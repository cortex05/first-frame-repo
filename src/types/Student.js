class Student {
  questionsAnswered = [];

  constructor(number) {
    this.number = number;
  }

  answerQuestion(question) {
    this.questionsAnswered.push(question);
  }
}

export default Student;