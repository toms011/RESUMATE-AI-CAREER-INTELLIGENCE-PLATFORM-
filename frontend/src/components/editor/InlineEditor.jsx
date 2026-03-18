import React, { useEffect } from 'react';
import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react';
// import { BubbleMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import FloatingToolbar from './FloatingToolbar';

const InlineEditor = ({
    value,
    onChange,
    tagName = 'div',
    className = '',
    style = {},
    isEditable = false
}) => {
    const editor = useEditor({
        extensions: [
            StarterKit,
            Underline,
            TextStyle,
            Color,
            TextAlign.configure({
                types: ['heading', 'paragraph'],
            }),
        ],
        content: value,
        editable: isEditable,
        onUpdate: ({ editor }) => {
            // Return HTML for storage
            const html = editor.getHTML();
            if (onChange) {
                onChange(html);
            }
        },
        editorProps: {
            attributes: {
                class: `outline-none focus:ring-2 focus:ring-blue-400/50 rounded px-1 -mx-1 transition-all ${className}`,
                style: 'min-height: 1em; display: inline-block; width: 100%;',
            },
        },
    });

    // Sync content if value changes externally (and not focused to avoid cursor jumps)
    useEffect(() => {
        if (editor && value !== editor.getHTML() && !editor.isFocused) {
            editor.commands.setContent(value);
        }
    }, [value, editor]);

    // Sync editable state
    useEffect(() => {
        if (editor) {
            editor.setEditable(isEditable);
        }
    }, [isEditable, editor]);

    if (!editor) {
        return null; // Or a loader/placeholder
    }

    return (
        <div className="relative inline-editor-wrapper" style={{ width: '100%', ...style }}>
            {isEditable && (
                <BubbleMenu editor={editor} tippyOptions={{ duration: 100, zIndex: 999 }}>
                    <FloatingToolbar editor={editor} />
                </BubbleMenu>
            )}
            <EditorContent editor={editor} />
        </div>
    );
};

export default InlineEditor;
