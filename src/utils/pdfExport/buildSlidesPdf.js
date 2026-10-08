// The question slides PDF (spec 009, AC-12 to AC-15): one landscape page per
// question with the client, "Question n" and the question text, large and
// centered. No options, points or answers.
import { slideBlocks } from './pdfContent';
import {
  FONT,
  FOOTER_OFFSET,
  LINE_HEIGHT,
  MARGIN,
  SLIDE_PAGE_HEIGHT,
  SLIDE_PAGE_WIDTH,
  createSlideDoc,
  drawFooters,
  setFont,
} from './pdfLayout';

export const SLIDE_TEXT_MAX = 40;
export const SLIDE_TEXT_MIN = 20;
const SLIDE_TEXT_STEP = 2;
const LINE_SPACING = 1.2;

const LABEL_SIZE = FONT.header + 4;
const LABEL_GAP = 24;
const CONTENT_WIDTH = SLIDE_PAGE_WIDTH - MARGIN * 2;
const CENTER_X = SLIDE_PAGE_WIDTH / 2;
const CLIENT_Y = MARGIN + FONT.header;
// The label and text are centered between the client line and the footer.
export const SLIDE_TOP = CLIENT_Y + LINE_HEIGHT * 2;
export const SLIDE_BOTTOM = SLIDE_PAGE_HEIGHT - FOOTER_OFFSET - 24;

const textHeight = (lines, size) => lines.length * size * LINE_SPACING;

// Shrinks from 40pt in 2pt steps until the text fits, stopping at 20pt (AC-14).
const fitText = (doc, text, maxHeight) => {
  let size = SLIDE_TEXT_MAX;
  setFont(doc, size, 'bold');
  let lines = doc.splitTextToSize(text, CONTENT_WIDTH);
  while (textHeight(lines, size) > maxHeight && size > SLIDE_TEXT_MIN) {
    size = Math.max(SLIDE_TEXT_MIN, size - SLIDE_TEXT_STEP);
    setFont(doc, size, 'bold');
    lines = doc.splitTextToSize(text, CONTENT_WIDTH);
  }
  return { size, lines };
};

const drawSlide = (doc, block, clientName) => {
  setFont(doc, FONT.header);
  doc.text(`Client: ${clientName}`, MARGIN, CLIENT_Y);

  const area = SLIDE_BOTTOM - SLIDE_TOP;
  const { size, lines } = block.text
    ? fitText(doc, block.text, area - LABEL_SIZE - LABEL_GAP)
    : { size: SLIDE_TEXT_MAX, lines: [] };
  const total = LABEL_SIZE + (lines.length ? LABEL_GAP + textHeight(lines, size) : 0);
  const labelY = SLIDE_TOP + Math.max(0, (area - total) / 2) + LABEL_SIZE;

  setFont(doc, LABEL_SIZE, 'bold');
  doc.text(block.label, CENTER_X, labelY, { align: 'center' });

  setFont(doc, size, 'bold');
  let y = labelY + LABEL_GAP + size;
  // Text that still doesn't fit at the minimum size is clipped, never moved
  // to another page, so there is always one page per question.
  for (const line of lines) {
    if (y > SLIDE_BOTTOM) break;
    doc.text(line, CENTER_X, y, { align: 'center' });
    y += size * LINE_SPACING;
  }
};

export const buildSlidesPdf = (JsPDF, activeCase) => {
  const doc = createSlideDoc(JsPDF);
  const clientName = activeCase?.clientName ?? '';

  slideBlocks(activeCase?.questions).forEach((block, index) => {
    if (index > 0) doc.addPage();
    drawSlide(doc, block, clientName);
  });

  drawFooters(doc);
  return doc.output('blob');
};
