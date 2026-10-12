import { createPortal } from 'react-dom';

/**
 * Renders a dialog straight into <body>, outside #root, so useModalDialog can
 * make the app inert without making the dialog inert too.
 */
const DialogPortal = ({ children }) => createPortal(children, document.body);

export default DialogPortal;
