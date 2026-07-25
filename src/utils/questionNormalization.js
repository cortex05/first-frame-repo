import { QuestionType } from '../types/ENUMS';

export const isTrueLabel = (label) => label === true || label === 'true';
export const isFalseLabel = (label) => label === false || label === 'false';

const normalizeTrueFalseLabel = (label) => {
  if (isTrueLabel(label)) return true;
  if (isFalseLabel(label)) return false;
  return label;
};

export const normalizeQuestionOption = (option, questionType) => {
  if (!option || typeof option !== 'object') {
    return option;
  }

  const normalizedLabel =
    questionType === QuestionType.TRUE_FALSE
      ? normalizeTrueFalseLabel(option.label)
      : String(option.label ?? '').trim();

  return {
    ...option,
    label: normalizedLabel,
    value: Number(option.value) || 0,
  };
};

export const normalizeQuestion = (question) => {
  if (!question || typeof question !== 'object') {
    return question;
  }

  const normalizedType = question.type;
  const normalizedOptions = Array.isArray(question.options)
    ? question.options.map((option) =>
        normalizeQuestionOption(option, normalizedType),
      )
    : [];

  return {
    ...question,
    text: String(question.text ?? '').trim(),
    type: normalizedType,
    options: normalizedOptions,
  };
};

export const normalizeQuestions = (questions) =>
  Array.isArray(questions) ? questions.map(normalizeQuestion) : [];

export const normalizeCaseQuestionsPayload = (casePayload) => {
  if (!casePayload || typeof casePayload !== 'object') {
    return casePayload;
  }

  return {
    ...casePayload,
    questions: normalizeQuestions(casePayload.questions),
  };
};
