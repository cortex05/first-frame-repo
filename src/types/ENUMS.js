export const QuestionType = {
  TRUE_FALSE: 'TRUE_FALSE',
  MULTIPLE_CHOICE: 'MULTIPLE_CHOICE',
};

export const CaseTypes = {
  CRIMINAL: 'Criminal',
  CIVIL: 'Civil',
};

export const ChargeOptionsByCaseType = {
  [CaseTypes.CRIMINAL]: ['Assault', 'Battery'],
  [CaseTypes.CIVIL]: ['Personal Injury', 'Breach of contract'],
};