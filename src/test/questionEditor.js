import { screen, within } from '@testing-library/react';
import { expect } from 'vitest';

/**
 * Spec 013: the Add Question editor (copied in CaseScreen, MakePlaylistScreen,
 * CreateRecommendedScreen, EditRecommendedScreen and EditPlaylistScreen) names
 * every control.
 * Opens the editor with "+ Add Question", then walks both question types.
 */
export const expectLabelledQuestionEditor = async (user) => {
  await user.click(screen.getByRole('button', { name: '+ Add Question' }));
  const editor = within(screen.getByRole('dialog', { name: 'Add Question' }));

  expect(editor.getByLabelText('Question Text').tagName).toBe('TEXTAREA');
  const type = editor.getByLabelText('Type');
  expect(type.tagName).toBe('SELECT');

  const points = within(editor.getByRole('group', { name: 'Point Values' }));
  expect(points.getByLabelText('True points')).toHaveValue(3);
  expect(points.getByLabelText('False points')).toHaveValue(0);

  await user.selectOptions(type, 'MULTIPLE_CHOICE');

  const options = within(editor.getByRole('group', { name: 'Options (up to 4)' }));
  for (const n of [1, 2, 3, 4]) {
    expect(options.getByLabelText(`Option ${n}`)).toHaveAttribute('type', 'text');
    expect(options.getByLabelText(`Option ${n} points`)).toHaveAttribute('type', 'number');
  }
};
