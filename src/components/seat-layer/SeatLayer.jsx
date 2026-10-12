import { centerOn, isSeatInView, letterKeyIndex } from '../../utils/seating';

import styles from './SeatLayer.module.css';

/**
 * Real buttons laid exactly over the seat circles of a Konva stage (spec 014),
 * so keyboard and screen-reader users can reach and answer each student. Rows
 * are named groups, seats keep the chart's order.
 *
 * The layer ignores the pointer (pointer-events: none): mouse and touch keep
 * going to the canvas, so wheel/pinch zoom and drag-to-pan work over seats.
 * Screen readers activate the buttons with a synthetic click, which still works.
 *
 * getSeatState(id) → { name, pressed, disabled, hintId }. `pressed` is only
 * set for toggle seats (true/false questions).
 */
const SeatLayer = ({
  rects,
  scale,
  stagePos,
  width,
  height,
  radius,
  getSeatState,
  onActivate,
  onLetter,
  onBringIntoView,
}) => {
  const view = { scale, stagePos, width, height, radius };
  const size = radius * 2 * scale;

  return (
    <div className={styles.layer}>
      {rects.map((rect, index) => (
        <div key={rect.id} role="group" aria-label={`Row ${index + 1}`}>
          {rect.assignedStudents.map((seat) => {
            const { name, pressed, disabled, hintId } = getSeatState(seat.id);
            return (
              <button
                key={seat.id}
                type="button"
                className={styles.seat}
                style={{
                  left: stagePos.x + (seat.x - radius) * scale,
                  top: stagePos.y + (seat.y - radius) * scale,
                  width: size,
                  height: size,
                }}
                aria-label={name}
                aria-pressed={pressed}
                aria-disabled={disabled || undefined}
                aria-describedby={hintId}
                onClick={() => {
                  if (!disabled) onActivate(seat.id);
                }}
                onFocus={() => {
                  if (!isSeatInView(seat, view)) onBringIntoView(centerOn(seat, view));
                }}
                onKeyDown={(event) => {
                  const optionIndex = letterKeyIndex(event.key);
                  if (optionIndex === null || event.ctrlKey || event.metaKey || event.altKey) return;
                  event.preventDefault();
                  onLetter(seat.id, optionIndex);
                }}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
};

export default SeatLayer;
