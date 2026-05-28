import React, { useState, useRef, useEffect } from "react";
import {
  Stage,
  Layer,
  Rect,
  Circle,
  Text,
  Transformer,
  Group,
} from "react-konva";
import "../../App.css";
import useCaseStore from "../../store/useCaseStore";
import { useNavigate, useParams } from "react-router-dom";

import { initialStudentGeneration } from "../../utilities/studentUtilities";

const PALETTE_X = 20;
const PALETTE_Y = 20;
const PALETTE_W = 120;
const PALETTE_H = 160;

const SHAPE_W = 60;
const SHAPE_H = 40;
const TEMPLATE_X = PALETTE_X + PALETTE_W / 2 - SHAPE_W / 2;
const TEMPLATE_Y = PALETTE_Y + 80;

const CIRCLE_R = 18;
const CELL_PAD = 8;
const BUTTON_H = 28;

const SCALE_MIN = 0.1;
const SCALE_MAX = 5;
const SCALE_STEP = 1.2;

// Returns { cols, rows } for N students.
// Up to 6: fill a 3-col, 2-row grid. Beyond 6: alternate adding a col then a row.
function getGridDimensions(count) {
  	if (count <= 0) return { cols: 1, rows: 1 };
  	if (count <= 6) {
    	const cols = Math.min(3, count);
    	const rows = Math.ceil(count / cols);
    	return { cols, rows };
  	}
  	let cols = 3;
  	let rows = 2;
  	let addCol = true;
  	while (cols * rows < count) {
    	if (addCol) cols++;
    	else rows++;
    	addCol = !addCol;
  	}
  	return { cols, rows };
}

function getMinRectSize(count) {
  	if (count === 0) return { width: SHAPE_W, height: SHAPE_H };
  	const { cols, rows } = getGridDimensions(count);
  	const width = cols * (CIRCLE_R * 2 + CELL_PAD) + CELL_PAD;
  	const height = BUTTON_H + rows * (CIRCLE_R * 2 + CELL_PAD) + CELL_PAD;
  	return { width, height };
}

function getCirclePositions(count, rectWidth, rectHeight) {
  	if (count === 0) return [];
  	const { cols, rows } = getGridDimensions(count);
  	const areaH = rectHeight - BUTTON_H - CELL_PAD;
  	const cellW = (rectWidth - CELL_PAD) / cols;
  	const cellH = areaH / rows;
  	const positions = [];
  	for (let i = 0; i < count; i++) {
    	const col = i % cols;
    	const row = Math.floor(i / cols);
    	positions.push({
      	x: CELL_PAD / 2 + cellW * col + cellW / 2,
      	y: BUTTON_H + CELL_PAD / 2 + cellH * row + cellH / 2,
    	});
  	}
  	return positions;
}

