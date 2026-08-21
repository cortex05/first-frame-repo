import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { login } from '../../../api/auth';
import useAuthStore from '../../../store/useAuthStore';
import useCaseStore from '../../../store/useCaseStore';

import styles from './LoginScreen.module.css';

const LoginScreen = () => {
  const navigate = useNavigate();
  const setUserInfo = useAuthStore((state) => state.setUserInfo);
  const fetchUserPlaylists = useAuthStore((state) => state.fetchUserPlaylists);
  const fetchRecommendedNames = useAuthStore((state) => state.fetchRecommendedNames);
  const fetchUserCases = useCaseStore((state) => state.fetchUserCases);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const userInfo = await login({ email: email.trim(), password });
      setUserInfo(userInfo);
      await Promise.all([
        fetchUserPlaylists(userInfo.token),
        fetchUserCases(userInfo.token),
        // No-ops for a non-admin; setUserInfo above is what makes isAdmin known.
        fetchRecommendedNames(userInfo.token),
      ]);
      navigate('/home', { replace: true });
    } catch (requestError) {
      setError(
        requestError?.response?.data?.message || 'Unable to log in. Please check your credentials.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <h1>Login</h1>
      <p className={styles.subtitle}>Sign in to access your cases.</p>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.fieldStyle}>
          <label className={styles.labelStyle}>Email</label>
          <input
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
          <label className={styles.labelStyle}>Password</label>
          <input
            className={styles.inputStyle}
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter password"
            required
            autoComplete="current-password"
          />
        </div>

        {error && <p className={styles.error}>{error}</p>}

        <button className={styles.submitButton} type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Logging in...' : 'Login'}
        </button>
      </form>

      <p className={styles.footerText}>
        Need an account? <Link to="/register">Create one</Link>
      </p>
    </div>
  );
};

export default LoginScreen;
