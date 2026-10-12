import { useId, useState } from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import DialogPortal from '../components/modal/DialogPortal';
import useModalDialog from './useModalDialog';

const TestDialog = ({ title, onDismiss, dismissible, withAutoFocus = false, children }) => {
  const titleId = useId();
  const { dialogRef, dialogProps } = useModalDialog({ onDismiss, dismissible });
  return (
    <DialogPortal>
      <div ref={dialogRef} {...dialogProps} aria-labelledby={titleId}>
        <h2 id={titleId}>{title}</h2>
        {withAutoFocus && <input aria-label="Name" autoFocus />}
        <button type="button">A</button>
        <button type="button" disabled>
          B
        </button>
        <button type="button">C</button>
        {children}
      </div>
    </DialogPortal>
  );
};

// A page with a heading, a trigger and a dialog that can open a nested one.
const Page = ({ dismissible = true, withAutoFocus = false, withHeading = true, onDismiss = vi.fn() }) => {
  const [open, setOpen] = useState(false);
  const [innerOpen, setInnerOpen] = useState(false);
  const [triggerShown, setTriggerShown] = useState(true);

  const close = () => {
    onDismiss();
    setOpen(false);
  };

  return (
    <div>
      {withHeading && <h1>Page heading</h1>}
      {triggerShown && (
        <button type="button" onClick={() => setOpen(true)}>
          Open
        </button>
      )}
      <button type="button" onClick={() => setTriggerShown(false)}>
        Remove trigger
      </button>
      {open && (
        <TestDialog title="Outer" onDismiss={close} dismissible={dismissible} withAutoFocus={withAutoFocus}>
          <button type="button" onClick={() => setTriggerShown(false)}>
            Remove opener
          </button>
          <button type="button" onClick={() => setInnerOpen(true)}>
            Open inner
          </button>
          <button type="button" onClick={() => setOpen(false)}>
            Close outer
          </button>
          {innerOpen && <TestDialog title="Inner" onDismiss={() => setInnerOpen(false)} />}
        </TestDialog>
      )}
    </div>
  );
};

let root;

const renderPage = (props) => render(<Page {...props} />, { container: root });

// restoreFocus runs in a microtask after the dialog unmounts.
const flushFocus = () => act(async () => {});

beforeEach(() => {
  root = document.createElement('div');
  root.id = 'root';
  document.body.appendChild(root);
  document.body.style.overflow = 'auto';
});

afterEach(() => {
  root.remove();
  document.body.style.overflow = '';
});

describe('useModalDialog', () => {
  it('moves focus to the dialog, which is named by its title', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Open' }));

    expect(screen.getByRole('dialog', { name: 'Outer' })).toHaveFocus();
  });

  it('leaves focus on an autoFocus element inside', async () => {
    const user = userEvent.setup();
    renderPage({ withAutoFocus: true });

    await user.click(screen.getByRole('button', { name: 'Open' }));

    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveFocus();
  });

  it('keeps Tab inside the dialog and skips disabled controls', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: 'Open' }));

    await user.tab();
    expect(screen.getByRole('button', { name: 'A' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'C' })).toHaveFocus();

    screen.getByRole('button', { name: 'Close outer' }).focus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'A' })).toHaveFocus();

    await user.tab({ shift: true });
    expect(screen.getByRole('button', { name: 'Close outer' })).toHaveFocus();
  });

  it('dismisses on Escape', async () => {
    const onDismiss = vi.fn();
    const user = userEvent.setup();
    renderPage({ onDismiss });
    await user.click(screen.getByRole('button', { name: 'Open' }));

    await user.keyboard('{Escape}');

    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('ignores Escape when not dismissible', async () => {
    const onDismiss = vi.fn();
    const user = userEvent.setup();
    renderPage({ onDismiss, dismissible: false });
    await user.click(screen.getByRole('button', { name: 'Open' }));

    await user.keyboard('{Escape}');

    expect(onDismiss).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'Outer' })).toBeInTheDocument();
  });

  it('returns focus to the opener on close', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: 'Open' }));

    await user.keyboard('{Escape}');
    await flushFocus();

    expect(screen.getByRole('button', { name: 'Open' })).toHaveFocus();
  });

  it('falls back to the page heading when the opener is gone', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.click(screen.getByRole('button', { name: 'Remove opener' }));

    await user.keyboard('{Escape}');
    await flushFocus();

    const heading = screen.getByRole('heading', { name: 'Page heading' });
    expect(heading).toHaveFocus();
    expect(heading).toHaveAttribute('tabindex', '-1');
  });

  it('falls back to the body when there is no heading either', async () => {
    const user = userEvent.setup();
    renderPage({ withHeading: false });
    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.click(screen.getByRole('button', { name: 'Remove opener' }));

    await user.keyboard('{Escape}');
    await flushFocus();

    expect(document.body).toHaveFocus();
  });

  it('makes the app inert and locks scrolling while open', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: 'Open' }));

    expect(root).toHaveAttribute('inert');
    expect(document.body.style.overflow).toBe('hidden');
    expect(screen.getByRole('dialog', { name: 'Outer' }).closest('#root')).toBeNull();

    await user.keyboard('{Escape}');

    expect(root).not.toHaveAttribute('inert');
    expect(document.body.style.overflow).toBe('auto');
  });

  it('handles a nested dialog: only the top one closes, focus goes back inside the outer', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.click(screen.getByRole('button', { name: 'Open inner' }));

    const outer = screen.getByRole('dialog', { name: 'Outer', hidden: true });
    expect(outer).toHaveAttribute('inert');
    expect(screen.getByRole('dialog', { name: 'Inner' })).toHaveFocus();

    await user.keyboard('{Escape}');
    await flushFocus();

    expect(screen.queryByRole('dialog', { name: 'Inner' })).not.toBeInTheDocument();
    expect(outer).not.toHaveAttribute('inert');
    expect(screen.getByRole('button', { name: 'Open inner' })).toHaveFocus();
    expect(document.body.style.overflow).toBe('hidden');

    await user.keyboard('{Escape}');
    await flushFocus();

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe('auto');
    expect(screen.getByRole('button', { name: 'Open' })).toHaveFocus();
  });

  it('cleans up when unmounted without closing', async () => {
    const onDismiss = vi.fn();
    const user = userEvent.setup();
    const { unmount } = renderPage({ onDismiss });
    await user.click(screen.getByRole('button', { name: 'Open' }));

    unmount();
    await flushFocus();

    expect(root).not.toHaveAttribute('inert');
    expect(document.body.style.overflow).toBe('auto');
    await user.keyboard('{Escape}');
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('does not pull focus back when something else took it', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: 'Open' }));
    const elsewhere = screen.getByRole('button', { name: 'Remove trigger', hidden: true });

    await user.keyboard('{Escape}');
    elsewhere.focus();
    await flushFocus();

    await waitFor(() => expect(elsewhere).toHaveFocus());
  });
});
