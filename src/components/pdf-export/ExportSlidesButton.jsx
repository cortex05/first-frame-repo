import { useEffect, useId, useState } from 'react';
import { LOAD_ERROR } from './PdfExportModal';
import { loadJsPdf } from '../../utils/pdfExport/loadJsPdf';
import { buildSlidesPdf, savePdfFiles, slidesFileName, toPdfFile } from '../../utils/pdfExport';

export const NO_QUESTIONS_HINT = 'Add a question to export.';
export const SLIDES_EXPORT_ERROR = "Couldn't export the PDF. Please try again.";

/**
 * Exports the question slides PDF (spec 009) with no confirmation modal.
 * jsPDF is preloaded on mount, so the click can build the file synchronously
 * and still open the share sheet within its user activation. Styling comes
 * from the parent's CSS module.
 */
const ExportSlidesButton = ({ activeCase, wrapperClassName, className, hintClassName }) => {
  const [JsPDF, setJsPDF] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [exportError, setExportError] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const hintId = useId();

  // Runs once per mount, so reopening the Case screen retries a failed load.
  useEffect(() => {
    let cancelled = false;
    loadJsPdf()
      .then((constructor) => {
        if (!cancelled) setJsPDF(() => constructor);
      })
      .catch(() => {
        if (!cancelled) setLoadError(LOAD_ERROR);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const noQuestions = (activeCase?.questions?.length ?? 0) === 0;

  const handleExport = () => {
    if (!JsPDF || isExporting) return;
    setExportError('');

    let file;
    try {
      file = toPdfFile(buildSlidesPdf(JsPDF, activeCase), slidesFileName(activeCase.clientName));
    } catch {
      setExportError(SLIDES_EXPORT_ERROR);
      return;
    }

    setIsExporting(true);
    savePdfFiles([file], { title: `Client: ${activeCase.clientName}` })
      .catch(() => setExportError(SLIDES_EXPORT_ERROR))
      .finally(() => setIsExporting(false));
  };

  let label = 'Export Questions';
  if (isExporting) label = 'Exporting...';
  else if (!JsPDF && !loadError) label = 'Preparing...';

  const hint = noQuestions ? NO_QUESTIONS_HINT : loadError || exportError;
  // The no-questions hint just explains the disabled button; a failure is announced.
  const hintIsError = !noQuestions && Boolean(hint);

  return (
    <div className={wrapperClassName}>
      <button
        type="button"
        onClick={handleExport}
        disabled={noQuestions || !JsPDF || isExporting || Boolean(loadError)}
        aria-describedby={hint ? hintId : undefined}
        className={className}
      >
        {label}
      </button>
      {hint && (
        <p id={hintId} className={hintClassName} role={hintIsError ? 'alert' : undefined}>
          {hint}
        </p>
      )}
    </div>
  );
};

export default ExportSlidesButton;
