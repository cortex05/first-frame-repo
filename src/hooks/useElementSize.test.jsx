import { useState } from 'react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import useElementSize from './useElementSize';
import { activeObserverCount, resizeTo, uninstallResizeObserver } from '../test/resizeObserver';

const Box = () => {
  const [ref, size] = useElementSize();
  return (
    <div ref={ref} data-testid="box">
      {size.width}x{size.height}
    </div>
  );
};

describe('useElementSize', () => {
  it('reports the observed size, rounded, and follows changes', () => {
    render(<Box />);
    expect(screen.getByTestId('box')).toHaveTextContent('800x600');

    act(() => resizeTo(400.4, 300.6));
    expect(screen.getByTestId('box')).toHaveTextContent('400x301');
  });

  it('stops observing on unmount', () => {
    const { unmount } = render(<Box />);
    expect(activeObserverCount()).toBe(1);

    unmount();
    expect(activeObserverCount()).toBe(0);
  });

  it('starts measuring when the element appears after the first render', async () => {
    const Late = () => {
      const [shown, setShown] = useState(false);
      const [ref, size] = useElementSize();
      return (
        <>
          <button onClick={() => setShown(true)}>Show</button>
          <span data-testid="size">{size.width}x{size.height}</span>
          {shown && <div ref={ref} />}
        </>
      );
    };
    render(<Late />);
    expect(screen.getByTestId('size')).toHaveTextContent('0x0');

    await userEvent.click(screen.getByRole('button', { name: 'Show' }));
    expect(screen.getByTestId('size')).toHaveTextContent('800x600');
  });

  it('falls back to clientWidth/clientHeight and window resize without ResizeObserver', () => {
    uninstallResizeObserver();
    let width = 640;
    let height = 480;
    // jsdom defines these on Element.prototype; shadow them here and delete after.
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => width });
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, get: () => height });

    try {
      render(<Box />);
      expect(screen.getByTestId('box')).toHaveTextContent('640x480');

      width = 320;
      height = 240;
      act(() => {
        window.dispatchEvent(new Event('resize'));
      });
      expect(screen.getByTestId('box')).toHaveTextContent('320x240');
    } finally {
      delete HTMLElement.prototype.clientWidth;
      delete HTMLElement.prototype.clientHeight;
    }
  });
});
