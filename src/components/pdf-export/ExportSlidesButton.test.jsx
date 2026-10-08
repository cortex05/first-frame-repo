import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ExportSlidesButton, { NO_QUESTIONS_HINT, SLIDES_EXPORT_ERROR } from './ExportSlidesButton';
import { LOAD_ERROR } from './PdfExportModal';
import { loadJsPdf } from '../../utils/pdfExport/loadJsPdf';
import { buildSlidesPdf, savePdfFiles } from '../../utils/pdfExport';

vi.mock('../../utils/pdfExport/loadJsPdf', () => ({ loadJsPdf: vi.fn() }));
vi.mock('../../utils/pdfExport', async () => {
  const actual = await vi.importActual('../../utils/pdfExport');
  return {
    ...actual,
    buildSlidesPdf: vi.fn(() => new Blob(['s'], { type: 'application/pdf' })),
    savePdfFiles: vi.fn(async () => 'downloaded'),
  };
});

const FakeJsPdf = function FakeJsPdf() {};

const ACTIVE_CASE = {
  _id: 'case-1',
  clientName: 'Jane Doe',
  questions: [{ id: 'q-1', text: 'Intent?', type: 'TRUE_FALSE', options: [] }],
};

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const renderButton = (activeCase = ACTIVE_CASE) =>
  render(<ExportSlidesButton activeCase={activeCase} className="export" hintClassName="hint" />);

const button = () => screen.getByRole('button');

beforeEach(() => {
  vi.clearAllMocks();
  loadJsPdf.mockResolvedValue(FakeJsPdf);
  savePdfFiles.mockResolvedValue('downloaded');
});

describe('ExportSlidesButton', () => {
  it('shows Preparing... until jsPDF has loaded, then Export PDF', async () => {
    const load = deferred();
    loadJsPdf.mockReturnValue(load.promise);
    renderButton();

    expect(button()).toHaveTextContent('Preparing...');
    expect(button()).toBeDisabled();

    load.resolve(FakeJsPdf);
    await waitFor(() => expect(button()).toHaveTextContent('Export PDF'));
    expect(button()).toBeEnabled();
    expect(button()).toHaveClass('export');
  });

  it('loads jsPDF once across re-renders', async () => {
    const { rerender } = renderButton();
    await waitFor(() => expect(button()).toBeEnabled());
    rerender(
      <ExportSlidesButton activeCase={{ ...ACTIVE_CASE }} className="export" hintClassName="hint" />,
    );
    expect(loadJsPdf).toHaveBeenCalledTimes(1);
  });

  it('is disabled with a hint when the case has no questions', async () => {
    renderButton({ ...ACTIVE_CASE, questions: [] });
    await waitFor(() => expect(loadJsPdf).toHaveBeenCalled());

    expect(button()).toBeDisabled();
    expect(screen.getByText(NO_QUESTIONS_HINT)).toHaveClass('hint');
  });

  it('builds and saves one slides PDF on click, with no modal', async () => {
    renderButton();
    await waitFor(() => expect(button()).toBeEnabled());
    await userEvent.click(button());

    expect(buildSlidesPdf).toHaveBeenCalledWith(FakeJsPdf, ACTIVE_CASE);
    expect(savePdfFiles).toHaveBeenCalledTimes(1);
    const [files, options] = savePdfFiles.mock.calls[0];
    expect(files).toHaveLength(1);
    expect(files[0]).toBeInstanceOf(File);
    expect(files[0].name).toBe('client_Jane_Doe_QUESTIONS_SLIDE.pdf');
    expect(files[0].type).toBe('application/pdf');
    expect(options).toEqual({ title: 'Client: Jane Doe' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it.each(['downloaded', 'cancelled', 'shared'])(
    'shows Exporting... while saving, then resets after %s',
    async (result) => {
      const save = deferred();
      savePdfFiles.mockReturnValue(save.promise);
      renderButton();
      await waitFor(() => expect(button()).toBeEnabled());
      await userEvent.click(button());

      expect(button()).toHaveTextContent('Exporting...');
      expect(button()).toBeDisabled();

      save.resolve(result);
      await waitFor(() => expect(button()).toHaveTextContent('Export PDF'));
      expect(button()).toBeEnabled();
      expect(screen.queryByText(SLIDES_EXPORT_ERROR)).not.toBeInTheDocument();
    },
  );

  it('stays disabled with the load error when jsPDF fails to load', async () => {
    loadJsPdf.mockRejectedValue(new Error('offline'));
    renderButton();

    expect(await screen.findByText(LOAD_ERROR)).toBeInTheDocument();
    expect(button()).toBeDisabled();
    expect(button()).toHaveTextContent('Export PDF');
  });

  it('shows an error when building fails, and clears it on the next click', async () => {
    buildSlidesPdf.mockImplementationOnce(() => {
      throw new Error('boom');
    });
    renderButton();
    await waitFor(() => expect(button()).toBeEnabled());

    await userEvent.click(button());
    expect(screen.getByText(SLIDES_EXPORT_ERROR)).toBeInTheDocument();
    expect(savePdfFiles).not.toHaveBeenCalled();
    expect(button()).toBeEnabled();

    await userEvent.click(button());
    expect(screen.queryByText(SLIDES_EXPORT_ERROR)).not.toBeInTheDocument();
    expect(savePdfFiles).toHaveBeenCalledTimes(1);
  });

  it('shows an error when saving fails', async () => {
    savePdfFiles.mockRejectedValue(new Error('blocked'));
    renderButton();
    await waitFor(() => expect(button()).toBeEnabled());
    await userEvent.click(button());

    expect(await screen.findByText(SLIDES_EXPORT_ERROR)).toBeInTheDocument();
    expect(button()).toBeEnabled();
  });
});
