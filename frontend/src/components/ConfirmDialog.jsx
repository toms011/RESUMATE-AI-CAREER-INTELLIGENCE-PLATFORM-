import { useEffect } from 'react';

/**
 * ConfirmDialog – a lightweight modal confirmation dialog.
 *
 * Props:
 *   isOpen        {boolean}   – Whether the dialog is visible.
 *   title         {string}    – Dialog heading.
 *   message       {string}    – Body text.
 *   onConfirm     {function}  – Called when user clicks the confirm button.
 *   onCancel      {function}  – Called when user dismisses the dialog.
 *   confirmLabel  {string}    – Label for confirm button (default: "Confirm").
 *   cancelLabel   {string}    – Label for cancel button  (default: "Cancel").
 *   confirmVariant {string}   – "danger" | "warning" | "primary" (default: "primary").
 */
const VARIANT_CLASSES = {
    danger:  'cd-confirm-btn cd-confirm-danger',
    warning: 'cd-confirm-btn cd-confirm-warning',
    primary: 'cd-confirm-btn cd-confirm-primary',
};

const ConfirmDialog = ({
    isOpen,
    title = 'Are you sure?',
    message = '',
    onConfirm,
    onCancel,
    confirmLabel = 'Confirm',
    cancelLabel  = 'Cancel',
    confirmVariant = 'primary',
}) => {
    // Lock body scroll while dialog is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    if (!isOpen) return null;

    const btnClass = VARIANT_CLASSES[confirmVariant] || VARIANT_CLASSES.primary;

    return (
        <div className="cd-dialog-backdrop" onClick={onCancel}>
            <div
                className="cd-dialog"
                role="dialog"
                aria-modal="true"
                aria-labelledby="cd-dialog-title"
                onClick={e => e.stopPropagation()}
            >
                <h3 id="cd-dialog-title" className="cd-dialog-title">{title}</h3>
                {message && <p className="cd-dialog-msg">{message}</p>}

                <div className="cd-dialog-footer">
                    <button className="cd-confirm-btn cd-confirm-cancel" onClick={onCancel}>
                        {cancelLabel}
                    </button>
                    <button className={btnClass} onClick={onConfirm}>
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmDialog;
