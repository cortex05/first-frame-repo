import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import CreateCaseScreen from './CreateCaseScreen';
import { createCase } from '../../api/case';
import { getAccountUsers } from '../../api/account';
import useAccountStore from '../../store/useAccountStore';
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

const USERS = [
  { _id: 'u-alice', username: 'alice', role: 'admin', status: 'active' },
  { _id: 'u-bob', username: 'bob', role: 'member', status: 'active' },
  { _id: 'u-carol', username: 'carol', role: 'member', status: 'disabled' },
];

const renderCreate = () =>
  render(
    <MemoryRouter initialEntries={['/create-case']}>
      <Routes>
        <Route path="/create-case" element={<CreateCaseScreen />} />
        <Route path="/case/:id" element={<p>Case screen</p>} />
      </Routes>
    </MemoryRouter>,
  );

// Resolves once the account users have loaded into the Attorney select.
const attorneySelect = async () => {
  await screen.findByRole('option', { name: 'bob' });
  return screen.getByLabelText('Attorney');
};

const pickAttorney = async (id) => userEvent.selectOptions(await attorneySelect(), id);

const fillForm = async () => {
  await userEvent.type(screen.getByPlaceholderText('Client name'), 'Jane Client');
  await pickAttorney('u-bob');
  await userEvent.selectOptions(screen.getByLabelText('Case Category'), 'criminal.theft');
  await userEvent.type(screen.getByPlaceholderText('e.g. 30'), '12');
};

const openConfirmation = () => userEvent.click(screen.getByRole('button', { name: 'Create Case' }));

