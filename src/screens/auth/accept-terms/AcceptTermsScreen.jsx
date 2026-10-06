import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { acceptAgreement, getCurrentAgreement } from '../../../api/agreement';
import AgreementModal from '../../../components/agreement-modal/AgreementModal';
import useAuthStore, { selectIsAccountAdmin } from '../../../store/useAuthStore';
import useCaseStore from '../../../store/useCaseStore';

import styles from '../login/LoginScreen.module.css';

const TERMS_UNAVAILABLE =
  'Terms of Service are unavailable right now. Please try again later.';
const TERMS_UPDATED = 'The terms were just updated. Please review them again.';
export const MEMBER_NOTICE =
  "Your organization's Terms of Service have been updated. An account administrator must accept them before you can continue.";

/**
 * Where TermsGate sends a user whose account has not accepted the current
 * Terms of Service. Until an account admin accepts, the API refuses everything
 * else for the whole account. Members can only wait (or log out).
 */
const AcceptTermsScreen = () => {
  const navigate = useNavigate();
  const userInfo = useAuthStore((state) => state.userInfo);
  const isAccountAdmin = useAuthStore(selectIsAccountAdmin);
  const setUserInfo = useAuthStore((state) => state.setUserInfo);
  const clearUserInfo = useAuthStore((state) => state.clearUserInfo);
  const fetchUserPlaylists = useAuthStore((state) => state.fetchUserPlaylists);
  const fetchRecommendedNames = useAuthStore((state) => state.fetchRecommendedNames);
  const fetchUserCases = useCaseStore((state) => state.fetchUserCases);

  const [agreement, setAgreement] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isAccountAdmin) {
      return undefined;
    }

    let isCancelled = false;
    getCurrentAgreement()
      .then((current) => {
        if (!isCancelled) setAgreement(current);
      })
      .catch(() => {
        if (!isCancelled) setLoadError(TERMS_UNAVAILABLE);
      });

    return () => {
      isCancelled = true;
    };
  }, [isAccountAdmin]);

  // ProtectedRoutes sends a signed-out user to /login.
  const logOut = () => clearUserInfo();

  const handleAccept = async () => {
    setError('');
    setIsSubmitting(true);

    try {
      const session = await acceptAgreement({ termsVersion: agreement.termsVersion }, userInfo.token);
      setUserInfo(session);
      await Promise.all([
        fetchUserPlaylists(session.token),
        fetchUserCases(session.token),
        fetchRecommendedNames(session.token),
      ]);
      navigate('/dashboard', { replace: true });
    } catch (requestError) {
      if (requestError?.response?.data?.code === 'TERMS_OUTDATED') {
        try {
          setAgreement(await getCurrentAgreement());
          setNotice(TERMS_UPDATED);
        } catch {
          setError(TERMS_UNAVAILABLE);
        }
        return;
      }

      setError(requestError?.response?.data?.message || 'Unable to accept the terms. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <h1>Updated Terms of Service</h1>

      {isAccountAdmin ? (
        <p className={styles.subtitle}>
          {loadError || 'Please review and accept the updated terms to continue.'}
        </p>
      ) : (
        <p className={styles.subtitle}>{MEMBER_NOTICE}</p>
      )}

      {(!isAccountAdmin || loadError) && (
        <button className={styles.submitButton} type="button" onClick={logOut}>
          Log out
        </button>
      )}

      {isAccountAdmin && agreement && (
        <AgreementModal
          agreement={agreement}
          notice={notice}
          error={error}
          isSubmitting={isSubmitting}
          onSubmit={handleAccept}
          onCancel={logOut}
          cancelLabel="Log out"
        />
      )}
    </div>
  );
};

export default AcceptTermsScreen;
