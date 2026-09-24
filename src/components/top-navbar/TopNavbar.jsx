import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import Modal from '../modal/Modal';
import useAuthStore, { selectIsAccountAdmin } from '../../store/useAuthStore';

import styles from './TopNavbar.module.css';

const TopNavbar = ({ warnOnHomeNavigation = false }) => {
  const navigate = useNavigate();
  const userInfo = useAuthStore((state) => state.userInfo);
  const isAccountAdmin = useAuthStore(selectIsAccountAdmin);
  const clearUserInfo = useAuthStore((state) => state.clearUserInfo);
  const [logoutWarningOpen, setLogoutWarningOpen] = useState(false);
  // Where the user asked to go while the page has unsaved changes.
  const [pendingPath, setPendingPath] = useState(null);

  const handleContinueLogout = () => {
    clearUserInfo();
    setLogoutWarningOpen(false);
  };

  // On pages that warn about unsaved changes, every navbar link asks first.
  const handleNavigate = (event, path) => {
    if (!warnOnHomeNavigation) return;

    event.preventDefault();
    setPendingPath(path);
  };

  const handleContinueNavigation = () => {
    const path = pendingPath;
    setPendingPath(null);
    navigate(path);
  };

  return (
    <React.Fragment>
      <header className={styles.navbar}>
        <div> 
          <Link
            to="/home"
            className={styles.navButton}
            onClick={(event) => handleNavigate(event, '/home')}
          >
            Home
          </Link>
          <span>   Hello {userInfo?.username}</span>
          {userInfo?.accountName && (
            <span className={styles.accountName}>{userInfo.accountName}</span>
          )}
        </div>

        <div className={styles.navActions}>
          <Link
            to="/archive"
            className={styles.navButton}
            onClick={(event) => handleNavigate(event, '/archive')}
          >
            Archive
          </Link>
          {isAccountAdmin && (
            <Link
              to="/account"
              className={styles.navButton}
              onClick={(event) => handleNavigate(event, '/account')}
            >
              Account
            </Link>
          )}
          <button
            type="button"
            className={styles.navButton}
            onClick={() => setLogoutWarningOpen(true)}
          >
            Log out
          </button>
        </div>
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

      <Modal
        isOpen={Boolean(pendingPath)}
        onClose={() => setPendingPath(null)}
        title="Leave This Page?"
      >
        <h3
          style={{
            color: 'var(--modal-text)',
            fontWeight: 500,
            maxWidth: 420,
          }}
        >
          Navigating away will discard unsaved changes.
        </h3>

        <div className={styles.modalButtons}>
          <button type="button" className={styles.confirm} onClick={handleContinueNavigation}>
            Confirm
          </button>
        </div>
      </Modal>
    </React.Fragment>
  );
};

export default TopNavbar;
