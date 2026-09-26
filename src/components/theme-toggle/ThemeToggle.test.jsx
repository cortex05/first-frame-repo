import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import ThemeToggle from './ThemeToggle';

const root = () => document.documentElement;

beforeEach(() => {
  root().dataset.theme = 'dark';
});

describe('ThemeToggle', () => {
  it('offers light mode while dark', () => {
    render(<ThemeToggle />);
    const button = screen.getByRole('button', { name: 'Switch to light mode' });
    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(button).toHaveAttribute('type', 'button');
  });

  it('switches to light, stores it, and switches back', async () => {
    render(<ThemeToggle />);

    await userEvent.click(screen.getByRole('button', { name: 'Switch to light mode' }));
    expect(root().dataset.theme).toBe('light');
    expect(window.localStorage.getItem('theme')).toBe('light');
    const button = screen.getByRole('button', { name: 'Switch to dark mode' });
    expect(button).toHaveAttribute('aria-pressed', 'true');

    await userEvent.click(button);
    expect(root().dataset.theme).toBe('dark');
    expect(window.localStorage.getItem('theme')).toBe('dark');
    expect(screen.getByRole('button', { name: 'Switch to light mode' })).toBeInTheDocument();
  });
});
