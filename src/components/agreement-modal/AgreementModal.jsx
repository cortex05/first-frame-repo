import { useId, useState } from 'react';

import styles from './AgreementModal.module.css';

export const AGREE_LABEL = 'I have read and agree to the Terms of Service.';

/**
 * The Terms of Service with an "I agree" checkbox. Submit stays disabled until
 * the box is checked. Shared by RegisterScreen (before the account exists) and
 * AcceptTermsScreen (when a new version has gone live).
 *
 * The check belongs to one version: when `agreement` changes to a newer one,
 * the box is unchecked again.
 */
const AgreementModal = ({
  agreement,
  onSubmit,
  onCancel,
  cancelLabel = 'Cancel',
  isSubmitting = false,
  error = '',
  notice = '',
}) => {
  const idPrefix = useId();
  const [checkedVersion, setCheckedVersion] = useState(null);
  const isChecked = checkedVersion === agreement.termsVersion;

  const toggle = (event) => {
    setCheckedVersion(event.target.checked ? agreement.termsVersion : null);
  };

  return (
    <div className={styles.backdrop}>
      <div className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby={`${idPrefix}-title`}>
        <h2 id={`${idPrefix}-title`} className={styles.title}>
          {`Agreement: ${agreement.termsVersion}`}
        </h2>

        {notice && (
          <p className={styles.notice} role="status">
            {notice}
          </p>
        )}

        <div className={styles.text} tabIndex={0} aria-label="Terms of Service">
          {agreement.agreementText}
        </div>

        <label className={styles.agree} htmlFor={`${idPrefix}-agree`}>
          <input
            id={`${idPrefix}-agree`}
            type="checkbox"
            checked={isChecked}
            onChange={toggle}
            disabled={isSubmitting}
          />
          {AGREE_LABEL}
        </label>

        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}

        <div className={styles.footer}>
          <button
            type="button"
            className={styles.submit}
            onClick={onSubmit}
            disabled={!isChecked || isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </button>
          <button type="button" className={styles.cancel} onClick={onCancel} disabled={isSubmitting}>
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AgreementModal;
