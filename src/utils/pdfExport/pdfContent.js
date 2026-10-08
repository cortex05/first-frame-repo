// The text of the offline PDFs (spec 006), kept free of jsPDF so it can be
// tested on its own. The builders only lay these strings out.
import { caseCategoryLabel } from '../../types/caseCategories';
import { QuestionType } from '../../types/ENUMS';
import { isFalseLabel, isTrueLabel } from '../questionNormalization';

export const END_MARKER = '-------- END --------';

const optionValue = (option) => Number(option?.value) || 0;

export const caseHeaderLines = (activeCase) => [
  `Client: ${activeCase?.clientName ?? ''}`,
  `Attorney: ${activeCase?.attorney || '—'}`,
  `Case Category: ${caseCategoryLabel(activeCase?.category)}`,
  `Number of Students: ${activeCase?.studentNumber || '—'}`,
];

const trueFalseBlock = (question) => {
  const options = Array.isArray(question.options) ? question.options : [];
  const trueOption = options.find((option) => isTrueLabel(option?.label));
  const falseOption = options.find((option) => isFalseLabel(option?.label));
  return {
    pointsLine: `Points: True: ${optionValue(trueOption)} - False: ${optionValue(falseOption)}`,
    tallyLabels: ['Students Answered True:'],
  };
};

const multipleChoiceBlock = (question) => {
  const options = (Array.isArray(question.options) ? question.options : [])
    .map((option) => ({ label: String(option?.label ?? '').trim(), value: optionValue(option) }))
    .filter((option) => option.label !== '');
  return {
    pointsLine: `Points: ${options.map((o) => `${o.label}: ${o.value}`).join(' - ')}`,
    tallyLabels: options.map((o) => `Students Answered ${o.label}:`),
  };
};

export const questionBlocks = (questions) =>
  (Array.isArray(questions) ? questions : []).map((question, index) => ({
    number: index + 1,
    text: `"${String(question?.text ?? '').trim()}"`,
    ...(question?.type === QuestionType.MULTIPLE_CHOICE
      ? multipleChoiceBlock(question)
      : trueFalseBlock(question)),
  }));

// One slide per question (spec 009). Only the number and text: options,
// points and answers must never reach the slides (AC-15).
export const slideBlocks = (questions) =>
  (Array.isArray(questions) ? questions : []).map((question, index) => ({
    number: index + 1,
    label: `Question ${index + 1}`,
    text: String(question?.text ?? '').trim(),
  }));

export const studentNumbers = (studentNumber) =>
  Array.from({ length: Math.max(0, Math.floor(Number(studentNumber) || 0)) }, (_, i) => i + 1);
