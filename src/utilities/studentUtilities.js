import Student from '../types/Student';

export const initialStudentGeneration = (numStudents) => {
  const students = [];
  for (let i = 0; i < numStudents; i++) {
    const student = new Student(i + 1);
    students.push(student);
  }
  return students;
};