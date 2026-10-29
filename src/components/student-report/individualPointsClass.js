import { individualPointsTier } from '../../utils/studentScores';

/**
 * The CSS-module class for an individual-round value in a student report:
 * the same tier as the student's seat in the Individual view (`risk_low`,
 * `risk_medium`, `risk_high` in the caller's module), or `emptyClass` at 0.
 */
const individualPointsClass = (styles, points, emptyClass) => {
  const tier = individualPointsTier(points);
  return tier ? styles[`risk_${tier}`] : emptyClass;
};

export default individualPointsClass;
