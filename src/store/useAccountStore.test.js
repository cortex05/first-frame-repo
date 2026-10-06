import { describe, expect, it } from 'vitest';

import { archivedByLabel } from './useAccountStore';

const users = [{ _id: 'u-owner', username: 'owner', status: 'active' }];

describe('archivedByLabel', () => {
  it('says "automatically" for the automatic archive a week after purchase', () => {
    expect(archivedByLabel({ archiveReason: 'purchase', archivedBy: null }, users)).toBe('automatically');
  });

  it('names the user for a manual archive', () => {
    expect(archivedByLabel({ archiveReason: 'manual', archivedBy: 'u-owner' }, users)).toBe('by owner');
  });

  it('falls back to Unknown for a user no longer in the account', () => {
    expect(archivedByLabel({ archiveReason: 'manual', archivedBy: 'u-gone' }, users)).toBe('by Unknown');
  });

  it('treats an archive without a reason as manual', () => {
    expect(archivedByLabel({ archivedBy: 'u-owner' }, users)).toBe('by owner');
  });
});
