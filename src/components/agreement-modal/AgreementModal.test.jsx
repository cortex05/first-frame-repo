import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import AgreementModal, { AGREE_LABEL } from './AgreementModal';

const AGREEMENT = { termsVersion: '11-20-2026', agreementText: 'Line one.\nLine two.' };

const renderModal = (props = {}) => {
  const handlers = { onSubmit: vi.fn(), onCancel: vi.fn() };
  const view = render(<AgreementModal agreement={AGREEMENT} {...handlers} {...props} />);
  return { ...view, ...handlers };
};

describe('AgreementModal', () => {
  it('shows the version, the text and an unchecked agreement', () => {
    renderModal();

    expect(screen.getByRole('heading', { name: 'Agreement: 11-20-2026' })).toBeInTheDocument();
    expect(screen.getByLabelText('Terms of Service')).toHaveTextContent('Line one. Line two.');
    expect(screen.getByLabelText(AGREE_LABEL)).not.toBeChecked();
  });

  it('enables Submit only once the box is checked', async () => {
    const { onSubmit } = renderModal();
    const submit = screen.getByRole('button', { name: 'Submit' });

    expect(submit).toBeDisabled();
    await userEvent.click(screen.getByLabelText(AGREE_LABEL));
    expect(submit).toBeEnabled();

    await userEvent.click(submit);
    expect(onSubmit).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getByLabelText(AGREE_LABEL));
    expect(submit).toBeDisabled();
  });

  it('disables Submit while submitting', async () => {
    renderModal({ isSubmitting: true });

    expect(screen.getByRole('button', { name: 'Submitting...' })).toBeDisabled();
  });

  it('calls onCancel with the given label', async () => {
    const { onCancel } = renderModal({ cancelLabel: 'Log out' });

    await userEvent.click(screen.getByRole('button', { name: 'Log out' }));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('unchecks the box when a newer version replaces the terms', async () => {
    const { rerender, onSubmit, onCancel } = renderModal();
    await userEvent.click(screen.getByLabelText(AGREE_LABEL));

    rerender(
      <AgreementModal
        agreement={{ termsVersion: '12-01-2026', agreementText: 'New.' }}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />,
    );

    expect(screen.getByLabelText(AGREE_LABEL)).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Submit' })).toBeDisabled();
  });
});
