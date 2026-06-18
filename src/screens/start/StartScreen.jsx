import React, { useState, useRef, useEffect } from "react";
import { Stage, Layer, Rect, Circle, Text, Group } from "react-konva";
import "../../App.css";
import useCaseStore from "../../store/useCaseStore";
import { useNavigate, useParams, Link } from "react-router-dom";
import { initialStudentGeneration } from "../../utilities/studentUtilities";

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

  const [rects, setRects] = useState([]);
  const [students, setStudents] = useState([]);
  const [displayedStudents, setDisplayedStudents] = useState([]);
  const [saveWarning, setSaveWarning] = useState(false);

  const [rowInput, setRowInput] = useState(2);
  const [colInput, setColInput] = useState(3);

  const [scale, setScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const stageRef = useRef(null);
  const lastPinchDist = useRef(0);

  useEffect(() => {
    if (!activeCase) return;
    setStudents(initialStudentGeneration(activeCase.studentNumber));
  }, []);

  if (!activeCase) return <p style={{ padding: 32 }}>Case not found.</p>;

  const rows = Math.max(1, parseInt(rowInput, 10) || 1);
  const cols = Math.max(1, parseInt(colInput, 10) || 1);
  const totalCells = rows * cols;

  const handleAddRect = () => {
    if (students.length === 0) return;
    const toAssign = students.slice(0, Math.min(totalCells, students.length));
    const remaining = students.slice(toAssign.length);
    const { width, height } = getRectSize(rows, cols);
    const offset = rects.length * 24;
    const newRect = {
      id: "rect-" + Date.now(),
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
    };
    setRects((prev) => [...prev, newRect]);
    setStudents(remaining);
    setDisplayedStudents((prev) => [...prev, ...toAssign]);
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
    updateCase({
      ...activeCase,
      chartData: { rects: rectsForSave },
      students: displayedStudents,
      seated: true,
    });
    localStorage.setItem(
      "cases",
      JSON.stringify(useCaseStore.getState().cases),
    );
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

  const inputStyle = {
    width: "100%",
    padding: "8px 10px",
    fontSize: 14,
    border: "1px solid #c5d8f5",
    borderRadius: 6,
    boxSizing: "border-box",
  };

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
          Remaining: <strong>{students.length}</strong> /{" "}
          {activeCase.studentNumber}
        </p>

        <p style={{ margin: 0, fontSize: 16, color: "#555" }}>
          {rows} × {cols} = {totalCells} cells
          {students.length < totalCells && students.length > 0
            ? ` (${students.length} filled, ${totalCells - students.length} empty)`
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
          disabled={students.length === 0}
          style={{
            padding: "10px 0",
            fontSize: 14,
            fontWeight: 600,
            background: students.length > 0 ? "var(--confirm)" : "#aaa",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            cursor: students.length > 0 ? "pointer" : "not-allowed",
          }}
        >
          + Add Row
        </button>
        <button
          onClick={() => setSaveWarning(true)}
          disabled={students.length === 0}
          style={{
            padding: "10px 0",
            fontSize: 14,
            fontWeight: 600,
            background: "#2c6fad",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            cursor: students.length > 0 ? "pointer" : "not-allowed",
          }}
        >
          Back to Case
        </button>

        {students.length === 0 && displayedStudents.length > 0 && (
          <button
            onClick={saveChart}
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
          scaleX={scale}
          scaleY={scale}
          x={stagePos.x}
          y={stagePos.y}
          draggable
          onWheel={handleWheel}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <Layer>
            {rects.map((r) => (
              <Group
                key={r.id}
                x={r.x}
                y={r.y}
                draggable
                onDragEnd={(e) => {
                  const node = e.target;
                  setRects((prev) =>
                    prev.map((rect) =>
                      rect.id === r.id
                        ? { ...rect, x: node.x(), y: node.y() }
                        : rect,
                    ),
                  );
                }}
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
            {Math.round(scale * 100)}%
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
            onClick={() => {
              setScale(1);
              setStagePos({ x: 0, y: 0 });
            }}
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

      {/* Save Warning modal */}
      <Modal
        isOpen={saveWarning}
        hideDefaultClose
        onClickOutside={() => setSaveWarning(false)}
        title="Are you sure?"
      >
        <h3
          style={{
            color: `var(--modal-text)`,
            fontWeight: 500,
            maxWidth: 400,
          }}
        >
         Unsaved changes to the seating chart will be lost if you
          leave this page.
        </h3>
        <div className={styles.saveModalButtons}>
          <button className={styles.confirm}>
            <Link
              to={`/case/${activeCase._id}`}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              Back to Case
            </Link>
          </button>
          <button
            className={styles.decline}
            onClick={() => setSaveWarning(false)}
          >
            Cancel
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default StartScreen;
