import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import CreateCaseScreen from './CreateCaseScreen';
import { createCase } from '../../api/case';
import useAuthStore from '../../store/useAuthStore';
import useCaseStore from '../../store/useCaseStore';

vi.mock('../../api/case', () => ({
  createCase: vi.fn(),
  getUserCases: vi.fn(async () => []),
}));
vi.mock('../../api/account', () => ({
  getAccountUsers: vi.fn(async () => []),
}));

const session = {
  token: 'token',
  userId: 'u-admin',
  username: 'admin',
  isAdmin: false,
  accountId: 'acc-1',
  accountName: 'Firm',
  role: 'admin',
  mustChangePassword: false,
};

const renderCreate = () =>
  render(
    <MemoryRouter initialEntries={['/create-case']}>
      <Routes>
        <Route path="/create-case" element={<CreateCaseScreen />} />
        <Route path="/case/:id" element={<p>Case screen</p>} />
      </Routes>
    </MemoryRouter>,
  );

const fillForm = async () => {
  await userEvent.type(screen.getByPlaceholderText('Client name'), 'Jane Client');
  await userEvent.type(screen.getByPlaceholderText('Attorney name'), 'Alex Attorney');
  await userEvent.selectOptions(screen.getByRole('combobox'), 'criminal.theft');
  await userEvent.type(screen.getByPlaceholderText('e.g. 30'), '12');
};

const openConfirmation = () => userEvent.click(screen.getByRole('button', { name: 'Create Case' }));

beforeEach(() => {
  vi.mocked(createCase).mockReset();
  useAuthStore.setState({ userInfo: session });
  useCaseStore.setState({ cases: [], activeCase: null });
});

describe('CreateCaseScreen', () => {
  it('has no question tools and says when questions become available', () => {
    renderCreate();

    expect(screen.queryByRole('button', { name: '+ Add Question' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Access Playlists' })).not.toBeInTheDocument();
    expect(
      screen.getByText('Questions can be created and viewed once payment is processed.'),
    ).toBeInTheDocument();
  });

  it('asks for confirmation with the case summary and a payment warning', async () => {
    renderCreate();
    await fillForm();
    await openConfirmation();

    expect(screen.getByRole('heading', { name: 'Confirm Case' })).toBeInTheDocument();
    expect(screen.getByText('Creating this case will initiate payment.')).toBeInTheDocument();
    expect(screen.getByText('Jane Client')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Yes, create case' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'No' })).toBeInTheDocument();
  });

  it('closes on No without creating anything and keeps the form', async () => {
    renderCreate();
    await fillForm();
    await openConfirmation();
    await userEvent.click(screen.getByRole('button', { name: 'No' }));

    expect(screen.queryByRole('heading', { name: 'Confirm Case' })).not.toBeInTheDocument();
    expect(createCase).not.toHaveBeenCalled();
    expect(screen.getByPlaceholderText('Client name')).toHaveValue('Jane Client');
  });

  it('creates the case with the browser timezone and no questions, then opens it', async () => {
    vi.mocked(createCase).mockResolvedValue({ _id: 'case-9', clientName: 'Jane Client' });
    renderCreate();
    await fillForm();
    await openConfirmation();
    await userEvent.click(screen.getByRole('button', { name: 'Yes, create case' }));

    expect(await screen.findByText('Case screen')).toBeInTheDocument();
    const [payload, token] = vi.mocked(createCase).mock.calls[0];
    expect(token).toBe('token');
    expect(payload).toEqual({
      clientName: 'Jane Client',
      attorney: 'Alex Attorney',
      category: 'criminal.theft',
      studentNumber: 12,
      owners: [],
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
    expect(payload).not.toHaveProperty('questions');
    expect(useCaseStore.getState().cases.map((c) => c._id)).toEqual(['case-9']);
  });

  it('keeps the modal open and shows the server message when creation fails', async () => {
    vi.mocked(createCase).mockRejectedValue({
      response: { status: 400, data: { message: 'Invalid case category' } },
    });
    renderCreate();
    await fillForm();
    await openConfirmation();
    await userEvent.click(screen.getByRole('button', { name: 'Yes, create case' }));

    expect(await screen.findByText('Invalid case category')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Confirm Case' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Yes, create case' })).toBeEnabled();
  });
});
