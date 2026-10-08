import { jsPDF } from 'jspdf';
import { describe, expect, it } from 'vitest';

import { LEFT_X, RIGHT_X, buildAnswersPdf } from './buildAnswersPdf';
import { buildQuestionsPdf } from './buildQuestionsPdf';
import { SLIDE_BOTTOM, SLIDE_TEXT_MAX, SLIDE_TEXT_MIN, buildSlidesPdf } from './buildSlidesPdf';
import { END_MARKER } from './pdfContent';
import { FOOTER_Y, PAGE_WIDTH, SLIDE_PAGE_HEIGHT, SLIDE_PAGE_WIDTH } from './pdfLayout';

// Records every text call with the page it landed on, and keeps the last doc.
const recordingJsPdf = () => {
  const calls = [];
  let lastDoc = null;
  class RecordingJsPdf extends jsPDF {
    constructor(options) {
      super(options);
      lastDoc = this;
      const text = this.text.bind(this);
      this.text = (value, x, y, opts) => {
        calls.push({
          value,
          x,
          y,
          opts,
          page: this.getCurrentPageInfo().pageNumber,
          fontSize: this.getFontSize(),
        });
        return text(value, x, y, opts);
      };
    }
  }
  return { RecordingJsPdf, calls, doc: () => lastDoc };
};

const makeCase = (overrides = {}) => ({
  clientName: 'Jane Client',
  attorney: 'Alex Attorney',
  category: 'criminal.theft',
  studentNumber: 5,
  questions: [
    {
      id: 'q-1',
      type: 'TRUE_FALSE',
      text: 'Intent?',
      options: [
        { label: true, value: 3 },
        { label: false, value: 0 },
      ],
    },
    {
      id: 'q-2',
      type: 'MULTIPLE_CHOICE',
      text: 'Rate the officer',
      options: [
        { label: 'Trustworthy', value: 3 },
        { label: 'Neutral', value: 1 },
      ],
    },
  ],
  ...overrides,
});

const manyQuestions = (count) =>
  Array.from({ length: count }, (_, i) => ({
    id: `q-${i + 1}`,
    type: 'MULTIPLE_CHOICE',
    text: `Question ${i + 1} is long enough that it has to wrap onto a second line of the page when it is printed out.`,
    options: [
      { label: 'Yes', value: 2 },
      { label: 'No', value: 0 },
      { label: 'Unsure', value: 1 },
    ],
  }));

const texts = (calls) => calls.map((c) => c.value);

describe('buildQuestionsPdf', () => {
  it('returns a PDF blob', () => {
    const blob = buildQuestionsPdf(jsPDF, makeCase());
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('application/pdf');
    expect(blob.size).toBeGreaterThan(0);
  });

  it('writes the header, every question, its points and tally lines, then END', () => {
    const { RecordingJsPdf, calls } = recordingJsPdf();
    buildQuestionsPdf(RecordingJsPdf, makeCase());

    const written = texts(calls);
    expect(written.slice(0, 4)).toEqual([
      'Client: Jane Client',
      'Attorney: Alex Attorney',
      'Case Category: Criminal — Theft',
      'Number of Students: 5',
    ]);
    expect(written).toEqual(
      expect.arrayContaining([
        '1. "Intent?"',
        'Points: True: 3 - False: 0',
        'Students Answered True:',
        '2. "Rate the officer"',
        'Points: Trustworthy: 3 - Neutral: 1',
        'Students Answered Trustworthy:',
        'Students Answered Neutral:',
      ]),
    );

    const endIndex = written.indexOf(END_MARKER);
    expect(endIndex).toBeGreaterThan(written.indexOf('Students Answered Neutral:'));
    expect(calls[endIndex].x).toBe(PAGE_WIDTH / 2);
    // jsPDF adds its own keys to the options object, so match only `align`.
    expect(calls[endIndex].opts).toMatchObject({ align: 'center' });
    // Only footers come after END.
    expect(written.slice(endIndex + 1).every((t) => /^Page \d+ of \d+$/.test(t))).toBe(true);
  });

  it('flows onto more pages without splitting a question, with a footer on each', () => {
    const { RecordingJsPdf, calls, doc } = recordingJsPdf();
    buildQuestionsPdf(RecordingJsPdf, makeCase({ questions: manyQuestions(40) }));

    const pages = doc().getNumberOfPages();
    expect(pages).toBeGreaterThan(1);

    // Group the body calls by question: a question starts at its "N. " line.
    const body = calls.slice(4, calls.findIndex((c) => c.value === END_MARKER));
    const pagesByQuestion = new Map();
    let current = null;
    body.forEach((call) => {
      const match = /^(\d+)\. /.exec(call.value);
      if (match) current = Number(match[1]);
      if (!pagesByQuestion.has(current)) pagesByQuestion.set(current, new Set());
      pagesByQuestion.get(current).add(call.page);
    });
    expect(pagesByQuestion.size).toBe(40);
    pagesByQuestion.forEach((pageSet) => expect(pageSet.size).toBe(1));

    for (let page = 1; page <= pages; page += 1) {
      const footer = calls.find((c) => c.value === `Page ${page} of ${pages}`);
      expect(footer?.page).toBe(page);
      // Portrait footers are unchanged by the page-size-aware drawFooters.
      expect(footer?.x).toBe(PAGE_WIDTH / 2);
      expect(footer?.y).toBe(FOOTER_Y);
    }
  });
});

