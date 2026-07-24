import React, { useState } from 'react';
import { Link } from 'react-router-dom';

import Modal from '../modal/Modal';
import useAuthStore from '../../store/useAuthStore';

import styles from './TopNavbar.module.css';

const TopNavbar = () => {
  const clearUserInfo = useAuthStore((state) => state.clearUserInfo);
  const [logoutWarningOpen, setLogoutWarningOpen] = useState(false);

  const handleContinueLogout = () => {
    clearUserInfo();
    setLogoutWarningOpen(false);
  };

  return (
    <React.Fragment>
      <header className={styles.navbar}>
        <Link to="/" className={styles.navButton}>
          Home
        </Link>

        <button
          type="button"
          className={styles.navButton}
          onClick={() => setLogoutWarningOpen(true)}
        >
          Log out
        </button>
      </header>

      <Modal
        isOpen={logoutWarningOpen}
        hideDefaultClose
        onClose={() => setLogoutWarningOpen(false)}
        title="Are you sure?"
      >
        <h3
          style={{
            color: 'var(--modal-text)',
            fontWeight: 500,
            maxWidth: 420,
          }}
        >
          Unsaved changes will not persist if you log out.
        </h3>

        <div className={styles.modalButtons}>
          <button type="button" className={styles.confirm} onClick={handleContinueLogout}>
            Continue
          </button>
          <button
            type="button"
            className={styles.decline}
            onClick={() => setLogoutWarningOpen(false)}
          >
            Cancel
          </button>
        </div>
      </Modal>
    </React.Fragment>
  );
};

export default TopNavbar;
