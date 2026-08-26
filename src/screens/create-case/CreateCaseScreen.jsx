import React, { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { useNavigate } from "react-router-dom";

import Modal from "../../components/modal/Modal";
import TopNavbar from "../../components/top-navbar/TopNavbar";

import useCaseStore from "../../store/useCaseStore";
import useAuthStore from "../../store/useAuthStore";
import { createCase } from "../../api/case";
import { getPlaylistById } from "../../api/playlist";

import Question from "../../types/polls/Question";
import { QuestionType } from "../../types/ENUMS";
import {
  CASE_CATEGORIES_BY_AREA,
  caseCategoryLabel,
  getCaseCategory,
} from "../../types/caseCategories";
import { normalizeQuestion } from "../../utils/questionNormalization";

import { EMPTY_QUESTION_FORM } from "../../utils/formUtils";
import useRecommendedPlaylist from "../../hooks/useRecommendedPlaylist";

import styles from "./CreateCaseScreen.module.css";

const CreateCaseScreen = () => {
	const navigate = useNavigate();
  const [caseId] = useState(() => uuidv4());
  const [clientName, setClientName] = useState("");
	const [attorney, setAttorney] = useState("");
  const [category, setCategory] = useState("");

	const [numberOfStudents, setNumberOfStudents] = useState("");

  const [questions, setQuestions] = useState([]);
  const [questionModal, setQuestionModal] = useState(false);
  const [questionForm, setQuestionForm] = useState(EMPTY_QUESTION_FORM);
  const [editingQuestionId, setEditingQuestionId] = useState(null);
  const [deleteQuestionId, setDeleteQuestionId] = useState(null);
  const [playlistModalOpen, setPlaylistModalOpen] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [selectedPlaylistQuestionIds, setSelectedPlaylistQuestionIds] = useState([]);
  const [isLoadingPlaylist, setIsLoadingPlaylist] = useState(false);
  const [isLoadingPlaylistDetails, setIsLoadingPlaylistDetails] = useState(false);
  const [playlistError, setPlaylistError] = useState("");

  const [previewModal, setPreviewModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const addCase = useCaseStore((state) => state.addCase);
  const setActiveCase = useCaseStore((state) => state.setActiveCase);
  const userInfo = useAuthStore((state) => state.userInfo);
  const playlists = useAuthStore((state) => state.playlists);
  const fetchUserPlaylists = useAuthStore((state) => state.fetchUserPlaylists);

  const {
    recommended,
    isLoading: isLoadingRecommended,
    error: recommendedError,
    load: loadRecommended,
  } = useRecommendedPlaylist(userInfo?.token);

  // Recommended sets are keyed by charge alone, while a category is an
  // area-and-charge pair -- 'Weapons Charges' files under both Criminal and
  // Civil, and one curated set covers it either way.
  const selectedCharge = getCaseCategory(category)?.matter || "";

  useEffect(() => {
    if (userInfo?.token) {
      fetchUserPlaylists(userInfo.token);
    }
  }, [userInfo?.token]);

  const normalizeQuestionForCase = (question) => {
    const normalized = normalizeQuestion(question);

    return new Question(
      uuidv4(),
      normalized.text,
      normalized.type,
      caseId,
      (normalized.options || []).map((option) => ({
        label: option.label,
        value: Number(option.value) || 0,
      })),
    );
  };

  const handleOpenPlaylistModal = () => {
    setSelectedPlaylist(null);
    setSelectedPlaylistQuestionIds([]);
    setPlaylistError("");
    setPlaylistModalOpen(true);
    loadRecommended(selectedCharge);
  };

  const handleSelectRecommended = () => {
    if (!recommended) return;

    setPlaylistError("");
    setSelectedPlaylist({
      _id: recommended._id,
      title: `Recommended — ${recommended.charge}`,
      questions: recommended.questions || [],
    });
    setSelectedPlaylistQuestionIds([]);
  };

  const getPlaylistQuestionKey = (question, index) => question.id || `index-${index}`;

  const handleTogglePlaylistQuestionSelection = (question, index) => {
    const key = getPlaylistQuestionKey(question, index);
    setSelectedPlaylistQuestionIds((prev) =>
      prev.includes(key) ? prev.filter((id) => id !== key) : [...prev, key],
    );
  };

  const handleSelectPlaylist = async (playlist) => {
    if (!userInfo?.token) {
      setPlaylistError("You must be logged in to access playlists.");
      return;
    }

    setPlaylistError("");
    setIsLoadingPlaylistDetails(true);

    try {
      const playlistDetails = await getPlaylistById(playlist._id, userInfo.token);
      setSelectedPlaylist(playlistDetails);
      setSelectedPlaylistQuestionIds([]);
    } catch (requestError) {
      setPlaylistError(
        requestError?.response?.data?.message || "Unable to load playlist details.",
      );
    } finally {
      setIsLoadingPlaylistDetails(false);
    }
  };

  const handleLoadPlaylist = async () => {
    if (!selectedPlaylist) return;
    if (selectedPlaylistQuestionIds.length === 0) {
      setPlaylistError("Select at least one question to load.");
      return;
    }

    setPlaylistError("");
    setIsLoadingPlaylist(true);

    try {
      const loadedQuestions = (selectedPlaylist.questions || [])
        .filter((question, index) =>
          selectedPlaylistQuestionIds.includes(getPlaylistQuestionKey(question, index)),
        )
        .map((question) => normalizeQuestionForCase(question));

      setQuestions((prev) => [...prev, ...loadedQuestions]);
      setPlaylistModalOpen(false);
      setSelectedPlaylist(null);
      setSelectedPlaylistQuestionIds([]);
    } catch (requestError) {
      setPlaylistError(
        requestError?.response?.data?.message || "Unable to load playlist.",
      );
    } finally {
      setIsLoadingPlaylist(false);
    }
  };

  const openQuestionModal = () => {
    setEditingQuestionId(null);
    setQuestionForm(EMPTY_QUESTION_FORM);
    setQuestionModal(true);
  };

  const closeQuestionModal = () => {
    setQuestionModal(false);
    setEditingQuestionId(null);
    setQuestionForm(EMPTY_QUESTION_FORM);
  };

  const openEditQuestionModal = (question) => {
    if (question.type === QuestionType.MULTIPLE_CHOICE) {
      const mcOptions = (question.options || []).map((opt) => ({
        label: opt.label || "",
        value: Number(opt.value) || 0,
      }));

      while (mcOptions.length < 4) {
        mcOptions.push({ label: "", value: 0 });
      }

      setQuestionForm({
        text: question.text || "",
        type: QuestionType.MULTIPLE_CHOICE,
        options: mcOptions.slice(0, 4),
        tfValues: [
          { label: true, value: 3 },
          { label: false, value: 0 },
        ],
      });
    } else {
      const trueOption = (question.options || []).find(
        (opt) => opt.label === true || opt.label === "true",
      );
      const falseOption = (question.options || []).find(
        (opt) => opt.label === false || opt.label === "false",
      );

      setQuestionForm({
        text: question.text || "",
        type: QuestionType.TRUE_FALSE,
        options: [
          { label: "", value: 0 },
          { label: "", value: 0 },
          { label: "", value: 0 },
          { label: "", value: 0 },
        ],
        tfValues: [
          { label: true, value: Number(trueOption?.value) || 0 },
          { label: false, value: Number(falseOption?.value) || 0 },
        ],
      });
    }

    setEditingQuestionId(question.id);
    setQuestionModal(true);
  };

  const handleOptionChange = (index, field, value) => {
    setQuestionForm((prev) => {
      const options = [...prev.options];
      options[index] = { ...options[index], [field]: field === 'value' ? Number(value) : value };
      return { ...prev, options };
    });
  };

  const handleTFValueChange = (index, value) => {
    setQuestionForm((prev) => {
      const tfValues = [...prev.tfValues];
      tfValues[index] = { ...tfValues[index], value: Number(value) };
      return { ...prev, tfValues };
    });
  };

  const handleAddQuestion = () => {
    if (!questionForm.text.trim()) return;

    const options =
      questionForm.type === QuestionType.MULTIPLE_CHOICE
        ? questionForm.options.filter((o) => o.label.trim() !== "")
        : questionForm.tfValues;

    const q = new Question(
      uuidv4(),
      questionForm.text.trim(),
      questionForm.type,
      caseId,
      options,
    );

    setQuestions((prev) => [...prev, q]);
    closeQuestionModal();
  };

  const handleSaveEditedQuestion = () => {
    if (!questionForm.text.trim() || !editingQuestionId) return;

    const options =
      questionForm.type === QuestionType.MULTIPLE_CHOICE
        ? questionForm.options.filter((o) => o.label.trim() !== "")
        : questionForm.tfValues;

    setQuestions((prev) =>
      prev.map((q) =>
        q.id === editingQuestionId
          ? {
              ...q,
              text: questionForm.text.trim(),
              type: questionForm.type,
              options,
            }
          : q,
      ),
    );

    closeQuestionModal();
  };

  const handleDeleteQuestion = () => {
    if (!deleteQuestionId) return;

    setQuestions((prev) => prev.filter((q) => q.id !== deleteQuestionId));
    setDeleteQuestionId(null);
  };

  const handleSubmit = async () => {
    if (!userInfo?.token) {
      setSubmitError("You must be logged in to create a case.");
      return;
    }

    if (!clientName.trim() || !numberOfStudents || !category) {
      setSubmitError("Please complete all required case details before creating the case.");
      return;
    }

    setSubmitError("");
    setIsSubmitting(true);

    const normalizedQuestions = questions.map((q) =>
      normalizeQuestion({
        ...q,
        caseId: q.caseId || caseId,
        firstPoll: Boolean(q.firstPoll),
      }),
    );

    const casePayload = {
      clientName: clientName.trim(),
      attorney: attorney.trim() || userInfo.username,
      category,
      studentNumber: Number(numberOfStudents),
      questions: normalizedQuestions,
    };

    try {
      const createdCase = await createCase(casePayload, userInfo.token);
      addCase(createdCase);
      setActiveCase(createdCase._id);
      setPreviewModal(false);
      navigate(`/case/${createdCase._id}`);
    } catch (requestError) {
      setSubmitError(
        requestError?.response?.data?.message || "Unable to create case. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <React.Fragment>
      <TopNavbar warnOnHomeNavigation />

      <div className={styles.container}>
        <h1>Create New Case</h1>

      {/* Basic Info */}
      <section style={{ marginBottom: 32,  }}>
        <h2 style={{ marginBottom: 16 }}>Basic Info</h2>

        <div className={styles.fieldStyle}>
          <label className={styles.labelStyle}>Client Name</label>
          <input
            className={styles.inputStyle}
            type="text"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="Client name"
          />
        </div>

        <div className={styles.fieldStyle}>
          <label className={styles.labelStyle}>Attorney</label>
          <input
            className={styles.inputStyle}
            type="text"
            value={attorney}
            onChange={(e) => setAttorney(e.target.value)}
            placeholder="Attorney name"
          />
        </div>

        <div className={styles.fieldStyle}>
          <label className={styles.labelStyle}>Case Category</label>
          <select
            className={styles.inputStyle}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">Select a case category...</option>
            {Object.entries(CASE_CATEGORIES_BY_AREA).map(([area, categories]) => (
              <optgroup key={area} label={area}>
                {categories.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.matter}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        <div className={styles.fieldStyle}>
          <label className={styles.labelStyle}>Number of Students</label>
          <input
            className={styles.inputStyle}
            type="number"
            min={1}
            value={numberOfStudents}
            onChange={(e) => setNumberOfStudents(e.target.value)}
            placeholder="e.g. 30"
          />
        </div>
      </section>

      {/* Questions */}
      <section style={{ marginBottom: 32 }}>
        <h2 style={{ marginBottom: 12 }}>Questions</h2>

        {questions.length === 0 && (
          <p style={{ color: "#888", fontSize: 14, marginBottom: 12 }}>
            No questions added yet.
          </p>
        )}

        {questions.map((q, i) => (
          <div
            key={q.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 12px",
              marginBottom: 8,
              background: "#f5f8ff",
              border: "1px solid #c5d8f5",
              borderRadius: 6,
              fontSize: 14,
            }}
          >
            <span style={{ fontWeight: 600, color: "#2c6fad", minWidth: 24 }}>
              {i + 1}.
            </span>
            <span style={{ flex: 1, color: "var(--modal-text)" }}>{q.text}</span>
            <button
              onClick={() => openEditQuestionModal(q)}
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: "4px 8px",
                background: "#f0ad4e",
                color: "#fff",
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
              }}
            >
              Edit
            </button>
            <button
              onClick={() => setDeleteQuestionId(q.id)}
              style={{
                width: 22,
                height: 22,
                fontSize: 13,
                fontWeight: 700,
                padding: 0,
                background: "#d9534f",
                color: "#fff",
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
                lineHeight: 1,
              }}
              aria-label="Delete question"
            >
              X
            </button>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                padding: "2px 8px",
                background:
                  q.type === QuestionType.TRUE_FALSE ? "#e6f4ea" : "#fff3cd",
                color:
                  q.type === QuestionType.TRUE_FALSE ? "#2e7d32" : "#856404",
                borderRadius: 12,
              }}
            >
              {q.type === QuestionType.TRUE_FALSE ? "T/F" : "MC"}
            </span>
          </div>
        ))}

        <button
          onClick={openQuestionModal}
          className={styles.addQuestionButton}
        >
          + Add Question
        </button>

        <button
          onClick={handleOpenPlaylistModal}
          className={styles.playlistAccessButton}
        >
          Access Playlists
        </button>
      </section>

      {/* Submit */}
      <button
        onClick={() => setPreviewModal(true)}
        className={styles.linkButton}
      >
        Create Case
      </button>

      {/* Add Question Modal */}
      <Modal
        isOpen={questionModal}
        onClose={closeQuestionModal}
        title={editingQuestionId ? "Edit Question" : "Add Question"}
        hideDefaultClose={Boolean(editingQuestionId)}
      >
        <div className={styles.fieldStyle}>
          <label className={styles.labelStyle}>Question Text</label>
          <textarea
            className={styles.textAreaStyle}
            type="textarea"
            value={questionForm.text}
            onChange={(e) =>
              setQuestionForm((prev) => ({ ...prev, text: e.target.value }))
            }
            placeholder="Enter question..."
            autoFocus
          />
        </div>

        <div className={styles.fieldStyle}>
          <label className={styles.labelStyle}>Type</label>
          <select
            className={styles.inputStyle}
            value={questionForm.type}
            onChange={(e) =>
              setQuestionForm((prev) => ({ ...prev, type: e.target.value }))
            }
          >
            <option value={QuestionType.TRUE_FALSE}>True / False</option>
            <option value={QuestionType.MULTIPLE_CHOICE}>
              Multiple Choice
            </option>
          </select>
        </div>

        {questionForm.type === QuestionType.TRUE_FALSE && (
          <div className={styles.fieldStyle}>
            <label className={styles.labelStyle} style={{ display: "block", marginBottom: 8 }}>
              Point Values
            </label>
            {questionForm.tfValues.map((opt, i) => (
              <div 
                key={i} 
                className={styles.trueFalseValueDisplay}
              >
                <span>{String(opt.label)}</span>
                <input
                  className={styles.inputStyle}
                  type="number"
                  value={opt.value}
                  onChange={(e) => handleTFValueChange(i, e.target.value)}
                  placeholder="Points"
                  style={{ width: 80 }}
                />
              </div>
            ))}
          </div>
        )}

        {questionForm.type === QuestionType.MULTIPLE_CHOICE && (
          <div className={styles.fieldStyle}>
            <label className={styles.labelStyle} style={{ display: "block", marginBottom: 8 }}>
              Options (up to 4)
            </label>
            {questionForm.options.map((opt, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input
                  className={styles.inputStyle}
                  type="text"
                  value={opt.label}
                  onChange={(e) => handleOptionChange(i, 'label', e.target.value)}
                  placeholder={`Option ${i + 1}`}
                  style={{ flex: 1 }}
                />
                <input
                  className={styles.inputStyle}
                  type="number"
                  value={opt.value}
                  onChange={(e) => handleOptionChange(i, 'value', e.target.value)}
                  placeholder="Points"
                  style={{ width: 80 }}
                />
              </div>
            ))}
          </div>
        )}

        {!editingQuestionId && (
          <button
            onClick={handleAddQuestion}
            disabled={!questionForm.text.trim()}
            style={{
              width: "100%",
              padding: "12px 0",
              fontSize: 15,
              fontWeight: 600,
              background: questionForm.text.trim() ? "var(--confirm)" : "#aaa",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              marginBottom: 8,
              cursor: questionForm.text.trim() ? "pointer" : "not-allowed",
            }}
          >
            Add Question
          </button>
        )}

        {editingQuestionId && (
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <button
              onClick={handleSaveEditedQuestion}
              disabled={!questionForm.text.trim()}
              style={{
                flex: 1,
                padding: "12px 0",
                fontSize: 15,
                fontWeight: 600,
                background: questionForm.text.trim() ? "#4a90d9" : "#aaa",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                cursor: questionForm.text.trim() ? "pointer" : "not-allowed",
              }}
            >
              Save
            </button>
            <button
              onClick={closeQuestionModal}
              style={{
                flex: 1,
                padding: "12px 0",
                fontSize: 15,
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
        )}
      </Modal>

      <Modal
        isOpen={Boolean(deleteQuestionId)}
        onClose={() => setDeleteQuestionId(null)}
        title="Remove Question"
        hideDefaultClose
      >
        <p style={{ marginBottom: 20, color: "var(--modal-text)", fontSize: 16 }}>
          Are you sure you want to remove this question from this case?
        </p>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 8,
          }}
        >
          <button
            onClick={handleDeleteQuestion}
            style={{
              flex: 1,
              padding: "10px 0",
              fontWeight: 600,
              background: "#d9534f",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            Yes
          </button>
          <button
            onClick={() => setDeleteQuestionId(null)}
            style={{
              flex: 1,
              padding: "10px 0",
              fontWeight: 600,
              background: "#f0f0f0",
              color: "#333",
              border: "1px solid #ccc",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            No
          </button>
        </div>
      </Modal>

      {/* Playlist Modal */}
      <Modal
        isOpen={playlistModalOpen}
        onClose={() => {
          setPlaylistModalOpen(false);
          setSelectedPlaylist(null);
          setSelectedPlaylistQuestionIds([]);
          setPlaylistError("");
        }}
        title="Access Playlists"
      >
        {!selectedPlaylist ? (
          <div>
            {!selectedCharge ? (
              <div className={styles.recommendedNotice}>
                Select a case category to see its recommended playlist.
              </div>
            ) : isLoadingRecommended ? (
              <div className={styles.recommendedNotice}>
                Loading the recommended playlist for {selectedCharge}...
              </div>
            ) : recommended ? (
              <div
                onClick={handleSelectRecommended}
                className={styles.recommendedListItem}
              >
                <span>Hector Recommends — {recommended.charge}</span>
              </div>
            ) : (
              <div className={styles.recommendedNotice}>
                No recommended playlist for {selectedCharge} yet.
              </div>
            )}

            {recommendedError && (
              <p className={styles.playlistErrorText}>{recommendedError}</p>
            )}

            {playlists.length === 0 ? (
              <p className={styles.playlistStatusText}>You have no playlists saved.</p>
            ) : (
              playlists.map((playlist) => (
                <div
                  key={playlist._id}
                  onClick={() => handleSelectPlaylist(playlist)}
                  className={`${styles.playlistListItem} ${
                    isLoadingPlaylistDetails ? styles.playlistLoadingState : ""
                  }`}
                >
                  <span>{playlist.title}</span>
                </div>
              ))
            )}

            {isLoadingPlaylistDetails && (
              <p className={styles.playlistStatusText}>Loading playlist...</p>
            )}

            {playlistError && (
              <p className={styles.playlistErrorText}>{playlistError}</p>
            )}
          </div>
        ) : (
          <div>
            <h3 className={styles.playlistTitle}>{selectedPlaylist.title}</h3>
            <p className={styles.playlistSelectionHint}>
              Select one or more questions to load.
            </p>

            <div className={styles.playlistQuestionsList}>
              {(selectedPlaylist.questions || []).map((question, index) => (
                <div
                  key={`${selectedPlaylist._id}-${question.id || index}`}
                  className={`${styles.playlistQuestionItem} ${styles.playlistQuestionSelectable} ${
                    selectedPlaylistQuestionIds.includes(getPlaylistQuestionKey(question, index))
                      ? styles.playlistQuestionSelected
                      : ""
                  }`}
                  onClick={() => handleTogglePlaylistQuestionSelection(question, index)}
                >
                  <span className={styles.playlistQuestionNumber}>
                    {index + 1}.
                  </span>
                  <span className={styles.playlistQuestionText}>{question.text}</span>
                </div>
              ))}
            </div>

            <button
              onClick={handleLoadPlaylist}
              disabled={isLoadingPlaylist}
              className={styles.playlistLoadButton}
            >
              {isLoadingPlaylist ? "Loading..." : "Load Questions"}
            </button>

            {playlistError && (
              <p className={styles.playlistErrorText}>{playlistError}</p>
            )}
          </div>
        )}
      </Modal>

      {/* Preview / Submit Modal */}
        <Modal
          isOpen={previewModal}
          onClose={() => setPreviewModal(false)}
          title="Case Summary"
        >
          <div style={{ fontSize: 20, marginBottom: 16, lineHeight: 1.8, color: "var(--modal-text)" }}>
            <div>
              <strong>Client Name:</strong> {clientName || "—"}
            </div>
            <div>
              <strong>Attorney:</strong> {attorney || "—"}
            </div>
            <div>
              <strong>Case Category:</strong> {caseCategoryLabel(category)}
            </div>
            <div>
              <strong>Students:</strong> {numberOfStudents || "—"}
            </div>
            <div style={{ marginTop: 12 }}>
              <strong>Questions ({questions.length}):</strong>
            </div>
            {questions.length === 0 && <div style={{ color: "#888" }}>None</div>}
            <div style={{marginBottom: 20}}>
              {questions.map((q, i) => (
                <div key={q.id} style={{ marginLeft: 12, color: "#333", margin: "4px 0" }}>
                  <span style={{ fontWeight: 500, fontSize: 18, maxWidth: 500, display: "inline-block", whiteSpace: "wrap" }} >
                    {i + 1}.{" "}
                    {q.text}
                    {q.options.length > 0 && (
                        <span style={{ color: "#666" }}>
                          {" "}
                          — {q.options.map((o) => `${o.label} (${o.value}pts)`).join(", ")}
                        </span>
                      )}
                  </span>
                </div>
              ))}
            </div>
            {submitError && (
              <p style={{ color: "#d9534f", fontSize: 16, marginBottom: 12 }}>{submitError}</p>
            )}

            <button
              onClick={() => handleSubmit()}
              className={styles.summaryCreateButton}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating..." : "Create Case"}
            </button>
          </div>
        </Modal>
        </div>
    </React.Fragment>
  );
};

export default CreateCaseScreen;
