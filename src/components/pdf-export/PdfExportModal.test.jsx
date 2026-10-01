import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import PdfExportModal, { EXPORT_ERROR, LOAD_ERROR } from './PdfExportModal';
import { loadJsPdf } from '../../utils/pdfExport/loadJsPdf';
import { buildAnswersPdf, buildQuestionsPdf, savePdfFiles } from '../../utils/pdfExport';

vi.mock('../../utils/pdfExport/loadJsPdf', () => ({ loadJsPdf: vi.fn() }));
vi.mock('../../utils/pdfExport', async () => {
  const actual = await vi.importActual('../../utils/pdfExport');
  return {
    ...actual,
    buildQuestionsPdf: vi.fn(() => new Blob(['q'], { type: 'application/pdf' })),
    buildAnswersPdf: vi.fn(() => new Blob(['a'], { type: 'application/pdf' })),
    savePdfFiles: vi.fn(async () => 'downloaded'),
  };
});

const FakeJsPdf = function FakeJsPdf() {};

const ACTIVE_CASE = {
  _id: 'case-1',
  clientName: 'Jane Client',
  attorney: 'Alex Attorney',
  category: 'criminal.theft',
  studentNumber: 2,
  questions: [{ id: 'q-1', text: 'Intent?', type: 'TRUE_FALSE', options: [] }],
};

const BODY_TEXT =
  "If your courtroom prohibits or doesn't allow internet access, you can export a PDF of all the questions with their point values and a sheet of each Student with a space to tally their answers and points. Would you like to export the PDFs?";

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const renderModal = (props = {}) => {
  const onClose = vi.fn();
  const utils = render(
    <PdfExportModal isOpen onClose={onClose} activeCase={ACTIVE_CASE} {...props} />,
  );
  return { ...utils, onClose };
};

const exportButton = () => screen.getByRole('button', { name: /export|preparing|exporting/i });

beforeEach(() => {
  vi.clearAllMocks();
  loadJsPdf.mockResolvedValue(FakeJsPdf);
  savePdfFiles.mockResolvedValue('downloaded');
});

describe('PdfExportModal', () => {
  it('renders the title, body text and Export/Cancel', async () => {
    renderModal();
    expect(screen.getByRole('heading', { name: 'Export Questions to PDF' })).toBeInTheDocument();
    expect(screen.getByText(BODY_TEXT)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Export' })).toBeEnabled();
  });

  it('renders nothing while closed and does not load jsPDF', () => {
    renderModal({ isOpen: false });
    expect(screen.queryByText('Export Questions to PDF')).not.toBeInTheDocument();
    expect(loadJsPdf).not.toHaveBeenCalled();
  });

  it('shows Preparing... until jsPDF has loaded', async () => {
    const load = deferred();
    loadJsPdf.mockReturnValue(load.promise);
    renderModal();

    expect(exportButton()).toHaveTextContent('Preparing...');
    expect(exportButton()).toBeDisabled();

    load.resolve(FakeJsPdf);
    expect(await screen.findByRole('button', { name: 'Export' })).toBeEnabled();
  });

  it('shows an error and keeps Export disabled when jsPDF fails to load', async () => {
    loadJsPdf.mockRejectedValue(new Error('offline'));
    renderModal();

    expect(await screen.findByText(LOAD_ERROR)).toBeInTheDocument();
    expect(exportButton()).toBeDisabled();
  });

  it('retries the load when reopened after a failure', async () => {
    loadJsPdf.mockRejectedValueOnce(new Error('offline'));
    const { rerender, onClose } = renderModal();
    await screen.findByText(LOAD_ERROR);

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    rerender(<PdfExportModal isOpen={false} onClose={onClose} activeCase={ACTIVE_CASE} />);
    rerender(<PdfExportModal isOpen onClose={onClose} activeCase={ACTIVE_CASE} />);

    expect(await screen.findByRole('button', { name: 'Export' })).toBeEnabled();
    expect(screen.queryByText(LOAD_ERROR)).not.toBeInTheDocument();
    expect(loadJsPdf).toHaveBeenCalledTimes(2);
  });

  it('Cancel closes without generating anything', async () => {
    const { onClose } = renderModal();
    await screen.findByRole('button', { name: 'Export' });

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(buildQuestionsPdf).not.toHaveBeenCalled();
    expect(buildAnswersPdf).not.toHaveBeenCalled();
    expect(savePdfFiles).not.toHaveBeenCalled();
  });

  it('Export builds both PDFs, saves them with their names and closes', async () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const { onClose } = renderModal();

    await userEvent.click(await screen.findByRole('button', { name: 'Export' }));

    expect(buildQuestionsPdf).toHaveBeenCalledWith(FakeJsPdf, ACTIVE_CASE);
    expect(buildAnswersPdf).toHaveBeenCalledWith(FakeJsPdf, ACTIVE_CASE);
    expect(savePdfFiles).toHaveBeenCalledTimes(1);
    const [savedFiles, options] = savePdfFiles.mock.calls[0];
    expect(savedFiles.map((f) => [f.name, f.type])).toEqual([
      ['client_Jane_Client_questions.pdf', 'application/pdf'],
      ['client_Jane_Client_answers.pdf', 'application/pdf'],
    ]);
    expect(options).toEqual({ title: 'Client: Jane Client' });
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(setItem).not.toHaveBeenCalled();
  });

  it('shows Exporting... while saving, then closes when the share sheet is dismissed', async () => {
    const save = deferred();
    savePdfFiles.mockReturnValue(save.promise);
    const { onClose } = renderModal();

    await userEvent.click(await screen.findByRole('button', { name: 'Export' }));
    expect(exportButton()).toHaveTextContent('Exporting...');
    expect(exportButton()).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();

    save.resolve('cancelled');
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it('shows an error and stays open when saving fails', async () => {
    savePdfFiles.mockRejectedValue(new Error('boom'));
    const { onClose } = renderModal();

    await userEvent.click(await screen.findByRole('button', { name: 'Export' }));

    expect(await screen.findByText(EXPORT_ERROR)).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Export' })).toBeEnabled();
  });

  it('shows an error when building a PDF throws', async () => {
    buildQuestionsPdf.mockImplementationOnce(() => {
      throw new Error('bad font');
    });
    const { onClose } = renderModal();

    await userEvent.click(await screen.findByRole('button', { name: 'Export' }));

    expect(await screen.findByText(EXPORT_ERROR)).toBeInTheDocument();
    expect(savePdfFiles).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });
});
