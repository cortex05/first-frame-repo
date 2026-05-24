import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import useCaseStore from '../../store/useCaseStore';
import Modal from '../../components/modal/Modal';
import Question from '../../types/polls/Question';
import { QuestionType } from '../../types/ENUMS';

import styles from './CaseScreen.module.css';

const EMPTY_QUESTION_FORM = {
  text: '',
  type: QuestionType.TRUE_FALSE,
  options: ['', '', '', ''],
};

const CaseScreen = () => {
  const { id } = useParams();
  const activeCase = useCaseStore((state) => state.cases.find((c) => c._id === id));
  const updateCase = useCaseStore((state) => state.updateCase);

  const [questionModal, setQuestionModal] = useState(false);
  const [questionForm, setQuestionForm] = useState(EMPTY_QUESTION_FORM);

  if (!activeCase) return <p>Case not found.</p>;

  const openQuestionModal = () => {
    setQuestionForm(EMPTY_QUESTION_FORM);
    setQuestionModal(true);
  };

  const handleOptionChange = (index, value) => {
    setQuestionForm((prev) => {
      const options = [...prev.options];
      options[index] = value;
      return { ...prev, options };
    });
  };

  const handleAddQuestion = () => {
    if (!questionForm.text.trim()) return;
    const options =
      questionForm.type === QuestionType.MULTIPLE_CHOICE
        ? questionForm.options.filter((o) => o.trim() !== '')
        : [];
    const q = new Question(uuidv4(), questionForm.text.trim(), questionForm.type, activeCase._id, options);
    updateCase({ ...activeCase, questions: [...activeCase.questions, q] });
    setQuestionModal(false);
  };

  const inputStyle = {
    padding: '10px 12px', fontSize: 15, border: '1px solid #ccc',
    borderRadius: 6, width: '100%', boxSizing: 'border-box',
  };

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: 32 }}>
      <h1 style={{ marginBottom: 24 }}>{activeCase.name}</h1>

      {/* Basic Info */}
      <section style={{ marginBottom: 32 }}>
        <h2 style={{ marginBottom: 16 }}>Basic Info</h2>

        <div>
			<p className={styles.label}>Name</p>
			<p className={styles.value}>{activeCase.name || '—'}</p>
		</div>
        <div>
			<p className={styles.label}>Author</p>
			<p className={styles.value}>{activeCase.author || '—'}</p>
		</div>
        <div>
			<p className={styles.label}>Location</p>
			<p className={styles.value}>{activeCase.location || '—'}</p>
		</div>
        <div>
			<p className={styles.label}>Number of Students</p>
			<p className={styles.value}>{activeCase.studentNumber || '—'}</p>
		</div>
        <div>
			<p className={styles.label}>Date / Time</p>
			<p className={styles.value}>{activeCase.dateCreated ? new Date(activeCase.dateCreated).toLocaleString() : '—'}</p>
		</div>
      </section>

      {/* Questions */}
      <section style={{ marginBottom: 32 }}>
        <h2 style={{ marginBottom: 12 }}>Questions</h2>

        {activeCase.questions.length === 0 && (
          <p style={{ color: '#888', fontSize: 14, marginBottom: 12 }}>No questions added yet.</p>
        )}

        {activeCase.questions.map((q, i) => (
          <div key={q.id} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 12px', marginBottom: 8,
            background: '#f5f8ff', border: '1px solid #c5d8f5',
            borderRadius: 6, fontSize: 14,
          }}>
            <span style={{ fontWeight: 600, color: '#2c6fad', minWidth: 24 }}>{i + 1}.</span>
            <span style={{ flex: 1 }}>{q.text}</span>
            <span style={{
              fontSize: 11, fontWeight: 600, padding: '2px 8px',
              background: q.type === QuestionType.TRUE_FALSE ? '#e6f4ea' : '#fff3cd',
              color: q.type === QuestionType.TRUE_FALSE ? '#2e7d32' : '#856404',
              borderRadius: 12,
            }}>
              {q.type === QuestionType.TRUE_FALSE ? 'T/F' : 'MC'}
            </span>
          </div>
        ))}

        <button
          onClick={openQuestionModal}
          style={{
            marginTop: 8, padding: '10px 20px', fontSize: 15,
            background: '#4a90d9', color: '#fff',
            border: 'none', borderRadius: 6, cursor: 'pointer',
          }}
        >
          + Add Question
        </button>
      </section>

      {/* Start link */}
      <Link
        to="/start"
        style={{
          display: 'inline-block', padding: '14px 36px',
          fontSize: 17, fontWeight: 600,
          background: '#2c6fad', color: '#fff',
          borderRadius: 8, textDecoration: 'none',
        }}
      >
        Start Session
      </Link>

      {/* Add Question Modal */}
      <Modal isOpen={questionModal} onClose={() => setQuestionModal(false)} title="Add Question">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#444' }}>Question Text</label>
          <input
            style={inputStyle}
            type="text"
            value={questionForm.text}
            onChange={(e) => setQuestionForm((prev) => ({ ...prev, text: e.target.value }))}
            placeholder="Enter question..."
            autoFocus
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#444' }}>Type</label>
          <select
            style={inputStyle}
            value={questionForm.type}
            onChange={(e) => setQuestionForm((prev) => ({ ...prev, type: e.target.value }))}
          >
            <option value={QuestionType.TRUE_FALSE}>True / False</option>
            <option value={QuestionType.MULTIPLE_CHOICE}>Multiple Choice</option>
          </select>
        </div>

        {questionForm.type === QuestionType.MULTIPLE_CHOICE && (
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#444', display: 'block', marginBottom: 8 }}>
              Options (up to 4)
            </label>
            {questionForm.options.map((opt, i) => (
              <input
                key={i}
                style={{ ...inputStyle, marginBottom: 8 }}
                type="text"
                value={opt}
                onChange={(e) => handleOptionChange(i, e.target.value)}
                placeholder={`Option ${i + 1}`}
              />
            ))}
          </div>
        )}

        <button
          onClick={handleAddQuestion}
          disabled={!questionForm.text.trim()}
          style={{
            width: '100%', padding: '12px 0', fontSize: 15, fontWeight: 600,
            background: questionForm.text.trim() ? '#4a90d9' : '#aaa',
            color: '#fff', border: 'none', borderRadius: 6, marginBottom: 8,
            cursor: questionForm.text.trim() ? 'pointer' : 'not-allowed',
          }}
        >
          Add Question
        </button>
      </Modal>
    </div>
  );
};

export default CaseScreen;