import { useId, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { login } from '../../../api/auth';
import useAuthStore from '../../../store/useAuthStore';
import useCaseStore from '../../../store/useCaseStore';

import styles from './LoginScreen.module.css';
import usePageTitle from '../../../hooks/usePageTitle';
import useFormError from '../../../hooks/useFormError';
import FormError from '../../../components/form-error/FormError';

const LoginScreen = () => {
  usePageTitle('Log in');
  const navigate = useNavigate();
  const setUserInfo = useAuthStore((state) => state.setUserInfo);
  const fetchUserPlaylists = useAuthStore((state) => state.fetchUserPlaylists);
  const fetchRecommendedNames = useAuthStore((state) => state.fetchRecommendedNames);
  const fetchUserCases = useCaseStore((state) => state.fetchUserCases);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const formError = useFormError();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const idPrefix = useId();

  const handleSubmit = async (event) => {
    event.preventDefault();
    formError.clear();
    setIsSubmitting(true);

    try {
      const userInfo = await login({ email: email.trim(), password });
      setUserInfo(userInfo);

      // A user with a temporary password can do nothing else yet -- loading
      // cases or playlists now would only come back 403.
      if (userInfo.mustChangePassword) {
        navigate('/change-password', { replace: true });
        return;
      }

      // Same for an account that has not accepted the current terms.
      if (userInfo.mustAcceptTerms) {
        navigate('/accept-terms', { replace: true });
        return;
      }

      await Promise.all([
        fetchUserPlaylists(userInfo.token),
        fetchUserCases(userInfo.token),
        // No-ops for a non-admin; setUserInfo above is what makes isAdmin known.
        fetchRecommendedNames(userInfo.token),
      ]);
      navigate('/dashboard', { replace: true });
    } catch (requestError) {
      formError.setError(
        requestError?.response?.data?.message || 'Unable to log in. Please check your credentials.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className={styles.container}>
      <h1>Login</h1>
      <p className={styles.subtitle}>Sign in to access your cases.</p>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.fieldStyle}>
          <label className={styles.labelStyle} htmlFor={`${idPrefix}-email`}>Email</label>
          <input
            id={`${idPrefix}-email`}
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
          <label className={styles.labelStyle} htmlFor={`${idPrefix}-password`}>Password</label>
          <input
            id={`${idPrefix}-password`}
            className={styles.inputStyle}
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter password"
            required
            autoComplete="current-password"
          />
        </div>

        <FormError id={formError.messageId} message={formError.message} version={formError.version} className={styles.error} />

        <button className={styles.submitButton} type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Logging in...' : 'Login'}
        </button>
      </form>

      <p className={styles.footerText}>
        Need an account? <Link to="/register">Create one</Link>
      </p>
    </main>
  );
};

export default LoginScreen;
