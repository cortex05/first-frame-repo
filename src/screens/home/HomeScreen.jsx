import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Modal from '../../components/modal/Modal';
import styles from './HomeScreen.module.css';

import useCaseStore from '../../store/useCaseStore';

const Home = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [storedCases, setStoredCases] = useState([]);
  const setActiveCase = useCaseStore((state) => state.setActiveCase);

  const navigate = useNavigate();

  const handleSelectCase = (caseId) => {
	setActiveCase(caseId);
	setModalOpen(false);
	navigate(`/case/${caseId}`);
  }

  useEffect(() => {
    const cases = localStorage.getItem('cases');
    if (cases) {
      setStoredCases(JSON.parse(cases));
    }
  }, []);

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
      >
        <div>
        <h3>Existing Cases:</h3>
          {storedCases.length === 0 ? (
            <p>No existing cases found.</p>
          ) : (
            <ul>
              {storedCases.map((c, i) => (
                <li key={i} onClick={() => handleSelectCase(c._id)}>
                    <button className={styles.caseLink}>
					  {c.name} by {c.author}
					</button>
                </li>
              ))}
            </ul>
          )}
        </div>

      </Modal>
    </div>
  );
};

export default Home;