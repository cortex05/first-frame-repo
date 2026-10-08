import { useId, useState } from 'react';

import { STUDENT_DETAIL_LIMITS, StudentGender } from '../../types/ENUMS';
import {
  DETAIL_FIELDS,
  formatDetail,
  getStudentDetails,
  toDetailsPayload,
  toDraft,
  validateStudentDetails,
} from '../../utils/studentDetails';
import {
  RISK_LABELS,
  formatAnswerLabel,
  getAnswer,
  getAnswerTier,
  getReportStudentNumbers,
  getRiskTiers,
  getStudentTotal,
} from '../../utils/studentScores';

import styles from './StudentReportModal.module.css';

/**
 * One student's live report: their optional details (editable) and every
 * question with the answer they gave and its points. Shared by CaseScreen and
 * QuestionsScreen.
 *
 * `onSaveDetails(payload)` must return a promise; a rejection keeps the form
 * open and shows the server's message. The parent mounts this only while it is
 * open, so reopening always starts in read mode.
 */
const StudentReportModal = ({ activeCase, studentNumber, onClose, onSaveDetails }) => {
  const idPrefix = useId();
  const details = getStudentDetails(activeCase, studentNumber);
  const total = getStudentTotal(activeCase, studentNumber);
  // Banded over the same students as the Scores view and the archive report,
  // so the badge matches the student's color there. Unseated students have none.
  const risk = getRiskTiers(activeCase, getReportStudentNumbers(activeCase)).get(Number(studentNumber));

  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(() => toDraft(details));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const startEditing = () => {
    setDraft(toDraft(details));
    setError('');
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setError('');
    setIsEditing(false);
  };

  const handleSave = async () => {
    const validationError = validateStudentDetails(draft);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    setIsSaving(true);
    try {
      await onSaveDetails(toDetailsPayload(draft));
      setIsEditing(false);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Unable to save student details.');
    } finally {
      setIsSaving(false);
    }
  };

  const setField = (key) => (event) => setDraft((prev) => ({ ...prev, [key]: event.target.value }));

  const renderInput = (key, inputId) => {
    if (key === 'gender') {
      return (
        <select id={inputId} className={styles.input} value={draft.gender} onChange={setField('gender')}>
          <option value="">?</option>
          <option value={StudentGender.MALE}>Male</option>
          <option value={StudentGender.FEMALE}>Female</option>
        </select>
      );
    }

    if (key === 'age') {
      return (
        <input
          id={inputId}
          className={styles.input}
          type="number"
          inputMode="numeric"
          min={STUDENT_DETAIL_LIMITS.AGE_MIN}
          max={STUDENT_DETAIL_LIMITS.AGE_MAX}
          step={1}
          value={draft.age}
          onChange={setField('age')}
        />
      );
    }

    return (
      <input
        id={inputId}
        className={styles.input}
        type="text"
        maxLength={key === 'occupation' ? STUDENT_DETAIL_LIMITS.OCCUPATION_MAX : STUDENT_DETAIL_LIMITS.RACE_MAX}
        value={draft[key]}
        onChange={setField(key)}
      />
    );
  };

  return (
    <div className={styles.backdrop}>
      <div className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby={`${idPrefix}-title`}>
        <div className={styles.header}>
          <div className={styles.titleGroup}>
            <h3 id={`${idPrefix}-title`} className={styles.title}>
              Student Report - #{studentNumber} = {total} Points
            </h3>
            {risk && (
              <span className={`${styles.riskBadge} ${styles[`risk_${risk}`]}`}>
                Risk: {RISK_LABELS[risk]}
              </span>
            )}
          </div>
          <button type="button" className={styles.close} aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className={styles.body}>
          <dl className={styles.details}>
            {DETAIL_FIELDS.map(({ key, label }) => {
              const inputId = `${idPrefix}-${key}`;
              return (
                <div key={key} className={styles.detailRow}>
                  <dt className={styles.detailLabel}>
                    {isEditing ? <label htmlFor={inputId}>{label}</label> : label}
                  </dt>
                  <dd className={styles.detailValue}>
                    {isEditing ? renderInput(key, inputId) : formatDetail(key, details[key])}
                  </dd>
                </div>
              );
            })}
          </dl>

          <ul className={styles.answers}>
            {(activeCase.questions || []).map((question) => {
              const answer = getAnswer(activeCase, question.id, studentNumber);
              const hasValue = answer?.value !== null && answer?.value !== undefined;
              const tier = hasValue ? getAnswerTier(question, answer) : null;

              return (
                <li key={question.id} className={styles.answerRow}>
                  <span className={styles.answerText}>
                    {question.text} - {formatAnswerLabel(question, answer)}
                  </span>
                  <span className={`${styles.points} ${tier ? styles[`risk_${tier}`] : styles.pointsEmpty}`}>
                    {hasValue ? answer.value : 'N/A'}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}

        <div className={styles.footer}>
          {isEditing ? (
            <>
              <button type="button" className={styles.save} onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save'}
              </button>
              <button type="button" className={styles.cancel} onClick={cancelEditing} disabled={isSaving}>
                Cancel
              </button>
            </>
          ) : (
            <button type="button" className={styles.edit} onClick={startEditing}>
              Edit
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentReportModal;
