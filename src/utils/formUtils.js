import { QuestionType } from "../types/ENUMS";

export const EMPTY_QUESTION_FORM = {
  text: "",
  type: QuestionType.TRUE_FALSE,
  options: [
    { label: "", value: 0 },
    { label: "", value: 0 },
    { label: "", value: 0 },
    { label: "", value: 0 },
  ],
  tfValues: [
    { label: true, value: 3 },
    { label: false, value: 0 },
  ],
};