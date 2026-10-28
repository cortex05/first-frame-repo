import {
  RISK_LABELS,
  answerPoints,
  formatAnswerLabel,
  formatIndividualPoints,
  getAnswer,
  getAnswerTier,
  individualPointsTier,
} from '../../utils/studentScores';

import styles from './StudentReportCard.module.css';

// Colored like the student's seat in the Individual view; neutral at 0.
const individualBadgeClass = (points) => {
  const tier = individualPointsTier(points);
  return tier ? styles[`risk_${tier}`] : styles.badgeEmpty;
};

/**
 * One student's report: their risk tier and total, then every question with
 * the answer they gave and the points it earned, then their individual-round
 * points. Presentational -- the caller works out `risk`, `total` and
 * `individual` with utils/studentScores over the whole class.
 */
const StudentReportCard = ({
  studentNumber,
  risk = 'low',
  total = 0,
  individual = 0,
  questions = [],
  answers = {},
}) => (
  <section className={styles.card} aria-label={`Student ${studentNumber}`}>
    <h3 className={styles.header}>
      <span className={styles.student}>Student #{studentNumber}</span>
      <span className={`${styles.badge} ${styles[`risk_${risk}`]}`}>
        Risk: {RISK_LABELS[risk]}
      </span>
      <span className={styles.total}>Total: {total} pts</span>
    </h3>

    <ul className={styles.rows}>
      {questions.map((question, index) => {
        const answer = getAnswer({ answers }, question.id, studentNumber);
        const tier = getAnswerTier(question, answer);

        return (
          <li key={question.id} className={styles.row}>
            <span className={styles.questionText}>
              {index + 1}. {question.text} — {formatAnswerLabel(question, answer)}
            </span>
            <span className={`${styles.badge} ${tier ? styles[`risk_${tier}`] : styles.badgeEmpty}`}>
              {tier ? `${answerPoints(answer)} pts` : '—'}
            </span>
          </li>
        );
      })}
      <li className={styles.row}>
        <span className={styles.questionText}>Individual round</span>
        <span className={`${styles.badge} ${individualBadgeClass(individual)}`}>
          {formatIndividualPoints(individual)} pts
        </span>
      </li>
    </ul>
  </section>
);

export default StudentReportCard;
