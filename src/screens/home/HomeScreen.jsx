import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Modal from "../../components/modal/Modal";
import styles from "./HomeScreen.module.css";

import useCaseStore from "../../store/useCaseStore";

const Home = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [storedCases, setStoredCases] = useState([]);
  const setActiveCase = useCaseStore((state) => state.setActiveCase);

  const navigate = useNavigate();

  const handleSelectCase = (caseId) => {
    setActiveCase(caseId);
    setModalOpen(false);
    navigate(`/case/${caseId}`);
  };

  useEffect(() => {
    const cases = localStorage.getItem("cases");
    if (cases) {
      setStoredCases(JSON.parse(cases));
    }
  }, []);

  return (
    <div className={styles.homeContainer}>
      <div className={styles.homeHeading}>
        <h1>Welcome to our Application</h1>
        <p>
          Currently, you can start NEW a case for seating and questioning
          students or you can access an EXISTING case that is already in
          progress.
        </p>
        {/* <h3>What would you like to do?</h3> */}
      </div>

      <div className={styles.actionContainer}>
        <Link to="/create-case" className={styles.linkButton}>
          Create New Case
        </Link>

        <div onClick={() => setModalOpen(true)} className={styles.linkButton}>
          <span>Access Existing Case</span>
        </div>
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Access Existing Case"
      >
        <div className={styles.modalContent}>
          {storedCases.length === 0 ? (
            <p>No existing cases found.</p>
          ) : (
            <div>
              {storedCases.map((c, i) => (
                <div
                  key={i}
                  onClick={() => handleSelectCase(c._id)}
                  className={styles.caseItem}
                >
                  <span>{c.name}</span> by <span>{c.author}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default Home;
