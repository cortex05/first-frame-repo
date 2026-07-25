import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Modal from "../../components/modal/Modal";
import TopNavbar from "../../components/top-navbar/TopNavbar";
import styles from "./HomeScreen.module.css";

import useCaseStore from "../../store/useCaseStore";
import useAuthStore from "../../store/useAuthStore";

const Home = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const cases = useCaseStore((state) => state.cases);
  const fetchUserCases = useCaseStore((state) => state.fetchUserCases);
  const setActiveCase = useCaseStore((state) => state.setActiveCase);
  const userInfo = useAuthStore((state) => state.userInfo);

  const navigate = useNavigate();

  useEffect(() => {
    if (userInfo?.token) {
      fetchUserCases(userInfo.token);
    }
  }, [userInfo?.token]);

  const handleSelectCase = (caseId) => {
    setActiveCase(caseId);
    setModalOpen(false);
    navigate(`/case/${caseId}`);
  };

  return (
    <React.Fragment>
      <TopNavbar />

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
            {cases.length === 0 ? (
              <p>No existing cases found.</p>
            ) : (
              <div>
                {cases.map((c) => (
                  <div
                    key={c._id}
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
    </React.Fragment>
  );
};

export default Home;
