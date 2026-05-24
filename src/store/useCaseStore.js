import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

const useCaseStore = create(devtools((set) => ({
  cases: [],
  activeCase: null,

  getAllCases: (casesArray) =>
	set((state) => ({ cases: casesArray })),

  addCase: (newCase) =>
    set((state) => ({ cases: [...state.cases, newCase] })),

  setActiveCase: (caseId) =>
    set((state) => ({
      activeCase: state.cases.find((c) => c._id === caseId) ?? null,
    })),

  updateCase: (updatedCase) =>
    set((state) => ({
      cases: state.cases.map((c) =>
        c._id === updatedCase._id ? updatedCase : c
      ),
      activeCase:
        state.activeCase && state.activeCase._id === updatedCase._id
          ? updatedCase
          : state.activeCase,
    })),

  removeCase: (caseId) =>
    set((state) => ({
      cases: state.cases.filter((c) => c._id !== caseId),
      activeCase:
        state.activeCase && state.activeCase._id === caseId
          ? null
          : state.activeCase,
    })),
})));

export default useCaseStore;