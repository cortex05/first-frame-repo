import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";

import Modal from "../../components/modal/Modal";
import TopNavbar from "../../components/top-navbar/TopNavbar";

import useAuthStore from "../../store/useAuthStore";
import {
  deleteRecommended,
  getRecommendedForCharge,
  updateRecommended,
} from "../../api/recommended";

import Question from "../../types/polls/Question";
import { QuestionType } from "../../types/ENUMS";
import { EMPTY_QUESTION_FORM } from "../../utils/formUtils";

import styles from "./EditRecommendedScreen.module.css";

/**
 * Edits the single recommended playlist covering one charge. The charge is the
 * identifier -- the backend keeps it unique -- so it is what the route carries
 * and what the lookup endpoint matches on.
 */
const EditRecommendedScreen = () => {
  const { charge } = useParams();
  const navigate = useNavigate();

  const userInfo = useAuthStore((state) => state.userInfo);
  const fetchRecommendedNames = useAuthStore((state) => state.fetchRecommendedNames);

  const [recommended, setRecommended] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [questionModal, setQuestionModal] = useState(false);
  const [questionForm, setQuestionForm] = useState(EMPTY_QUESTION_FORM);
  const [editingQuestionId, setEditingQuestionId] = useState(null);
  const [removeQuestionId, setRemoveQuestionId] = useState(null);

  const [deleteRecommendedModal, setDeleteRecommendedModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [charge]);

  useEffect(() => {
    if (!userInfo?.token) return;

    let cancelled = false;

    const loadRecommended = async () => {
      setIsLoading(true);
      setLoadError("");

      try {
        const found = await getRecommendedForCharge(charge, userInfo.token);
        if (cancelled) return;

        // A charge with nothing curated is an ordinary state on the backend, so
        // the lookup answers with null rather than a 404.
        if (!found) {
          setLoadError(`No recommended playlist exists for ${charge}.`);
          setRecommended(null);
        } else {
          setRecommended(found);
        }
      } catch (requestError) {
        if (cancelled) return;
        setLoadError(
          requestError?.response?.data?.message ||
            "Unable to load this recommended playlist.",
        );
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    loadRecommended();

    return () => {
      cancelled = true;
    };
  }, [charge, userInfo?.token]);

  const questions = recommended?.questions || [];

  /** Writes the new question list straight through to the database. */
  const persistQuestions = async (nextQuestions) => {
    const saved = await updateRecommended(
      recommended._id,
      { questions: nextQuestions },
      userInfo.token,
    );

    // Merged rather than replaced: only the questions changed, so anything the
    // response happens not to resolve -- an unpopulated createdBy, say -- keeps
    // the value the populated load already put in state.
    setRecommended((prev) => ({
      ...prev,
      ...(saved || {}),
      createdBy: saved?.createdBy?.username ? saved.createdBy : prev.createdBy,
      questions: saved?.questions ?? nextQuestions,
    }));
  };

  const closeQuestionModal = () => {
    setQuestionModal(false);
    setEditingQuestionId(null);
    setQuestionForm(EMPTY_QUESTION_FORM);
    setSaveError("");
  };

  const openQuestionModal = () => {
    setSaveError("");
    setEditingQuestionId(null);
    setQuestionForm(EMPTY_QUESTION_FORM);
    setQuestionModal(true);
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

    setSaveError("");
    setEditingQuestionId(question.id);
    setQuestionModal(true);
  };

  const handleOptionChange = (index, field, value) => {
    setQuestionForm((prev) => {
      const options = [...prev.options];
      options[index] = {
        ...options[index],
        [field]: field === "value" ? Number(value) : value,
      };
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

  const buildOptionsFromForm = () =>
    questionForm.type === QuestionType.MULTIPLE_CHOICE
      ? questionForm.options.filter((o) => String(o.label).trim() !== "")
      : questionForm.tfValues;

  /** Adds or edits, depending on which mode the modal was opened in. */
  const handleSubmitQuestion = async () => {
    if (!questionForm.text.trim()) return;

    const options = buildOptionsFromForm();

    const updatedQuestions = editingQuestionId
      ? questions.map((q) =>
          q.id === editingQuestionId
            ? {
                ...q,
                text: questionForm.text.trim(),
                type: questionForm.type,
                options,
              }
            : q,
        )
      : [
          ...questions,
          // A recommended playlist is not tied to a case, so caseId stays null
          // until its questions are pulled into one.
          new Question(
            uuidv4(),
            questionForm.text.trim(),
            questionForm.type,
            null,
            options,
          ),
        ];

    setSaveError("");
    setIsSaving(true);

    try {
      await persistQuestions(updatedQuestions);
      closeQuestionModal();
    } catch (requestError) {
      setSaveError(
        requestError?.response?.data?.message || "Unable to save this question.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveQuestion = async () => {
    if (!removeQuestionId) return;

    const updatedQuestions = questions.filter((q) => q.id !== removeQuestionId);

    setSaveError("");
    setIsSaving(true);

    try {
      await persistQuestions(updatedQuestions);
      setRemoveQuestionId(null);
    } catch (requestError) {
      setSaveError(
        requestError?.response?.data?.message || "Unable to remove this question.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRecommended = async () => {
    setSaveError("");
    setIsSaving(true);

    try {
      await deleteRecommended(recommended._id, userInfo.token);
      // The charge is free again, so the list -- and the create screen's charge
      // options -- have to be rebuilt before leaving.
      await fetchRecommendedNames(userInfo.token);
      setDeleteRecommendedModal(false);
      navigate("/recommended");
    } catch (requestError) {
      setSaveError(
        requestError?.response?.data?.message ||
          "Unable to delete this recommended playlist.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <React.Fragment>
        <TopNavbar />
        <div className={styles.container}>
          <p className={styles.statusText}>Loading recommended playlist...</p>
        </div>
      </React.Fragment>
    );
  }

  if (!recommended) {
    return (
      <React.Fragment>
        <TopNavbar />
        <div className={styles.container}>
          <p className={styles.errorText}>
            {loadError || "Recommended playlist not found."}
          </p>
          <span className={styles.backLink} onClick={() => navigate("/recommended")}>
            Back to Recommended Playlists
          </span>
        </div>
      </React.Fragment>
    );
  }

  return (
    <React.Fragment>
      <TopNavbar />

      <div className={styles.container}>
        <h1>Charge: {recommended.charge}</h1>

        <section className={styles.infoSection}>
          <p className={styles.value}>
            Created By: {recommended.createdBy?.username || "—"}
          </p>
          <p className={styles.value}>Questions: {questions.length}</p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionHeading}>Questions</h2>

          {questions.length === 0 && (
            <p className={styles.emptyText}>No questions on this playlist.</p>
          )}

          {questions.map((q, i) => (
            <div key={q.id} className={styles.questionItem}>
              <span className={styles.questionNumber}>{i + 1}.</span>
              <span className={styles.questionText}>{q.text}</span>
              <button
                onClick={() => openEditQuestionModal(q)}
                disabled={isSaving}
                className={styles.editButton}
              >
                Edit
              </button>
              <button
                onClick={() => {
                  setSaveError("");
                  setRemoveQuestionId(q.id);
                }}
                disabled={isSaving}
                className={styles.removeButton}
                aria-label="Remove question"
              >
                X
              </button>
              <span
                className={`${styles.typeBadge} ${
                  q.type === QuestionType.TRUE_FALSE
                    ? styles.typeBadgeTrueFalse
                    : styles.typeBadgeMultipleChoice
                }`}
              >
                {q.type === QuestionType.TRUE_FALSE ? "T/F" : "MC"}
              </span>
            </div>
          ))}

          <button
            onClick={openQuestionModal}
            disabled={isSaving}
            className={styles.addQuestionButton}
          >
            + Add Question
          </button>

          {saveError && !questionModal && !removeQuestionId && !deleteRecommendedModal && (
            <p className={styles.errorText}>{saveError}</p>
          )}
        </section>

        <button
          onClick={() => {
            setSaveError("");
            setDeleteRecommendedModal(true);
          }}
          disabled={isSaving}
          className={styles.deleteRecommendedButton}
        >
          Delete Recommended Playlist
        </button>

        {/* Edit Question Modal */}
        <Modal
          isOpen={questionModal}
          onClose={closeQuestionModal}
          title={editingQuestionId ? "Edit Question" : "Add Question"}
          hideDefaultClose
        >
          <div className={styles.fieldStyle}>
            <label className={styles.labelStyle}>Question Text</label>
            <textarea
              className={styles.textAreaStyle}
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
              <option value={QuestionType.MULTIPLE_CHOICE}>Multiple Choice</option>
            </select>
          </div>

          {questionForm.type === QuestionType.TRUE_FALSE && (
            <div className={styles.fieldStyle}>
              <label className={styles.labelStyle}>Point Values</label>
              {questionForm.tfValues.map((opt, i) => (
                <div key={i} className={styles.trueFalseValueDisplay}>
                  <span>{String(opt.label)}:</span>
                  <input
                    className={`${styles.inputStyle} ${styles.pointsInput}`}
                    type="number"
                    value={opt.value}
                    onChange={(e) => handleTFValueChange(i, e.target.value)}
                    placeholder="Points"
                  />
                </div>
              ))}
            </div>
          )}

          {questionForm.type === QuestionType.MULTIPLE_CHOICE && (
            <div className={styles.fieldStyle}>
              <label className={styles.labelStyle}>Options (up to 4)</label>
              {questionForm.options.map((opt, i) => (
                <div key={i} className={styles.optionRow}>
                  <input
                    className={`${styles.inputStyle} ${styles.optionLabelInput}`}
                    type="text"
                    value={opt.label}
                    onChange={(e) => handleOptionChange(i, "label", e.target.value)}
                    placeholder={`Option ${i + 1}`}
                  />
                  <input
                    className={`${styles.inputStyle} ${styles.pointsInput}`}
                    type="number"
                    value={opt.value}
                    onChange={(e) => handleOptionChange(i, "value", e.target.value)}
                    placeholder="Points"
                  />
                </div>
              ))}
            </div>
          )}

          {saveError && <p className={styles.modalErrorText}>{saveError}</p>}

          <div className={styles.modalButtons}>
            <button
              onClick={handleSubmitQuestion}
              disabled={!questionForm.text.trim() || isSaving}
              className={styles.confirm}
            >
              {isSaving ? "Saving..." : editingQuestionId ? "Submit" : "Add Question"}
            </button>
            <button
              onClick={closeQuestionModal}
              disabled={isSaving}
              className={styles.decline}
            >
              Cancel
            </button>
          </div>
        </Modal>

        {/* Remove Question Confirmation Modal */}
        <Modal
          isOpen={Boolean(removeQuestionId)}
          onClose={() => setRemoveQuestionId(null)}
          title="Remove Question"
          hideDefaultClose
        >
          <div className={styles.modalBody}>
            <p className={styles.modalText}>
              Are you sure you want to remove this question from this recommended
              playlist?
            </p>

            {saveError && <p className={styles.modalErrorText}>{saveError}</p>}

            <div className={styles.modalButtons}>
              <button
                onClick={handleRemoveQuestion}
                disabled={isSaving}
                className={styles.confirm}
              >
                {isSaving ? "Removing..." : "Yes"}
              </button>
              <button
                onClick={() => setRemoveQuestionId(null)}
                disabled={isSaving}
                className={styles.decline}
              >
                No
              </button>
            </div>
          </div>
        </Modal>

        {/* Delete Recommended Confirmation Modal */}
        <Modal
          isOpen={deleteRecommendedModal}
          onClose={() => setDeleteRecommendedModal(false)}
          title="Delete Recommended Playlist"
          hideDefaultClose
        >
          <div className={styles.modalBody}>
            <p className={styles.modalText}>
              Delete the recommended playlist for {recommended.charge}? Its questions
              are removed and the charge becomes available for a new playlist.
            </p>

            {saveError && <p className={styles.modalErrorText}>{saveError}</p>}

            <div className={styles.modalButtons}>
              <button
                onClick={handleDeleteRecommended}
                disabled={isSaving}
                className={styles.confirm}
              >
                {isSaving ? "Deleting..." : "Yes"}
              </button>
              <button
                onClick={() => setDeleteRecommendedModal(false)}
                disabled={isSaving}
                className={styles.decline}
              >
                No
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </React.Fragment>
  );
};

export default EditRecommendedScreen;