beforeEach(() => {
  vi.mocked(createCase).mockReset();
  vi.mocked(getAccountUsers).mockReset();
  vi.mocked(getAccountUsers).mockResolvedValue(USERS);
  useAccountStore.setState({ users: [], isLoadingUsers: false });
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
    const dialog = screen.getByRole('dialog', { name: 'Confirm Case' });
    expect(within(dialog).getByText('Jane Client')).toBeInTheDocument();
    expect(within(dialog).getByText('bob')).toBeInTheDocument();
    expect(within(dialog).getByText('12')).toBeInTheDocument();
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
      attorney: 'bob',
      attorneyId: 'u-bob',
      category: 'criminal.theft',
      studentNumber: 12,
      owners: ['u-bob'],
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

describe('CreateCaseScreen labels (spec 013)', () => {
  it('names each field by its label', () => {
    useAuthStore.setState({ userInfo: session });
    renderCreate();

    expect(screen.getByLabelText('Client Name')).toHaveAttribute('placeholder', 'Client name');
    expect(screen.getByLabelText('Attorney').tagName).toBe('SELECT');
    expect(screen.getByLabelText('Case Category').tagName).toBe('SELECT');
    expect(screen.getByLabelText('Number of Students')).toHaveAttribute('type', 'number');
  });

  it('groups the owner checkboxes under Case Owners, with its hint as the description', async () => {
    useAuthStore.setState({ userInfo: session });
    renderCreate();
    await pickAttorney('u-alice');

    const owners = screen.getByRole('group', { name: 'Case Owners' });
    expect(owners).toHaveAccessibleDescription(/The attorney can always open this case/);
    expect(within(owners).getByRole('checkbox', { name: /bob/ })).toBeInTheDocument();
  });
});

describe('CreateCaseScreen missing details (spec 016)', () => {
  it('names and focuses the missing fields instead of opening the confirmation', async () => {
    useAuthStore.setState({ userInfo: session });
    renderCreate();

    await pickAttorney('u-bob');
    await userEvent.click(screen.getByRole('button', { name: 'Create Case' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Fill in: Client Name, Case Category, Number of Students',
    );
    for (const label of ['Client Name', 'Case Category', 'Number of Students']) {
      expect(screen.getByLabelText(label)).toHaveAttribute('aria-invalid', 'true');
    }
    expect(screen.getByLabelText('Attorney')).not.toHaveAttribute('aria-invalid');
    expect(screen.getByLabelText('Client Name')).toHaveFocus();
  });

  it('opens the confirmation once everything is filled in', async () => {
    useAuthStore.setState({ userInfo: session });
    renderCreate();

    await fillForm();
    await openConfirmation();

    expect(screen.getByRole('dialog', { name: 'Confirm Case' })).toBeInTheDocument();
    expect(screen.queryByText(/^Fill in:/)).not.toBeInTheDocument();
  });
});

describe('CreateCaseScreen attorney (spec 021)', () => {
  beforeEach(() => {
    useAuthStore.setState({ userInfo: session });
  });

  it('lists the active users after a placeholder, and hides Case Owners until one is picked', async () => {
    renderCreate();
    const select = await attorneySelect();

    expect(within(select).getAllByRole('option').map((o) => o.textContent)).toEqual([
      'Select an attorney...',
      'alice',
      'bob',
    ]);
    expect(screen.queryByRole('group', { name: 'Case Owners' })).not.toBeInTheDocument();
  });

  it('leaves the attorney out of Case Owners and drops them if they were checked', async () => {
    renderCreate();
    await pickAttorney('u-bob');
    await userEvent.click(screen.getByRole('checkbox', { name: /alice/ }));

    await pickAttorney('u-alice');
    const owners = screen.getByRole('group', { name: 'Case Owners' });
    expect(within(owners).queryByRole('checkbox', { name: /alice/ })).not.toBeInTheDocument();

    await pickAttorney('u-bob');
    expect(screen.getByRole('checkbox', { name: /alice/ })).not.toBeChecked();
  });

  it('keeps checked owners while the attorney is cleared and picked again', async () => {
    renderCreate();
    await pickAttorney('u-bob');
    await userEvent.click(screen.getByRole('checkbox', { name: /alice/ }));

    await userEvent.selectOptions(screen.getByLabelText('Attorney'), '');
    expect(screen.queryByRole('group', { name: 'Case Owners' })).not.toBeInTheDocument();

    await pickAttorney('u-bob');
    expect(screen.getByRole('checkbox', { name: /alice/ })).toBeChecked();
  });

  it('says so when nobody else can be an owner', async () => {
    vi.mocked(getAccountUsers).mockResolvedValue([USERS[1]]);
    renderCreate();
    await pickAttorney('u-bob');

    expect(screen.getByText('No other users in this account.')).toBeInTheDocument();
  });

  it('asks for the attorney instead of opening the confirmation', async () => {
    renderCreate();
    await attorneySelect();
    await userEvent.click(screen.getByRole('button', { name: 'Create Case' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Fill in: Client Name, Attorney, Case Category, Number of Students',
    );
    expect(screen.getByLabelText('Attorney')).toHaveAttribute('aria-invalid', 'true');
  });

  it('disables the select while the users load', async () => {
    vi.mocked(getAccountUsers).mockReturnValue(new Promise(() => {}));
    renderCreate();

    const select = screen.getByLabelText('Attorney');
    expect(select).toBeDisabled();
    expect(within(select).getByRole('option', { name: 'Loading users...' })).toBeInTheDocument();
  });

  it('says when the users could not be loaded', async () => {
    vi.mocked(getAccountUsers).mockRejectedValue(new Error('offline'));
    renderCreate();

    expect(
      await screen.findByText("Couldn't load the account's users. Reload the page to try again."),
    ).toBeInTheDocument();
  });

  it('sends the attorney first among the owners', async () => {
    vi.mocked(createCase).mockResolvedValue({ _id: 'case-9', clientName: 'Jane Client' });
    renderCreate();
    await fillForm();
    await userEvent.click(screen.getByRole('checkbox', { name: /alice/ }));
    await openConfirmation();
    await userEvent.click(screen.getByRole('button', { name: 'Yes, create case' }));

    await screen.findByText('Case screen');
    expect(vi.mocked(createCase).mock.calls[0][0]).toMatchObject({
      attorney: 'bob',
      attorneyId: 'u-bob',
      owners: ['u-bob', 'u-alice'],
    });
  });
});
