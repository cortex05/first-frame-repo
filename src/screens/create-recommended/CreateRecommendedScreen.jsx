import React, { useMemo, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { useNavigate } from "react-router-dom";

import Modal from "../../components/modal/Modal";
import TopNavbar from "../../components/top-navbar/TopNavbar";

import useAuthStore from "../../store/useAuthStore";
import { createRecommended } from "../../api/recommended";

import Question from "../../types/polls/Question";
import { QuestionType } from "../../types/ENUMS";
import { CASE_CHARGES } from "../../types/charges";
import { normalizeQuestion } from "../../utils/questionNormalization";
import { EMPTY_QUESTION_FORM } from "../../utils/formUtils";

import styles from "./CreateRecommendedScreen.module.css";

const CreateRecommendedScreen = () => {
  const navigate = useNavigate();

  const userInfo = useAuthStore((state) => state.userInfo);
  const recommendedNames = useAuthStore((state) => state.recommendedNames);
  const fetchRecommendedNames = useAuthStore((state) => state.fetchRecommendedNames);

  const [charge, setCharge] = useState("");
  const [questions, setQuestions] = useState([]);

  const [questionModal, setQuestionModal] = useState(false);
  const [questionForm, setQuestionForm] = useState(EMPTY_QUESTION_FORM);
  const [editingQuestionId, setEditingQuestionId] = useState(null);
  const [deleteQuestionId, setDeleteQuestionId] = useState(null);

  const [confirmModal, setConfirmModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // One recommended playlist per charge, so a charge that already has one is not
  // offerable. recommendedNames holds the charges already covered.
  const availableCharges = useMemo(() => {
    const taken = new Set(recommendedNames);
    return CASE_CHARGES.filter((option) => !taken.has(option));
  }, [recommendedNames]);

  const canCreate = Boolean(charge) && questions.length > 0;

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
      ? questionForm.options.filter((o) => o.label.trim() !== "")
      : questionForm.tfValues;

  const handleAddQuestion = () => {
    if (!questionForm.text.trim()) return;

    // A recommended playlist is not tied to a case, so caseId stays null until
    // its questions are pulled into one.
    const q = new Question(
      uuidv4(),
      questionForm.text.trim(),
      questionForm.type,
      null,
      buildOptionsFromForm(),
    );

    setQuestions((prev) => [...prev, q]);
    closeQuestionModal();
  };

  const handleSaveEditedQuestion = () => {
    if (!questionForm.text.trim() || !editingQuestionId) return;

    const options = buildOptionsFromForm();

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

  const handleCreate = async () => {
    if (!userInfo?.token) {
      setSubmitError("You must be logged in to create a recommended playlist.");
      return;
    }

    if (!canCreate) {
      setSubmitError("Select a charge and add at least one question.");
      return;
    }

    setSubmitError("");
    setIsSubmitting(true);

    const recommendedPayload = {
      charge,
      questions: questions.map((q) =>
        normalizeQuestion({
          ...q,
          caseId: q.caseId || null,
          firstPoll: Boolean(q.firstPoll),
        }),
      ),
    };

    try {
      await createRecommended(recommendedPayload, userInfo.token);
      await fetchRecommendedNames(userInfo.token);
      setConfirmModal(false);
      navigate("/recommended");
    } catch (requestError) {
      setSubmitError(
        requestError?.response?.data?.message ||
          "Unable to create recommended playlist. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <React.Fragment>
      <TopNavbar warnOnHomeNavigation />

      <div className={styles.container}>
        <h1>Create Recommended Playlist</h1>
        <p className={styles.subtitle}>
          Available to every user whose case carries the matching charge.
        </p>

        {/* Charge */}
        <section className={styles.section}>
          <h2 className={styles.sectionHeading}>Charge</h2>

          <div className={styles.fieldStyle}>
            <label className={styles.labelStyle}>Charge</label>
            <select
              className={styles.inputStyle}
              value={charge}
              onChange={(e) => setCharge(e.target.value)}
            >
              <option value="">Select a charge...</option>
              {availableCharges.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          {availableCharges.length === 0 && (
            <p className={styles.helperText}>
              Every charge already has a recommended playlist.
            </p>
          )}
        </section>

        {/* Questions */}
        <section className={styles.section}>
          <h2 className={styles.sectionHeading}>Questions</h2>

          {questions.length === 0 && (
            <p className={styles.emptyText}>No questions added yet.</p>
          )}

          {questions.map((q, i) => (
            <div key={q.id} className={styles.questionItem}>
              <span className={styles.questionNumber}>{i + 1}.</span>
              <span className={styles.questionText}>{q.text}</span>
              <button onClick={() => openEditQuestionModal(q)} className={styles.editButton}>
                Edit
              </button>
              <button
                onClick={() => setDeleteQuestionId(q.id)}
                className={styles.deleteButton}
                aria-label="Delete question"
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

          <button onClick={openQuestionModal} className={styles.addQuestionButton}>
            + Add Question
          </button>
        </section>

        {/* Submit */}
        <button
          onClick={() => setConfirmModal(true)}
          className={styles.createButton}
          disabled={!canCreate}
        >
          Create
        </button>

        {submitError && !confirmModal && <p className={styles.errorText}>{submitError}</p>}

        {/* Add / Edit Question Modal */}
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
              value={questionForm.text}
              onChange={(e) => setQuestionForm((prev) => ({ ...prev, text: e.target.value }))}
              placeholder="Enter question..."
              autoFocus
            />
          </div>

          <div className={styles.fieldStyle}>
            <label className={styles.labelStyle}>Type</label>
            <select
              className={styles.inputStyle}
              value={questionForm.type}
              onChange={(e) => setQuestionForm((prev) => ({ ...prev, type: e.target.value }))}
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
                  <span>{String(opt.label)}</span>
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

          {!editingQuestionId && (
            <button
              onClick={handleAddQuestion}
              disabled={!questionForm.text.trim()}
              className={styles.questionModalAddButton}
            >
              Add Question
            </button>
          )}

          {editingQuestionId && (
            <div className={styles.questionModalEditButtons}>
              <button
                onClick={handleSaveEditedQuestion}
                disabled={!questionForm.text.trim()}
                className={styles.questionModalSaveButton}
              >
                Save
              </button>
              <button onClick={closeQuestionModal} className={styles.questionModalCancelButton}>
                Cancel
              </button>
            </div>
          )}
        </Modal>

        {/* Remove Question Modal */}
        <Modal
          isOpen={Boolean(deleteQuestionId)}
          onClose={() => setDeleteQuestionId(null)}
          title="Remove Question"
          hideDefaultClose
        >
          <p className={styles.confirmDeleteText}>
            Are you sure you want to remove this question from this recommended playlist?
          </p>
          <div className={styles.deleteConfirmButtons}>
            <button onClick={handleDeleteQuestion} className={styles.deleteYesButton}>
              Yes
            </button>
            <button onClick={() => setDeleteQuestionId(null)} className={styles.deleteNoButton}>
              No
            </button>
          </div>
        </Modal>

        {/* Confirmation Modal */}
        <Modal
          isOpen={confirmModal}
          onClose={() => setConfirmModal(false)}
          title="Recommended Playlist Summary"
        >
          <div className={styles.summaryBody}>
            <div>
              <strong>Charge:</strong> {charge || "—"}
            </div>
            <div>
              <strong>Created By:</strong> {userInfo?.username || "—"}
            </div>
            <div className={styles.summaryQuestionsHeading}>
              <strong>Questions ({questions.length}):</strong>
            </div>

            <div className={styles.summaryQuestions}>
              {questions.map((q, i) => (
                <div key={q.id} className={styles.summaryQuestion}>
                  <span className={styles.summaryQuestionText}>
                    {i + 1}. {q.text}
                    {q.options.length > 0 && (
                      <span className={styles.summaryOptions}>
                        {" "}
                        — {q.options.map((o) => `${o.label} (${o.value}pts)`).join(", ")}
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>

            {submitError && <p className={styles.errorText}>{submitError}</p>}

            <div className={styles.modalButtons}>
              <button
                type="button"
                className={styles.confirm}
                onClick={handleCreate}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Creating..." : "Accept"}
              </button>
              <button
                type="button"
                className={styles.decline}
                onClick={() => setConfirmModal(false)}
                disabled={isSubmitting}
              >
                Decline
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </React.Fragment>
  );
};

export default CreateRecommendedScreen;
