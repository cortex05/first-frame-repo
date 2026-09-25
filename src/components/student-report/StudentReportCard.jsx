import {
  RISK_LABELS,
  answerPoints,
  formatAnswerLabel,
  getAnswer,
  getAnswerTier,
} from '../../utils/studentScores';

import styles from './StudentReportCard.module.css';

/**
 * One student's report: their risk tier and total, then every question with
 * the answer they gave and the points it earned. Presentational -- the caller
 * works out `risk` and `total` with utils/studentScores over the whole class.
 */
const StudentReportCard = ({ studentNumber, risk = 'low', total = 0, questions = [], answers = {} }) => (
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
    </ul>
  </section>
);

export default StudentReportCard;
