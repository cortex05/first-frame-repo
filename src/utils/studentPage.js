// Total score for one student
export const total = (studentId) => {
  	return Object.values(activeCase.answers).reduce(
    	(sum, qAnswers) => sum + (qAnswers[studentId]?.value ?? 0), 0
  	);
}

// All answers for one student (for the tap-to-inspect view)
export const studentSummary = (studentId) => {
  	return activeCase.questions.map((q) => ({
    	question: q.text,
    	answer: activeCase.answers[q.id]?.[studentId]?.label ?? null,
    	value:  activeCase.answers[q.id]?.[studentId]?.value ?? 0,
  	}));
}

// Sort students by score
export const sorted = activeCase.students
  .slice()
  .sort((a, b) => total(b.number) - total(a.number));