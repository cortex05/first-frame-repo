import React, { useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Stage, Layer, Rect, Circle, Text, Group } from 'react-konva';
import useCaseStore from '../../store/useCaseStore';
import { QuestionType } from '../../types/ENUMS';

const CIRCLE_R = 18;
const SCALE_MIN = 0.1;
const SCALE_MAX = 5;
const SCALE_STEP = 1.2;
const SIDEBAR_W = 300;
const MC_COLORS = ['#4caf50', '#f44336', '#ff9800', '#009688'];

const QuestionsScreen = () => {
  const { caseId } = useParams();
  const activeCase = useCaseStore((state) => state.cases.find((c) => c._id === caseId));
  const updateCase = useCaseStore((state) => state.updateCase);

  const [selectedQuestionId, setSelectedQuestionId] = useState(null);
  const [currentAnswers, setCurrentAnswers] = useState({});
  const [activeOptionIndex, setActiveOptionIndex] = useState(null);
  const [showScores, setShowScores] = useState(false);

  const [scale, setScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const stageRef = useRef(null);
  const lastPinchDist = useRef(0);

  if (!activeCase) return <p style={{ padding: 32 }}>Case not found.</p>;

  const rects = activeCase.chartData?.rects ?? [];
  const selectedQuestion = activeCase.questions.find((q) => q.id === selectedQuestionId) ?? null;

  // ── score helper ──────────────────────────────────────────────
  const getStudentScore = (studentId) => {
    const answers = activeCase.answers ?? {};
    return Object.values(answers).reduce(
      (sum, qAnswers) => sum + (qAnswers[studentId]?.value ?? 0),
      0
    );
  };

  // ── score colour (gradient: #5BF527 low → #F54927 high) ────────
  const _allStudents = rects.flatMap((r) => r.assignedStudents);
  const _allScores = _allStudents.map((s) => getStudentScore(s.id));
  const _minScore = _allScores.length ? Math.min(..._allScores) : 0;
  const _maxScore = _allScores.length ? Math.max(..._allScores) : 0;

  const getScoreColor = (studentId) => {
    const score = getStudentScore(studentId);
    if (_maxScore === _minScore) return '#5BF527';
    const range = _maxScore - _minScore;
    if (score <= _minScore + range / 3) return '#5BF527';
    if (score <= _minScore + (2 * range) / 3) return '#F7F46D';
    return '#F54927';
  };

  // ── colour helpers ─────────────────────────────────────────────
  const getStudentFill = (studentId) => {
    if (showScores) return getScoreColor(studentId);
    if (!selectedQuestion) return '#fff';
    const answer = currentAnswers[studentId];
    if (answer === undefined) return '#fff';
    if (selectedQuestion.type === QuestionType.TRUE_FALSE) {
      return answer.label === true ? '#4caf50' : '#f44336';
    }
    const idx = selectedQuestion.options.findIndex((o) => o.label === answer.label);
    return idx >= 0 ? MC_COLORS[idx] : '#fff';
  };

  const getStudentTextColor = (studentId) => {
    if (showScores) return getScoreColor(studentId) === '#F54927' ? '#fff' : '#2E2E2D';
    return getStudentFill(studentId) === '#fff' ? '#2c6fad' : '#fff';
  };

  // ── question selection ─────────────────────────────────────────
  const handleSelectQuestion = (questionId) => {
    setSelectedQuestionId(questionId);
    setActiveOptionIndex(null);
    setCurrentAnswers((activeCase.answers ?? {})[questionId] ?? {});
    setShowScores(false);
  };

  // ── T/F set all ────────────────────────────────────────────────
  const handleSetAllTF = (optionObj) => {
    const all = rects.flatMap((r) => r.assignedStudents);
    const answers = {};
    all.forEach((s) => { answers[s.id] = optionObj; });
    setCurrentAnswers(answers);
  };

  // ── student tap ────────────────────────────────────────────────
  const handleStudentTap = (studentId) => {
    if (!selectedQuestion) return;
    if (selectedQuestion.type === QuestionType.TRUE_FALSE) {
      const trueOpt = selectedQuestion.options.find((o) => o.label === true);
      const falseOpt = selectedQuestion.options.find((o) => o.label === false);
      setCurrentAnswers((prev) => ({
        ...prev,
        [studentId]: prev[studentId]?.label === true ? falseOpt : trueOpt,
      }));
    } else {
      if (activeOptionIndex === null) return;
      setCurrentAnswers((prev) => ({ ...prev, [studentId]: selectedQuestion.options[activeOptionIndex] }));
    }
  };

  // ── save answers ───────────────────────────────────────────────
  const handleSaveAnswers = () => {
    if (!selectedQuestion) return;
    const newAnswers = { ...(activeCase.answers ?? {}), [selectedQuestionId]: currentAnswers };
    updateCase({ ...activeCase, answers: newAnswers });
    localStorage.setItem('cases', JSON.stringify(useCaseStore.getState().cases));
	alert('Answers saved!');
  };

  // ── zoom / pan ─────────────────────────────────────────────────
  const clampScale = (s) => Math.min(SCALE_MAX, Math.max(SCALE_MIN, s));

  const zoomBy = (factor) => {
    const stage = stageRef.current;
    const oldScale = stage.scaleX();
    const newScale = clampScale(oldScale * factor);
    const center = { x: (window.innerWidth - SIDEBAR_W) / 2, y: window.innerHeight / 2 };
    const pointTo = {
      x: (center.x - stage.x()) / oldScale,
      y: (center.y - stage.y()) / oldScale,
    };
    setScale(newScale);
    setStagePos({ x: center.x - pointTo.x * newScale, y: center.y - pointTo.y * newScale });
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
    const newScale = clampScale(e.evt.deltaY < 0 ? oldScale * SCALE_STEP : oldScale / SCALE_STEP);
    setScale(newScale);
    setStagePos({ x: pointer.x - pointTo.x * newScale, y: pointer.y - pointTo.y * newScale });
  };

  const handleTouchMove = (e) => {
    const touches = e.evt.touches;
    if (touches.length !== 2) return;
    e.evt.preventDefault();
    const [t1, t2] = [touches[0], touches[1]];
    const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
    if (lastPinchDist.current === 0) { lastPinchDist.current = dist; return; }
    const stage = stageRef.current;
    const oldScale = stage.scaleX();
    const midX = (t1.clientX + t2.clientX) / 2;
    const midY = (t1.clientY + t2.clientY) / 2;
    const pointTo = { x: (midX - stage.x()) / oldScale, y: (midY - stage.y()) / oldScale };
    const newScale = clampScale(oldScale * (dist / lastPinchDist.current));
    lastPinchDist.current = dist;
    setScale(newScale);
    setStagePos({ x: midX - pointTo.x * newScale, y: midY - pointTo.y * newScale });
  };

  const handleTouchEnd = (e) => {
    if (e.evt.touches.length < 2) lastPinchDist.current = 0;
  };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>

      {/* ── Sidebar ── */}
      <div style={{
        width: SIDEBAR_W, flexShrink: 0, background: '#f5f8ff',
        borderRight: '1px solid #c5d8f5', display: 'flex',
        flexDirection: 'column', overflowY: 'auto', padding: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 16, color: '#2c6fad' }}>Questions</h2>
          <button
            onClick={() => setShowScores((v) => !v)}
            style={{
              padding: '5px 12px', fontSize: 13, fontWeight: 600,
              background: showScores ? '#2c6fad' : '#e3edf7',
              color: showScores ? '#fff' : '#2c6fad',
              border: '1px solid #2c6fad', borderRadius: 6, cursor: 'pointer',
            }}
          >
            Scores
          </button>
        </div>

        {activeCase.questions.length === 0 && (
          <p style={{ color: '#888', fontSize: 13 }}>No questions on this case.</p>
        )}

        {activeCase.questions.map((q) => (
          <div
            key={q.id}
            onClick={() => handleSelectQuestion(q.id)}
            style={{
              padding: '10px 12px', marginBottom: 6, borderRadius: 6, cursor: 'pointer',
              background: selectedQuestionId === q.id ? '#2c6fad' : '#fff',
              color: selectedQuestionId === q.id ? '#fff' : '#333',
              border: '1px solid #c5d8f5', fontSize: 13,
              display: 'flex', alignItems: 'center', gap: 8,
            }}
          >
            <span style={{ flex: 1 }}>{q.text}</span>
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 10,
              background: q.type === QuestionType.TRUE_FALSE ? '#e6f4ea' : '#fff3cd',
              color: q.type === QuestionType.TRUE_FALSE ? '#2e7d32' : '#856404',
            }}>
              {q.type === QuestionType.TRUE_FALSE ? 'T/F' : 'MC'}
            </span>
          </div>
        ))}

        {/* Answer controls */}
        {selectedQuestion && (
          <div style={{ borderTop: '1px solid #c5d8f5', paddingTop: 16, marginTop: 8 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 12 }}>
              {selectedQuestion.text}
            </p>

            {selectedQuestion.type === QuestionType.TRUE_FALSE ? (
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <button
                  onClick={() => handleSetAllTF(selectedQuestion.options.find((o) => o.label === true))}
                  style={{
                    flex: 1, padding: '10px 0', fontSize: 14, fontWeight: 600,
                    background: '#4caf50', color: '#fff',
                    border: 'none', borderRadius: 6, cursor: 'pointer',
                  }}
                >All True</button>
                <button
                  onClick={() => handleSetAllTF(selectedQuestion.options.find((o) => o.label === false))}
                  style={{
                    flex: 1, padding: '10px 0', fontSize: 14, fontWeight: 600,
                    background: '#f44336', color: '#fff',
                    border: 'none', borderRadius: 6, cursor: 'pointer',
                  }}
                >All False</button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                {selectedQuestion.options.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveOptionIndex(i)}
                    style={{
                      padding: '10px 12px', fontSize: 13, fontWeight: 600,
                      background: MC_COLORS[i], color: '#fff',
                      border: activeOptionIndex === i ? '3px solid #222' : '3px solid transparent',
                      borderRadius: 6, cursor: 'pointer', textAlign: 'left',
                      opacity: activeOptionIndex !== null && activeOptionIndex !== i ? 0.6 : 1,
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}

            <p style={{ fontSize: 11, color: '#888', marginBottom: 12 }}>
              {selectedQuestion.type === QuestionType.TRUE_FALSE
                ? 'Tap a student circle to toggle their answer.'
                : activeOptionIndex !== null
                  ? `Tap students to assign "${selectedQuestion.options[activeOptionIndex].label}".`
                  : 'Select an option above, then tap students.'}
            </p>

            <button
              onClick={handleSaveAnswers}
              style={{
                width: '100%', padding: '12px 0', fontSize: 15, fontWeight: 600,
                background: '#2c6fad', color: '#fff',
                border: 'none', borderRadius: 6, cursor: 'pointer',
              }}
            >
              Save Answers
            </button>
			<Link to={`/case/${activeCase._id}`} >
			  	<button style={{
                width: '100%', padding: '12px 0', fontSize: 15, fontWeight: 600,
                background: '#2c6fad', color: '#fff',
                border: 'none', borderRadius: 6, cursor: 'pointer', marginTop: 8,
              }}>Back to case</button>
			</Link>
          </div>
        )}
      </div>

      {/* ── Canvas area ── */}
      <div style={{ flex: 1, position: 'relative' }}>
        {rects.length === 0 ? (
          <div style={{ padding: 32 }}>
            <p style={{ color: '#888' }}>No seating chart saved yet. Complete the seating chart first.</p>
          </div>
        ) : (
          <>
            <Stage
              ref={stageRef}
              width={window.innerWidth - SIDEBAR_W}
              height={window.innerHeight}
              scaleX={scale}
              scaleY={scale}
              x={stagePos.x}
              y={stagePos.y}
              onWheel={handleWheel}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <Layer>
                {/* Row rectangles */}
                {rects.map((r) => (
                  <Group key={r.id} x={r.x} y={r.y}>
                    <Rect
                      width={r.width}
                      height={r.height}
                      fill="#4a90d9"
                      stroke="#2c6fad"
                      strokeWidth={2}
                      cornerRadius={4}
                    />
                  </Group>
                ))}

                {/* Student circles */}
                {rects.flatMap((r) =>
                  r.assignedStudents.map((s) => (
                    <Group
                      key={'c-' + s.id}
                      x={s.x}
                      y={s.y}
                      onClick={() => handleStudentTap(s.id)}
                      onTap={() => handleStudentTap(s.id)}
                    >
                      <Circle
                        radius={CIRCLE_R}
                        fill={getStudentFill(s.id)}
                        stroke="#2c6fad"
                        strokeWidth={1.5}
                      />
                      <Text
                        x={-CIRCLE_R}
                        y={-CIRCLE_R}
                        width={CIRCLE_R * 2}
                        height={CIRCLE_R * 2}
                        text={showScores ? `#${s.id} - ${getStudentScore(s.id)}` : String(s.id)}
                        fontSize={showScores ? 9 : 12}
                        fill={getStudentTextColor(s.id)}
                        align="center"
                        verticalAlign="middle"
                        listening={false}
                      />
                    </Group>
                  ))
                )}
              </Layer>
            </Stage>

            {/* Zoom controls */}
            <div style={{
              position: 'absolute', bottom: 16, left: 16, zIndex: 100,
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'rgba(255,255,255,0.92)', borderRadius: 8,
              padding: '6px 10px', boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
              userSelect: 'none',
            }}>
              <button onClick={() => zoomBy(1 / SCALE_STEP)} style={{ width: 28, height: 28, fontSize: 18, lineHeight: 1, border: '1px solid #ccc', borderRadius: 4, cursor: 'pointer', background: '#f5f5f5' }}>−</button>
              <span style={{ minWidth: 52, textAlign: 'center', fontSize: 14, fontFamily: 'monospace' }}>{Math.round(scale * 100)}%</span>
              <button onClick={() => zoomBy(SCALE_STEP)} style={{ width: 28, height: 28, fontSize: 18, lineHeight: 1, border: '1px solid #ccc', borderRadius: 4, cursor: 'pointer', background: '#f5f5f5' }}>+</button>
              <button onClick={() => { setScale(1); setStagePos({ x: 0, y: 0 }); }} style={{ height: 28, padding: '0 8px', fontSize: 12, border: '1px solid #ccc', borderRadius: 4, cursor: 'pointer', background: '#f5f5f5', marginLeft: 4 }}>Reset</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default QuestionsScreen;