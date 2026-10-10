import { useState, useRef, useMemo, useEffect } from "react";
import {
  Stage,
  Layer,
  Line,
  Rect,
  Circle,
  Text,
  Group,
  Transformer,
} from "react-konva";
import useCaseStore from "../../store/useCaseStore";
import useAuthStore from "../../store/useAuthStore";
import { saveSeating } from "../../api/case";
import { useNavigate, useParams } from "react-router-dom";
import { initialStudentGeneration } from "../../utilities/studentUtilities";
import useSeatingDraft from "../../hooks/useSeatingDraft";

import Modal from "../../components/modal/Modal";
import { cssVar } from "../../utils/cssVars";
import styles from "./SaveScreen.module.css";

const SIDEBAR_W = 260;
const CIRCLE_R = 24;
const CELL_PAD = 8;
const CELL_SIZE = CIRCLE_R * 2 + CELL_PAD; //
const GRID_SPACING = 40;

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
// Circles are numbered bottom→top, and left→right within a row (idx=0 is
// bottom-left) unless `rightToLeft`, which mirrors each row (idx=0 is
// bottom-right). When students < rows×cols, empty cells appear at the top rows.
function getCircleRelPos(idx, rows, cols, rightToLeft = false) {
  const col = rightToLeft ? cols - 1 - (idx % cols) : idx % cols;
  const gridRow = Math.floor(idx / cols); // 0 = bottom row
  const screenRow = rows - 1 - gridRow; // 0 = top on screen
  return {
    x: CELL_PAD / 2 + col * CELL_SIZE + CIRCLE_R,
    y: CELL_PAD / 2 + screenRow * CELL_SIZE + CIRCLE_R,
  };
}

// Snap angles for the rotate handle, every 45°.
const ROTATION_SNAPS = [0, 45, 90, 135, 180, 225, 270, 315];

// `r.x`/`r.y` stay the unrotated top-left corner; a rect turns about its
// center by `r.rotation` degrees (clockwise, as Konva draws it).
function seatToAbsolute(r, s) {
  const rad = ((r.rotation || 0) * Math.PI) / 180;
  const dx = s.xRel - r.width / 2;
  const dy = s.yRel - r.height / 2;
  return {
    x: r.x + r.width / 2 + dx * Math.cos(rad) - dy * Math.sin(rad),
    y: r.y + r.height / 2 + dx * Math.sin(rad) + dy * Math.cos(rad),
  };
}

