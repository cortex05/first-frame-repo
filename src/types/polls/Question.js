import { QuestionType } from '../ENUMS';

class Question {
  firstPoll = false;

  constructor(id, text, type, caseId, options = []) {
    this.id = id;
    this.text = text;
    this.type = type;
    this.caseId = caseId;
    this.options = type === QuestionType.TRUE_FALSE
      ? [true, false]
      : options; // expect 3-4 items for MULTIPLE_CHOICE
    this.answers = new Map(); // studentId -> answer string
  }

  recordAnswer(studentId, answer) {
    this.answers.set(studentId, answer);
  }

  getAnswer(studentId) {
    return this.answers.get(studentId) ?? null;
  }

  // Returns array of studentIds who haven't answered yet
  getUnanswered(allStudentIds) {
    return allStudentIds.filter((id) => !this.answers.has(id));
  }
}

export default Question;