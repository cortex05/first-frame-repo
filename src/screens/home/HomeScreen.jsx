import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Modal from '../../components/modal/Modal';
import styles from './HomeScreen.module.css';

const Home = () => {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className={styles.homeContainer}>
      <h1>Welcome to the Home Page!</h1>
      <p>This is the home screen of our application. Here you will be able to access our various features.</p>
      <hr />
      <h3>What would you like to do?</h3>

      <div className={styles.actionContainer}>
        <Link
          to="/create-case"
            className={styles.linkButton}
        >
          Create New Case
        </Link>

        <button
          onClick={() => setModalOpen(true)}
          className={styles.linkButton}
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