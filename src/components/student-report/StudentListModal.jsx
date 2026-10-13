import { useId } from 'react';

import DialogPortal from '../modal/DialogPortal';
import useModalDialog from '../../hooks/useModalDialog';
import {
  RISK_LABELS,
  getRiskTiers,
  getSeatedStudentNumbers,
  getStudentTotal,
} from '../../utils/studentScores';

import styles from './StudentListModal.module.css';

/**
 * Every student of the case, #1 to #studentNumber, in numeric order. Seated
 * students carry the same risk color as on the Questions screen (tiers banded
 * over seated students only); anyone not seated yet is neutral.
 */
const StudentListModal = ({ activeCase, onSelectStudent, onClose }) => {
  const titleId = useId();
  const { dialogRef, dialogProps } = useModalDialog({ onDismiss: onClose });
  const count = Math.max(0, Number(activeCase.studentNumber) || 0);
  const numbers = Array.from({ length: count }, (_, i) => i + 1);

  const seated = getSeatedStudentNumbers(activeCase.chartData);
  const seatedSet = new Set(seated);
  const tiers = getRiskTiers(activeCase, seated);

  return (
    <DialogPortal>
      <div className={styles.backdrop}>
        <div ref={dialogRef} {...dialogProps} className={styles.dialog} aria-labelledby={titleId}>
          <div className={styles.header}>
            <h3 id={titleId} className={styles.title}>Students</h3>
            <button type="button" className={styles.close} aria-label="Close" onClick={onClose}>
              ×
            </button>
          </div>

          <div className={styles.list}>
            {numbers.map((number) => {
              const tier = seatedSet.has(number) ? tiers.get(number) : null;
              return (
                <button
                  key={number}
                  type="button"
                  className={`${styles.row} ${tier ? styles[`risk_${tier}`] : styles.neutral}`}
                  data-tier={tier ?? 'none'}
                  onClick={() => onSelectStudent(number)}
                >
                  #{number} &mdash; {getStudentTotal(activeCase, number)}
                  {tier && <> &middot; {RISK_LABELS[tier]}</>}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </DialogPortal>
  );
};

export default StudentListModal;
