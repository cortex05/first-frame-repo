// Shared page layout for the offline PDFs (spec 006). US Letter, portrait, in
// points. jsPDF draws in black on white, so no theme tokens are involved.

export const PAGE_WIDTH = 612;
export const PAGE_HEIGHT = 792;
export const MARGIN = 54;
export const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
export const RIGHT_EDGE = PAGE_WIDTH - MARGIN;
export const LINE_HEIGHT = 16;
export const TOP_Y = MARGIN;
// Baseline of the first line on a continuation page.
export const CONTENT_TOP = TOP_Y + LINE_HEIGHT;
export const FOOTER_Y = PAGE_HEIGHT - 30;
// Content stops here so it never runs into the footer.
export const BOTTOM_Y = FOOTER_Y - 24;

export const FONT = {
  title: 16,
  header: 12,
  body: 11,
  footer: 9,
};

const RULE_GAP = 4;

export const createDoc = (JsPDF) =>
  new JsPDF({ unit: 'pt', format: 'letter', orientation: 'portrait' });

export const setFont = (doc, size, style = 'normal') => {
  doc.setFont('helvetica', style);
  doc.setFontSize(size);
};

/**
 * Starts a new page when `height` more points won't fit below `y`. A block
 * already at the top of a page is left alone, so a block taller than a page
 * flows on instead of adding blank pages.
 */
export const ensureSpace = (doc, y, height) => {
  if (y + height <= BOTTOM_Y || y <= CONTENT_TOP) return y;
  doc.addPage();
  return CONTENT_TOP;
};

// Writes `label` and draws a writing line from just after it to `rightX`.
export const drawRuleAfterLabel = (doc, label, x, y, rightX) => {
  doc.text(label, x, y);
  const start = x + doc.getTextWidth(label) + RULE_GAP;
  doc.line(start, y + 2, Math.max(start, rightX), y + 2);
};

// Client, attorney, category and student count, then a full-width rule.
// Returns the y where the content below the header starts.
export const drawHeader = (doc, lines) => {
  let y = TOP_Y + FONT.title;
  lines.forEach((line, index) => {
    if (index === 0) setFont(doc, FONT.title, 'bold');
    else setFont(doc, FONT.header);
    doc.text(line, MARGIN, y);
    y += index === 0 ? LINE_HEIGHT + 6 : LINE_HEIGHT;
  });
  y += 2;
  doc.setLineWidth(1);
  doc.line(MARGIN, y, RIGHT_EDGE, y);
  doc.setLineWidth(0.5);
  setFont(doc, FONT.body);
  return y + LINE_HEIGHT * 1.75;
};

export const drawFooters = (doc) => {
  const total = doc.getNumberOfPages();
  setFont(doc, FONT.footer);
  for (let page = 1; page <= total; page += 1) {
    doc.setPage(page);
    doc.text(`Page ${page} of ${total}`, PAGE_WIDTH / 2, FOOTER_Y, { align: 'center' });
  }
};
