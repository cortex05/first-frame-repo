/**
 * Charges, derived from the case catalog.
 *
 * A charge is the "matter" half of a case category -- 'Assault', 'Divorce',
 * 'Chapter 7'. Recommended playlists are keyed by charge rather than by a full
 * category id, so one set covers a charge no matter which area a case files it
 * under ('Weapons Charges' is both Criminal and Civil).
 *
 * Mirrors first-frame-back/src/charges.js. Derived rather than added to
 * ./caseCategories.js on purpose: that file is byte-mirrored across both repos
 * and has no imports, so it stays as-is.
 */

import { CASE_CATEGORIES } from './caseCategories';

/** Every distinct charge in the catalog, alphabetical. */
export const CASE_CHARGES = [
  ...new Set(CASE_CATEGORIES.map((category) => category.matter)),
].sort((a, b) => a.localeCompare(b));
