import { useId } from 'react';
import DialogPortal from './DialogPortal';
import useModalDialog from '../../hooks/useModalDialog';
import styles from './Modal.module.css';

/**
 * The shared modal dialog. Escape does what `onClose` does; without `onClose`,
 * or while `closeDisabled` (a request in flight), Escape does nothing and the
 * default Close button is disabled. The backdrop does not close it.
 */
const Modal = ({ isOpen, ...props }) => {
  if (!isOpen) return null;
  return <ModalDialog {...props} />;
};

// Mounted only while open: useModalDialog runs its open/close work on mount/unmount.
const ModalDialog = ({
  onClose,
  title = '',
  ariaLabel,
  children,
  hideDefaultClose = false,
  closeDisabled = false,
}) => {
  const titleId = useId();
  const { dialogRef, dialogProps } = useModalDialog({
    onDismiss: onClose,
    dismissible: Boolean(onClose) && !closeDisabled,
  });

  return (
    <DialogPortal>
      <div className={styles.modalBackdrop}>
        <div
          ref={dialogRef}
          {...dialogProps}
          aria-labelledby={title ? titleId : undefined}
          aria-label={title ? undefined : ariaLabel}
          className={styles.mainBody}
        >
          {title && <h2 id={titleId} className={styles.title}>{title}</h2>}
          {children}
          {!hideDefaultClose && (
            <button
              onClick={onClose}
              disabled={closeDisabled}
              className={styles.closeButton}
            >
              Close
            </button>
          )}
        </div>
      </div>
    </DialogPortal>
  );
};

export default Modal;
