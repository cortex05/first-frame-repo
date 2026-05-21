import React from 'react';

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 1000,
    }}>
      <div style={{
        background: '#fff', borderRadius: 8, padding: 32, minWidth: 320,
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
      }}>
        {title && <h2 style={{ margin: '0 0 24px' }}>{title}</h2>}
        {children}
        <button
          onClick={onClose}
          style={{
            width: '100%', padding: '12px 0', fontSize: 16,
            background: '#f0f0f0', color: '#333', border: '1px solid #ccc',
            borderRadius: 6, cursor: 'pointer',
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default Modal;