import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Modal from "../../components/modal/Modal";
import TopNavbar from "../../components/top-navbar/TopNavbar";
import styles from "./HomeScreen.module.css";
import { getPlaylistById } from "../../api/playlist";

import useCaseStore from "../../store/useCaseStore";
import useAuthStore from "../../store/useAuthStore";

const Home = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [playlistModalOpen, setPlaylistModalOpen] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [isLoadingPlaylistDetails, setIsLoadingPlaylistDetails] = useState(false);
  const cases = useCaseStore((state) => state.cases);
  const fetchUserCases = useCaseStore((state) => state.fetchUserCases);
  const setActiveCase = useCaseStore((state) => state.setActiveCase);
  const userInfo = useAuthStore((state) => state.userInfo);
  const playlists = useAuthStore((state) => state.playlists);
  const fetchUserPlaylists = useAuthStore((state) => state.fetchUserPlaylists);

  const navigate = useNavigate();

  useEffect(() => {
    if (userInfo?.token) {
      fetchUserCases(userInfo.token);
      fetchUserPlaylists(userInfo.token);
    }
  }, [userInfo?.token]);

  const handleOpenPlaylistModal = () => {
    setSelectedPlaylist(null);
    setPlaylistModalOpen(true);
  };

  const handleSelectPlaylist = async (playlist) => {
    if (!userInfo?.token) {
      return;
    }

    setIsLoadingPlaylistDetails(true);

    try {
      const playlistDetails = await getPlaylistById(playlist._id, userInfo.token);
      setSelectedPlaylist(playlistDetails);
    } finally {
      setIsLoadingPlaylistDetails(false);
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

      <div className={styles.homeContainer}>
        <div className={styles.homeHeading}>
          <h1>Welcome to our Application</h1>
          <p>
            Currently, you can start NEW a case for seating and questioning
            students or you can access an EXISTING case that is already in
            progress.
          </p>
          {/* <h3>What would you like to do?</h3> */}
        </div>

        <div className={styles.actionContainer}>
          <Link to="/create-case" className={styles.linkButton}>
            Create New Case
          </Link>

          <div onClick={() => setModalOpen(true)} className={styles.linkButton}>
            <span>Access Existing Case</span>
          </div>

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

        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Access Existing Case"
        >
          <div className={styles.modalContent}>
            {cases.length === 0 ? (
              <p style={{ color: "var(--modal-text)" }}>No existing cases found.</p>
            ) : (
              <div>
                {cases.map((c) => (
                  <div
                    key={c._id}
                    onClick={() => handleSelectCase(c._id)}
                    className={styles.caseItem}
                  >
                    <span>{c.clientName}</span> by <span>{c.attorney}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Modal>

        <Modal
          isOpen={playlistModalOpen}
          onClose={() => {
            setPlaylistModalOpen(false);
            setSelectedPlaylist(null);
          }}
          title="Access Playlists"
        >
          {!selectedPlaylist ? (
            <div className={styles.modalContent}>
              {playlists.length === 0 ? (
                <p style={{ color: "var(--modal-text)" }}>No playlists found.</p>
              ) : (
                playlists.map((playlist) => (
                  <div
                    key={playlist._id}
                    onClick={() => handleSelectPlaylist(playlist)}
                    className={styles.caseItem}
                    style={{ opacity: isLoadingPlaylistDetails ? 0.7 : 1 }}
                  >
                    <span>{playlist.title}</span>
                  </div>
                ))
              )}

              {isLoadingPlaylistDetails && (
                <p style={{ color: "#666", marginTop: 12 }}>Loading playlist...</p>
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
                    <span style={{ fontWeight: 600, color: "#2c6fad", minWidth: 24 }}>
                      {index + 1}.
                    </span>
                    <span style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>
                      {question.text}
                    </span>
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                <button
                  onClick={() => {}}
                  style={{
                    flex: 1,
                    minWidth: 100,
                    padding: "10px 0",
                    fontWeight: 600,
                    background: "#f0ad4e",
                    color: "#fff",
                    border: "none",
                    borderRadius: 6,
                    cursor: "pointer",
                  }}
                >
                  Edit
                </button>
                <button
                  onClick={() => {}}
                  style={{
                    flex: 1,
                    minWidth: 100,
                    padding: "10px 0",
                    fontWeight: 600,
                    background: "#d9534f",
                    color: "#fff",
                    border: "none",
                    borderRadius: 6,
                    cursor: "pointer",
                  }}
                >
                  Delete
                </button>
                <button
                  onClick={() => {
                    setPlaylistModalOpen(false);
                    setSelectedPlaylist(null);
                  }}
                  style={{
                    flex: 1,
                    minWidth: 100,
                    padding: "10px 0",
                    fontWeight: 600,
                    background: "#f0f0f0",
                    color: "#333",
                    border: "1px solid #ccc",
                    borderRadius: 6,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </React.Fragment>
  );
};

export default Home;
