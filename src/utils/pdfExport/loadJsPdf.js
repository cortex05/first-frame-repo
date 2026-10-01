// The only place jspdf is imported. Kept dynamic so it lands in its own chunk
// and is loaded only when the export modal opens (spec 006).
export const loadJsPdf = () => import('jspdf').then((module) => module.jsPDF ?? module.default);
