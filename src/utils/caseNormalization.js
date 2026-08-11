import { legacyPairToCategoryId } from "../types/caseCategories";

/**
 * Upgrades a case saved before classification collapsed into a single
 * `category` id. Cases in localStorage predate the change and still carry the
 * old `caseType` + `charge` pair; the server-side equivalent is
 * scripts/migrateCaseCategory.js in the backend repo.
 *
 * Returns the case untouched once it already has a category.
 */
export const upgradeLegacyCase = (storedCase) => {
  if (!storedCase || typeof storedCase !== "object") return storedCase;
  if (storedCase.category) return storedCase;

  const { caseType, charge, ...rest } = storedCase;
  const category = legacyPairToCategoryId(caseType, charge);

  return category ? { ...rest, category } : rest;
};

export const upgradeLegacyCases = (storedCases) =>
  Array.isArray(storedCases) ? storedCases.map(upgradeLegacyCase) : [];
