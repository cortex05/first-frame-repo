import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import FormError from './FormError';

describe('FormError (spec 016)', () => {
  it('announces the message as an alert with its id and styling', () => {
    render(<FormError id="err" message="Nope" className="red" />);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Nope');
    expect(alert).toHaveAttribute('id', 'err');
    expect(alert).toHaveClass('red');
  });

  it('renders nothing without a message', () => {
    const { container } = render(<FormError id="err" message="" />);

    expect(container).toBeEmptyDOMElement();
  });
});
