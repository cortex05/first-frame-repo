class Case {	
	students = [];
  	questions = [];
  	chartData = {};
  	answers = {};
		seated = false;

  	constructor(_id, name, author, crimeType,location, studentNumber, caseDate, questions) {
    	this._id = _id;
    	this.name = name;
    	this.author = author;
			this.crimeType = crimeType;
    	this.location = location;
    	this.studentNumber = studentNumber;
			this.caseDate = caseDate;
    	this.questions = questions;
    	this.dateCreated = new Date();
  	}
}

export default Case;
