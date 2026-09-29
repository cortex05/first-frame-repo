import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import StudentReportModal from './StudentReportModal';

const questions = [
  {
    id: 'q-1',
    text: 'Was there intent?',
    type: 'TRUE_FALSE',
    options: [
      { label: true, value: 5 },
      { label: false, value: 0 },
    ],
  },
  {
    id: 'q-2',
    text: 'Which motive?',
    type: 'MULTIPLE_CHOICE',
    options: [
      { label: 'Money', value: 2 },
      { label: 'Revenge', value: 0 },
    ],
  },
  { id: 'q-3', text: 'Credible witness?', type: 'TRUE_FALSE', options: [{ label: true, value: 3 }, { label: false, value: 0 }] },
];

const makeCase = (overrides = {}) => ({
  _id: 'case-1',
  studentNumber: 5,
  questions,
  answers: {
    'q-1': { 4: { label: 'true', value: 5 } },
    'q-2': { 4: { label: 'Money', value: 2 } },
  },
  studentDetails: {},
  ...overrides,
});

const renderModal = (props = {}) => {
  const onClose = vi.fn();
  const onSaveDetails = vi.fn(async () => {});
  const utils = render(
    <StudentReportModal
      activeCase={makeCase()}
      studentNumber={4}
      onClose={onClose}
      onSaveDetails={onSaveDetails}
      {...props}
    />,
  );
  return { ...utils, onClose, onSaveDetails };
};

const detailValue = (label) => screen.getByText(label, { selector: 'dt' }).nextElementSibling;

describe('StudentReportModal', () => {
  it('puts the student and their point total in the heading', () => {
    renderModal();

    expect(screen.getByRole('heading', { name: 'Student Report - #4 = 7 Points' })).toBeInTheDocument();
  });

  it('shows ? for every empty detail', () => {
    renderModal();

    for (const label of ['Age', 'Occupation', 'Gender', 'Race']) {
      expect(detailValue(label)).toHaveTextContent('?');
    }
  });

  it('shows the saved details, with gender capitalized', () => {
    renderModal({
      activeCase: makeCase({ studentDetails: { 4: { age: 34, occupation: 'Teacher', gender: 'female' } } }),
    });

    expect(detailValue('Age')).toHaveTextContent('34');
    expect(detailValue('Occupation')).toHaveTextContent('Teacher');
    expect(detailValue('Gender')).toHaveTextContent('Female');
    expect(detailValue('Race')).toHaveTextContent('?');
  });

  it('lists every question with the answer and its points', () => {
    renderModal();

    const rows = screen.getAllByRole('listitem');
    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveTextContent('Was there intent? - True');
    expect(within(rows[0]).getByText('5')).toBeInTheDocument();
    expect(rows[1]).toHaveTextContent('Which motive? - Money');
    expect(rows[2]).toHaveTextContent('Credible witness? - No answer');
    expect(within(rows[2]).getByText('N/A')).toBeInTheDocument();
  });

  it('turns the details into pre-filled inputs on Edit', async () => {
    const user = userEvent.setup();
    renderModal({
      activeCase: makeCase({ studentDetails: { 4: { age: 34, gender: 'male' } } }),
    });

    await user.click(screen.getByRole('button', { name: 'Edit' }));

    expect(screen.getByLabelText('Age')).toHaveValue(34);
    expect(screen.getByLabelText('Occupation')).toHaveValue('');
    expect(screen.getByLabelText('Gender')).toHaveValue('male');
    expect(screen.getByLabelText('Race')).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
  });

  it('drops the edits on Cancel without saving', async () => {
    const user = userEvent.setup();
    const { onSaveDetails } = renderModal({
      activeCase: makeCase({ studentDetails: { 4: { occupation: 'Teacher' } } }),
    });

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    await user.clear(screen.getByLabelText('Occupation'));
    await user.type(screen.getByLabelText('Occupation'), 'Pilot');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onSaveDetails).not.toHaveBeenCalled();
    expect(detailValue('Occupation')).toHaveTextContent('Teacher');
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
  });

  it('saves the payload, shows the saving state, then goes back to read mode', async () => {
    const user = userEvent.setup();
    let resolveSave;
    const onSaveDetails = vi.fn(() => new Promise((resolve) => { resolveSave = resolve; }));
    renderModal({ onSaveDetails });

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    await user.type(screen.getByLabelText('Age'), '41');
    await user.type(screen.getByLabelText('Occupation'), '  Nurse ');
    await user.selectOptions(screen.getByLabelText('Gender'), 'female');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSaveDetails).toHaveBeenCalledWith({ age: 41, occupation: 'Nurse', gender: 'female', race: null });
    expect(screen.getByRole('button', { name: 'Saving...' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();

    resolveSave();

    expect(await screen.findByRole('button', { name: 'Edit' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Age')).not.toBeInTheDocument();
  });

  it('refuses an age outside 18–120 without calling the server', async () => {
    const user = userEvent.setup();
    const { onSaveDetails } = renderModal();

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    await user.type(screen.getByLabelText('Age'), '17');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Age must be a whole number from 18 to 120.');
    expect(onSaveDetails).not.toHaveBeenCalled();
  });

  it('stays in edit mode with the server message when the save fails', async () => {
    const user = userEvent.setup();
    const onSaveDetails = vi.fn().mockRejectedValue({ response: { data: { message: 'race must be at most 50 characters' } } });
    renderModal({ onSaveDetails });

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    await user.type(screen.getByLabelText('Race'), 'Something');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('race must be at most 50 characters');
    expect(screen.getByLabelText('Race')).toHaveValue('Something');
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
  });

  it('falls back to a generic message', async () => {
    const user = userEvent.setup();
    renderModal({ onSaveDetails: vi.fn().mockRejectedValue(new Error('network')) });

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to save student details.');
  });

  it('closes with × and reopens in read mode', async () => {
    const user = userEvent.setup();
    const { onClose, unmount } = renderModal();

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalled();

    unmount();
    renderModal();
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Age')).not.toBeInTheDocument();
  });
});
