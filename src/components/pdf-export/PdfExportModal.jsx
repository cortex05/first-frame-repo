import { useEffect, useState } from 'react';
import Modal from '../modal/Modal';
import styles from './PdfExportModal.module.css';
import { loadJsPdf } from '../../utils/pdfExport/loadJsPdf';
import {
  answersFileName,
  buildAnswersPdf,
  buildQuestionsPdf,
  questionsFileName,
  savePdfFiles,
  toPdfFile,
} from '../../utils/pdfExport';

export const LOAD_ERROR = "Couldn't prepare the export. Check your connection and try again.";
export const EXPORT_ERROR = "Couldn't export the PDFs. Please try again.";

/**
 * Confirms and runs the offline PDF export (spec 006). jsPDF loads when the
 * modal opens, so the Export click can build both files synchronously and
 * still open the share sheet within its user activation.
 */
const PdfExportModal = ({ isOpen, onClose, activeCase }) => {
  const [JsPDF, setJsPDF] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [exportError, setExportError] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (!isOpen || JsPDF) return undefined;
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
  }, [isOpen, JsPDF]);

  // Clearing the load error here means reopening the modal retries the load.
  const handleClose = () => {
    setLoadError('');
    setExportError('');
    onClose();
  };

  const handleExport = () => {
    if (!JsPDF || isExporting) return;
    setExportError('');

    let files;
    try {
      files = [
        toPdfFile(buildQuestionsPdf(JsPDF, activeCase), questionsFileName(activeCase.clientName)),
        toPdfFile(buildAnswersPdf(JsPDF, activeCase), answersFileName(activeCase.clientName)),
      ];
    } catch {
      setExportError(EXPORT_ERROR);
      return;
    }

    setIsExporting(true);
    savePdfFiles(files, { title: `Client: ${activeCase.clientName}` })
      .then(handleClose)
      .catch(() => setExportError(EXPORT_ERROR))
      .finally(() => setIsExporting(false));
  };

  let exportLabel = 'Export';
  if (isExporting) exportLabel = 'Exporting...';
  else if (!JsPDF && !loadError) exportLabel = 'Preparing...';

  const error = loadError || exportError;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Export Questions to PDF" hideDefaultClose>
      <p className={styles.modalText}>
        If your courtroom prohibits or doesn&apos;t allow internet access, you can export a PDF
        of all the questions with their point values and a sheet of each Student with a space to
        tally their answers and points. Would you like to export the PDFs?
      </p>
      {error && <p className={styles.modalError}>{error}</p>}
      <div className={styles.modalButtons}>
        <button
          type="button"
          onClick={handleExport}
          disabled={!JsPDF || isExporting || Boolean(loadError)}
          className={styles.confirm}
        >
          {exportLabel}
        </button>
        <button
          type="button"
          onClick={handleClose}
          disabled={isExporting}
          className={styles.decline}
        >
          Cancel
        </button>
      </div>
    </Modal>
  );
};

export default PdfExportModal;
