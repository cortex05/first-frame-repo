import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import Modal from "../../components/modal/Modal";
import OwnerPicker from "../../components/owner-picker/OwnerPicker";
import TopNavbar from "../../components/top-navbar/TopNavbar";

import useCaseStore from "../../store/useCaseStore";
import useAuthStore from "../../store/useAuthStore";
import useAccountStore from "../../store/useAccountStore";
import { createCase } from "../../api/case";

import {
  CASE_CATEGORIES_BY_AREA,
  caseCategoryLabel,
} from "../../types/caseCategories";
import { getBrowserTimeZone } from "../../utils/timezone";

import styles from "./CreateCaseScreen.module.css";

/**
 * Creating a case is a purchase: the confirmation modal warns that payment will
 * be initiated, and the backend opens the case's transaction. Questions are
 * added on the case page once payment is processed.
 */
const CreateCaseScreen = () => {
	const navigate = useNavigate();
  const [clientName, setClientName] = useState("");
	const [attorney, setAttorney] = useState("");
  const [category, setCategory] = useState("");

	const [numberOfStudents, setNumberOfStudents] = useState("");
  // Users the case is handed to. Account admins see every case regardless.
  const [owners, setOwners] = useState([]);

  const [confirmModal, setConfirmModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const addCase = useCaseStore((state) => state.addCase);
  const setActiveCase = useCaseStore((state) => state.setActiveCase);
  const userInfo = useAuthStore((state) => state.userInfo);
  const accountUsers = useAccountStore((state) => state.users);
  const fetchAccountUsers = useAccountStore((state) => state.fetchAccountUsers);

  useEffect(() => {
    if (userInfo?.token) {
      fetchAccountUsers(userInfo.token).catch(() => {
        // The picker shows its empty state; creating a case still works.
      });
    }
  }, [userInfo?.token]);

  const openConfirmModal = () => {
    setSubmitError("");
    setConfirmModal(true);
  };

  const closeConfirmModal = () => {
    if (isSubmitting) return;
    setConfirmModal(false);
  };

  const handleSubmit = async () => {
    if (!userInfo?.token) {
      setSubmitError("You must be logged in to create a case.");
      return;
    }

    if (!clientName.trim() || !numberOfStudents || !category) {
      setSubmitError("Please complete all required case details before creating the case.");
      return;
    }

    setSubmitError("");
    setIsSubmitting(true);

    const casePayload = {
      clientName: clientName.trim(),
      attorney: attorney.trim() || userInfo.username,
      category,
      studentNumber: Number(numberOfStudents),
      owners,
      timezone: getBrowserTimeZone(),
    };

    try {
      const createdCase = await createCase(casePayload, userInfo.token);
      addCase(createdCase);
      setActiveCase(createdCase._id);
      setConfirmModal(false);
      navigate(`/case/${createdCase._id}`);
    } catch (requestError) {
      setSubmitError(
        requestError?.response?.data?.message || "Unable to create case. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <React.Fragment>
      <TopNavbar warnOnHomeNavigation />

      <div className={styles.container}>
        <h1>Create New Case</h1>

      {/* Basic Info */} 
      <section style={{ marginBottom: 32,  }}>
        <h2 style={{ marginBottom: 16 }}>Basic Info</h2>

        <div className={styles.fieldStyle}>
          <label className={styles.labelStyle}>Client Name</label>
          <input
            className={styles.inputStyle}
            type="text"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="Client name"
          />
        </div>

        <div className={styles.fieldStyle}>
          <label className={styles.labelStyle}>Attorney</label>
          <input
            className={styles.inputStyle}
            type="text"
            value={attorney}
            onChange={(e) => setAttorney(e.target.value)}
            placeholder="Attorney name"
          />
        </div>

        <div className={styles.fieldStyle}>
          <label className={styles.labelStyle}>Case Category</label>
          <select
            className={styles.inputStyle}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">Select a case category...</option>
            {Object.entries(CASE_CATEGORIES_BY_AREA).map(([area, categories]) => (
              <optgroup key={area} label={area}>
                {categories.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.matter}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        <div className={styles.fieldStyle}>
          <label className={styles.labelStyle}>Number of Students</label>
          <input
            className={styles.inputStyle}
            type="number"
            min={1}
            value={numberOfStudents}
            onChange={(e) => setNumberOfStudents(e.target.value)}
            placeholder="e.g. 30"
          />
        </div>

        <div className={styles.fieldStyle}>
          <label className={styles.labelStyle}>Case Owners</label>
          <p className={styles.ownersHint}>
            Owners can open, run and archive this case. Account admins can always see it.
          </p>
          <OwnerPicker users={accountUsers} value={owners} onChange={setOwners} />
        </div>
      </section>

      {/* Questions */}
      <section style={{ marginBottom: 32 }}>
        <h2 style={{ marginBottom: 12 }}>Questions</h2>
        <p className={styles.paymentNotice}>
          Questions can be created and viewed once payment is processed.
        </p>
      </section>

      {/* Submit */}
      <button
        onClick={openConfirmModal}
        className={styles.linkButton}
      >
        Create Case
      </button>

      {/* Purchase Confirmation Modal */}
        <Modal
          isOpen={confirmModal}
          onClose={closeConfirmModal}
          title="Confirm Case"
          hideDefaultClose
        >
          <div style={{ fontSize: 20, marginBottom: 16, lineHeight: 1.8, color: "var(--modal-text)" }}>
            <div>
              <strong>Client Name:</strong> {clientName || "—"}
            </div>
            <div>
              <strong>Attorney:</strong> {attorney || "—"}
            </div>
            <div>
              <strong>Case Category:</strong> {caseCategoryLabel(category)}
            </div>
            <div>
              <strong>Students:</strong> {numberOfStudents || "—"}
            </div>
          </div>

          <p className={styles.paymentWarning}>
            Creating this case will initiate payment.
          </p>

          {submitError && (
            <p className={styles.submitError}>{submitError}</p>
          )}

          <div className={styles.confirmRow}>
            <button
              onClick={handleSubmit}
              className={styles.confirmButton}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating..." : "Yes, create case"}
            </button>
            <button
              onClick={closeConfirmModal}
              className={styles.declineButton}
              disabled={isSubmitting}
            >
              No
            </button>
          </div>
        </Modal>
        </div>
    </React.Fragment>
  );
};

export default CreateCaseScreen;
