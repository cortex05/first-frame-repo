import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import TopNavbar from '../../components/top-navbar/TopNavbar';
import { getArchivedCases } from '../../api/archive';
import useAccountStore, { usernameFor } from '../../store/useAccountStore';
import useAuthStore from '../../store/useAuthStore';
import { caseCategoryLabel } from '../../types/caseCategories';
import { formatDate } from '../../utils/formatDate';

import styles from './ArchiveScreen.module.css';

/**
 * The account's past cases. Admins see every archived case; everyone else
 * sees the ones they owned -- the server decides which.
 */
const ArchiveScreen = () => {
  const userInfo = useAuthStore((state) => state.userInfo);
  const users = useAccountStore((state) => state.users);
  const fetchAccountUsers = useAccountStore((state) => state.fetchAccountUsers);

  // null until the first response (or failure) arrives.
  const [result, setResult] = useState(null);
  const isLoading = result === null;
  const archivedCases = result?.archivedCases ?? [];
  const error = result?.error ?? '';

  useEffect(() => {
    if (!userInfo?.token) return;

    Promise.all([getArchivedCases(userInfo.token), fetchAccountUsers(userInfo.token)])
      .then(([loaded]) => setResult({ archivedCases: loaded }))
      .catch((requestError) =>
        setResult({
          error: requestError?.response?.data?.message || 'Unable to load archived cases.',
        }),
      );
  }, [userInfo?.token]);

  return (
    <React.Fragment>
      <TopNavbar />

      <div className={styles.container}>
        <h1>Archived Cases</h1>
        <p className={styles.subtitle}>Completed cases, kept read-only for your records.</p>

        {error && <p className={styles.error}>{error}</p>}

        {isLoading ? (
          <p className={styles.hint}>Loading archived cases...</p>
        ) : archivedCases.length === 0 ? (
          <div className={styles.emptyState}>No archived cases yet.</div>
        ) : (
          <ul className={styles.list}>
            {archivedCases.map((archived) => (
              <li key={archived._id}>
                <Link to={`/archive/${archived._id}`} className={styles.item}>
                  <span className={styles.itemTitle}>
                    {archived.clientName} <span className={styles.muted}>by {archived.attorney}</span>
                  </span>
                  <span className={styles.itemMeta}>{caseCategoryLabel(archived.category)}</span>
                  <span className={styles.itemMeta}>
                    Archived {formatDate(archived.archivedAt)} by {usernameFor(users, archived.archivedBy)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </React.Fragment>
  );
};

export default ArchiveScreen;
