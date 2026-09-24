import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { changePassword } from '../../../api/auth';
import useAuthStore from '../../../store/useAuthStore';

import styles from '../login/LoginScreen.module.css';

const MIN_PASSWORD_LENGTH = 8;

/**
 * Where a user with a temporary password lands. Until the change succeeds the
 * API refuses everything else, and PasswordChangeGate keeps them on this page.
 */
const ChangePasswordScreen = () => {
  const navigate = useNavigate();
  const userInfo = useAuthStore((state) => state.userInfo);
  const setUserInfo = useAuthStore((state) => state.setUserInfo);
  const clearUserInfo = useAuthStore((state) => state.clearUserInfo);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isForced = Boolean(userInfo?.mustChangePassword);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setError(`New password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (newPassword === currentPassword) {
      setError('New password must be different from the current password.');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      const session = await changePassword({ currentPassword, newPassword }, userInfo.token);
      setUserInfo(session);
      navigate('/home', { replace: true });
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Unable to change password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <h1>Change Password</h1>
      <p className={styles.subtitle}>
        {isForced
          ? 'Your administrator gave you a temporary password. Choose your own to continue.'
          : 'Choose a new password for your account.'}
      </p>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.fieldStyle}>
          <label className={styles.labelStyle}>
            {isForced ? 'Temporary Password' : 'Current Password'}
          </label>
          <input
            className={styles.inputStyle}
            type="password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            required
            autoComplete="current-password"
          />
        </div>

        <div className={styles.fieldStyle}>
          <label className={styles.labelStyle}>New Password</label>
          <input
            className={styles.inputStyle}
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
            required
            autoComplete="new-password"
          />
        </div>

        <div className={styles.fieldStyle}>
          <label className={styles.labelStyle}>Confirm New Password</label>
          <input
            className={styles.inputStyle}
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            autoComplete="new-password"
          />
        </div>

        {error && <p className={styles.error}>{error}</p>}

        <button className={styles.submitButton} type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Change Password'}
        </button>
      </form>

      {isForced && (
        <p className={styles.footerText}>
          Not you?{' '}
          <a href="/login" onClick={(event) => { event.preventDefault(); clearUserInfo(); }}>
            Log out
          </a>
        </p>
      )}
    </div>
  );
};

export default ChangePasswordScreen;
