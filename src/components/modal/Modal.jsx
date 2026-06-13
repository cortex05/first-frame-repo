import React from 'react';
import styles from './Modal.module.css';

const Modal = ({ isOpen, onClose, title = '', children, hideDefaultClose = false }) => {
  if (!isOpen) return null;

  return (
    <div className={styles.modalBackdrop}>
      <div className={styles.mainBody}>
        {title && <h2 className={styles.title}>{title}</h2>}
        {children}
        {!hideDefaultClose && (
          <button
            onClick={onClose}
            className={styles.closeButton}
          >
            Close
          </button>
        )}
      </div>
    </div>
  );
};

export default Modal;