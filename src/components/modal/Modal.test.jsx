import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import Modal from './Modal';

const renderModal = (props = {}) => {
  const onClose = vi.fn();
  const view = render(
    <Modal isOpen onClose={onClose} title="Archive Case" {...props}>
      <button type="button">Archive</button>
    </Modal>,
  );
  return { ...view, onClose };
};

describe('Modal (spec 012)', () => {
  it('is a modal dialog named by its title, rendered outside the app', () => {
    const { container } = renderModal();
    const dialog = screen.getByRole('dialog', { name: 'Archive Case' });

    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveFocus();
    expect(container).not.toContainElement(dialog);
    expect(document.body).toContainElement(dialog);
  });

  it('falls back to ariaLabel without a title', () => {
    renderModal({ title: '', ariaLabel: 'Confirm' });

    expect(screen.getByRole('dialog', { name: 'Confirm' })).toBeInTheDocument();
  });

  it('renders nothing while closed', () => {
    renderModal({ isOpen: false });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes on Escape', async () => {
    const { onClose } = renderModal();

    await userEvent.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('ignores Escape and disables Close while closeDisabled', async () => {
    const { onClose } = renderModal({ closeDisabled: true });

    await userEvent.keyboard('{Escape}');

    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Close' })).toBeDisabled();
  });

  it('ignores Escape without onClose', async () => {
    render(
      <Modal isOpen title="Saving" hideDefaultClose>
        <p>Busy</p>
      </Modal>,
    );

    await userEvent.keyboard('{Escape}');

    expect(screen.getByRole('dialog', { name: 'Saving' })).toBeInTheDocument();
  });

  it('still closes from the default Close button', async () => {
    const { onClose } = renderModal();

    await userEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
