import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import FormError from '../components/form-error/FormError';
import useFormError from './useFormError';

const Harness = () => {
  const formError = useFormError();
  return (
    <form onSubmit={(e) => e.preventDefault()}>
      <label htmlFor="a">A</label>
      <input id="a" {...formError.fieldProps('a')} />
      <label htmlFor="b">B</label>
      <input id="b" {...formError.fieldProps('b')} />
      <FormError id={formError.messageId} message={formError.message} version={formError.version} />
      <button type="button" onClick={() => formError.setError('A is wrong', ['a'])}>
        Validate
      </button>
      <button type="button" onClick={() => formError.setError('Server down')}>
        Server
      </button>
      <button type="button" onClick={() => formError.clear()}>
        Clear
      </button>
    </form>
  );
};

describe('useFormError', () => {
  it('marks, describes and focuses the invalid field', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('button', { name: 'Validate' }));

    const a = screen.getByLabelText('A');
    expect(screen.getByRole('alert')).toHaveTextContent('A is wrong');
    expect(a).toHaveAttribute('aria-invalid', 'true');
    expect(a).toHaveAccessibleDescription('A is wrong');
    expect(a).toHaveFocus();
    expect(screen.getByLabelText('B')).not.toHaveAttribute('aria-invalid');
  });

  it('announces a server error without marking or focusing a field', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('button', { name: 'Server' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Server down');
    expect(screen.getByLabelText('A')).not.toHaveAttribute('aria-invalid');
    expect(screen.getByRole('button', { name: 'Server' })).toHaveFocus();
  });

  it('remounts the alert when the same error is set again', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('button', { name: 'Validate' }));
    const first = screen.getByRole('alert');
    await user.click(screen.getByRole('button', { name: 'Validate' }));

    expect(screen.getByRole('alert')).not.toBe(first);
  });

  it('clears everything', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('button', { name: 'Validate' }));
    await user.click(screen.getByRole('button', { name: 'Clear' }));

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByLabelText('A')).not.toHaveAttribute('aria-invalid');
  });
});
