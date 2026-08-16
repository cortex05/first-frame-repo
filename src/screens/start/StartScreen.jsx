import { useState, useRef, useMemo } from "react";
import { Stage, Layer, Rect, Circle, Text, Group } from "react-konva";
import "../../App.css";
import useCaseStore from "../../store/useCaseStore";
import { useNavigate, useParams } from "react-router-dom";
import { initialStudentGeneration } from "../../utilities/studentUtilities";
import useSeatingDraft from "../../hooks/useSeatingDraft";

import Modal from "../../components/modal/Modal";
import styles from "./SaveScreen.module.css";

const SIDEBAR_W = 260;
const CIRCLE_R = 24;
const CELL_PAD = 8;
const CELL_SIZE = CIRCLE_R * 2 + CELL_PAD; //

const SCALE_MIN = 0.1;
const SCALE_MAX = 5;
const SCALE_STEP = 1.2;

// Returns the pixel dimensions of a rect that fits rows×cols circles.
function getRectSize(rows, cols) {
  return {
    width: CELL_PAD + cols * CELL_SIZE,
    height: CELL_PAD + rows * CELL_SIZE,
  };
}

// Returns { x, y } relative to the rect's top-left corner.
// Circles are numbered left→right, bottom→top (idx=0 is bottom-left).
// When students < rows×cols, empty cells appear at the top rows.
function getCircleRelPos(idx, rows, cols) {
  const col = idx % cols;
  const gridRow = Math.floor(idx / cols); // 0 = bottom row
  const screenRow = rows - 1 - gridRow; // 0 = top on screen
  return {
    x: CELL_PAD / 2 + col * CELL_SIZE + CIRCLE_R,
    y: CELL_PAD / 2 + screenRow * CELL_SIZE + CIRCLE_R,
  };
}

