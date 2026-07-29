export const QuestionType = {
  TRUE_FALSE: 'TRUE_FALSE',
  MULTIPLE_CHOICE: 'MULTIPLE_CHOICE',
};

export const CaseTypes = {
  CRIMINAL: 'Criminal',
  CIVIL: 'Civil',
  FAMILY: 'Family',
  PROBATE: 'Probate',
  JUVENILE: 'Juvenile',
  TRAFFIC: 'Traffic',
  BUSINESS_COMMERCIAL: 'Business/Commercial',
  EMPLOYMENT: 'Employment',
  PROPERTY: 'Property',
  TAX: 'Tax',
  BANKRUPTCY: 'Bankruptcy',
};

export const ChargeOptionsByCaseType = {
  [CaseTypes.CRIMINAL]: ['Assault', 'Battery', 'Murder', 'Theft', 'Burglary', 'Robbery', 'Arson', 'Fraud', 'Drug Possession', 'DWI', 'Domestic Violence', 'Kidnapping', 'Weapons Charges', 'Hit and Run'],
  [CaseTypes.CIVIL]: ['Personal Injury', 'Breach of contract', 'Property Damage', 'Medical Malpractice', 'Weapons Charges'],
  [CaseTypes.FAMILY]: ['Divorce', 'Child Custody', 'Child Support', 'Adoption', 'Guardianship', 'Paternity'],
  [CaseTypes.PROBATE]: ['Will Contests', 'Estate Administration', 'Trust Disputes'],
  [CaseTypes.JUVENILE]: ['Juvenile Delinquency', 'Child in Need of Services', 'Juvenile Assault'],
  [CaseTypes.TRAFFIC]: ['Speeding', 'Reckless Driving', 'Driving Without Insurance', 'DWI/DUI', 'Traffic Violations'],
  [CaseTypes.BUSINESS_COMMERCIAL]: ['Partnership Disputes', 'Intellectual Property', 'Shareholder litigation', 'Regulatory Compliance', 'Unfair Competition'],
  [CaseTypes.EMPLOYMENT]: ['Wrongful Termination', 'Workplace Discrimination', 'Workplace Harassment', 'Wage and Hour Disputes'],
  [CaseTypes.PROPERTY]: ['Eviction', 'Boundary Disputes', 'Eminent Domain', 'Quiet Title'],
  [CaseTypes.TAX]: ['Tax Evasion', 'Tax Fraud', 'IRS Audits', 'Tax Appeals'],
  [CaseTypes.BANKRUPTCY]: ['Chapter 7', 'Chapter 11', 'Chapter 13', 'Debt Relief'],
};