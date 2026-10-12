// Helpers for the keyboard / screen-reader layer over the seating canvases
// (spec 014). Pure, so the canvas screens stay thin.

const OPTION_LETTERS = 'ABCD';

// "students 1–6" for a consecutive row, "students 3, 5, 9" otherwise.
export const rowSummary = (rect) => {
  const numbers = (rect?.assignedStudents || []).map((s) => Number(s.id)).sort((a, b) => a - b);

  if (numbers.length === 0) return 'no students';
  if (numbers.length === 1) return `student ${numbers[0]}`;

  const consecutive = numbers.every((n, i) => i === 0 || n === numbers[i - 1] + 1);
  return consecutive
    ? `students ${numbers[0]}–${numbers[numbers.length - 1]}`
    : `students ${numbers.join(', ')}`;
};

export const optionLetter = (index) => OPTION_LETTERS[index] ?? '';

// A–D (either case) or 1–4 → option index 0–3; anything else → null.
export const letterKeyIndex = (key) => {
  if (typeof key !== 'string' || key.length !== 1) return null;
  const letter = OPTION_LETTERS.indexOf(key.toUpperCase());
  if (letter !== -1) return letter;
  const digit = Number(key);
  return Number.isInteger(digit) && digit >= 1 && digit <= 4 ? digit - 1 : null;
};

// Whether a seat's circle is fully on screen, `margin` px inside the stage edges.
export const isSeatInView = ({ x, y }, { scale, stagePos, width, height, radius, margin = 16 }) => {
  const cx = stagePos.x + x * scale;
  const cy = stagePos.y + y * scale;
  const r = radius * scale;
  return (
    cx - r >= margin && cy - r >= margin && cx + r <= width - margin && cy + r <= height - margin
  );
};

// The stage position that puts a seat in the middle of the view at `scale`.
export const centerOn = ({ x, y }, { scale, width, height }) => ({
  x: width / 2 - x * scale,
  y: height / 2 - y * scale,
});
