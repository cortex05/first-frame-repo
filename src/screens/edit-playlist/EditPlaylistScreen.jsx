import React, { useEffect, useId, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';

import Modal from '../../components/modal/Modal';
import TopNavbar from '../../components/top-navbar/TopNavbar';

import useAuthStore from '../../store/useAuthStore';

import Question from '../../types/polls/Question';
import { QuestionType } from '../../types/ENUMS';
import { EMPTY_QUESTION_FORM } from '../../utils/formUtils';
import { normalizeQuestion } from '../../utils/questionNormalization';

import { getPlaylistById, updatePlaylist } from '../../api/playlist';

// Same layout as Make Playlist, so the two screens can't drift apart visually.
import styles from '../make-playlist/MakePlaylistScreen.module.css';
import usePageTitle from '../../hooks/usePageTitle';
import useFormError from '../../hooks/useFormError';
import FormError from '../../components/form-error/FormError';

export const UNSAVED_WARNING = 'Unsaved changes will be lost. Do you wish to proceed?';

/**
 * Edits an account playlist (spec 022, account admins only). Every change --
 * title, added, edited or removed questions -- stays in local state; the only
 * write is the single PATCH sent by Update Playlist.
 */
const EditPlaylistScreen = () => {
  const { playlistId } = useParams();
  const navigate = useNavigate();

  const userInfo = useAuthStore((state) => state.userInfo);
  const fetchUserPlaylists = useAuthStore((state) => state.fetchUserPlaylists);

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  usePageTitle('Edit Question Playlist', { ready: !isLoading });

  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState([]);

  const [questionModal, setQuestionModal] = useState(false);
  const [questionForm, setQuestionForm] = useState(EMPTY_QUESTION_FORM);
  const idPrefix = useId();
  const [editingQuestionId, setEditingQuestionId] = useState(null);
  const [deleteQuestionId, setDeleteQuestionId] = useState(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const formError = useFormError();

  useEffect(() => {
    if (!userInfo?.token) return;

    let cancelled = false;

    const loadPlaylist = async () => {
      setIsLoading(true);
      setLoadError('');

      try {
        const playlist = await getPlaylistById(playlistId, userInfo.token);
        if (cancelled) return;

        if (!playlist) {
          setLoadError('Playlist not found.');
        } else {
          setTitle(playlist.title || '');
          setQuestions(playlist.questions || []);
        }
      } catch (requestError) {
        if (cancelled) return;
        setLoadError(
          requestError?.response?.data?.message || 'Unable to load this playlist.'
        );
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    loadPlaylist();

    return () => {
      cancelled = true;
    };
  }, [playlistId, userInfo?.token]);

  const editingQuestion = useMemo(
    () => questions.find((q) => q.id === editingQuestionId) || null,
    [questions, editingQuestionId]
  );

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
      const mcOptions = (question.options || []).map((opt) => ({
        label: opt.label || '',
        value: Number(opt.value) || 0,
      }));

      while (mcOptions.length < 4) {
        mcOptions.push({ label: '', value: 0 });
      }

      setQuestionForm({
        text: question.text || '',
        type: QuestionType.MULTIPLE_CHOICE,
        options: mcOptions.slice(0, 4),
        tfValues: [
          { label: true, value: 3 },
          { label: false, value: 0 },
        ],
      });
    } else {
      const trueOption = (question.options || []).find(
        (opt) => opt.label === true || opt.label === 'true'
      );
      const falseOption = (question.options || []).find(
        (opt) => opt.label === false || opt.label === 'false'
      );

      setQuestionForm({
        text: question.text || '',
        type: QuestionType.TRUE_FALSE,
        options: [
          { label: '', value: 0 },
          { label: '', value: 0 },
          { label: '', value: 0 },
          { label: '', value: 0 },
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
        [field]: field === 'value' ? Number(value) : value,
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
      ? questionForm.options.filter((o) => String(o.label).trim() !== '')
      : questionForm.tfValues;

  const handleAddQuestion = () => {
    if (!questionForm.text.trim()) return;

    const q = new Question(
      uuidv4(),
      questionForm.text.trim(),
      questionForm.type,
      buildOptionsFromForm()
    );

    setQuestions((prev) => [...prev, q]);
    closeQuestionModal();
  };

  // Local only: the question keeps its id, nothing is sent until Update Playlist.
  const handleSaveEditedQuestion = () => {
    if (!questionForm.text.trim() || !editingQuestionId) return;

    const options = buildOptionsFromForm();

    setQuestions((prev) =>
      prev.map((q) =>
        q.id !== editingQuestionId
          ? q
          : { ...q, text: questionForm.text.trim(), type: questionForm.type, options }
      )
    );
    closeQuestionModal();
  };

  const handleDeleteQuestion = () => {
    if (!deleteQuestionId) return;
    setQuestions((prev) => prev.filter((q) => q.id !== deleteQuestionId));
    setDeleteQuestionId(null);
  };

  const handleUpdatePlaylist = async () => {
    if (isSubmitting) return;

    if (!userInfo?.token) {
      formError.setError('You must be logged in to update a playlist.');
      return;
    }

    if (!title.trim()) {
      formError.setError('Please provide a playlist title.', [`${idPrefix}-title`]);
      return;
    }

    formError.clear();
    setIsSubmitting(true);

    try {
      await updatePlaylist(
        playlistId,
        { title: title.trim(), questions: questions.map(normalizeQuestion) },
        userInfo.token
      );
      await fetchUserPlaylists(userInfo.token);
      navigate('/dashboard');
    } catch (requestError) {
      formError.setError(
        requestError?.response?.data?.message || 'Unable to update playlist. Please try again.'
      );
      setIsSubmitting(false);
    }
  };

  const navbar = <TopNavbar warnOnHomeNavigation navigationWarning={UNSAVED_WARNING} />;

  if (isLoading) {
    return (
      <React.Fragment>
        {navbar}
        <main className={styles.container}>
          <p className={styles.statusText}>Loading playlist...</p>
        </main>
      </React.Fragment>
    );
  }

  if (loadError) {
    return (
      <React.Fragment>
        {navbar}
        <main className={styles.container}>
          <p className={styles.errorText} role="alert">
            {loadError}
          </p>
          <Link to="/dashboard" className={styles.backLink}>
            Back to Dashboard
          </Link>
        </main>
      </React.Fragment>
    );
  }

  return (
    <React.Fragment>
      {navbar}

      <main className={styles.container}>
        <h1 style={{ marginBottom: 32 }}>Edit Question Playlist</h1>

        <section style={{ marginBottom: 32 }}>
          <label className={styles.labelStyle} htmlFor={`${idPrefix}-title`}>Title</label>
          <input
            id={`${idPrefix}-title`}
            {...formError.fieldProps(`${idPrefix}-title`)}
            className={styles.inputStyle}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Playlist title"
            maxLength={80}
          />
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ marginBottom: 12 }}>Questions</h2>

          {questions.length === 0 && (
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 12 }}>
              No questions added yet.
            </p>
          )}

          {questions.map((q, i) => (
            <div
              key={q.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 12px',
                marginBottom: 8,
                background: 'var(--surface-subtle)',
                border: '1px solid var(--light-blue-background)',
                borderRadius: 6,
                fontSize: 14,
              }}
            >
              <span style={{ fontWeight: 600, color: 'var(--modal-text)', minWidth: 24 }}>
                {i + 1}.
              </span>
              <span style={{ flex: 1, color: 'var(--modal-text)' }}>{q.text}</span>

              <button
                type="button"
                onClick={() => openEditQuestionModal(q)}
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  padding: '4px 8px',
                  background: 'var(--orange-edit)',
                  color: 'var(--text-on-bright-fill)',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer',
                }}
              >
                Edit
              </button>

              <button
                type="button"
                onClick={() => setDeleteQuestionId(q.id)}
                style={{
                  width: 24,
                  height: 24,
                  fontSize: 13,
                  fontWeight: 700,
                  padding: 0,
                  background: 'var(--decline)',
                  color: 'var(--light-text)',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer',
                  lineHeight: 1,
                }}
                aria-label="Delete question"
              >
                X
              </button>

              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  padding: '2px 8px',
                  background:
                    q.type === QuestionType.TRUE_FALSE ? 'var(--tf-bg)' : 'var(--warning-bg)',
                  color:
                    q.type === QuestionType.TRUE_FALSE ? 'var(--tf-text)' : 'var(--warning-text)',
                  borderRadius: 12,
                }}
              >
                {q.type === QuestionType.TRUE_FALSE ? 'T/F' : 'MC'}
              </span>
            </div>
          ))}

          <button type="button" onClick={openQuestionModal} className={styles.addQuestionButton}>
            + Add Question
          </button>
        </section>

        <FormError
          id={formError.messageId}
          message={formError.message}
          version={formError.version}
          style={{ color: 'var(--error-text-light)', fontSize: 14, marginBottom: 12 }}
        />

        <div>
          <button
            type="button"
            onClick={handleUpdatePlaylist}
            disabled={isSubmitting}
            style={{
              display: 'inline-block',
              padding: '14px 36px',
              fontSize: 17,
              fontWeight: 600,
              background: 'var(--blue-background)',
              color: 'var(--light-text)',
              borderRadius: 8,
              textDecoration: 'none',
              border: 'none',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              opacity: isSubmitting ? 0.75 : 1,
              marginRight: 12,
            }}
          >
            {isSubmitting ? 'Updating Playlist...' : 'Update Playlist'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            style={{
              display: 'inline-block',
              padding: '14px 36px',
              fontSize: 17,
              fontWeight: 600,
              background: 'var(--decline)',
              color: 'var(--light-text)',
              borderRadius: 8,
              textDecoration: 'none',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        </div>
      </main>

      <Modal
        isOpen={questionModal}
        onClose={closeQuestionModal}
        title={editingQuestion ? 'Edit Question' : 'Add Question'}
        hideDefaultClose={Boolean(editingQuestion)}
      >
        <div className={styles.fieldStyle}>
          <label htmlFor={`${idPrefix}-q-text`} className={styles.fieldLabel}>Question Text</label>
          <textarea
            id={`${idPrefix}-q-text`}
            className={styles.inputStyle}
            value={questionForm.text}
            onChange={(e) => setQuestionForm((prev) => ({ ...prev, text: e.target.value }))}
            placeholder="Enter question..."
            autoFocus
          />
        </div>

        <div className={styles.fieldStyle}>
          <label htmlFor={`${idPrefix}-q-type`} className={styles.fieldLabel}>Type</label>
          <select
            id={`${idPrefix}-q-type`}
            className={styles.inputStyle}
            value={questionForm.type}
            onChange={(e) => setQuestionForm((prev) => ({ ...prev, type: e.target.value }))}
          >
            <option value={QuestionType.TRUE_FALSE}>True / False</option>
            <option value={QuestionType.MULTIPLE_CHOICE}>Multiple Choice</option>
          </select>
        </div>

        {questionForm.type === QuestionType.TRUE_FALSE && (
          <div role="group" aria-labelledby={`${idPrefix}-q-points`} style={{ marginBottom: 16 }}>
            <span
              id={`${idPrefix}-q-points`}
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--text-secondary)',
                display: 'block',
                marginBottom: 8,
              }}
            >
              Point Values
            </span>
            <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
              {questionForm.tfValues.map((opt, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 8,
                    color: 'var(--modal-text)',
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
                    aria-label={`${String(opt.label) === 'true' ? 'True' : 'False'} points`}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {questionForm.type === QuestionType.MULTIPLE_CHOICE && (
          <div role="group" aria-labelledby={`${idPrefix}-q-options`} style={{ marginBottom: 16 }}>
            <span
              id={`${idPrefix}-q-options`}
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--text-secondary)',
                display: 'block',
                marginBottom: 8,
              }}
            >
              Options (up to 4)
            </span>
            {questionForm.options.map((opt, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input
                  className={styles.inputStyle}
                  style={{ flex: 1 }}
                  type="text"
                  value={opt.label}
                  onChange={(e) => handleOptionChange(i, 'label', e.target.value)}
                  placeholder={`Option ${i + 1}`}
                  aria-label={`Option ${i + 1}`}
                />
                <input
                  className={styles.inputStyle}
                  style={{ width: 80 }}
                  type="number"
                  value={opt.value}
                  onChange={(e) => handleOptionChange(i, 'value', e.target.value)}
                  placeholder="Points"
                  aria-label={`Option ${i + 1} points`}
                />
              </div>
            ))}
          </div>
        )}

        {!editingQuestion && (
          <button
            type="button"
            onClick={handleAddQuestion}
            disabled={!questionForm.text.trim()}
            style={{
              width: '100%',
              padding: '12px 0',
              fontSize: 15,
              fontWeight: 600,
              background: questionForm.text.trim() ? 'var(--confirm)' : 'var(--grey-disabled)',
              color: 'var(--light-text)',
              border: 'none',
              borderRadius: 6,
              marginBottom: 8,
              cursor: questionForm.text.trim() ? 'pointer' : 'not-allowed',
            }}
          >
            Add Question
          </button>
        )}

        {editingQuestion && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <button
              type="button"
              onClick={handleSaveEditedQuestion}
              disabled={!questionForm.text.trim()}
              className={styles.editModalSave}
              style={{
                flex: 1,
                padding: '12px 0',
                fontSize: 15,
                fontWeight: 600,
                background: questionForm.text.trim()
                  ? 'var(--confirm)'
                  : 'var(--grey-disabled)',
                color: 'var(--light-text)',
                border: 'none',
                borderRadius: 6,
                cursor: questionForm.text.trim() ? 'pointer' : 'not-allowed',
                transition: "box-shadow 0.5s ease, color 0.5s ease",
              }}
            >
              Save
            </button>
            <button
              type="button"
              onClick={closeQuestionModal}
              style={{
                flex: 1,
                padding: '12px 0',
                fontSize: 15,
                fontWeight: 600,
                background: 'var(--decline)',
                color: 'var(--light-text)',
                border: '1px solid var(--grey-disabled)',
                borderRadius: 6,
                cursor: 'pointer',
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
        <p style={{ marginBottom: 20, color: 'var(--modal-text)' }}>
          Are you sure you want to remove this question from this playlist?
        </p>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
          <button
            type="button"
            onClick={handleDeleteQuestion}
            style={{
              flex: 1,
              padding: '10px 0',
              fontWeight: 600,
              background: 'var(--confirm)',
              color: 'var(--light-text)',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
            }}
          >
            Yes
          </button>
          <button
            type="button"
            onClick={() => setDeleteQuestionId(null)}
            style={{
              flex: 1,
              padding: '10px 0',
              fontWeight: 600,
              background: 'var(--decline)',
              color: 'var(--light-text)',
              border: '1px solid var(--grey-disabled)',
              borderRadius: 6,
              cursor: 'pointer',
            }}
          >
            No
          </button>
        </div>
      </Modal>
    </React.Fragment>
  );
};

export default EditPlaylistScreen;
