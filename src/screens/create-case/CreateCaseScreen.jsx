import React, { useEffect, useId, useState } from "react";
import { useNavigate } from "react-router-dom";

import Modal from "../../components/modal/Modal";
import OwnerPicker from "../../components/owner-picker/OwnerPicker";
import TopNavbar from "../../components/top-navbar/TopNavbar";

import useCaseStore from "../../store/useCaseStore";
import useAuthStore from "../../store/useAuthStore";
import useAccountStore, { activeUsersOf } from "../../store/useAccountStore";
import { createCase } from "../../api/case";

import {
  CASE_CATEGORIES_BY_AREA,
  caseCategoryLabel,
} from "../../types/caseCategories";
import { getBrowserTimeZone } from "../../utils/timezone";

import styles from "./CreateCaseScreen.module.css";
import usePageTitle from "../../hooks/usePageTitle";
import useFormError from "../../hooks/useFormError";
import FormError from "../../components/form-error/FormError";

const USERS_LOAD_ERROR = "Couldn't load the account's users. Reload the page to try again.";

/**
 * Creating a case is a purchase: the confirmation modal warns that payment will
 * be initiated, and the backend opens the case's transaction. Questions are
 * added on the case page once payment is processed.
 *
 * The attorney is picked from the account's active users and is always an
 * owner, so Case Owners appears once they're chosen and lists everyone else
 * (spec 021).
 */
const CreateCaseScreen = () => {
	usePageTitle("Create New Case");
	const navigate = useNavigate();
  const [clientName, setClientName] = useState("");
	const [attorneyId, setAttorneyId] = useState("");
  const [category, setCategory] = useState("");

	const [numberOfStudents, setNumberOfStudents] = useState("");
  // Users the case is handed to. Account admins see every case regardless.
  const [owners, setOwners] = useState([]);
  const [usersError, setUsersError] = useState("");

  const [confirmModal, setConfirmModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const idPrefix = useId();
  // Missing details, found before the payment confirmation opens (spec 016).
  const detailsError = useFormError();

  const addCase = useCaseStore((state) => state.addCase);
  const setActiveCase = useCaseStore((state) => state.setActiveCase);
  const userInfo = useAuthStore((state) => state.userInfo);
  const accountUsers = useAccountStore((state) => state.users);
  const isLoadingUsers = useAccountStore((state) => state.isLoadingUsers);
  const fetchAccountUsers = useAccountStore((state) => state.fetchAccountUsers);

  useEffect(() => {
    if (userInfo?.token) {
      fetchAccountUsers(userInfo.token).catch(() => {
        setUsersError(USERS_LOAD_ERROR);
      });
    }
  }, [userInfo?.token]);

  const attorneyOptions = activeUsersOf(accountUsers);
  const attorneyName = accountUsers.find((user) => user._id === attorneyId)?.username ?? "";

  // The attorney is always an owner, so they can't also be checked as one.
  const handleAttorneyChange = (event) => {
    const next = event.target.value;
    setAttorneyId(next);
    setOwners((previous) => previous.filter((id) => id !== next));
  };

  const openConfirmModal = () => {
    const missing = [
      [`${idPrefix}-client`, "Client Name", clientName.trim()],
      [`${idPrefix}-attorney`, "Attorney", attorneyId],
      [`${idPrefix}-category`, "Case Category", category],
      [`${idPrefix}-students`, "Number of Students", numberOfStudents],
    ].filter(([, , value]) => !value);

    if (missing.length > 0) {
      detailsError.setError(
        `Fill in: ${missing.map(([, label]) => label).join(", ")}`,
        missing.map(([id]) => id),
      );
      return;
    }

    detailsError.clear();
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

    if (!clientName.trim() || !attorneyId || !numberOfStudents || !category) {
      setSubmitError("Please complete all required case details before creating the case.");
      return;
    }

    setSubmitError("");
    setIsSubmitting(true);

    const casePayload = {
      clientName: clientName.trim(),
      attorney: attorneyName,
      attorneyId,
      category,
      studentNumber: Number(numberOfStudents),
      // The backend adds the attorney too; sending them keeps an older backend
      // giving them access.
      owners: [attorneyId, ...owners],
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

      <main className={styles.container}>
        <h1>Create New Case</h1>

      {/* Basic Info */} 
      <section style={{ marginBottom: 32,  }}>
        <h2 style={{ marginBottom: 16 }}>Basic Info</h2>

        <div className={styles.fieldStyle}>
          <label className={styles.labelStyle} htmlFor={`${idPrefix}-client`}>Client Name</label>
          <input
            id={`${idPrefix}-client`}
            {...detailsError.fieldProps(`${idPrefix}-client`)}
            className={styles.inputStyle} 
            type="text"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="Client name"
          />
        </div>

        <div className={styles.fieldStyle}>
          <label className={styles.labelStyle} htmlFor={`${idPrefix}-attorney`}>Attorney</label>
          <select
            id={`${idPrefix}-attorney`}
            {...detailsError.fieldProps(`${idPrefix}-attorney`)}
            className={styles.inputStyle}
            value={attorneyId}
            onChange={handleAttorneyChange}
            disabled={isLoadingUsers}
          >
            <option value="">
              {isLoadingUsers ? "Loading users..." : "Select an attorney..."}
            </option>
            {attorneyOptions.map((user) => (
              <option key={user._id} value={user._id}>
                {user.username}
              </option>
            ))}
          </select>
          <FormError message={usersError} className={styles.formError} />
        </div>

        <div className={styles.fieldStyle}>
          <label className={styles.labelStyle} htmlFor={`${idPrefix}-category`}>Case Category</label>
          <select
            id={`${idPrefix}-category`}
            {...detailsError.fieldProps(`${idPrefix}-category`)}
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
          <label className={styles.labelStyle} htmlFor={`${idPrefix}-students`}>Number of Students</label>
          <input
            id={`${idPrefix}-students`}
            {...detailsError.fieldProps(`${idPrefix}-students`)}
            className={styles.inputStyle}
            type="number"
            min={1}
            value={numberOfStudents}
            onChange={(e) => setNumberOfStudents(e.target.value)}
            placeholder="e.g. 30"
          />
        </div>

        {attorneyId && (
          <div className={styles.fieldStyle}>
            <span className={styles.labelStyle} id={`${idPrefix}-owners`}>Case Owners</span>
            <p className={styles.ownersHint} id={`${idPrefix}-owners-hint`}>
              The attorney can always open this case. Owners can also open, run and archive it.
              Account admins can always see it.
            </p>
            <OwnerPicker
              users={accountUsers}
              value={owners}
              onChange={setOwners}
              labelledBy={`${idPrefix}-owners`}
              describedBy={`${idPrefix}-owners-hint`}
              excludeIds={[attorneyId]}
              emptyMessage="No other users in this account."
            />
          </div>
        )}
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
      <FormError
        id={detailsError.messageId}
        message={detailsError.message}
        version={detailsError.version}
        className={styles.formError}
      />

      {/* Purchase Confirmation Modal */}
        <Modal
          isOpen={confirmModal}
          onClose={closeConfirmModal}
          title="Confirm Case"
          hideDefaultClose
          closeDisabled={isSubmitting}
        >
          <div style={{ fontSize: 20, marginBottom: 16, lineHeight: 1.8, color: "var(--modal-text)" }}>
            <div>
              <strong>Client Name:</strong> {clientName || "—"}
            </div>
            <div>
              <strong>Attorney:</strong> {attorneyName || "—"}
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

          <FormError message={submitError} className={styles.submitError} />

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
        </main>
    </React.Fragment>
  );
};

export default CreateCaseScreen;