describe('buildAnswersPdf', () => {
  it('returns a PDF blob with the case header', () => {
    const { RecordingJsPdf, calls } = recordingJsPdf();
    const blob = buildAnswersPdf(RecordingJsPdf, makeCase());
    expect(blob.type).toBe('application/pdf');
    expect(texts(calls).slice(0, 4)).toEqual([
      'Client: Jane Client',
      'Attorney: Alex Attorney',
      'Case Category: Criminal — Theft',
      'Number of Students: 5',
    ]);
  });

  it('writes one block per student, two per row', () => {
    const { RecordingJsPdf, calls } = recordingJsPdf();
    buildAnswersPdf(RecordingJsPdf, makeCase({ studentNumber: 5 }));

    const headings = calls.filter((c) => /^# \d+$/.test(c.value));
    expect(headings.map((c) => c.value)).toEqual(['# 1', '# 2', '# 3', '# 4', '# 5']);
    expect(headings.map((c) => c.x)).toEqual([LEFT_X, RIGHT_X, LEFT_X, RIGHT_X, LEFT_X]);
    // Each pair shares a row.
    expect(headings[0].y).toBe(headings[1].y);
    expect(headings[2].y).toBe(headings[3].y);
    expect(headings[4].y).toBeGreaterThan(headings[2].y);

    expect(calls.filter((c) => c.value === 'Points:')).toHaveLength(5);
    expect(calls.filter((c) => c.value === 'Total:')).toHaveLength(5);
  });

  it('keeps every row on one page for a large class', () => {
    const { RecordingJsPdf, calls, doc } = recordingJsPdf();
    buildAnswersPdf(RecordingJsPdf, makeCase({ studentNumber: 60 }));

    expect(doc().getNumberOfPages()).toBeGreaterThan(1);
    const headings = calls.filter((c) => /^# \d+$/.test(c.value));
    expect(headings).toHaveLength(60);

    // Each student's heading, Points and Total land on the same page.
    const blockCalls = calls.filter((c) => /^(# \d+|Points:|Total:)$/.test(c.value));
    for (let i = 0; i < blockCalls.length; i += 6) {
      const row = blockCalls.slice(i, i + 6);
      expect(new Set(row.map((c) => c.page)).size).toBe(1);
    }
  });
});

describe('buildSlidesPdf', () => {
  const slidesCase = () =>
    makeCase({
      questions: [
        {
          id: 'q-1',
          type: 'TRUE_FALSE',
          text: 'Did the defendant intend it?',
          options: [
            { label: true, value: 3 },
            { label: false, value: 0 },
          ],
        },
        {
          id: 'q-2',
          type: 'MULTIPLE_CHOICE',
          text: 'How credible was the officer?',
          options: [
            { label: 'Zebra', value: 7 },
            { label: 'Yak', value: 5 },
          ],
        },
        { id: 'q-3', type: 'TRUE_FALSE', text: 'Was it fair?', options: [] },
      ],
    });

  it('returns a landscape PDF with one page per question', () => {
    const { RecordingJsPdf, doc } = recordingJsPdf();
    const blob = buildSlidesPdf(RecordingJsPdf, slidesCase());

    expect(blob.type).toBe('application/pdf');
    expect(doc().getNumberOfPages()).toBe(3);
    expect(doc().internal.pageSize.getWidth()).toBeCloseTo(SLIDE_PAGE_WIDTH, 0);
    expect(doc().internal.pageSize.getHeight()).toBeCloseTo(SLIDE_PAGE_HEIGHT, 0);
  });

  it('puts the client, question label, centered text and footer on each page', () => {
    const { RecordingJsPdf, calls } = recordingJsPdf();
    buildSlidesPdf(RecordingJsPdf, slidesCase());
    const { questions } = slidesCase();

    for (let page = 1; page <= 3; page += 1) {
      const onPage = calls.filter((c) => c.page === page);
      expect(onPage.map((c) => c.value)).toEqual([
        'Client: Jane Client',
        `Question ${page}`,
        questions[page - 1].text,
        `Page ${page} of 3`,
      ]);
      const [, label, text, footer] = onPage;
      [label, text, footer].forEach((call) => {
        expect(call.x).toBe(SLIDE_PAGE_WIDTH / 2);
        expect(call.opts).toMatchObject({ align: 'center' });
      });
      expect(text.fontSize).toBe(SLIDE_TEXT_MAX);
      expect(text.y).toBeGreaterThan(label.y);
    }
  });

  it('leaves out points, options and tally lines', () => {
    const { RecordingJsPdf, calls } = recordingJsPdf();
    buildSlidesPdf(RecordingJsPdf, slidesCase());

    const written = texts(calls).join(' ');
    ['Points:', 'Students Answered', 'True:', 'False:', 'Zebra', 'Yak'].forEach((word) =>
      expect(written).not.toContain(word),
    );
  });

  it('shrinks a long question to fit on its own page', () => {
    const { RecordingJsPdf, calls, doc } = recordingJsPdf();
    const long = 'The witness said the light was red. '.repeat(10).trim();
    buildSlidesPdf(RecordingJsPdf, makeCase({ questions: [{ id: 'q-1', text: long }] }));

    expect(doc().getNumberOfPages()).toBe(1);
    const body = calls.filter((c) => !/^(Client: |Question 1$|Page )/.test(c.value));
    expect(body.length).toBeGreaterThan(1);
    expect(body[0].fontSize).toBeLessThan(SLIDE_TEXT_MAX);
    expect(body[0].fontSize).toBeGreaterThanOrEqual(SLIDE_TEXT_MIN);
    expect(body.map((c) => c.value).join(' ')).toBe(long);
    body.forEach((call) => expect(call.y).toBeLessThanOrEqual(SLIDE_BOTTOM));
  });

  it('clips text that does not fit at the minimum size instead of adding a page', () => {
    const { RecordingJsPdf, calls, doc } = recordingJsPdf();
    buildSlidesPdf(
      RecordingJsPdf,
      makeCase({ questions: [{ id: 'q-1', text: 'word '.repeat(2000).trim() }] }),
    );

    expect(doc().getNumberOfPages()).toBe(1);
    const body = calls.filter((c) => /^word/.test(c.value));
    expect(body[0].fontSize).toBe(SLIDE_TEXT_MIN);
    body.forEach((call) => expect(call.y).toBeLessThanOrEqual(SLIDE_BOTTOM));
  });

  it('still renders a page for a question with empty text', () => {
    const { RecordingJsPdf, calls, doc } = recordingJsPdf();
    buildSlidesPdf(RecordingJsPdf, makeCase({ questions: [{ id: 'q-1', text: '   ' }] }));

    expect(doc().getNumberOfPages()).toBe(1);
    expect(texts(calls)).toEqual(['Client: Jane Client', 'Question 1', 'Page 1 of 1']);
  });
});
