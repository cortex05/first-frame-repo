import { useEffect, useId, useState } from "react";

const EMPTY = { message: "", fieldIds: [], version: 0 };

/**
 * One form's error message (spec 016). `setError(message, fieldIds)` marks the
 * listed inputs invalid, links them to the message, and moves focus to the
 * first one. Server errors pass no field ids: they are announced, focus stays.
 *
 * Render the message with
 *   <FormError id={messageId} message={message} version={version} />
 * and spread fieldProps(id) on each input that can be invalid. `version` grows
 * on every setError, so the same message set twice is announced twice.
 */
const useFormError = () => {
  const messageId = useId();
  const [state, setState] = useState(EMPTY);

  const setError = (message, fieldIds = []) =>
    setState((prev) => ({ message, fieldIds, version: prev.version + 1 }));
  const clear = () => setState((prev) => ({ ...EMPTY, version: prev.version }));

  const fieldProps = (fieldId) =>
    state.fieldIds.includes(fieldId)
      ? { "aria-invalid": true, "aria-describedby": messageId }
      : {};

  useEffect(() => {
    const first = state.fieldIds[0];
    if (first) document.getElementById(first)?.focus();
  }, [state]);

  return {
    message: state.message,
    version: state.version,
    messageId,
    setError,
    clear,
    fieldProps,
  };
};

export default useFormError;
