import React from 'react';

const FloatingToolbar = ({ editor }) => {
    if (!editor) {
        return null;
    }

    return (
        <div className="flex bg-slate-800 text-white rounded-lg shadow-lg overflow-hidden border border-slate-700">
            <button
                onClick={() => editor.chain().focus().toggleBold().run()}
                className={`p-2 hover:bg-slate-700 ${editor.isActive('bold') ? 'bg-slate-600 text-blue-400' : ''}`}
                title="Bold"
            >
                <strong>B</strong>
            </button>
            <button
                onClick={() => editor.chain().focus().toggleItalic().run()}
                className={`p-2 hover:bg-slate-700 ${editor.isActive('italic') ? 'bg-slate-600 text-blue-400' : ''}`}
                title="Italic"
            >
                <em>I</em>
            </button>
            <button
                onClick={() => editor.chain().focus().toggleUnderline().run()}
                className={`p-2 hover:bg-slate-700 ${editor.isActive('underline') ? 'bg-slate-600 text-blue-400' : ''}`}
                title="Underline"
            >
                <u>U</u>
            </button>

            <div className="w-px bg-slate-700 mx-1"></div>

            <button
                onClick={() => editor.chain().focus().setTextAlign('left').run()}
                className={`p-2 hover:bg-slate-700 ${editor.isActive({ textAlign: 'left' }) ? 'bg-slate-600 text-blue-400' : ''}`}
                title="Align Left"
            >
                ⇠
            </button>
            <button
                onClick={() => editor.chain().focus().setTextAlign('center').run()}
                className={`p-2 hover:bg-slate-700 ${editor.isActive({ textAlign: 'center' }) ? 'bg-slate-600 text-blue-400' : ''}`}
                title="Align Center"
            >
                ↔
            </button>
            <button
                onClick={() => editor.chain().focus().setTextAlign('right').run()}
                className={`p-2 hover:bg-slate-700 ${editor.isActive({ textAlign: 'right' }) ? 'bg-slate-600 text-blue-400' : ''}`}
                title="Align Right"
            >
                ⇢
            </button>
        </div>
    );
};

export default FloatingToolbar;
