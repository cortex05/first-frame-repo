import React, { useState, useRef, useEffect } from 'react'
import './App.css'
import { Stage, Layer, Rect, Text, Transformer } from 'react-konva';

const PALETTE_X = 20;
const PALETTE_Y = 20;
const PALETTE_W = 120;
const PALETTE_H = 160;

const SHAPE_W = 60;
const SHAPE_H = 40;
const TEMPLATE_X = PALETTE_X + PALETTE_W / 2 - SHAPE_W / 2;
const TEMPLATE_Y = PALETTE_Y + 80;

function App() {
  const [rects, setRects] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [studentCount, setStudentCount] = useState(0);
  const [students, setStudents] = useState([]);

  const templateRef = useRef(null);
  const trRef = useRef(null);
  const stageRef = useRef(null);
  const prompted = useRef(false);

  useEffect(() => {
    if (prompted.current) return;
    prompted.current = true;
    const numberOfStudents = prompt('How many students are in the class?');
    const studentsToNumber = Number(numberOfStudents);
    setStudentCount(studentsToNumber);
  }, [])
  
  useEffect(() => {
    if (!trRef.current) return;
    if (selectedId && stageRef.current) {
      const node = stageRef.current.findOne('#' + selectedId);
      if (node) {
        trRef.current.nodes([node]);
        trRef.current.getLayer().batchDraw();
        return;
      }
    }
    trRef.current.nodes([]);
    trRef.current.getLayer()?.batchDraw();
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
        { id: 'rect-' + Date.now(), x, y, width: SHAPE_W, height: SHAPE_H },
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

  return (
    <React.Fragment>
      <Stage
        ref={stageRef}
        width={window.innerWidth}
        height={window.innerHeight}
        onClick={handleStageClick}
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

          {/* Spawned rects — click to select and resize */}
          {rects.map((r) => (
            <Rect
              key={r.id}
              id={r.id}
              x={r.x}
              y={r.y}
              width={r.width}
              height={r.height}
              fill="#4a90d9"
              stroke="#2c6fad"
              strokeWidth={2}
              cornerRadius={4}
              draggable
              onClick={() => setSelectedId(r.id)}
              onTransformEnd={(e) => {
                const node = e.target;
                const scaleX = node.scaleX();
                const scaleY = node.scaleY();
                // Reset scale before setState so React re-renders with scale=1
                node.scaleX(1);
                node.scaleY(1);
                setRects((prev) =>
                  prev.map((rect) =>
                    rect.id === r.id
                      ? {
                          ...rect,
                          x: node.x(),
                          y: node.y(),
                          width: Math.max(10, node.width() * scaleX),
                          height: Math.max(10, node.height() * scaleY),
                        }
                      : rect
                  )
                );
              }}
            />
          ))}

          <Transformer ref={trRef} />
        </Layer>
      </Stage>
    </React.Fragment>
  );
}

export default App
