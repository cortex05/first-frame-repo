import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { register } from '../../../api/auth';
import { getCurrentAgreement } from '../../../api/agreement';
import AgreementModal from '../../../components/agreement-modal/AgreementModal';
import useAuthStore from '../../../store/useAuthStore';
import useCaseStore from '../../../store/useCaseStore';

import styles from './RegisterScreen.module.css';

const MIN_PASSWORD_LENGTH = 8;

const ADMIN_NOTICE =
  "You will be the administrator of this account and can add other users once it's created.";

const TERMS_UNAVAILABLE =
  'Terms of Service are unavailable right now. Please try again later.';
const TERMS_UPDATED = 'The terms were just updated. Please review them again.';

/**
 * Creates a new account together with its first user. Everyone else joins an
 * account by being added by one of its administrators.
 *
 * Create Account only validates the form and shows the Terms of Service; the
 * account is created when the person accepts them in the modal.
 */
const RegisterScreen = () => {
  const navigate = useNavigate();
  const setUserInfo = useAuthStore((state) => state.setUserInfo);
  const fetchUserPlaylists = useAuthStore((state) => state.fetchUserPlaylists);
  const fetchUserCases = useCaseStore((state) => state.fetchUserCases);

  const [accountName, setAccountName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoadingTerms, setIsLoadingTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // The terms shown in the modal; null while it is closed.
  const [agreement, setAgreement] = useState(null);
  const [agreementNotice, setAgreementNotice] = useState('');

  const closeAgreement = () => {
    setAgreement(null);
    setAgreementNotice('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setError('');
    setIsLoadingTerms(true);

    try {
      setAgreement(await getCurrentAgreement());
    } catch {
      setError(TERMS_UNAVAILABLE);
    } finally {
      setIsLoadingTerms(false);
    }
  };

  const handleAccept = async () => {
    setIsSubmitting(true);

    try {
      const session = await register({
        accountName: accountName.trim(),
        username: username.trim(),
        email: email.trim(),
        password,
        termsVersion: agreement.termsVersion,
      });

      setUserInfo(session);
      await Promise.all([
        fetchUserPlaylists(session.token),
        fetchUserCases(session.token),
      ]);
      navigate('/dashboard', { replace: true });
    } catch (requestError) {
      // The terms changed while the modal was open: show the new ones.
      if (requestError?.response?.data?.code === 'TERMS_OUTDATED') {
        try {
          setAgreement(await getCurrentAgreement());
          setAgreementNotice(TERMS_UPDATED);
          return;
        } catch {
          closeAgreement();
          setError(TERMS_UNAVAILABLE);
          return;
        }
      }

      closeAgreement();
      setError(
        requestError?.response?.data?.message || 'Unable to create the account. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <h1>Create an Account</h1>
      <p className={styles.subtitle}>Set up your organization to start building cases.</p>

      <p className={styles.notice}>{ADMIN_NOTICE}</p>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.fieldStyle}>
          <label className={styles.labelStyle} htmlFor="register-account-name">
            Account Name
          </label>
          <input
            id="register-account-name"
            className={styles.inputStyle}
            type="text"
            value={accountName}
            onChange={(event) => setAccountName(event.target.value)}
            placeholder="Your firm or organization"
            required
            maxLength={80}
            autoComplete="organization"
          />
        </div>

        <h2 className={styles.sectionLabel}>Your administrator login</h2>

        <div className={styles.fieldStyle}>
          <label className={styles.labelStyle} htmlFor="register-username">Username</label>
          <input
            id="register-username"
            className={styles.inputStyle}
            type="text"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="Your username"
            required
            autoComplete="username"
          />
        </div>

        <div className={styles.fieldStyle}>
          <label className={styles.labelStyle} htmlFor="register-email">Email</label>
          <input
            id="register-email"
            className={styles.inputStyle}
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            required
            autoComplete="email"
          />
        </div>

        <div className={styles.fieldStyle}>
          <label className={styles.labelStyle} htmlFor="register-password">Password</label>
          <input
            id="register-password"
            className={styles.inputStyle}
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
            required
            autoComplete="new-password"
          />
        </div>

        <div className={styles.fieldStyle}>
          <label className={styles.labelStyle} htmlFor="register-confirm-password">
            Confirm Password
          </label>
          <input
            id="register-confirm-password"
            className={styles.inputStyle}
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Confirm password"
            required
            autoComplete="new-password"
          />
        </div>

        {error && <p className={styles.error}>{error}</p>}

        <button className={styles.submitButton} type="submit" disabled={isLoadingTerms}>
          {isLoadingTerms ? 'Loading terms...' : 'Create Account'}
        </button>
      </form>

      {agreement && (
        <AgreementModal
          agreement={agreement}
          notice={agreementNotice}
          isSubmitting={isSubmitting}
          onSubmit={handleAccept}
          onCancel={closeAgreement}
        />
      )}

      <p className={styles.footerText}>
        Already have an account? <Link to="/login">Sign in</Link>
      </p>
    </div>
  );
};

export default RegisterScreen;
