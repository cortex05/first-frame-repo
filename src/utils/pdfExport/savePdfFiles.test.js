import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { savePdfFiles, toPdfFile } from './savePdfFiles';

const files = () => [
  toPdfFile(new Blob(['q'], { type: 'application/pdf' }), 'client_Jane_questions.pdf'),
  toPdfFile(new Blob(['a'], { type: 'application/pdf' }), 'client_Jane_answers.pdf'),
];

const setPointer = (coarse) => {
  window.matchMedia = vi.fn((query) => ({
    matches: query === '(pointer: coarse)' ? coarse : false,
    media: query,
  }));
};

const setNavigator = (props) => {
  Object.entries(props).forEach(([key, value]) => {
    Object.defineProperty(navigator, key, { value, configurable: true, writable: true });
  });
};

const domError = (name) => Object.assign(new Error(name), { name });

let clicked;
let originalMatchMedia;

beforeEach(() => {
  vi.useFakeTimers();
  originalMatchMedia = window.matchMedia;
  clicked = [];
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function click() {
    clicked.push({ href: this.href, download: this.download, attached: this.isConnected });
  });
  let counter = 0;
  URL.createObjectURL = vi.fn(() => `blob:test-${(counter += 1)}`);
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  window.matchMedia = originalMatchMedia;
  delete navigator.share;
  delete navigator.canShare;
});

describe('savePdfFiles: share sheet', () => {
  it('shares both files at once on a touch device', async () => {
    setPointer(true);
    setNavigator({ share: vi.fn(async () => {}), canShare: vi.fn(() => true) });
    const toSave = files();

    await expect(savePdfFiles(toSave, { title: 'Client: Jane' })).resolves.toBe('shared');

    expect(navigator.canShare).toHaveBeenCalledWith({ files: toSave });
    expect(navigator.share).toHaveBeenCalledTimes(1);
    expect(navigator.share).toHaveBeenCalledWith({ files: toSave, title: 'Client: Jane' });
    expect(clicked).toEqual([]);
  });

  it('does nothing more when the share sheet is dismissed', async () => {
    setPointer(true);
    setNavigator({
      share: vi.fn(async () => {
        throw domError('AbortError');
      }),
      canShare: () => true,
    });

    await expect(savePdfFiles(files())).resolves.toBe('cancelled');
    expect(clicked).toEqual([]);
  });

  it('falls back to downloads when sharing fails for another reason', async () => {
    setPointer(true);
    setNavigator({
      share: vi.fn(async () => {
        throw domError('NotAllowedError');
      }),
      canShare: () => true,
    });

    await expect(savePdfFiles(files())).resolves.toBe('downloaded');
    expect(clicked.map((c) => c.download)).toEqual([
      'client_Jane_questions.pdf',
      'client_Jane_answers.pdf',
    ]);
  });
});

describe('savePdfFiles: download fallback', () => {
  it('downloads on a fine pointer even when sharing is available', async () => {
    setPointer(false);
    setNavigator({ share: vi.fn(), canShare: () => true });

    await expect(savePdfFiles(files())).resolves.toBe('downloaded');
    expect(navigator.share).not.toHaveBeenCalled();
    expect(clicked).toHaveLength(2);
  });

  it('downloads when navigator.share is missing', async () => {
    setPointer(true);
    await expect(savePdfFiles(files())).resolves.toBe('downloaded');
    expect(clicked).toHaveLength(2);
  });

  it('downloads when the files cannot be shared', async () => {
    setPointer(true);
    setNavigator({ share: vi.fn(), canShare: () => false });

    await expect(savePdfFiles(files())).resolves.toBe('downloaded');
    expect(navigator.share).not.toHaveBeenCalled();
  });

  it('downloads when canShare throws', async () => {
    setPointer(true);
    setNavigator({
      share: vi.fn(),
      canShare: () => {
        throw new TypeError('bad');
      },
    });

    await expect(savePdfFiles(files())).resolves.toBe('downloaded');
    expect(navigator.share).not.toHaveBeenCalled();
  });

  it('names each download, removes the anchors and revokes the URLs', async () => {
    setPointer(false);
    await savePdfFiles(files());

    expect(clicked).toEqual([
      { href: 'blob:test-1', download: 'client_Jane_questions.pdf', attached: true },
      { href: 'blob:test-2', download: 'client_Jane_answers.pdf', attached: true },
    ]);
    expect(document.querySelectorAll('a[download]')).toHaveLength(0);

    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test-1');
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test-2');
  });
});

describe('toPdfFile', () => {
  it('wraps a blob as a named PDF file', () => {
    const file = toPdfFile(new Blob(['x']), 'a.pdf');
    expect(file).toBeInstanceOf(File);
    expect(file.name).toBe('a.pdf');
    expect(file.type).toBe('application/pdf');
  });
});
