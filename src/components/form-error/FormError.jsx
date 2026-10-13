/**
 * An error message screen readers announce when it appears (spec 016). Each
 * screen keeps its own styling through `className` / `style`. A new `version`
 * (from useFormError) remounts the alert so a repeated message is announced again.
 */
const FormError = ({ id, message, version, className, style }) =>
  message ? (
    <p key={version} id={id} role="alert" className={className} style={style}>
      {message}
    </p>
  ) : null;

export default FormError;
