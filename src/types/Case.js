class Case {	
	students = [];
  	questions = [];
  	chartData = {};
  	answers = {};
		seated = false;

  	constructor(_id, clientName, attorney, caseType, charge, studentNumber, questions) {
    	this._id = _id;
			this.clientName = clientName;
			this.attorney = attorney;
			this.caseType = caseType;
			this.charge = charge;
    	this.studentNumber = studentNumber;
    	this.questions = questions;
  	}
}

export default Case;
