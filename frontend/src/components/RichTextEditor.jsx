import React, { useRef, useEffect } from 'react';

const RichTextEditor = ({ value, onChange, placeholder, style, disabled }) => {
    const contentRef = useRef(null);
    const isInternalUpdate = useRef(false);

    useEffect(() => {
        if (contentRef.current && !isInternalUpdate.current && value !== contentRef.current.innerHTML) {
            // Only update if the new value is different from current content
            // This prevents cursor jumping
            contentRef.current.innerHTML = value || '';
        }
        // Reset internal update flag
        isInternalUpdate.current = false;
    }, [value]);

    const handleInput = (e) => {
        isInternalUpdate.current = true;
        const cleanContent = e.target.innerHTML; // Get HTML
        onChange(cleanContent);
    };

    const execCmd = (command, value = null) => {
        document.execCommand(command, false, value);
        contentRef.current.focus();
        // Trigger input to update state
        const cleanContent = contentRef.current.innerHTML;
        onChange(cleanContent);
    };

    return (
        <div className="rich-text-editor" style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
            <div className="editor-toolbar" style={{
                background: '#f9fafb',
                borderBottom: '1px solid #e5e7eb',
                padding: '8px',
                display: 'flex',
                gap: '4px'
            }}>
                <button
                    type="button"
                    className="toolbar-btn"
                    onMouseDown={(e) => { e.preventDefault(); execCmd('bold'); }}
                    title="Bold"
                    style={{ fontWeight: 'bold' }}>
                    B
                </button>
                <button
                    type="button"
                    className="toolbar-btn"
                    onMouseDown={(e) => { e.preventDefault(); execCmd('italic'); }}
                    title="Italic"
                    style={{ fontStyle: 'italic' }}>
                    I
                </button>
                <button
                    type="button"
                    className="toolbar-btn"
                    onMouseDown={(e) => { e.preventDefault(); execCmd('underline'); }}
                    title="Underline"
                    style={{ textDecoration: 'underline' }}>
                    U
                </button>
                <div style={{ width: '1px', background: '#ccc', margin: '0 4px' }}></div>
                <button
                    type="button"
                    className="toolbar-btn"
                    onMouseDown={(e) => { e.preventDefault(); execCmd('insertUnorderedList'); }}
                    title="Bullet List"
                    style={{ fontSize: '18px', lineHeight: '1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    •
                </button>
                <button
                    type="button"
                    className="toolbar-btn"
                    onMouseDown={(e) => { e.preventDefault(); execCmd('insertOrderedList'); }}
                    title="Numbered List"
                    style={{ fontSize: '14px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    1.
                </button>
            </div>

            <div
                ref={contentRef}
                className="editor-content"
                contentEditable={!disabled}
                onInput={handleInput}
                style={{
                    minHeight: '200px',
                    padding: '12px',
                    outline: 'none',
                    fontSize: '14px',
                    lineHeight: '1.6',
                    color: '#374151',
                    ...style
                }}
            />
            {(!value) && placeholder && (
                <div style={{
                    position: 'absolute',
                    top: '50px',
                    left: '12px',
                    color: '#9ca3af',
                    pointerEvents: 'none',
                    fontSize: '14px'
                }}>
                    {placeholder}
                </div>
            )}
        </div>
    );
};

export default RichTextEditor;
