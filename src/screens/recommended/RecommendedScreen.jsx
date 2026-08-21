import React, { useEffect } from 'react';

import TopNavbar from '../../components/top-navbar/TopNavbar';
import useAuthStore from '../../store/useAuthStore';

import styles from './RecommendedScreen.module.css';

/**
 * Admin view of every recommended set. A recommended set has no title -- the
 * backend keeps one set per charge, so the charge is the identifier.
 */
const RecommendedScreen = () => {
  const userInfo = useAuthStore((state) => state.userInfo);
  const recommendedNames = useAuthStore((state) => state.recommendedNames);
  const fetchRecommendedNames = useAuthStore((state) => state.fetchRecommendedNames);

  useEffect(() => {
    if (userInfo?.token) {
      fetchRecommendedNames(userInfo.token);
    }
  }, [userInfo?.token]);

  return (
    <React.Fragment>
      <TopNavbar />

      <div className={styles.container}>
        <h1>Recommended Playlists</h1>
        <p className={styles.subtitle}>
          One recommended playlist per charge, available to every user.
        </p>

        <section>
          <h2 className={styles.sectionHeading}>Charges Covered</h2>

          {recommendedNames.length === 0 ? (
            <div className={styles.emptyState}>
              No Recommended playlists available.{' '}
              <span className={styles.emptyStatePrompt}>Make One?</span>
            </div>
          ) : (
            <div className={styles.recommendedList}>
              {recommendedNames.map((charge, index) => (
                <div key={charge} className={styles.recommendedItem}>
                  <span className={styles.recommendedNumber}>{index + 1}.</span>
                  <span className={styles.recommendedCharge}>{charge}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </React.Fragment>
  );
};

export default RecommendedScreen;