const StartScreen = () => {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const activeCase = useCaseStore((state) =>
    state.cases.find((c) => c._id === caseId),
  );
  const updateCase = useCaseStore((state) => state.updateCase);

  const [saveWarning, setSaveWarning] = useState(false);
  const [saveCheck, setSaveCheck] = useState(false);

  const [rowInput, setRowInput] = useState(2);
  const [colInput, setColInput] = useState(3);

  const stageRef = useRef(null);
  const lastPinchDist = useRef(0);

  const studentNumber = Number(activeCase?.studentNumber);
  const {
    rects,
    view,
    canUndo,
    addRect,
    moveRect,
    clearRects,
    undo,
    setView,
    discardDraft,
  } = useSeatingDraft(caseId, studentNumber);

  // The roster is regenerated from the case rather than stored, so a refresh
  // rebuilds it; `rects` alone decides who has already been seated.
  const roster = useMemo(
    () =>
      Number.isFinite(studentNumber) ? initialStudentGeneration(studentNumber) : [],
    [studentNumber],
  );

  const seatedIds = useMemo(
    () => new Set(rects.flatMap((r) => r.assignedStudents.map((s) => s.id))),
    [rects],
  );

  const remaining = useMemo(
    () => roster.filter((s) => !seatedIds.has(s.number)),
    [roster, seatedIds],
  );

  // Distinguishes "the store has not hydrated yet" from a genuinely bad id.
  const caseInStorage = useMemo(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("cases") || "[]");
      return Array.isArray(stored) && stored.some((c) => c._id === caseId);
    } catch {
      return false;
    }
  }, [caseId]);

  if (!activeCase) {
    return (
      <p style={{ padding: 32 }}>
        {caseInStorage ? "Loading case…" : "Case not found."}
      </p>
    );
  }

  const rows = Math.max(1, parseInt(rowInput, 10) || 1);
  const cols = Math.max(1, parseInt(colInput, 10) || 1);
  const totalCells = rows * cols;

  const handleAddRect = () => {
    if (remaining.length === 0) return;
    const toAssign = remaining.slice(0, Math.min(totalCells, remaining.length));
    const { width, height } = getRectSize(rows, cols);
    const offset = rects.length * 24;
    addRect({
      id: `rect-${Date.now()}-${rects.length}`,
      x: 20 + offset,
      y: 20 + offset,
      width,
      height,
      rows,
      cols,
      assignedStudents: toAssign.map((s, i) => {
        const pos = getCircleRelPos(i, rows, cols);
        return { id: s.number, xRel: pos.x, yRel: pos.y };
      }),
    });
  };

  const saveChart = () => {
    // Convert relative circle positions to absolute for QuestionsScreen compatibility
    const rectsForSave = rects.map((r) => ({
      ...r,
      assignedStudents: r.assignedStudents.map((s) => ({
        id: s.id,
        x: r.x + s.xRel,
        y: r.y + s.yRel,
      })),
    }));
    const seatedStudents = rects.flatMap((r) =>
      r.assignedStudents
        .map((s) => roster.find((student) => student.number === s.id))
        .filter(Boolean),
    );
    updateCase({
      ...activeCase,
      chartData: { rects: rectsForSave },
      students: seatedStudents,
      seated: true,
    });
    localStorage.setItem(
      "cases",
      JSON.stringify(useCaseStore.getState().cases),
    );
    discardDraft();
    navigate(`/questions/${activeCase._id}`);
  };

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
    setView({
      scale: newScale,
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
    setView({
      scale: newScale,
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
    setView({
      scale: newScale,
      x: midX - pointTo.x * newScale,
      y: midY - pointTo.y * newScale,
    });
  };

  const handleTouchEnd = (e) => {
    if (e.evt.touches.length < 2) lastPinchDist.current = 0;
  };

  const inputStyle = {
    width: "100%",
    padding: "8px 10px",
    fontSize: 14,
    border: "1px solid #c5d8f5",
    borderRadius: 6,
    boxSizing: "border-box",
  };

  const secondaryButtonStyle = (enabled) => ({
    padding: "8px 0",
    fontSize: 13,
    fontWeight: 600,
    background: "#fff",
    color: enabled ? "#2c6fad" : "#aaa",
    border: `1px solid ${enabled ? "#c5d8f5" : "#e0e0e0"}`,
    borderRadius: 6,
    cursor: enabled ? "pointer" : "not-allowed",
  });

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      {/* ── Sidebar ── */}
      <div
        style={{
          width: SIDEBAR_W,
          flexShrink: 0,
          background: "#f5f8ff",
          borderRight: "1px solid #c5d8f5",
          display: "flex",
          flexDirection: "column",
          padding: 16,
          gap: 12,
          overflowY: "auto",
        }}
      >
        <h2 style={{ margin: 0, fontSize: 24, color: "#2c6fad" }}>
          Assign Students
        </h2>

        <p style={{ margin: 0, fontSize: 16, color: "#555" }}>
          Remaining: <strong>{remaining.length}</strong> /{" "}
          {activeCase.studentNumber}
        </p>

        <p style={{ margin: 0, fontSize: 16, color: "#555" }}>
          {rows} × {cols} = {totalCells} cells
          {remaining.length < totalCells && remaining.length > 0
            ? ` (${remaining.length} filled, ${totalCells - remaining.length} empty)`
            : ""}
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "#444",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="3" y1="9" x2="21" y2="9" />
              <line x1="3" y1="15" x2="21" y2="15" />
            </svg>
            <span style={{ lineHeight: 1 }}>Rows</span>
          </label>
          <input
            style={inputStyle}
            type="number"
            min={1}
            value={rowInput}
            onChange={(e) => setRowInput(e.target.value)}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div>
            <label
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "#444",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <line x1="9" y1="3" x2="9" y2="21" />
                <line x1="15" y1="3" x2="15" y2="21" />
              </svg>
              <span style={{ lineHeight: 1 }}>Columns</span>
            </label>
          </div>
          <input
            style={inputStyle}
            type="number"
            min={1}
            value={colInput}
            onChange={(e) => setColInput(e.target.value)}
          />
        </div>

        <button
          onClick={handleAddRect}
          disabled={remaining.length === 0}
          style={{
            padding: "10px 0",
            fontSize: 14,
            fontWeight: 600,
            background: remaining.length > 0 ? "var(--confirm)" : "#aaa",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            cursor: remaining.length > 0 ? "pointer" : "not-allowed",
          }}
        >
          + Add Row
        </button>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={undo}
            disabled={!canUndo}
            style={{ ...secondaryButtonStyle(canUndo), flex: 1 }}
          >
            ↩ Undo
          </button>
          <button
            onClick={clearRects}
            disabled={rects.length === 0}
            style={{ ...secondaryButtonStyle(rects.length > 0), flex: 1 }}
          >
            Clear All
          </button>
        </div>

        <button
          onClick={() => setSaveWarning(true)}
          style={{
            padding: "10px 0",
            fontSize: 14,
            fontWeight: 600,
            background: "#2c6fad",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            cursor: "pointer" 
          }}
        >
          Back to Case
        </button>

        {remaining.length === 0 && rects.length > 0 && (
          <button
            onClick={() => setSaveCheck(true)}
            style={{
              padding: "12px 0",
              fontSize: 15,
              fontWeight: 600,
              background: "#2e7d32",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            Save Chart
          </button>
        )}

        <p
          style={{
            marginTop: "auto",
            fontSize: 16,
            color: "#555",
            borderTop: "1px solid #c5d8f5",
            paddingTop: 12,
          }}
        >
          Drag rows to reposition. Scroll or pinch to zoom.
        </p>
      </div>

      {/* ── Canvas ── */}
      <div style={{ flex: 1, position: "relative" }}>
        <Stage
          ref={stageRef}
          width={window.innerWidth - SIDEBAR_W}
          height={window.innerHeight}
          scaleX={view.scale}
          scaleY={view.scale}
          x={view.x}
          y={view.y}
          draggable
          onWheel={handleWheel}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onDragEnd={(e) => {
            // Only the stage itself — a rect drag bubbles up through here too.
            if (e.target !== stageRef.current) return;
            setView({ scale: view.scale, x: e.target.x(), y: e.target.y() });
          }}
        >
          <Layer>
            {rects.map((r) => (
              <Group
                key={r.id}
                x={r.x}
                y={r.y}
                draggable
                onDragEnd={(e) => moveRect(r.id, e.target.x(), e.target.y())}
              >
                <Rect
                  width={r.width}
                  height={r.height}
                  fill="#4a90d9"
                  stroke="#2c6fad"
                  strokeWidth={2}
                  cornerRadius={4}
                />
                {r.assignedStudents.map((s) => (
                  <Group key={s.id} x={s.xRel} y={s.yRel}>
                    <Circle
                      radius={CIRCLE_R}
                      fill="#fff"
                      stroke="#2c6fad"
                      strokeWidth={1.5}
                    />
                    <Text
                      x={-CIRCLE_R}
                      y={-CIRCLE_R}
                      width={CIRCLE_R * 2}
                      height={CIRCLE_R * 2}
                      text={String(s.id)}
                      fontSize={12}
                      fill="#2c6fad"
                      align="center"
                      verticalAlign="middle"
                      listening={false}
                    />
                  </Group>
                ))}
              </Group>
            ))}
          </Layer>
        </Stage>

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
            background: "rgba(255,255,255,0.92)",
            borderRadius: 8,
            padding: "6px 10px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
            userSelect: "none",
          }}
        >
          <button
            onClick={() => zoomBy(1 / SCALE_STEP)}
            style={{
              width: 28,
              height: 28,
              fontSize: 18,
              lineHeight: 1,
              border: "1px solid #ccc",
              borderRadius: 4,
              cursor: "pointer",
              background: "#f5f5f5",
            }}
          >
            −
          </button>
          <span
            style={{
              minWidth: 52,
              textAlign: "center",
              fontSize: 14,
              fontFamily: "monospace",
            }}
          >
            {Math.round(view.scale * 100)}%
          </span>
          <button
            onClick={() => zoomBy(SCALE_STEP)}
            style={{
              width: 28,
              height: 28,
              fontSize: 18,
              lineHeight: 1,
              border: "1px solid #ccc",
              borderRadius: 4,
              cursor: "pointer",
              background: "#f5f5f5",
            }}
          >
            +
          </button>
          <button
            onClick={() => setView({ scale: 1, x: 0, y: 0 })}
            style={{
              height: 28,
              padding: "0 8px",
              fontSize: 12,
              border: "1px solid #ccc",
              borderRadius: 4,
              cursor: "pointer",
              background: "#f5f5f5",
              marginLeft: 4,
            }}
          >
            Reset
          </button>
        </div>
      </div>

      {/* Leave-page warning modal */}
      <Modal isOpen={saveWarning} hideDefaultClose title="Are you sure?">
        <h3
          style={{
            color: `var(--modal-text)`,
            fontWeight: 500,
            maxWidth: 400,
          }}
        >
          The seating chart has not been saved to the case yet. Your progress is
          kept and will be restored the next time you open this screen.
        </h3>
        <div className={styles.saveModalButtons}>
          <button
            className={styles.confirm}
            onClick={() => navigate(`/case/${activeCase._id}`)}
          >
            Back to Case
          </button>
          <button
            className={styles.decline}
            onClick={() => setSaveWarning(false)}
          >
            Cancel
          </button>
        </div>
      </Modal>

      {/* Save confirmation modal */}
      <Modal isOpen={saveCheck} hideDefaultClose title="Are you sure?">
        <h3
          style={{
            color: `var(--modal-text)`,
            fontWeight: 500,
            maxWidth: 400,
          }}
        >
         Seating cannot be changed after saving. Do you want to proceed?
        </h3>
        <div className={styles.saveModalButtons}>
          <button 
            className={styles.confirm}
            onClick={saveChart}
          >
            Proceed
          </button>
          <button
            className={styles.decline}
            onClick={() => setSaveCheck(false)}
          >
            Cancel
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default StartScreen;
