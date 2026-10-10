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

/**
 * A question is `{ id, text, type, options }` everywhere: on a case, a
 * playlist and a recommended set (spec 010). Built field by field, so the
 * fields older documents may still carry (`answers`, `firstPoll`, `caseId`)
 * are dropped on the way in and never sent back out. A case's answers live
 * only in `case.answers`.
 */
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
    id: question.id,
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
