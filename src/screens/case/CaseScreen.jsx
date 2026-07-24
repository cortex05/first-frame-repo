import React, { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import useCaseStore from "../../store/useCaseStore";
import Modal from "../../components/modal/Modal";
import TopNavbar from "../../components/top-navbar/TopNavbar";
import Question from "../../types/polls/Question";
import { QuestionType } from "../../types/ENUMS";
import { EMPTY_QUESTION_FORM } from "../../utils/formUtils";

import styles from "./CaseScreen.module.css";

const CaseScreen = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const activeCase = useCaseStore((state) =>
    state.cases.find((c) => c._id === id),
  );
  const setActiveCase = useCaseStore((state) => state.setActiveCase);
  const updateCase = useCaseStore((state) => state.updateCase);

  const [questionModal, setQuestionModal] = useState(false);
  const [questionForm, setQuestionForm] = useState(EMPTY_QUESTION_FORM);
  const [editingQuestionId, setEditingQuestionId] = useState(null);
  const [deleteQuestionId, setDeleteQuestionId] = useState(null);

  const [startModal, setStartModal] = useState(false);
  const [editStudentNumber, setEditStudentNumber] = useState(false);
  const [numberOfStudents, setNumberOfStudents] = useState(
    activeCase ? activeCase.studentNumber : 0,
  );

  if (!activeCase) return <p>Case not found.</p>;

  const handleStart = () => {
    setStartModal(false);
    setActiveCase(activeCase._id);
    navigate(`/start/${activeCase._id}`);
  };

  const handleNumberOfStudentsChange = () => {
    updateCase({ ...activeCase, studentNumber: Number(numberOfStudents) });
    localStorage.setItem(
      "cases",
      JSON.stringify(useCaseStore.getState().cases),
    );
    setEditStudentNumber(false);
  };

  const persistCaseUpdate = (updatedCase) => {
    updateCase(updatedCase);
    localStorage.setItem(
      "cases",
      JSON.stringify(useCaseStore.getState().cases),
    );
  };

  const openQuestionModal = () => {
    setQuestionForm(EMPTY_QUESTION_FORM);
    setEditingQuestionId(null);
    setQuestionModal(true);
  };

  const closeQuestionModal = () => {
    setQuestionModal(false);
    setEditingQuestionId(null);
    setQuestionForm(EMPTY_QUESTION_FORM);
  };

  const openEditQuestionModal = (question) => {
    if (question.type === QuestionType.MULTIPLE_CHOICE) {
      const mcOptions = question.options.map((opt) => ({
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
      const trueOption = question.options.find(
        (opt) => opt.label === true || opt.label === "true",
      );
      const falseOption = question.options.find(
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
      activeCase._id,
      options,
    );
    persistCaseUpdate({
      ...activeCase,
      questions: [...activeCase.questions, q],
    });
    closeQuestionModal();
  };

  const handleSaveEditedQuestion = () => {
    if (!questionForm.text.trim() || !editingQuestionId) return;
    const options =
      questionForm.type === QuestionType.MULTIPLE_CHOICE
        ? questionForm.options.filter((o) => o.label.trim() !== "")
        : questionForm.tfValues;

    const updatedQuestions = activeCase.questions.map((q) => {
      if (q.id !== editingQuestionId) return q;
      return {
        ...q,
        text: questionForm.text.trim(),
        type: questionForm.type,
        options,
      };
    });

    persistCaseUpdate({ ...activeCase, questions: updatedQuestions });
    closeQuestionModal();
  };

  const handleDeleteQuestion = () => {
    if (!deleteQuestionId) return;

    const updatedQuestions = activeCase.questions.filter(
      (q) => q.id !== deleteQuestionId,
    );
    const updatedAnswers = { ...(activeCase.answers || {}) };
    delete updatedAnswers[deleteQuestionId];

    persistCaseUpdate({
      ...activeCase,
      questions: updatedQuestions,
      answers: updatedAnswers,
    });

    setDeleteQuestionId(null);
  };

  return (
    <React.Fragment>
      <TopNavbar />

      <div style={{ maxWidth: 640, margin: "0 auto", padding: 32 }}>
        <h1 style={{ marginBottom: 32 }}>{activeCase.name}</h1>

      {/* Basic Info */}
      <section style={{ marginBottom: 32 }} className={styles.infoSection}>
        <p className={styles.value}>Owner: {activeCase.author || "—"}</p>
        <p className={styles.value}>Crime Type: {activeCase.crimeType || "—"}</p>
        <p className={styles.value}>Location: {activeCase.location || "—"}</p>
        <p className={styles.value}>
          Number of Students: {activeCase.studentNumber || "—"}
        </p>
        <div>
          <p className={styles.value}>
            Date & Time:{" "}
            {activeCase.caseDate
              ? new Date(activeCase.caseDate).toLocaleString()
              : "—"}
          </p>
        </div>
      </section>

      {/* Questions */}
      <section style={{ marginBottom: 32 }}>
        <h2 style={{ marginBottom: 12 }}>Questions</h2>

        {activeCase.questions.length === 0 && (
          <p style={{ color: "#888", fontSize: 14, marginBottom: 12 }}>
            No questions added yet.
          </p>
        )}

        {activeCase.questions.map((q, i) => (
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
            <span style={{ flex: 1 }}>{q.text}</span>
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
          style={{
            marginTop: 8,
            padding: "10px 20px",
            fontSize: 15,
            background: "#4a90d9",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
          }}
        >
          + Add Question
        </button>
      </section>

      {/* Start link */}
      {!activeCase.seated && (
        <button
          onClick={() => setStartModal(true)}
          style={{
            display: "inline-block",
            padding: "14px 36px",
            fontSize: 17,
            fontWeight: 600,
            background: "#2c6fad",
            color: "#fff",
            borderRadius: 8,
            textDecoration: "none",
          }}
        >
          Start Session
        </button>
      )}

      {/* questions link */}
      {activeCase.seated && (
        <Link to={`/questions/${activeCase._id}`}>
          <button
            // onClick={() => setStartModal(true)}
            style={{
              display: "inline-block",
              padding: "14px 36px",
              fontSize: 17,
              fontWeight: 600,
              background: "#2c6fad",
              color: "#fff",
              borderRadius: 8,
              textDecoration: "none",
            }}
          >
            Access Questions
          </button>
        </Link>
      )}

      {/* Add/Edit Question Modal */}
      <Modal
        isOpen={questionModal}
        onClose={closeQuestionModal}
        title={editingQuestionId ? "Edit Question" : "Add Question"}
        hideDefaultClose={Boolean(editingQuestionId)}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
            marginBottom: 16,
          }}
        >
          <label style={{ fontSize: 13, fontWeight: 600, color: "#444" }}>
            Question Text
          </label>
          <textarea
            className={styles.inputStyle}
            type="text"
            value={questionForm.text}
            onChange={(e) =>
              setQuestionForm((prev) => ({ ...prev, text: e.target.value }))
            }
            placeholder="Enter question..."
            autoFocus
          />
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
            marginBottom: 16,
          }}
        >
          <label style={{ fontSize: 13, fontWeight: 600, color: "#444" }}>
            Type
          </label>
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
          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "#444",
                display: "block",
                marginBottom: 8,
              }}
            >
              Point Values
            </label>
            <div style={{display: 'flex', flexDirection: "row"}}>
              {questionForm.tfValues.map((opt, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 8,
                }}
              >
                <span style={{ minWidth: 52, fontSize: 14, fontWeight: 600 }}>
                  {String(opt.label)}:
                </span>
                <input
                  className={styles.inputStyle}
                  style={{ width: 80 }}
                  type="number"
                  value={opt.value}
                  onChange={(e) => handleTFValueChange(i, e.target.value)}
                  placeholder="Points"
                />
              </div>
            ))}
            </div>
            
          </div>
        )}

        {questionForm.type === QuestionType.MULTIPLE_CHOICE && (
          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "#444",
                display: "block",
                marginBottom: 8,
              }}
            >
              Options (up to 4)
            </label>
            {questionForm.options.map((opt, i) => (
              <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <input
                  className={styles.inputStyle}
                  style={{ flex: 1 }}
                  type="text"
                  value={opt.label}
                  onChange={(e) =>
                    handleOptionChange(i, "label", e.target.value)
                  }
                  placeholder={`Option ${i + 1}`}
                />
                <input
                  className={styles.inputStyle}
                  style={{ width: 80 }}
                  type="number"
                  value={opt.value}
                  onChange={(e) =>
                    handleOptionChange(i, "value", e.target.value)
                  }
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

      {/* Delete Question Confirmation Modal */}
      <Modal
        isOpen={Boolean(deleteQuestionId)}
        onClose={() => setDeleteQuestionId(null)}
        title="Remove Question"
        hideDefaultClose
      >
        <p style={{ marginBottom: 20 }}>
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

        {/* Start Session Modal */}
        <Modal
          isOpen={startModal}
          onClose={() => setStartModal(false)}
          title="Start Session"
        >
          {!editStudentNumber ? (
            <div className={styles.startModal}>
              <p style={{ marginBottom: 16 }}>
                You are moving to assign the students to their rows and tables.
              </p>
              <p style={{ marginBottom: 24 }}>
                Currently this case is set for {activeCase.studentNumber}
              </p>
              <p style={{ marginBottom: 16 }}>Is this correct?</p>
              <div className={styles.startModalButtons}>
                <button onClick={handleStart} className={styles.confirm}>
                  Yes
                </button>
                <button
                  onClick={() => setEditStudentNumber(true)}
                  className={styles.decline}
                >
                  No
                </button>
              </div>
            </div>
          ) : (
            <div className={styles.startModal}>
              <p style={{ marginBottom: 8 }}>
                How many students are in this case?
              </p>
              <div className={styles.fieldStyle}>
                <label className={styles.labelStyle}>Number of Students:</label>
                <input
                  className={styles.inputStyle}
                  type="number"
                  min={1}
                  value={numberOfStudents}
                  onChange={(e) => setNumberOfStudents(e.target.value)}
                  placeholder="e.g. 30"
                />
              </div>
              <div className={styles.startModalButtons}>
                <button
                  onClick={() => handleNumberOfStudentsChange()}
                  className={styles.confirm}
                >
                  Confirm
                </button>
                <button
                  onClick={() => setEditStudentNumber(false)}
                  className={styles.decline}
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

export default CaseScreen;
