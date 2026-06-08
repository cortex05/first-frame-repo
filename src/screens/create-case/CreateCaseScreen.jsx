import React, { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import styles from "./CreateCaseScreen.module.css";
import { useNavigate } from "react-router-dom";

import Modal from "../../components/modal/Modal";
import useCaseStore from "../../store/useCaseStore";

import Question from "../../types/polls/Question";
import Case from "../../types/Case";
import { QuestionType } from "../../types/ENUMS";
import { EMPTY_QUESTION_FORM } from "../../utils/formUtils";

const CreateCaseScreen = () => {
	const navigate = useNavigate();
  	const [caseId] = useState(() => uuidv4());

  	const [name, setName] = useState("");
  	const [author, setAuthor] = useState("");
  	const [location, setLocation] = useState("");
  	const [numberOfStudents, setNumberOfStudents] = useState("");
  	const [dateTime, setDateTime] = useState("");

  const [questions, setQuestions] = useState([]);
  const [questionModal, setQuestionModal] = useState(false);
  const [questionForm, setQuestionForm] = useState(EMPTY_QUESTION_FORM);

  const [previewModal, setPreviewModal] = useState(false);

  const addCase = useCaseStore((state) => state.addCase);
  const setActiveCase = useCaseStore((state) => state.setActiveCase);

  const openQuestionModal = () => {
    setQuestionForm(EMPTY_QUESTION_FORM);
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
    setQuestionModal(false);
  };

  const handleSubmit = () => {
    const createdCase = new Case(caseId, name, author, location, numberOfStudents, dateTime, questions);
    const casesArray = JSON.parse(localStorage.getItem('cases')) || [];
    casesArray.push(createdCase);

    localStorage.setItem('cases', JSON.stringify(casesArray));
	  
    addCase(createdCase);
	  setActiveCase(caseId);
    setPreviewModal(false);
    navigate(`/case/${caseId}`);
  };

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: 32 }}>
      <h1 style={{ marginBottom: 24 }}>Create New Case</h1>

      {/* Basic Info */}
      <section style={{ marginBottom: 32 }}>
        <h2 style={{ marginBottom: 16 }}>Basic Info</h2>

        <div className={styles.fieldStyle}>
          <label className={styles.labelStyle}>Name</label>
          <input
            className={styles.inputStyle}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Case name"
          />
        </div>

        <div className={styles.fieldStyle}>
          <label className={styles.labelStyle}>Author</label>
          <input
            className={styles.inputStyle}
            type="text"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="Your name"
          />
        </div>

        <div className={styles.fieldStyle}>
          <label className={styles.labelStyle}>Location</label>
          <input
            className={styles.inputStyle}
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Room / building"
          />
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

        <div className={styles.fieldStyle}>
          <label className={styles.labelStyle}>Date / Time</label>
          <input
            className={styles.inputStyle}
            type="datetime-local"
            value={dateTime}
            onChange={(e) => setDateTime(e.target.value)}
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
            <span style={{ flex: 1 }}>{q.text}</span>
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

      {/* Submit */}
      <button
        onClick={() => setPreviewModal(true)}
        style={{
          padding: "14px 36px",
          fontSize: 17,
          fontWeight: 600,
          background: "#2c6fad",
          color: "#fff",
          border: "none",
          borderRadius: 8,
          cursor: "pointer",
        }}
      >
        Submit Case
      </button>

      {/* Add Question Modal */}
      <Modal
        isOpen={questionModal}
        onClose={() => setQuestionModal(false)}
        title="Add Question"
      >
        <div className={styles.fieldStyle}>
          <label className={styles.labelStyle}>Question Text</label>
          <input
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
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ minWidth: 52, fontSize: 14, fontWeight: 600 }}>{String(opt.label)}</span>
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

        <button
          onClick={handleAddQuestion}
          disabled={!questionForm.text.trim()}
          style={{
            width: "100%",
            padding: "12px 0",
            fontSize: 15,
            fontWeight: 600,
            background: questionForm.text.trim() ? "#4a90d9" : "#aaa",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            marginBottom: 8,
            cursor: questionForm.text.trim() ? "pointer" : "not-allowed",
          }}
        >
          Add Question
        </button>
      </Modal>

      {/* Preview / Submit Modal */}
      <Modal
        isOpen={previewModal}
        onClose={() => setPreviewModal(false)}
        title="Case Summary"
      >
        <div style={{ fontSize: 14, marginBottom: 16, lineHeight: 1.8 }}>
          <div>
            <strong>Name:</strong> {name || "—"}
          </div>
          <div>
            <strong>Author:</strong> {author || "—"}
          </div>
          <div>
            <strong>Location:</strong> {location || "—"}
          </div>
          <div>
            <strong>Students:</strong> {numberOfStudents || "—"}
          </div>
          <div>
            <strong>Date / Time:</strong> {dateTime ? new Date(dateTime).toLocaleString() : "—"}
          </div>
          <div style={{ marginTop: 12 }}>
            <strong>Questions ({questions.length}):</strong>
          </div>
          {questions.length === 0 && <div style={{ color: "#888" }}>None</div>}
          {questions.map((q, i) => (
            <div key={q.id} style={{ marginLeft: 12, color: "#333" }}>
              {i + 1}. [{q.type === QuestionType.TRUE_FALSE ? "T/F" : "MC"}]{" "}
              {q.text}
              {q.options.length > 0 && (
                  <span style={{ color: "#666" }}>
                    {" "}
                    — {q.options.map((o) => `${o.label} (${o.value}pts)`).join(", ")}
                  </span>
                )}
            </div>
          ))}
          <button onClick={() => handleSubmit()} className={styles.linkButton}>
            Create Case
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default CreateCaseScreen;