const StartScreen = () => {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const activeCase = useCaseStore((state) =>
    state.cases.find((c) => c._id === caseId),
  );
  const updateCase = useCaseStore((state) => state.updateCase);
  const userInfo = useAuthStore((state) => state.userInfo);

  const [saveWarning, setSaveWarning] = useState(false);
  const [saveCheck, setSaveCheck] = useState(false);
  const [isSavingChart, setIsSavingChart] = useState(false);
  const [saveChartError, setSaveChartError] = useState("");

  const [rowInput, setRowInput] = useState(2);
  const [colInput, setColInput] = useState(3);
  const [rightToLeft, setRightToLeft] = useState(false);

  const stageRef = useRef(null);
  const lastPinchDist = useRef(0);
  const transformerRef = useRef(null);
  const rectNodes = useRef(new Map());
  const [selectedRectId, setSelectedRectId] = useState(null);

  // Canvas can't resolve `var(--x)` — Konva needs the literal hex.
  const canvas = {
    light: cssVar("--light-text", "#fff"),
    black: cssVar("--color-text-primary", "#08060d"),
  };

  const studentNumber = Number(activeCase?.studentNumber);
  const {
    rects,
    view,
    canUndo,
    addRect,
    moveRect,
    rotateRect,
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

  // Attach the rotate handle to the selected row. Undo or Clear All can remove
  // that row, which leaves the handle detached.
  useEffect(() => {
    const transformer = transformerRef.current;
    if (!transformer) return;
    const node = rectNodes.current.get(selectedRectId);
    transformer.nodes(node ? [node] : []);
    transformer.getLayer()?.batchDraw();
  }, [selectedRectId, rects]);

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
  const stageWidth = window.innerWidth - SIDEBAR_W;
  const stageHeight = window.innerHeight;
  const isLightTheme = document.documentElement.dataset.theme === "light";
  const gridStartX = Math.floor((-view.x / view.scale) / GRID_SPACING) * GRID_SPACING - GRID_SPACING;
  const gridStartY = Math.floor((-view.y / view.scale) / GRID_SPACING) * GRID_SPACING - GRID_SPACING;
  const gridColumnCount = Math.ceil(stageWidth / view.scale / GRID_SPACING) + 3;
  const gridRowCount = Math.ceil(stageHeight / view.scale / GRID_SPACING) + 3;
  const gridXs = Array.from({ length: gridColumnCount }, (_, index) => gridStartX + index * GRID_SPACING);
  const gridYs = Array.from({ length: gridRowCount }, (_, index) => gridStartY + index * GRID_SPACING);

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
        const pos = getCircleRelPos(i, rows, cols, rightToLeft);
        return { id: s.number, xRel: pos.x, yRel: pos.y };
      }),
    });
  };

  const saveChart = async () => {
    // Convert relative circle positions to absolute for QuestionsScreen compatibility
    const rectsForSave = rects.map((r) => ({
      ...r,
      assignedStudents: r.assignedStudents.map((s) => ({
        id: s.id,
        ...seatToAbsolute(r, s),
      })),
    }));
    const seatedStudents = rects.flatMap((r) =>
      r.assignedStudents
        .map((s) => roster.find((student) => student.number === s.id))
        .filter(Boolean),
    );
    const seating = { chartData: { rects: rectsForSave }, students: seatedStudents };

    // Saved on its own endpoint, so it never overwrites answers or questions
    // someone else saved meanwhile. The draft is kept until the save succeeds.
    setSaveChartError("");
    setIsSavingChart(true);
    try {
      const savedCase = userInfo?.token
        ? await saveSeating(activeCase._id, seating, userInfo.token)
        : { ...activeCase, ...seating, seated: true };
      updateCase(savedCase);
    } catch (requestError) {
      setSaveChartError(
        requestError?.response?.data?.message ||
          "Unable to save the seating chart. Please try again.",
      );
      setIsSavingChart(false);
      return;
    }
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
    border: "2px solid var(--color-text-primary)",
    borderRadius: 6,
    boxSizing: "border-box",
  };

  const secondaryButtonStyle = (enabled) => ({
    padding: "8px 0",
    fontSize: 13,
    fontWeight: 600,
    background: "var(--surface)",
    color: enabled ? "var(--modal-text)" : "var(--grey-disabled)",
    border: `1px solid ${enabled ? "var(--light-blue-background)" : "var(--border-subtle)"}`,
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
          background: "var(--surface-subtle)",
          borderRight: "1px solid var(--page-text)",
          display: "flex",
          flexDirection: "column",
          padding: 16,
          gap: 12,
          overflowY: "auto",
        }}
      >
        <h2 style={{ margin: 0, fontSize: 24, color: "var(--modal-text)" }}>
          Assign Students
        </h2>

        <p style={{ margin: 0, fontSize: 16, color: "var(--text-secondary)" }}>
          Remaining: <strong>{remaining.length}</strong> /{" "}
          {activeCase.studentNumber}
        </p>

        <p style={{ margin: 0, fontSize: 16, color: "var(--text-secondary)" }}>
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
              color: "var(--text-secondary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <svg
              width="8"
              height="24"
              viewBox="0 0 8 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <rect x="1" y="1" width="6" height="6" rx="1" />
              <rect x="1" y="9" width="6" height="6" rx="1" />
              <rect x="1" y="17" width="6" height="6" rx="1" />
            </svg>
            <span style={{ lineHeight: 1 }}>Rows/Depth</span>
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
                color: "var(--text-secondary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <svg
                width="32"
                height="8"
                viewBox="0 0 32 8"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <rect x="1" y="1" width="6" height="6" rx="1" />
                <rect x="9" y="1" width="6" height="6" rx="1" />
                <rect x="17" y="1" width="6" height="6" rx="1" />
                <rect x="25" y="1" width="6" height="6" rx="1" />
              </svg>
              <span style={{ lineHeight: 1 }}>Seats/Width</span>
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
          type="button"
          onClick={() => setRightToLeft((v) => !v)}
          aria-pressed={rightToLeft}
          title="Order of student numbers in the next row added"
          className={`${styles.directionToggle} ${
            rightToLeft ? styles.rightToLeft : styles.leftToRight
          }`}
        >
          {rightToLeft ? "Right to Left" : "Left to Right"}
        </button>

        <button
          onClick={handleAddRect}
          disabled={remaining.length === 0}
          style={{
            padding: "10px 0",
            fontSize: 14,
            fontWeight: 600,
            background: remaining.length > 0 ? "var(--confirm)" : "var(--grey-disabled)",
            color: "var(--light-text)",
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
            background: "var(--blue-background)",
            color: "var(--light-text)",
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
              background: "var(--tf-text)",
              color: "var(--light-text)",
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
            color: "var(--text-secondary)",
            borderTop: "1px solid var(--light-blue-background)",
            paddingTop: 12,
          }}
        >
          Drag rows to reposition. Tap a row, then drag its round handle to
          rotate it. Scroll or pinch to zoom.
        </p>
      </div>

      {/* ── Canvas ── */}
      <div style={{ flex: 1, position: "relative" }}>
        <Stage
          ref={stageRef}
          width={stageWidth}
          height={stageHeight}
          scaleX={view.scale}
          scaleY={view.scale}
          x={view.x}
          y={view.y}
          draggable
          onWheel={handleWheel}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onClick={(e) => {
            if (e.target === stageRef.current) setSelectedRectId(null);
          }}
          onTap={(e) => {
            if (e.target === stageRef.current) setSelectedRectId(null);
          }}
          onDragEnd={(e) => {
            // Only the stage itself — a rect drag bubbles up through here too.
            if (e.target !== stageRef.current) return;
            setView({ scale: view.scale, x: e.target.x(), y: e.target.y() });
          }}
        >
          <Layer>
            {isLightTheme && (
              <>
                {gridXs.map((x) => (
                  <Line
                    key={`grid-x-${x}`}
                    points={[x, gridStartY, x, gridStartY + gridRowCount * GRID_SPACING]}
                    stroke={
                      Math.round(x / GRID_SPACING) % 5 === 0
                        ? cssVar("--light-blue-background", "#e4edf8")
                        : cssVar("--border-subtle", "#d5dbe3")
                    }
                    strokeWidth={1 / view.scale}
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
                    strokeWidth={1 / view.scale}
                    listening={false}
                  />
                ))}
              </>
            )}
            {rects.map((r) => (
              // The group's origin is the rect's center so it rotates in place;
              // `r.x`/`r.y` remain the unrotated top-left corner.
              <Group
                key={r.id}
                ref={(node) => {
                  if (node) rectNodes.current.set(r.id, node);
                  else rectNodes.current.delete(r.id);
                }}
                x={r.x + r.width / 2}
                y={r.y + r.height / 2}
                offsetX={r.width / 2}
                offsetY={r.height / 2}
                rotation={r.rotation || 0}
                draggable
                onClick={() => setSelectedRectId(r.id)}
                onTap={() => setSelectedRectId(r.id)}
                onDragEnd={(e) =>
                  moveRect(
                    r.id,
                    e.target.x() - r.width / 2,
                    e.target.y() - r.height / 2,
                  )
                }
                onTransformEnd={(e) => {
                  const node = e.target;
                  const rotation = ((Math.round(node.rotation()) % 360) + 360) % 360;
                  node.rotation(rotation);
                  if (rotation === (r.rotation || 0)) return;
                  rotateRect(
                    r.id,
                    node.x() - r.width / 2,
                    node.y() - r.height / 2,
                    rotation,
                  );
                }}
              >
                <Rect
                  width={r.width}
                  height={r.height}
                  fill={cssVar("--border-control", "#bfbfbf")}
                  stroke={canvas.black}
                  strokeWidth={2}
                  cornerRadius={4}
                />
                {r.assignedStudents.map((s) => (
                  // Counter-rotated so the numbers stay upright.
                  <Group
                    key={s.id}
                    x={s.xRel}
                    y={s.yRel}
                    rotation={-(r.rotation || 0)}
                  >
                    <Circle
                      radius={CIRCLE_R}
                      fill={canvas.light}
                      stroke={canvas.black}
                      strokeWidth={1.5}
                    />
                    <Text
                      x={-CIRCLE_R}
                      y={-CIRCLE_R}
                      width={CIRCLE_R * 2}
                      height={CIRCLE_R * 2}
                      text={String(s.id)}
                      fontSize={12}
                      fill={canvas.black}
                      align="center"
                      verticalAlign="middle"
                      listening={false}
                    />
                  </Group>
                ))}
              </Group>
            ))}
            <Transformer
              ref={transformerRef}
              resizeEnabled={false}
              rotateEnabled
              rotationSnaps={ROTATION_SNAPS}
              rotationSnapTolerance={8}
              rotateAnchorOffset={30}
              anchorSize={16}
              borderStroke={cssVar("--orange-edit", "#f79306")}
              anchorStroke={cssVar("--orange-edit", "#f79306")}
              anchorFill={canvas.light}
            />
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
            background: "var(--surface-overlay-control)",
            color: "var(--color-text-primary)",
            borderRadius: 8,
            padding: "6px 10px",
            boxShadow: "0 2px 8px var(--shadow-soft)",
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
              color: "var(--color-text-primary)",
              border: "1px solid var(--grey-disabled)",
              borderRadius: 4,
              cursor: "pointer",
              background: "var(--surface-muted)",
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
              color: "var(--color-text-primary)",
              border: "1px solid var(--grey-disabled)",
              borderRadius: 4,
              cursor: "pointer",
              background: "var(--surface-muted)",
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
              color: "var(--color-text-primary)",
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
        {saveChartError && (
          <p role="alert" style={{ color: "var(--error-text-light)" }}>
            {saveChartError}
          </p>
        )}
        <div className={styles.saveModalButtons}>
          <button
            className={styles.confirm}
            onClick={saveChart}
            disabled={isSavingChart}
          >
            {isSavingChart ? "Saving..." : "Proceed"}
          </button>
          <button
            className={styles.decline}
            onClick={() => {
              setSaveChartError("");
              setSaveCheck(false);
            }}
            disabled={isSavingChart}
          >
            Cancel
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default StartScreen;
