import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Modal from '../../components/modal/Modal';

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

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Access Existing Case"
      />
    </div>
  );
};

export default Home