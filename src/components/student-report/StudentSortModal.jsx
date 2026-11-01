import { useId } from 'react';

import DialogPortal from '../modal/DialogPortal';
import useModalDialog from '../../hooks/useModalDialog';
import { RISK_LABELS } from '../../utils/studentScores';

/**
 * The Scores view's ranked student list ("High to Low" / "Low to High") on
 * QuestionsScreen. Each row opens that student's report on top of this list.
 * Unlike the other dialogs, a click on the backdrop closes it.
 */
const StudentSortModal = ({ order, students, getScore, getTier, onSelectStudent, onClose }) => {
  const titleId = useId();
  const { dialogRef, dialogProps } = useModalDialog({ onDismiss: onClose });

  const sorted = [...students].sort((a, b) =>
    order === 'high' ? getScore(b.id) - getScore(a.id) : getScore(a.id) - getScore(b.id),
  );

  return (
    <DialogPortal>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'var(--overlay)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 500,
        }}
      >
        <div
          ref={dialogRef}
          {...dialogProps}
          aria-labelledby={titleId}
          onClick={(e) => e.stopPropagation()}
          style={{
            background: 'var(--surface)',
            borderRadius: 10,
            padding: 24,
            minWidth: 320,
            maxWidth: 440,
            maxHeight: '75vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 4px 24px var(--shadow-soft)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 16,
            }}
          >
            <h3 id={titleId} style={{ margin: 0, fontSize: 16, color: 'var(--modal-text)' }}>
              {order === 'high' ? 'High to Low' : 'Low to High'}
            </h3>
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                fontSize: 20,
                cursor: 'pointer',
                color: 'var(--text-secondary)',
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>
          <div style={{ overflowY: 'auto', paddingRight: 12 }}>
            {sorted.map((s) => {
              const tier = getTier(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onSelectStudent(s.id)}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    background: `var(--risk-${tier}-bg)`,
                    color: `var(--risk-${tier}-text)`,
                    padding: '10px 14px',
                    borderRadius: 6,
                    marginBottom: 8,
                    fontSize: 14,
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  #{s.id} &mdash; {getScore(s.id)} &middot; {RISK_LABELS[tier]}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </DialogPortal>
  );
};

export default StudentSortModal;