const StartScreen = () => {
  	const { caseId } = useParams();
  	const navigate = useNavigate();
  	const activeCase = useCaseStore((state) => state.cases.find((c) => c._id === caseId));
  	const updateCase = useCaseStore((state) => state.updateCase);

  	const [rects, setRects] = useState([]);
  	const [selectedId, setSelectedId] = useState(null);
  
  	const [studentCount, setStudentCount] = useState(0);
  	const [students, setStudents] = useState([]);
  	const [displayedStudents, setDisplayedStudents] = useState([]);

  	const [modalRectId, setModalRectId] = useState(null);
  	const [modalInput, setModalInput] = useState("");

  	const [scale, setScale] = useState(1);
  	const [stagePos, setStagePos] = useState({ x: 0, y: 0 });

  	const templateRef = useRef(null);
  	const trRef = useRef(null);
  	const stageRef = useRef(null);
  	const lastPinchDist = useRef(0);

  	useEffect(() => {
    	if (!activeCase) return;

    	setStudentCount(activeCase.studentNumber);
    	setStudents(initialStudentGeneration(activeCase.studentNumber));
  	}, []);
  
  	useEffect(() => {
    	if (!trRef.current) return;
    	if (selectedId && stageRef.current) {
      		const node = stageRef.current.findOne("#" + selectedId);
      		if (node) {
        		trRef.current.nodes([node]);
        		trRef.current.getLayer().batchDraw();
        		return;
      		}
    	}
    	trRef.current.nodes([]);
    	const layer = trRef.current.getLayer();
    	if (layer) layer.batchDraw();
  	}, [selectedId]);
  
  	const handleTemplateDragEnd = (e) => {
    	const node = e.target;
    	const x = node.x();
    	const y = node.y();
    	const cx = x + SHAPE_W / 2;
    	const cy = y + SHAPE_H / 2;

    	const outsidePalette =
      		cx < PALETTE_X ||
      		cx > PALETTE_X + PALETTE_W ||
      		cy < PALETTE_Y ||
      		cy > PALETTE_Y + PALETTE_H;

   		if (outsidePalette) {
      		setRects((prev) => [
        		...prev,
        	{
          		id: 'rect-' + Date.now(),
          		x, y,
          		width: SHAPE_W,
          		height: SHAPE_H,
          		assigned: false,
          		assignedStudents: [],
        	},
      	]);
    	}

    	node.position({ x: TEMPLATE_X, y: TEMPLATE_Y });
    	node.getLayer().batchDraw();
  	};

  	const handleStageClick = (e) => {
    	if (e.target === e.target.getStage()) {
      		setSelectedId(null);
    	}
  	};

  	const clampScale = (s) => Math.min(SCALE_MAX, Math.max(SCALE_MIN, s));

  	const zoomBy = (factor) => {
    	const stage = stageRef.current;
    	const oldScale = stage.scaleX();
    	const newScale = clampScale(oldScale * factor);
    	const center = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
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
    	const direction = e.evt.deltaY < 0 ? 1 : -1;
    	const newScale = clampScale(direction > 0 ? oldScale * SCALE_STEP : oldScale / SCALE_STEP);
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
    	const t1 = touches[0];
    	const t2 = touches[1];
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

	const saveChart = () => {
  		updateCase({
    		...activeCase,
    		chartData: { rects },
    		students: displayedStudents,
			seated: true,
  		});
  		localStorage.setItem('cases', JSON.stringify(useCaseStore.getState().cases));
		navigate(`/questions/${activeCase._id}`);
	};

  	const handleAssignSubmit = () => {
    	const count = parseInt(modalInput, 10);
    	if (isNaN(count) || count <= 0 || count > students.length) return;

    	const toAssign = students.slice(0, count);
    	const remaining = students.slice(count);
    	const { width, height } = getMinRectSize(count);

    	const targetRect = rects.find((r) => r.id === modalRectId);
    	const relPositions = getCirclePositions(count, width, height);

    	setRects((prev) =>
      prev.map((r) =>
        r.id === modalRectId
          ? {
              ...r,
              width,
              height,
              assigned: true,
              assignedStudents: toAssign.map((s, i) => ({
                id: s.number,
                x: (targetRect ? targetRect.x : 0) + relPositions[i].x,
                y: (targetRect ? targetRect.y : 0) + relPositions[i].y,
              })),
            }
          : r
      )
    	);
    	setStudents(remaining);
    	setStudentCount(remaining.length);
    	setDisplayedStudents((prev) => [...prev, ...toAssign]);
    	setModalRectId(null);
    	setModalInput('');
  	};

  	return <React.Fragment>
  		{students.length === 0 && displayedStudents.length > 0 && (
  			<button
    			onClick={saveChart}
    			style={{
      				position: 'fixed', top: 16, right: 16, zIndex: 200,
      				padding: '12px 28px', fontSize: 16, fontWeight: 600,
      				background: '#2e7d32', color: '#fff',
      				border: 'none', borderRadius: 8, cursor: 'pointer',
      				boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
    			}}
  			>
    			Save Chart
  			</button>
		)}
        <h1>Students to assign: {studentCount}</h1>
  
        {/* Assign modal */}
        {modalRectId && (
        	<div style={{
            	position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            	background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center',
            	justifyContent: 'center', zIndex: 1000,
          	}}>
            	<div style={{
              		background: '#fff', borderRadius: 8, padding: 24, minWidth: 280,
              		boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            	}}>
              		<h3 style={{ margin: '0 0 16px' }}>How many students in this row?</h3>
              		<p style={{ margin: '0 0 12px', color: '#666', fontSize: 14 }}>
                		Remaining students: {students.length}
              		</p>
              		<input
                		type="number"
                		min={1}
                		max={students.length}
                		value={modalInput}
                		onChange={(e) => setModalInput(e.target.value)}
                		onKeyDown={(e) => e.key === 'Enter' && handleAssignSubmit()}
                		autoFocus
                		style={{
                  			width: '100%', padding: '8px 12px', fontSize: 16,
                  			border: '1px solid #ccc', borderRadius: 4, boxSizing: 'border-box',
                		}}
              		/>
              		<div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                		<button
                  			onClick={handleAssignSubmit}
                  			style={{
                    			flex: 1, padding: '8px 0', background: '#4a90d9', color: '#fff',
                    			border: 'none', borderRadius: 4, fontSize: 15, cursor: 'pointer',
                  			}}
                  			disabled={!modalInput || isNaN(modalInput) || parseInt(modalInput, 10) <= 0 || parseInt(modalInput, 10) > students.length}
                		>
                 			 Assign
                		</button>
                		<button
                  			onClick={() => { setModalRectId(null); setModalInput(''); }}
                  			style={{
                    			flex: 1, padding: '8px 0', background: '#eee', color: '#333',
                    			border: 'none', borderRadius: 4, fontSize: 15, cursor: 'pointer',
                  			}}
                		>
                  			Cancel
                		</button>
              		</div>
            	</div>
          	</div>
        )}
  
        {/* Zoom controls RESUME ADJUSTING TAB HERE */}
        <div style={{
          position: 'fixed', bottom: 16, left: 16, zIndex: 100,
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'rgba(255,255,255,0.92)', borderRadius: 8,
          padding: '6px 10px', boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          userSelect: 'none',
        }}>
          <button
            onClick={() => zoomBy(1 / SCALE_STEP)}
            style={{ width: 28, height: 28, fontSize: 18, lineHeight: 1, border: '1px solid #ccc', borderRadius: 4, cursor: 'pointer', background: '#f5f5f5' }}
          >−</button>
          <span style={{ minWidth: 52, textAlign: 'center', fontSize: 14, fontFamily: 'monospace' }}>
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={() => zoomBy(SCALE_STEP)}
            style={{ width: 28, height: 28, fontSize: 18, lineHeight: 1, border: '1px solid #ccc', borderRadius: 4, cursor: 'pointer', background: '#f5f5f5' }}
          >+</button>
          <button
            onClick={() => { setScale(1); setStagePos({ x: 0, y: 0 }); }}
            style={{ height: 28, padding: '0 8px', fontSize: 12, border: '1px solid #ccc', borderRadius: 4, cursor: 'pointer', background: '#f5f5f5', marginLeft: 4 }}
          >Reset</button>
        </div>
  
        <Stage
          ref={stageRef}
          width={window.innerWidth}
          height={window.innerHeight}
          scaleX={scale}
          scaleY={scale}
          x={stagePos.x}
          y={stagePos.y}
          onClick={handleStageClick}
          onWheel={handleWheel}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <Layer>
            {/* Fixed palette rectangle */}
            <Rect
              x={PALETTE_X}
              y={PALETTE_Y}
              width={PALETTE_W}
              height={PALETTE_H}
              fill="#f0f0f0"
              stroke="#999"
              strokeWidth={2}
              cornerRadius={8}
            />
            <Text
              x={PALETTE_X}
              y={PALETTE_Y + 12}
              width={PALETTE_W}
              text="Drag to canvas"
              fontSize={12}
              fill="#555"
              align="center"
            />
  
            {/* Template rect — drag off the palette to spawn a new one */}
            <Rect
              ref={templateRef}
              x={TEMPLATE_X}
              y={TEMPLATE_Y}
              width={SHAPE_W}
              height={SHAPE_H}
              fill="#4a90d9"
              stroke="#2c6fad"
              strokeWidth={2}
              cornerRadius={4}
              draggable
              onDragEnd={handleTemplateDragEnd}
            />
  
            {/* Spawned row rectangles */}
            {rects.map((r) => {
              return (
                <Group
                  key={r.id}
                  id={r.id}
                  x={r.x}
                  y={r.y}
                  draggable
                  onClick={() => setSelectedId(r.id)}
                  onDragEnd={(e) => {
                    const node = e.target;
                    setRects((prev) =>
                      prev.map((rect) =>
                        rect.id === r.id
                          ? { ...rect, x: node.x(), y: node.y() }
                          : rect
                      )
                    );
                  }}
                  onTransformEnd={(e) => {
                    const node = e.target;
                    const scaleX = node.scaleX();
                    const scaleY = node.scaleY();
                    node.scaleX(1);
                    node.scaleY(1);
                    setRects((prev) =>
                      prev.map((rect) =>
                        rect.id === r.id
                          ? {
                              ...rect,
                              x: node.x(),
                              y: node.y(),
                              width: Math.max(60, rect.width * scaleX),
                              height: Math.max(40, rect.height * scaleY),
                            }
                          : rect
                      )
                    );
                  }}
                >
                  {/* Row background */}
                  <Rect
                    width={r.width}
                    height={r.height}
                    fill="#4a90d9"
                    stroke="#2c6fad"
                    strokeWidth={2}
                    cornerRadius={4}
                  />
  
                  {/* Assign / Edit button */}
                  <Rect
                    x={4}
                    y={4}
                    width={r.width - 8}
                    height={20}
                    fill="#2c6fad"
                    cornerRadius={3}
                    onClick={(e) => {
                      e.cancelBubble = true;
                      setModalRectId(r.id);
                      setModalInput('');
                    }}
                  />
                  <Text
                    x={4}
                    y={4}
                    width={r.width - 8}
                    height={20}
                    text={r.assigned ? 'Edit' : 'Assign'}
                    fontSize={12}
                    fill="#fff"
                    align="center"
                    verticalAlign="middle"
                    listening={false}
                  />
  
                </Group>
              );
            })}
  
            {/* Student circles — always rendered above rectangles */}
            {rects.flatMap((r) =>
              r.assignedStudents.map((s) => (
                <Group
                  key={'circle-' + s.id}
                  x={s.x}
                  y={s.y}
                  draggable
                  onDragEnd={(e) => {
                    const node = e.target;
                    setRects((prev) =>
                      prev.map((rect) =>
                        rect.id === r.id
                          ? {
                              ...rect,
                              assignedStudents: rect.assignedStudents.map((st) =>
                                st.id === s.id
                                  ? { ...st, x: node.x(), y: node.y() }
                                  : st
                              ),
                            }
                          : rect
                      )
                    );
                  }}
                >
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
              ))
            )}
  
            <Transformer ref={trRef} />
          </Layer>
        </Stage>
      </React.Fragment>;
};

export default StartScreen;
