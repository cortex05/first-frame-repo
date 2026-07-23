import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { register } from '../../../api/auth';
import useAuthStore from '../../../store/useAuthStore';

import styles from './RegisterScreen.module.css';

const RegisterScreen = () => {
  const navigate = useNavigate();
  const setUserInfo = useAuthStore((state) => state.setUserInfo);

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      const userInfo = await register({
        username: username.trim(),
        email: email.trim(),
        password,
      });

      if (userInfo?.token && userInfo?.userId && userInfo?.username) {
        setUserInfo(userInfo);
        navigate('/home', { replace: true });
      } else {
        navigate('/login', { replace: true });
      }
    } catch (requestError) {
      setError(
        requestError?.response?.data?.message || 'Unable to register. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <h1>Register</h1>
      <p className={styles.subtitle}>Create your account to start building cases.</p>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.fieldStyle}>
          <label className={styles.labelStyle}>Username</label>
          <input
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
            placeholder="Create password"
            required
            autoComplete="new-password"
          />
        </div>

        <div className={styles.fieldStyle}>
          <label className={styles.labelStyle}>Confirm Password</label>
          <input
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

        <button className={styles.submitButton} type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating account...' : 'Register'}
        </button>
      </form>

      <p className={styles.footerText}>
        Already have an account? <Link to="/login">Sign in</Link>
      </p>
    </div>
  );
};

export default RegisterScreen;
