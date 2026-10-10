// A question as cases, playlists and recommended sets all store it. Answers
// are not kept on the question: a case holds them in `case.answers`
// (spec 010).
class Question {
  constructor(id, text, type, options = []) {
    this.id = id;
    this.text = text;
    this.type = type;
    this.options = options; // { label, value }[] — provided by caller
  }
}

export default Question;
