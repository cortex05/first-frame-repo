class Case {	
	students = [];
  	questions = [];
  	chartData = {};
  	answers = {};
		seated = false;

  	constructor(_id, clientName, attorney, crimeType, studentNumber, questions) {
    	this._id = _id;
		this.clientName = clientName;
		this.attorney = attorney;
			this.crimeType = crimeType;
    	this.studentNumber = studentNumber;
    	this.questions = questions;
  	}
}

export default Case;
