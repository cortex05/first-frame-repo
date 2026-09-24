import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import TopNavbar from '../../components/top-navbar/TopNavbar';
import { getArchivedCase } from '../../api/archive';
import useAccountStore, { usernameFor } from '../../store/useAccountStore';
import useAuthStore from '../../store/useAuthStore';
import { caseCategoryLabel } from '../../types/caseCategories';
import { QuestionType } from '../../types/ENUMS';
import { formatDate } from '../../utils/formatDate';

import styles from './ArchiveScreen.module.css';

const answerText = (answer) => {
  if (answer === null || answer === undefined) return '—';
  if (typeof answer !== 'object') return String(answer);

  const label = answer.label === undefined || answer.label === null ? '—' : String(answer.label);
  return answer.value === undefined ? label : `${label} (${answer.value} pts)`;
};

/**
 * Read-only view of one archived case: its details, owners, and every
 * question with the answers each student gave.
 */
const ArchivedCaseScreen = () => {
  const { id } = useParams();
  const userInfo = useAuthStore((state) => state.userInfo);
  const users = useAccountStore((state) => state.users);
  const fetchAccountUsers = useAccountStore((state) => state.fetchAccountUsers);

  // Tagged with the id it was loaded for, so navigating to another archived
  // case shows "Loading" until that case's response arrives.
  const [result, setResult] = useState(null);
  const isLoading = result?.id !== id;
  const archived = isLoading ? null : result.archived;
  const notFound = !isLoading && Boolean(result.notFound);
  const error = isLoading ? '' : result.error ?? '';

  useEffect(() => {
    if (!userInfo?.token) return;

    Promise.all([getArchivedCase(id, userInfo.token), fetchAccountUsers(userInfo.token)])
      .then(([loaded]) => setResult({ id, archived: loaded }))
      .catch((requestError) => {
        const status = requestError?.response?.status;
        if (status === 404 || status === 400) {
          setResult({ id, notFound: true });
        } else {
          setResult({
            id,
            error: requestError?.response?.data?.message || 'Unable to load the archived case.',
          });
        }
      });
  }, [id, userInfo?.token]);

  const renderBody = () => {
    if (isLoading) return <p className={styles.hint}>Loading...</p>;
    if (notFound) {
      return (
        <div className={styles.emptyState}>
          Archived case not found. <Link to="/archive">Back to the archive</Link>
        </div>
      );
    }
    if (error || !archived) return <p className={styles.error}>{error}</p>;

    const answers = archived.answers || {};
    const owners = archived.owners || [];

    return (
      <React.Fragment>
        <h1>Client: {archived.clientName}</h1>
        <p className={styles.readOnlyTag}>Archived — read only</p>

        <section className={styles.details}>
          <p>Attorney: {archived.attorney || '—'}</p>
          <p>Case Category: {caseCategoryLabel(archived.category)}</p>
          <p>Number of Students: {archived.studentNumber}</p>
          <p>Created: {formatDate(archived.createdOn)}</p>
          <p>
            Archived: {formatDate(archived.archivedAt)} by {usernameFor(users, archived.archivedBy)}
          </p>
          <p>
            Owners:{' '}
            {owners.length === 0 ? '—' : owners.map((ownerId) => usernameFor(users, ownerId)).join(', ')}
          </p>
        </section>

        <section>
          <h2 className={styles.sectionHeading}>Questions</h2>
          {(archived.questions || []).map((question, index) => {
            const questionAnswers = Object.entries(answers[question.id] || {});
            return (
              <div key={question.id} className={styles.questionCard}>
                <div className={styles.questionHeader}>
                  <span className={styles.questionNumber}>{index + 1}.</span>
                  <span className={styles.questionText}>{question.text}</span>
                  <span className={styles.typeTag}>
                    {question.type === QuestionType.TRUE_FALSE ? 'T/F' : 'MC'}
                  </span>
                </div>
                {questionAnswers.length === 0 ? (
                  <p className={styles.muted}>No answers recorded.</p>
                ) : (
                  <ul className={styles.answerList}>
                    {questionAnswers.map(([studentId, answer], answerIndex) => (
                      <li key={studentId}>
                        <span className={styles.muted}>Student {answerIndex + 1}:</span>{' '}
                        {answerText(answer)}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </section>
      </React.Fragment>
    );
  };

  return (
    <React.Fragment>
      <TopNavbar />
      <div className={styles.container}>
        <Link to="/archive" className={styles.backLink}>
          ← Archived cases
        </Link>
        {renderBody()}
      </div>
    </React.Fragment>
  );
};

export default ArchivedCaseScreen;
