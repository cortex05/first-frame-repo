import React, { useEffect, useId, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { Stage, Layer, Line, Rect, Circle, Text, Group } from "react-konva";
import useCaseStore from "../../store/useCaseStore";
import useAuthStore from "../../store/useAuthStore";
import {
  isCaseConflict,
  saveQuestionAnswers,
  saveSeating,
  saveStudentDetails,
} from "../../api/case";
import { QuestionType } from "../../types/ENUMS";
import { cssVar } from "../../utils/cssVars";
import { RISK_LABELS, getRiskTiers, getStudentTotal, isPolled } from "../../utils/studentScores";
import { optionLetter } from "../../utils/seating";
import {
  applyLocalStudentDetails,
  mergeStudentDetails,
} from "../../utils/studentDetails";

import Modal from "../../components/modal/Modal";
import StudentReportModal from "../../components/student-report/StudentReportModal";
import StudentSortModal from "../../components/student-report/StudentSortModal";
import SeatLayer from "../../components/seat-layer/SeatLayer";

import styles from "./QuestionsScreen.module.css";

const CIRCLE_R = 24;
const SCALE_MIN = 0.1;
const SCALE_MAX = 5;
const SCALE_STEP = 1.2;
const SIDEBAR_W = 300;
const GRID_SPACING = 40;

const isTrueLabel = (label) => label === true || label === "true";
const isFalseLabel = (label) => label === false || label === "false";

const QuestionsScreen = () => {
  const { caseId } = useParams();
  const activeCase = useCaseStore((state) =>
    state.cases.find((c) => c._id === caseId),
  );
  const updateCase = useCaseStore((state) => state.updateCase);
  const fetchUserCases = useCaseStore((state) => state.fetchUserCases);
  const userInfo = useAuthStore((state) => state.userInfo);

  const [selectedQuestionId, setSelectedQuestionId] = useState(null);
  const [currentAnswers, setCurrentAnswers] = useState({});
  const [activeOptionIndex, setActiveOptionIndex] = useState(null);
  const [showScores, setShowScores] = useState(false);
  const [sortModal, setSortModal] = useState(null); // 'high' | 'low' | null
  const [studentReport, setStudentReport] = useState(null); // studentId | null
  const [saveWarning, setSaveWarning] = useState(false); // boolean
  const [isSavingAnswers, setIsSavingAnswers] = useState(false);
  const [toast, setToast] = useState(null);
  const toastId = useRef(0);

  useEffect(() => {
    if (!toast) return undefined;

    const timeoutId = window.setTimeout(() => setToast(null), 1800);
    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  // Selecting a question unmounts its select button, so focus moves to the
  // expanded question's text instead of falling back to <body>.
  const selectedTextRef = useRef(null);
  useEffect(() => {
    if (selectedQuestionId !== null) selectedTextRef.current?.focus();
  }, [selectedQuestionId]);

  const [scale, setScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const stageRef = useRef(null);
  const lastPinchDist = useRef(0);

  // Spoken after a keyboard answer on a seat button (spec 014).
  const [announcement, setAnnouncement] = useState("");
  const noQuestionHintId = useId();
  const noOptionHintId = useId();

  const showToast = (message, type) => {
    toastId.current += 1;
    setToast({ id: toastId.current, message, type });
  };

  if (!activeCase) return <p style={{ padding: 32 }}>Case not found.</p>;

  const rects = (activeCase.chartData || {}).rects || [];
  const selectedQuestion =
    activeCase.questions.find((q) => q.id === selectedQuestionId) || null;
  const selectedQuestionOrder =
    selectedQuestionId === null
      ? null
      : activeCase.questions.findIndex((q) => q.id === selectedQuestionId) + 1;
  const stageWidth = window.innerWidth - SIDEBAR_W;
  const stageHeight = window.innerHeight;
  const isLightTheme = document.documentElement.dataset.theme === "light";
  const gridStartX = Math.floor((-stagePos.x / scale) / GRID_SPACING) * GRID_SPACING - GRID_SPACING;
  const gridStartY = Math.floor((-stagePos.y / scale) / GRID_SPACING) * GRID_SPACING - GRID_SPACING;
  const gridColumnCount = Math.ceil(stageWidth / scale / GRID_SPACING) + 3;
  const gridRowCount = Math.ceil(stageHeight / scale / GRID_SPACING) + 3;
  const gridXs = Array.from({ length: gridColumnCount }, (_, index) => gridStartX + index * GRID_SPACING);
  const gridYs = Array.from({ length: gridRowCount }, (_, index) => gridStartY + index * GRID_SPACING);

  const getAllSeatedStudents = () => rects.flatMap((r) => r.assignedStudents);

  const getDefaultFalseAnswers = (question) => {
    const falseOpt = question.options.find((o) => isFalseLabel(o.label));
    if (!falseOpt) return {};
    const defaults = {};
    getAllSeatedStudents().forEach((s) => {
      defaults[s.id] = falseOpt;
    });
    return defaults;
  };

  // ── scores & risk tiers ───────────────────────────────────────
  // Totals and the low/medium/high banding come from utils/studentScores, the
  // same rule the archive report uses, so archived risk matches these colors.
  const getStudentScore = (studentId) => getStudentTotal(activeCase, studentId);

  const allStudents = rects.flatMap((r) => r.assignedStudents);
  const scoreTiers = getRiskTiers(
    activeCase,
    allStudents.map((s) => s.id),
  );
  const getScoreTier = (studentId) => scoreTiers.get(studentId) ?? "low";

  // ── color helpers ─────────────────────────────────────────────
  // Canvas can't resolve `var(--x)`, so read the variables into literal hex
  // once per render and compare against these instead of raw color literals.
  const canvas = {
    light: cssVar("--light-text", "#fff"),
    black: cssVar("--color-text-primary", "#08060d"),
  };
  const riskFill = {
    high: cssVar("--risk-high-bg", "#F54927"),
    medium: cssVar("--risk-medium-bg", "#F7F46D"),
    low: cssVar("--risk-low-bg", "#5BF527"),
  };
  const riskText = {
    high: cssVar("--risk-high-text", "#121212"),
    medium: cssVar("--risk-medium-text", "#2E2E2D"),
    low: cssVar("--risk-low-text", "#2E2E2D"),
  };
  // Multiple-choice option colors: canvas fills and the option buttons.
  const mcColors = [
    cssVar("--mc-1", "#4caf50"),
    cssVar("--mc-2", "#f44336"),
    cssVar("--mc-3", "#ff9800"),
    cssVar("--mc-4", "#009688"),
  ];

  const getScoreColor = (studentId) => riskFill[getScoreTier(studentId)];

  const getStudentFill = (studentId) => {
    if (showScores) return getScoreColor(studentId);
    if (!selectedQuestion) return canvas.light;
    const answer = currentAnswers[studentId];
    if (answer === undefined) return canvas.light;
    if (selectedQuestion.type === QuestionType.TRUE_FALSE) {
      return isTrueLabel(answer.label) ? canvas.black : canvas.light;
    }
    const idx = selectedQuestion.options.findIndex(
      (o) => o.label === answer.label,
    );
    return idx >= 0 ? mcColors[idx] : canvas.light;
  };

  const getStudentTextColor = (studentId) => {
    if (showScores) return riskText[getScoreTier(studentId)];
    if (selectedQuestion?.type === QuestionType.TRUE_FALSE) {
      const answer = currentAnswers[studentId];
      return isTrueLabel(answer?.label) ? canvas.light : canvas.black;
    }
    return getStudentFill(studentId) === canvas.light
      ? canvas.black
      : canvas.light;
  };

  // const getStudentStrokeWidth = (studentId) => {
  //   if (selectedQuestion?.type !== QuestionType.TRUE_FALSE) return 1.5;
  //   const answer = currentAnswers[studentId];
  //   return isTrueLabel(answer?.label) ? 3 : 1.5;
  // };

  // ── question selection ─────────────────────────────────────────
  const handleSelectQuestion = (questionId) => {
    if (selectedQuestionId !== questionId) {
      const question = activeCase.questions.find((q) => q.id === questionId);
      const savedAnswers = (activeCase.answers || {})[questionId] || {};
      setSelectedQuestionId(questionId);
      setActiveOptionIndex(null);
      if (question?.type === QuestionType.TRUE_FALSE) {
        // Polled = the case has saved answers for it (spec 010). Until then a
        // true/false question starts with everyone on "false".
        if (!isPolled(activeCase, questionId)) {
          setCurrentAnswers(getDefaultFalseAnswers(question));
        } else {
          setCurrentAnswers(
            Object.keys(savedAnswers).length > 0
              ? savedAnswers
              : getDefaultFalseAnswers(question),
          );
        }
      } else {
        setCurrentAnswers(savedAnswers);
      }
      setShowScores(false);
    }
  };

  // ── student tap ────────────────────────────────────────────────
  const handleStudentTap = (studentId) => {
    if (showScores) {
      setStudentReport(studentId);
      return;
    }
    if (!selectedQuestion) return;
    if (selectedQuestion.type === QuestionType.TRUE_FALSE) {
      const trueOpt = selectedQuestion.options.find((o) => isTrueLabel(o.label));
      const falseOpt = selectedQuestion.options.find((o) => isFalseLabel(o.label));
      if (!trueOpt || !falseOpt) return;
      setCurrentAnswers((prev) => ({
        ...prev,
        [studentId]: isTrueLabel(prev[studentId]?.label) ? falseOpt : trueOpt,
      }));
    } else {
      if (activeOptionIndex === null) return;
      setCurrentAnswers((prev) => ({
        ...prev,
        [studentId]: selectedQuestion.options[activeOptionIndex],
      }));
    }
  };

  // ── keyboard / screen-reader seats (spec 014) ──────────────────
  const optionIndexOf = (answer) =>
    answer ? selectedQuestion.options.findIndex((o) => o.label === answer.label) : -1;

  const answerMessage = (studentId, answer) => {
    if (selectedQuestion.type === QuestionType.TRUE_FALSE) {
      return `Student ${studentId}: ${isTrueLabel(answer?.label) ? "True" : "False"}`;
    }
    const index = optionIndexOf(answer);
    return `Student ${studentId}: Option ${optionLetter(index)}, ${answer.label}`;
  };

  const getSeatState = (studentId) => {
    if (showScores) {
      const tier = RISK_LABELS[getScoreTier(studentId)];
      return { name: `Student ${studentId}, ${getStudentScore(studentId)} points, ${tier} risk` };
    }
    if (!selectedQuestion) {
      return { name: `Student ${studentId}`, disabled: true, hintId: noQuestionHintId };
    }
    const answer = currentAnswers[studentId];
    if (selectedQuestion.type === QuestionType.TRUE_FALSE) {
      return { name: `Student ${studentId}`, pressed: isTrueLabel(answer?.label) };
    }
    const index = optionIndexOf(answer);
    return {
      name:
        index >= 0
          ? `Student ${studentId}, Option ${optionLetter(index)}: ${answer.label}`
          : `Student ${studentId}, no answer`,
      disabled: activeOptionIndex === null,
      hintId: activeOptionIndex === null ? noOptionHintId : undefined,
    };
  };

  // Same as tapping the circle, plus an announcement of the new answer.
  const handleSeatActivate = (studentId) => {
    let next = null;
    if (!showScores && selectedQuestion) {
      if (selectedQuestion.type === QuestionType.TRUE_FALSE) {
        const trueOpt = selectedQuestion.options.find((o) => isTrueLabel(o.label));
        const falseOpt = selectedQuestion.options.find((o) => isFalseLabel(o.label));
        if (trueOpt && falseOpt) {
          next = isTrueLabel(currentAnswers[studentId]?.label) ? falseOpt : trueOpt;
        }
      } else if (activeOptionIndex !== null) {
        next = selectedQuestion.options[activeOptionIndex];
      }
    }
    handleStudentTap(studentId);
    if (next) setAnnouncement(answerMessage(studentId, next));
  };

  // A-D / 1-4 on a seat: pick that option and give it to the student at once.
  // Sets the answer directly -- handleStudentTap would still see the old option.
  const handleSeatLetter = (studentId, index) => {
    if (showScores || !selectedQuestion) return;
    if (selectedQuestion.type !== QuestionType.MULTIPLE_CHOICE) return;
    const option = selectedQuestion.options[index];
    if (!option) return;
    setActiveOptionIndex(index);
    setCurrentAnswers((prev) => ({ ...prev, [studentId]: option }));
    setAnnouncement(answerMessage(studentId, option));
  };

  // The circle's text: "7·B" once a multiple-choice answer is set.
  const multipleChoiceSeatText = (studentId) => {
    const index = selectedQuestion ? optionIndexOf(currentAnswers[studentId]) : -1;
    return index >= 0 ? `${studentId}·${optionLetter(index)}` : String(studentId);
  };

  // Replaces the local copies with the server's after a conflict.
  const reloadCases = async () => {
    try {
      await fetchUserCases(userInfo.token);
      localStorage.setItem(
        "cases",
        JSON.stringify(useCaseStore.getState().cases),
      );
    } catch {
      // The conflict message is shown either way.
    }
  };

  // ── save answers ───────────────────────────────────────────────
  const handleSaveAnswers = async () => {
    if (!selectedQuestion) return;

    if (!userInfo?.token) {
      showToast("You must be logged in to save answers.", "error");
      return;
    }

    setIsSavingAnswers(true);

    try {
      // Only this question's answers go to the server, so someone answering
      // another question of the same case at the same time keeps their work.
      let savedCase = await saveQuestionAnswers(
        activeCase._id,
        selectedQuestionId,
        currentAnswers,
        userInfo.token,
      );
      // A case seated before seating had its own endpoint holds its chart only
      // in this browser; send it once so taking the server copy keeps it.
      if (activeCase.seated && !savedCase.seated) {
        savedCase = await saveSeating(activeCase._id, activeCase, userInfo.token);
      }
      updateCase(savedCase);
      localStorage.setItem(
        "cases",
        JSON.stringify(useCaseStore.getState().cases),
      );
      showToast("Answers saved!", "success");
    } catch (requestError) {
      // The question was removed by someone else: show the current case.
      if (isCaseConflict(requestError)) {
        await reloadCases();
      }
      showToast(
        requestError?.response?.data?.message ||
          "Unable to save answers. Please try again.",
        "error",
      );
    } finally {
      setIsSavingAnswers(false);
    }
  };

  // ── student details ────────────────────────────────────────────
  // Only `studentDetails` is merged into the stored case, so answers still being
  // tapped (currentAnswers) are untouched.
  // Errors, 404 included, are shown in the report modal.
  const handleSaveStudentDetails = async (studentNumber, payload) => {
    const currentCase = () =>
      useCaseStore.getState().cases.find((c) => c._id === activeCase._id) || activeCase;

    if (!userInfo?.token) {
      updateCase(applyLocalStudentDetails(currentCase(), studentNumber, payload));
    } else {
      const saved = await saveStudentDetails(activeCase._id, studentNumber, payload, userInfo.token);
      updateCase(mergeStudentDetails(currentCase(), saved.studentDetails));
    }

    localStorage.setItem(
      "cases",
      JSON.stringify(useCaseStore.getState().cases),
    );
  };

  // ── zoom / pan ─────────────────────────────────────────────────
  const clampScale = (s) => Math.min(SCALE_MAX, Math.max(SCALE_MIN, s));

  const zoomBy = (factor) => {
    const stage = stageRef.current;
    const oldScale = stage.scaleX();
    const newScale = clampScale(oldScale * factor);
    const center = {
      x: (window.innerWidth - SIDEBAR_W) / 2,
      y: window.innerHeight / 2,
    };
    const pointTo = {
      x: (center.x - stage.x()) / oldScale,
      y: (center.y - stage.y()) / oldScale,
    };
    setScale(newScale);
    setStagePos({
      x: center.x - pointTo.x * newScale,
      y: center.y - pointTo.y * newScale,
    });
  };

  const handleWheel = (e) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    const pointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };
    const newScale = clampScale(
      e.evt.deltaY < 0 ? oldScale * SCALE_STEP : oldScale / SCALE_STEP,
    );
    setScale(newScale);
    setStagePos({
      x: pointer.x - pointTo.x * newScale,
      y: pointer.y - pointTo.y * newScale,
    });
  };

  const handleTouchMove = (e) => {
    const touches = e.evt.touches;
    if (touches.length !== 2) return;
    e.evt.preventDefault();
    const [t1, t2] = [touches[0], touches[1]];
    const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
    if (lastPinchDist.current === 0) {
      lastPinchDist.current = dist;
      return;
    }
    const stage = stageRef.current;
    const oldScale = stage.scaleX();
    const midX = (t1.clientX + t2.clientX) / 2;
    const midY = (t1.clientY + t2.clientY) / 2;
    const pointTo = {
      x: (midX - stage.x()) / oldScale,
      y: (midY - stage.y()) / oldScale,
    };
    const newScale = clampScale(oldScale * (dist / lastPinchDist.current));
    lastPinchDist.current = dist;
    setScale(newScale);
    setStagePos({
      x: midX - pointTo.x * newScale,
      y: midY - pointTo.y * newScale,
    });
  };

  const handleTouchEnd = (e) => {
    if (e.evt.touches.length < 2) lastPinchDist.current = 0;
  };

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      {toast && (
        <div
          key={toast.id}
          role={toast.type === "error" ? "alert" : "status"}
          className={`${styles.toast} ${toast.type === "error" ? styles.toastError : styles.toastSuccess}`}
        >
          {toast.message}
        </div>
      )}

      {/* A live region, not role="status": the save toast is the screen's status. */}
      <p aria-live="polite" aria-atomic="true" className={styles.srOnly} data-testid="seat-announcer">
        {announcement}
      </p>
      <span id={noQuestionHintId} className={styles.srOnly}>
        Select a question first
      </span>
      <span id={noOptionHintId} className={styles.srOnly}>
        Select an option first
      </span>

      {/* ── Sidebar ── */}
      <div
        style={{
          width: SIDEBAR_W,
          flexShrink: 0,
          background: "var(--surface-subtle)", // mod this color
          borderRight: "2px solid var(--color-text-primary)",
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
          padding: 16,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <h2 style={{ margin: 0, fontSize: 16, color: "var(--modal-text)" }}>
            Questions
          </h2>
          <button
            onClick={() => {
              setShowScores((v) => {
                if (v) setSelectedQuestionId(null);
                return !v;
              });
            }}
            style={{
              padding: "5px 12px",
              fontSize: 13,
              fontWeight: 600,
              background: showScores ? "var(--blue-background)" : "var(--surface-selected)",
              color: showScores ? "var(--light-text)" : "var(--modal-text)",
              border: "1px solid var(--modal-text)",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            Scores
          </button>
        </div>

        {showScores ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button
              style={{
                width: "100%",
                padding: "12px 0",
                fontSize: 15,
                fontWeight: 600,
                background: "var(--blue-background)",
                color: "var(--light-text)",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
              }}
              onClick={() => setSaveWarning(true)}
            >
              Back to Case
            </button>

            <button
              onClick={() => setSortModal("high")}
              style={{
                width: "100%",
                padding: "12px 0",
                fontSize: 15,
                fontWeight: 600,
                background: "var(--blue-background)",
                color: "var(--light-text)",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
              }}
            >
              High to Low
            </button>
            <button
              onClick={() => setSortModal("low")}
              style={{
                width: "100%",
                padding: "12px 0",
                fontSize: 15,
                fontWeight: 600,
                background: "var(--blue-background)",
                color: "var(--light-text)",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
              }}
            >
              Low to High
            </button>
          </div>
        ) : (
          <React.Fragment>
            {activeCase.questions.length === 0 && (
              <p style={{ color: "var(--modal-text)", fontSize: 13 }}>
                No questions on this case.
              </p>
            )}

            <button
              style={{
                width: "100%",
                padding: "12px 0",
                fontSize: 15,
                fontWeight: 600,
                background: "var(--blue-background)",
                color: "var(--light-text)",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
								marginBottom: 12
              }}
              onClick={() => setSaveWarning(true)}
            >
              Back to Case
            </button>

            {activeCase.questions.map((q) => (
              <div
                key={q.id}
                className={`${
                  selectedQuestionId === q.id
                    ? styles.selectedQuestion
                    : styles.questionCard
                } ${
                  isPolled(activeCase, q.id) && selectedQuestionId !== q.id
                    ? styles.inactiveAfterFirstPoll
                    : ""
                }`}
              >
                {selectedQuestionId !== q.id && (
                  <button
                    type="button"
                    className={styles.questionSelectButton}
                    onClick={() => handleSelectQuestion(q.id)}
                  >
                    <span style={{ flex: 1, fontSize: 20 }}>{q.text}</span>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "2px 6px",
                        borderRadius: 10,
                        background:
                          q.type === QuestionType.TRUE_FALSE
                            ? "var(--tf-bg)"
                            : "var(--warning-bg)",
                        color:
                          q.type === QuestionType.TRUE_FALSE
                            ? "var(--tf-text)"
                            : "var(--warning-text)",
                      }}
                    >
                      {q.type === QuestionType.TRUE_FALSE ? "T/F" : "MC"}
                    </span>
                  </button>
                )}

                {selectedQuestionId === q.id && (
                  <div>
                    {/* Answer controls */}
                    {selectedQuestion && (
                      <div style={{ borderTop: "1px solid var(--light-blue-background)" }}>
                        <p
                          ref={selectedTextRef}
                          tabIndex={-1}
                          style={{
                            fontSize: 30,
                            fontWeight: 600,
                            color: "var(--modal-text)",
                            marginBottom: 12,
                          }}
                        >
                          <span
                            style={{
                              display: "block",
                              fontSize: 40,
                              fontWeight: 700,
                              color: "var(--text-link-muted)",
                              marginBottom: 6,
                            }}
                          >
                            {selectedQuestionOrder}/{activeCase.questions.length}
                          </span>
                          {selectedQuestion.text}
                        </p>

                        {selectedQuestion.type === QuestionType.TRUE_FALSE ? (
                          // <p
                          //   style={{
                          //     fontSize: 14,
                          //     color: "var(--text-strong)",
                          //     marginBottom: 12,
                          //   }}
                          // >
                          //   All students start as false (white) and a point value of {selectedQuestion.options.find((o) => o.label === false).value}. Tap a circle to
                          //   set true (black with X) and a value of {selectedQuestion.options.find((o) => o.label === true).value}.
                          // </p>
                          <React.Fragment>
                          </React.Fragment>
                        ) : (
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: 8,
                              marginBottom: 12,
                            }}
                          >
                            {selectedQuestion.options.map((opt, i) => (
                              <button
                                key={i}
                                onClick={() => setActiveOptionIndex(i)}
                                aria-label={`Option ${optionLetter(i)}, ${opt.label}, ${opt.value} points`}
                                style={{
                                  padding: "10px 12px",
                                  fontSize: 13,
                                  fontWeight: 600,
                                  background: mcColors[i],
                                  color: "var(--light-text)",
                                  border:
                                    activeOptionIndex === i
                                      ? "3px solid var(--text-strong)"
                                      : "3px solid transparent",
                                  borderRadius: 6,
                                  cursor: "pointer",
                                  textAlign: "left",
                                  opacity:
                                    activeOptionIndex !== null &&
                                    activeOptionIndex !== i
                                      ? 0.6
                                      : 1,
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  gap: 8,
                                }}
                              >
                                <span>
                                  <span className={styles.optionLetter}>{optionLetter(i)}</span>
                                  {opt.label}
                                </span>
                                <span>{opt.value}</span>
                              </button>
                            ))}
                          </div>
                        )}

                        <p
                          style={{
                            fontSize: 15,
                            color: "var(--text-strong)",
                            marginBottom: 12,
                          }}
                        >
                          {selectedQuestion.type === QuestionType.TRUE_FALSE
                            ? "Tap again to switch true circles back to false."
                            : activeOptionIndex !== null
                              ? `Tap students (or press A–D on a seat) to assign "${optionLetter(activeOptionIndex)}: ${selectedQuestion.options[activeOptionIndex].label}".`
                              : "Select an option above."}
                        </p>

                        <button
                          onClick={handleSaveAnswers}
                          disabled={isSavingAnswers}
                          style={{
                            width: "100%",
                            padding: "12px 0",
                            fontSize: 15,
                            fontWeight: 600,
                            background: "var(--blue-background)",
                            color: "var(--light-text)",
                            border: "none",
                            borderRadius: 6,
                            cursor: isSavingAnswers ? "not-allowed" : "pointer",
                            opacity: isSavingAnswers ? 0.75 : 1,
                            marginBottom: 16,
                          }}
                        >
                          {isSavingAnswers ? "Saving..." : "Save Answers"}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </React.Fragment>
        )}
      </div>

      {/* ── Sort modal ── */}
      {sortModal && (
        <StudentSortModal
          order={sortModal}
          students={allStudents}
          getScore={getStudentScore}
          getTier={getScoreTier}
          onSelectStudent={setStudentReport}
          onClose={() => setSortModal(null)}
        />
      )}

      {/* ── Student Report modal ── */}
      {studentReport !== null && (
        <StudentReportModal
          key={studentReport}
          activeCase={activeCase}
          studentNumber={studentReport}
          onClose={() => setStudentReport(null)}
          onSaveDetails={(payload) =>
            handleSaveStudentDetails(studentReport, payload)
          }
        />
      )}

      {/* Save Warning modal */}
      <Modal
        isOpen={saveWarning}
        hideDefaultClose
        onClose={() => setSaveWarning(false)}
        title="Are you sure?"
      >
        <h3 style={{
					color: `var(--modal-text)`,
					fontWeight: 500,
					maxWidth: 400,
				}}>
          Unsaved changes to the seating chart  will be lost if you
          leave this page.
        </h3>
        <div className={styles.saveModalButtons}>
          <button className={styles.confirm}>
            <Link to={`/case/${activeCase._id}`} style={{textDecoration: 'none', color: 'inherit'}}>Back to Case</Link>
          </button>
          <button
            className={styles.decline}
            onClick={() => setSaveWarning(false)}
          >
            Cancel
          </button>
        </div>
      </Modal>

      {/* ── Canvas area ── */}
      <div style={{ flex: 1, position: "relative" }}>
        {rects.length === 0 ? (
          <div style={{ padding: 32 }}>
            <p style={{ color: "var(--page-text)" }}>
              No seating chart saved yet. Complete the seating chart first.
            </p>
          </div>
        ) : (
          <React.Fragment>
            {/* Drawn for the eye; SeatLayer below is its accessible equivalent. */}
            <div aria-hidden="true">
              <Stage
                ref={stageRef}
                width={stageWidth}
                height={stageHeight}
                scaleX={scale}
                scaleY={scale}
                x={stagePos.x}
                y={stagePos.y}
                draggable
                onDragEnd={(e) =>
                  setStagePos({ x: e.target.x(), y: e.target.y() })
                }
                onWheel={handleWheel}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                <Layer>
                  {isLightTheme && (
                    <React.Fragment>
                      {gridXs.map((x) => (
                        <Line
                          key={`grid-x-${x}`}
                          points={[x, gridStartY, x, gridStartY + gridRowCount * GRID_SPACING]}
                          stroke={
                            Math.round(x / GRID_SPACING) % 5 === 0
                              ? cssVar("--light-blue-background", "#e4edf8")
                              : cssVar("--border-subtle", "#d5dbe3")
                          }
                          strokeWidth={1 / scale}
                          listening={false}
                        />
                      ))}
                      {gridYs.map((y) => (
                        <Line
                          key={`grid-y-${y}`}
                          points={[gridStartX, y, gridStartX + gridColumnCount * GRID_SPACING, y]}
                          stroke={
                            Math.round(y / GRID_SPACING) % 5 === 0
                              ? cssVar("--light-blue-background", "#e4edf8")
                              : cssVar("--border-subtle", "#d5dbe3")
                          }
                          strokeWidth={1 / scale}
                          listening={false}
                        />
                      ))}
                    </React.Fragment>
                  )}
                  {/* Row rectangles */}
                  {rects.map((r) => (
                    // Rotates about the rect's center, matching StartScreen.
                    // Seat circles are saved already rotated, as absolute x/y.
                    <Group
                      key={r.id}
                      x={r.x + r.width / 2}
                      y={r.y + r.height / 2}
                      offsetX={r.width / 2}
                      offsetY={r.height / 2}
                      rotation={r.rotation || 0}
                    >
                      <Rect
                        width={r.width}
                        height={r.height}
                        fill={cssVar("--border-control", "#bfbfbf")}
                        stroke={canvas.black}
                        strokeWidth={2}
                        cornerRadius={4}
                      />
                    </Group>
                  ))}

                  {/* Student circles */}
                  {rects.flatMap((r) =>
                    r.assignedStudents.map((s) => (
                      <Group
                        key={"c-" + s.id}
                        x={s.x}
                        y={s.y}
                        onClick={() => handleStudentTap(s.id)}
                        onTap={() => handleStudentTap(s.id)}
                      >
                        <Circle
                          radius={CIRCLE_R}
                          fill={getStudentFill(s.id)}
                          stroke={canvas.black}
                          strokeWidth={
                            // getStudentStrokeWidth(s.id)
                            1.5
                          }
                        />
                        <Text
                          x={-CIRCLE_R}
                          y={-CIRCLE_R}
                          width={CIRCLE_R * 2}
                          height={CIRCLE_R * 2}
                          text={
                            showScores
                              ? `#${s.id} - ${getStudentScore(s.id)}`
                              : selectedQuestion?.type === QuestionType.TRUE_FALSE
                                ? isTrueLabel(currentAnswers[s.id]?.label)
                                  ? "X"
                                  : String(s.id)
                                : multipleChoiceSeatText(s.id)
                          }
                          fontSize={showScores ? 9 : 12}
                          fill={getStudentTextColor(s.id)}
                          align="center"
                          verticalAlign="middle"
                          listening={false}
                        />
                      </Group>
                    )),
                  )}
                </Layer>
              </Stage>
            </div>

            <SeatLayer
              rects={rects}
              scale={scale}
              stagePos={stagePos}
              width={stageWidth}
              height={stageHeight}
              radius={CIRCLE_R}
              getSeatState={getSeatState}
              onActivate={handleSeatActivate}
              onLetter={handleSeatLetter}
              onBringIntoView={setStagePos}
            />

            {/* Zoom controls */}
            <div
              style={{
                position: "absolute",
                bottom: 16,
                left: 16,
                zIndex: 100,
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: "var(--surface-overlay-control)",
                border: "2px solid var(--color-text-primary)",
                borderRadius: 8,
                padding: "6px 10px",
                boxShadow: "0 2px 8px var(--shadow-soft)",
                userSelect: "none",
              }}
            >
              <button
                aria-label="Zoom out"
                onClick={() => zoomBy(1 / SCALE_STEP)}
                style={{
                  width: 28,
                  height: 28,
                  fontSize: 18,
                  lineHeight: 1,
                  border: "1px solid var(--grey-disabled)",
                  borderRadius: 4,
                  cursor: "pointer",
                  background: "var(--surface-muted)",
                }}
              >
                −
              </button>
              <span
                aria-live="off"
                style={{
                  minWidth: 52,
                  textAlign: "center",
                  fontSize: 14,
                  fontFamily: "monospace",
                  color: "var(--modal-text)"
                }}
              >
                {Math.round(scale * 100)}%
              </span>
              <button
                aria-label="Zoom in"
                onClick={() => zoomBy(SCALE_STEP)}
                style={{
                  width: 28,
                  height: 28,
                  fontSize: 18,
                  lineHeight: 1,
                  border: "1px solid var(--grey-disabled)",
                  borderRadius: 4,
                  cursor: "pointer",
                  background: "var(--surface-muted)",
                }}
              >
                +
              </button>
              <button
                aria-label="Reset zoom"
                onClick={() => {
                  setScale(1);
                  setStagePos({ x: 0, y: 0 });
                }}
                style={{
                  height: 28,
                  padding: "0 8px",
                  fontSize: 12,
                  border: "1px solid var(--grey-disabled)",
                  borderRadius: 4,
                  cursor: "pointer",
                  background: "var(--surface-muted)",
                  marginLeft: 4,
                }}
              >
                Reset
              </button>
            </div>
          </React.Fragment>
        )}
      </div>
    </div>
  );
};

export default QuestionsScreen;
