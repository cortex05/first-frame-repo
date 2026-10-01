// Hands the exported PDFs to the device (spec 006, AC-18 to AC-21). Touch
// devices get the share sheet; everything else downloads with <a download>.
// Nothing is stored.

export const isTouchDevice = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(pointer: coarse)').matches;

export const canShareFiles = (files) => {
  try {
    return (
      isTouchDevice() &&
      typeof navigator.share === 'function' &&
      typeof navigator.canShare === 'function' &&
      navigator.canShare({ files })
    );
  } catch {
    return false;
  }
};

export const downloadFile = (file) => {
  const url = URL.createObjectURL(file);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = file.name;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Revoke after the click has been handled, so Safari has started the download.
  setTimeout(() => URL.revokeObjectURL(url), 0);
};

export const toPdfFile = (blob, name) => new File([blob], name, { type: 'application/pdf' });

/**
 * Resolves to 'shared', 'cancelled' (share sheet dismissed) or 'downloaded'.
 * `navigator.share` is the first await, so it still runs within the click's
 * user activation as long as the caller built the files synchronously.
 */
export const savePdfFiles = async (files, { title } = {}) => {
  if (canShareFiles(files)) {
    try {
      await navigator.share({ files, title });
      return 'shared';
    } catch (error) {
      if (error?.name === 'AbortError') return 'cancelled';
      // Any other failure (e.g. NotAllowedError) falls back to downloading.
    }
  }

  files.forEach(downloadFile);
  return 'downloaded';
};
