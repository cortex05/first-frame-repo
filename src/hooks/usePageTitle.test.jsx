import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';

import usePageTitle, { __resetPageTitleForTests } from './usePageTitle';

const Page = ({ title, heading, to, ready = true }) => {
  usePageTitle(title, { ready });
  return (
    <>
      <h1>{heading}</h1>
      {to && <Link to={to}>Go</Link>}
    </>
  );
};

// A page whose heading only appears once its "data" has loaded.
const LoadingPage = () => {
  const [loaded, setLoaded] = useState(false);
  usePageTitle('Loaded', { ready: loaded });
  return loaded ? <h1>Loaded page</h1> : <button onClick={() => setLoaded(true)}>Load</button>;
};

const renderRoutes = (extraRoutes = null) =>
  render(
    <MemoryRouter initialEntries={['/a']}>
      <Routes>
        <Route path="/a" element={<Page title="Page A" heading="A heading" to="/b" />} />
        <Route path="/b" element={<Page title="Page B" heading="B heading" />} />
        {extraRoutes}
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  __resetPageTitleForTests();
  document.title = '';
});

describe('usePageTitle', () => {
  it('sets the tab title with the app name', () => {
    renderRoutes();

    expect(document.title).toBe('Page A – First Frame');
  });

  it('falls back to the app name for an empty title', () => {
    render(
      <MemoryRouter>
        <Page title="" heading="x" />
      </MemoryRouter>,
    );

    expect(document.title).toBe('First Frame');
  });

  it('does not move focus on the first page load', () => {
    renderRoutes();

    expect(screen.getByRole('heading', { name: 'A heading' })).not.toHaveFocus();
  });

  it('focuses the new screen heading after navigating', async () => {
    const user = userEvent.setup();
    renderRoutes();

    await user.click(screen.getByRole('link', { name: 'Go' }));

    const heading = screen.getByRole('heading', { name: 'B heading' });
    expect(heading).toHaveFocus();
    expect(heading).toHaveAttribute('tabindex', '-1');
    expect(document.title).toBe('Page B – First Frame');
  });

  it('waits for ready before focusing', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/a']}>
        <Routes>
          <Route path="/a" element={<Page title="Page A" heading="A heading" to="/loading" />} />
          <Route path="/loading" element={<LoadingPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('link', { name: 'Go' }));
    const load = screen.getByRole('button', { name: 'Load' });
    load.focus();
    expect(load).toHaveFocus();

    await user.click(load);
    expect(screen.getByRole('heading', { name: 'Loaded page' })).toHaveFocus();
  });

  it('leaves focus inside a dialog that opened on arrival', async () => {
    const DialogPage = () => {
      usePageTitle('With dialog');
      return (
        <>
          <h1>Dialog page</h1>
          <div role="dialog" aria-label="Terms">
            <button autoFocus>Agree</button>
          </div>
        </>
      );
    };
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/a']}>
        <Routes>
          <Route path="/a" element={<Page title="Page A" heading="A heading" to="/dialog" />} />
          <Route path="/dialog" element={<DialogPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('link', { name: 'Go' }));

    expect(screen.getByRole('button', { name: 'Agree' })).toHaveFocus();
  });
});
