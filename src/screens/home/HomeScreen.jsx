import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const Home = () => {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div>
      <h1>Welcome to the Home Page!</h1>
      <p>This is the home screen of our application. Here you will be able to access our various features.</p>
      <hr />
      <h3>What would you like to do?</h3>

      <div style={{ display: 'flex', gap: 16, marginTop: 24 }}>
        <Link
          to="/create-case"
          style={{
            display: 'inline-block',
            padding: '16px 32px',
            fontSize: 18,
            fontWeight: 600,
            background: '#4a90d9',
            color: '#fff',
            borderRadius: 8,
            textDecoration: 'none',
          }}
        >
          Create New Case
        </Link>

        <button
          onClick={() => setModalOpen(true)}
          style={{
            padding: '16px 32px',
            fontSize: 18,
            fontWeight: 600,
            background: '#f0f0f0',
            color: '#333',
            border: '2px solid #ccc',
            borderRadius: 8,
            cursor: 'pointer',
          }}
        >
          Access Existing Case
        </button>
      </div>

      {modalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 1000,
        }}>
          <div style={{
            background: '#fff', borderRadius: 8, padding: 32, minWidth: 320,
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          }}>
            <h2 style={{ margin: '0 0 24px' }}>Access Existing Case</h2>
            <button
              onClick={() => setModalOpen(false)}
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
      )}
    </div>
  );
};

export default Home