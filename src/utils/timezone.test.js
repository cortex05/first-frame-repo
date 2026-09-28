import { afterEach, describe, expect, it, vi } from 'vitest';

import { getBrowserTimeZone } from './timezone';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('getBrowserTimeZone', () => {
  it('returns the zone the browser resolves', () => {
    vi.spyOn(Intl, 'DateTimeFormat').mockReturnValue({
      resolvedOptions: () => ({ timeZone: 'America/Chicago' }),
    });

    expect(getBrowserTimeZone()).toBe('America/Chicago');
  });

  it('returns undefined when the zone is empty or Intl throws', () => {
    vi.spyOn(Intl, 'DateTimeFormat').mockReturnValueOnce({ resolvedOptions: () => ({ timeZone: '' }) });
    expect(getBrowserTimeZone()).toBeUndefined();

    vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(() => {
      throw new Error('unsupported');
    });
    expect(getBrowserTimeZone()).toBeUndefined();
  });
});
