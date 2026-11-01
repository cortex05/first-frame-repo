import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Modal from "../../components/modal/Modal";
import TopNavbar from "../../components/top-navbar/TopNavbar";
import ThemeToggle from "../../components/theme-toggle/ThemeToggle";
import styles from "./DashboardScreen.module.css";
import { deletePlaylist, getPlaylistById } from "../../api/playlist";
import FormError from "../../components/form-error/FormError";

import useCaseStore from "../../store/useCaseStore";
import useAuthStore, { selectIsAccountAdmin } from "../../store/useAuthStore";
import usePageTitle from "../../hooks/usePageTitle";

const Dashboard = () => {
  usePageTitle("Dashboard");
  const location = useLocation();
  // Set by a redirect, e.g. after losing access to a case. Shown once.
  const [notice] = useState(() => location.state?.message ?? "");
  const [modalOpen, setModalOpen] = useState(false);
  const [playlistModalOpen, setPlaylistModalOpen] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [isLoadingPlaylistDetails, setIsLoadingPlaylistDetails] = useState(false);
  // Delete flow (spec 022): the warning replaces the playlist modal while open,
  // and `selectedPlaylist` is kept so Cancel brings the same view back.
  const [deleteWarningOpen, setDeleteWarningOpen] = useState(false);
  const [isDeletingPlaylist, setIsDeletingPlaylist] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [listNotice, setListNotice] = useState("");
  const cases = useCaseStore((state) => state.cases);
  const fetchUserCases = useCaseStore((state) => state.fetchUserCases);
  const setActiveCase = useCaseStore((state) => state.setActiveCase);
  const userInfo = useAuthStore((state) => state.userInfo);
  const playlists = useAuthStore((state) => state.playlists);
  const fetchUserPlaylists = useAuthStore((state) => state.fetchUserPlaylists);
  const setPlaylists = useAuthStore((state) => state.setPlaylists);
  const isAccountAdmin = useAuthStore(selectIsAccountAdmin);

  const navigate = useNavigate();

  useEffect(() => {
    if (userInfo?.token) {
      fetchUserCases(userInfo.token);
      fetchUserPlaylists(userInfo.token);
    }
  }, [userInfo?.token]);

  useEffect(() => {
    // Clear the one-off message so a refresh or back navigation does not repeat it.
    if (location.state?.message) {
      navigate(location.pathname, { replace: true, state: null });
    }
  }, []);

  const handleOpenPlaylistModal = () => {
    setSelectedPlaylist(null);
    setListNotice("");
    setPlaylistModalOpen(true);
  };

  const handleSelectPlaylist = async (playlist) => {
    // One request at a time; the buttons stay focusable while it runs.
    if (isLoadingPlaylistDetails) return;
    if (!userInfo?.token) {
      return;
    }

    setListNotice("");
    setIsLoadingPlaylistDetails(true);

    try {
      const playlistDetails = await getPlaylistById(playlist._id, userInfo.token);
      setSelectedPlaylist(playlistDetails);
    } finally {
      setIsLoadingPlaylistDetails(false);
    }
  };

  const handleEditPlaylist = () => {
    const playlistId = selectedPlaylist?._id;
    if (!playlistId) return;

    setPlaylistModalOpen(false);
    setSelectedPlaylist(null);
    navigate(`/edit-playlist/${playlistId}`);
  };

  const handleRequestDelete = () => {
    setDeleteError("");
    setDeleteWarningOpen(true);
  };

  const handleCancelDelete = () => {
    setDeleteWarningOpen(false);
    setDeleteError("");
  };

  // Back to the refreshed list inside the still-open playlist modal.
  const finishDelete = async (deletedId, message = "") => {
    let notice = message;
    try {
      await fetchUserPlaylists(userInfo.token);
    } catch {
      setPlaylists(playlists.filter((p) => p._id !== deletedId));
      notice = "Playlist deleted, but the list could not be refreshed.";
    }

    setListNotice(notice);
    setSelectedPlaylist(null);
    setDeleteWarningOpen(false);
  };

  const handleConfirmDelete = async () => {
    const playlistId = selectedPlaylist?._id;
    if (!playlistId || !userInfo?.token || isDeletingPlaylist) return;

    setDeleteError("");
    setIsDeletingPlaylist(true);

    try {
      await deletePlaylist(playlistId, userInfo.token);
      await finishDelete(playlistId);
    } catch (requestError) {
      const message = requestError?.response?.data?.message;
      if (requestError?.response?.status === 404) {
        // Someone else already deleted it: the list is stale either way.
        await finishDelete(playlistId, message || "Playlist not found.");
      } else {
        setDeleteError(message || "Unable to delete this playlist. Please try again.");
      }
    } finally {
      setIsDeletingPlaylist(false);
    }
  };

  const handleSelectCase = (caseId) => {
    setActiveCase(caseId);
    setModalOpen(false);
    navigate(`/case/${caseId}`);
  };

  return (
    <React.Fragment>
      <TopNavbar />

      <main className={styles.dashboardContainer}>
        <div className={styles.dashboardHeading}>
          <h1>Welcome to our Application</h1>
          <p>
            Currently, you can start NEW a case for seating and questioning
            students or you can access an EXISTING case that is already in
            progress.
          </p>
          {/* <h3>What would you like to do?</h3> */}
        </div>

        {notice && (
          <p className={styles.notice} role="status">
            {notice}
          </p>
        )}

        <div className={styles.actionContainer}>
          {isAccountAdmin && (
            <Link to="/create-case" className={styles.linkButton}>
              Create New Case
            </Link>
          )}

          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className={styles.linkButton}
          >
            Access Existing Case
          </button>

          <Link to="/make-playlist" className={styles.linkButton}>
            Make Playlist
          </Link>

          <button
            type="button"
            onClick={handleOpenPlaylistModal}
            className={styles.linkButton}
          >
            Personal Playlists
          </button>

          {userInfo?.isAdmin && (
            <Link to="/recommended" className={styles.linkButton}>
              Recommended Playlists
            </Link>
          )}
        </div>

        <div className={styles.themeToggleRow}>
          <ThemeToggle />
        </div>

        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Access Existing Case"
        >
          <div className={styles.modalContent}>
            {cases.length === 0 ? (
              <p style={{ color: "var(--modal-text)" }}>
                {isAccountAdmin
                  ? "No existing cases found."
                  : "No cases have been assigned to you yet."}
              </p>
            ) : (
              <ul className={styles.itemList}>
                {cases.map((c) => (
                  <li key={c._id}>
                    <button
                      type="button"
                      onClick={() => handleSelectCase(c._id)}
                      className={styles.caseItem}
                    >
                      <span>{c.clientName}</span> by <span>{c.attorney}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Modal>

        <Modal
          isOpen={playlistModalOpen && !deleteWarningOpen}
          onClose={() => {
            setPlaylistModalOpen(false);
            setSelectedPlaylist(null);
            setListNotice("");
          }}
          title="Access Playlists"
        >
          {!selectedPlaylist ? (
            <div className={styles.modalContent}>
              {listNotice && (
                <p role="status" style={{ color: "var(--modal-text)", marginBottom: 12 }}>
                  {listNotice}
                </p>
              )}
              {playlists.length === 0 ? (
                <p style={{ color: "var(--modal-text)" }}>No playlists found.</p>
              ) : (
                <ul className={styles.itemList}>
                  {playlists.map((playlist) => (
                    <li key={playlist._id}>
                      <button
                        type="button"
                        onClick={() => handleSelectPlaylist(playlist)}
                        className={styles.caseItem}
                        aria-disabled={isLoadingPlaylistDetails || undefined}
                      >
                        <span>{playlist.title}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {isLoadingPlaylistDetails && (
                <p style={{ color: "var(--text-secondary)", marginTop: 12 }}>Loading playlist...</p>
              )}
            </div>
          ) : (
            <div className={styles.modalContent}>
              <h3 style={{ marginTop: 0, marginBottom: 12, color: "var(--modal-text)" }}>
                {selectedPlaylist.title}
              </h3>

              <div style={{ marginBottom: 16 }}>
                {(selectedPlaylist.questions || []).map((question, index) => (
                  <div
                    key={`${selectedPlaylist._id}-${question.id || index}`}
                    className={styles.caseItem}
                  >
                    <span style={{ fontWeight: 600, color: "var(--modal-text)", minWidth: 24 }}>
                      {index + 1}.
                    </span>
                    <span style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>
                      {question.text}
                    </span>
                  </div>
                ))}
              </div>

              {isAccountAdmin && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                  <button
                    type="button"
                    onClick={handleEditPlaylist}
                    style={{
                      flex: 1,
                      minWidth: 100,
                      padding: "10px 0",
                      fontWeight: 600,
                      background: "var(--orange-edit)",
                      color: "var(--text-on-bright-fill)",
                      border: "none",
                      borderRadius: 6,
                      cursor: "pointer",
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={handleRequestDelete}
                    style={{
                      flex: 1,
                      minWidth: 100,
                      padding: "10px 0",
                      fontWeight: 600,
                      background: "var(--decline)",
                      color: "var(--light-text)",
                      border: "none",
                      borderRadius: 6,
                      cursor: "pointer",
                    }}
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          )}
        </Modal>

        <Modal
          isOpen={deleteWarningOpen}
          onClose={handleCancelDelete}
          title="Warning"
          hideDefaultClose
          closeDisabled={isDeletingPlaylist}
        >
          <div className={styles.modalContent}>
            <p style={{ color: "var(--modal-text)" }}>
              This will delete the selected playlist permanently for all users in this account.
            </p>
            <hr />
            <p style={{ color: "var(--modal-text)" }}>Do you wish to proceed?</p>

            <FormError
              message={deleteError}
              style={{ color: "var(--error-text-surface)", fontSize: 14, marginBottom: 12 }}
            />

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeletingPlaylist}
                style={{
                  flex: 1,
                  minWidth: 100,
                  padding: "10px 0",
                  fontWeight: 600,
                  background: "var(--confirm)",
                  color: "var(--light-text)",
                  border: "none",
                  borderRadius: 6,
                  cursor: isDeletingPlaylist ? "not-allowed" : "pointer",
                  opacity: isDeletingPlaylist ? 0.75 : 1,
                }}
              >
                {isDeletingPlaylist ? "Deleting..." : "Confirm"}
              </button>
              <button
                type="button"
                onClick={handleCancelDelete}
                disabled={isDeletingPlaylist}
                style={{
                  flex: 1,
                  minWidth: 100,
                  padding: "10px 0",
                  fontWeight: 600,
                  background: "var(--decline)",
                  color: "var(--light-text)",
                  border: "none",
                  borderRadius: 6,
                  cursor: isDeletingPlaylist ? "not-allowed" : "pointer",
                  opacity: isDeletingPlaylist ? 0.75 : 1,
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      </main>
    </React.Fragment>
  );
};

export default Dashboard;
