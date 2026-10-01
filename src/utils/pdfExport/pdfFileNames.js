// File names for the offline PDF export (spec 006, AC-17).

export const sanitizeClientName = (clientName) => {
  const cleaned = String(clientName ?? '')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^A-Za-z0-9_-]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
  return cleaned || 'case';
};

export const questionsFileName = (clientName) =>
  `client_${sanitizeClientName(clientName)}_questions.pdf`;

export const answersFileName = (clientName) =>
  `client_${sanitizeClientName(clientName)}_answers.pdf`;
