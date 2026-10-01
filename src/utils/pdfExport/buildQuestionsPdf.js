// The Questions PDF (spec 006, AC-10 to AC-14): the case header, every
// question with its point values and tally lines, then a centered END.
import { END_MARKER, caseHeaderLines, questionBlocks } from './pdfContent';
import {
  CONTENT_WIDTH,
  FONT,
  LINE_HEIGHT,
  MARGIN,
  PAGE_WIDTH,
  RIGHT_EDGE,
  createDoc,
  drawFooters,
  drawHeader,
  drawRuleAfterLabel,
  ensureSpace,
  setFont,
} from './pdfLayout';

const INDENT = 18;
const TALLY_HEIGHT = LINE_HEIGHT * 1.5;
const BLOCK_GAP = LINE_HEIGHT;

export const buildQuestionsPdf = (JsPDF, activeCase) => {
  const doc = createDoc(JsPDF);
  let y = drawHeader(doc, caseHeaderLines(activeCase));

  questionBlocks(activeCase?.questions).forEach((block) => {
    setFont(doc, FONT.body, 'bold');
    const textLines = doc.splitTextToSize(`${block.number}. ${block.text}`, CONTENT_WIDTH);
    setFont(doc, FONT.body);
    const pointsLines = doc.splitTextToSize(block.pointsLine, CONTENT_WIDTH - INDENT);
    const height =
      (textLines.length + pointsLines.length) * LINE_HEIGHT +
      block.tallyLabels.length * TALLY_HEIGHT;

    // Keep the whole question on one page (AC-12). The per-line checks only
    // matter for a block taller than a page, which then flows on.
    y = ensureSpace(doc, y, height);

    setFont(doc, FONT.body, 'bold');
    textLines.forEach((line) => {
      y = ensureSpace(doc, y, LINE_HEIGHT);
      doc.text(line, MARGIN, y);
      y += LINE_HEIGHT;
    });

    setFont(doc, FONT.body);
    pointsLines.forEach((line) => {
      y = ensureSpace(doc, y, LINE_HEIGHT);
      doc.text(line, MARGIN + INDENT, y);
      y += LINE_HEIGHT;
    });

    block.tallyLabels.forEach((label) => {
      y = ensureSpace(doc, y, TALLY_HEIGHT);
      y += LINE_HEIGHT * 0.5;
      drawRuleAfterLabel(doc, label, MARGIN + INDENT, y, RIGHT_EDGE);
      y += LINE_HEIGHT;
    });

    y += BLOCK_GAP;
  });

  y = ensureSpace(doc, y, LINE_HEIGHT * 2);
  setFont(doc, FONT.body, 'bold');
  doc.text(END_MARKER, PAGE_WIDTH / 2, y + LINE_HEIGHT * 0.5, { align: 'center' });

  drawFooters(doc);
  return doc.output('blob');
};
