class Case {
  students = []
  questions = []

  constructor(_id, name, author, location, studentNumber, questions) {
    this._id = _id;
    this.name = name;
    this.author = author;
    this.location = location
    this.studentNumber = studentNumber
    this.questions = questions
    this.dateCreated = new Date();
  }

}

export default Case;