// The Answers (student scoring) PDF (spec 006, AC-15 and AC-16): the case
// header, then one tally block per student, two per row.
import { caseHeaderLines, studentNumbers } from './pdfContent';
import {
  CONTENT_WIDTH,
  FONT,
  LINE_HEIGHT,
  MARGIN,
  createDoc,
  drawFooters,
  drawHeader,
  drawRuleAfterLabel,
  ensureSpace,
  setFont,
} from './pdfLayout';

export const GUTTER = 36;
export const COLUMN_WIDTH = (CONTENT_WIDTH - GUTTER) / 2;
export const LEFT_X = MARGIN;
export const RIGHT_X = MARGIN + COLUMN_WIDTH + GUTTER;

// Heading baseline to the Total line, and the full row including the gap below it.
const BLOCK_HEIGHT = LINE_HEIGHT * 6;
const ROW_HEIGHT = LINE_HEIGHT * 8.5;

const drawStudentBlock = (doc, number, x, top) => {
  const rightX = x + COLUMN_WIDTH;
  let y = top;

  setFont(doc, FONT.header, 'bold');
  doc.text(`# ${number}`, x, y);
  y += LINE_HEIGHT * 1.75;

  setFont(doc, FONT.body);
  drawRuleAfterLabel(doc, 'Points:', x, y, rightX);
  y += LINE_HEIGHT * 2;

  doc.line(x, y + 2, rightX, y + 2);
  y += LINE_HEIGHT * 2;

  const totalLabel = 'Total:';
  drawRuleAfterLabel(
    doc,
    totalLabel,
    x,
    y,
    x + doc.getTextWidth(totalLabel) + COLUMN_WIDTH * 0.4,
  );
};

export const buildAnswersPdf = (JsPDF, activeCase) => {
  const doc = createDoc(JsPDF);
  let y = drawHeader(doc, caseHeaderLines(activeCase));

  const numbers = studentNumbers(activeCase?.studentNumber);
  for (let i = 0; i < numbers.length; i += 2) {
    // A row moves to the next page whole (AC-16).
    y = ensureSpace(doc, y, BLOCK_HEIGHT);
    drawStudentBlock(doc, numbers[i], LEFT_X, y);
    if (numbers[i + 1] !== undefined) drawStudentBlock(doc, numbers[i + 1], RIGHT_X, y);
    y += ROW_HEIGHT;
  }

  drawFooters(doc);
  return doc.output('blob');
};
