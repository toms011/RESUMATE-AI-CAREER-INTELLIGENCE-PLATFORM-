/**
 * ExportMenu — PDF/DOCX export dropdown
 * Strips editor overlays before export for clean output
 */
import React, { useRef, useEffect } from 'react';
import { useEditor } from '../context/EditorContext';
import api from '../../utils/api';
import toast from 'react-hot-toast';

function ExportMenu({ onClose }) {
  const { state, actions } = useEditor();
  const menuRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  /**
   * getCleanHTML — Extracts the resume paper HTML, strips all editor overlays,
   * and returns clean HTML suitable for PDF/DOCX generation.
   */
  const getCleanHTML = () => {
    const paperEl = document.getElementById('editor-resume-paper');
    if (!paperEl) return '';

    const clone = paperEl.cloneNode(true);

    // Remove all editor overlays and UI elements
    clone.querySelectorAll('.section-overlay').forEach(overlay => {
      // Keep only the content, remove overlay wrapper decorations
      const children = overlay.querySelector('.section-wrapper, [class*="bg-blue"]');
      // Actually, just strip data attributes and overlay classes
    });

    // Remove section label badges
    clone.querySelectorAll('[class*="absolute"][class*="-top-"]').forEach(el => el.remove());

    // Remove any contentEditable attributes
    clone.querySelectorAll('[contenteditable]').forEach(el => {
      el.removeAttribute('contenteditable');
    });

    // Remove TipTap editor wrappers — keep only text content
    clone.querySelectorAll('.tiptap, .ProseMirror').forEach(el => {
      el.removeAttribute('contenteditable');
      el.removeAttribute('role');
      el.classList.remove('ProseMirror', 'tiptap');
    });

    // Remove inline-editor wrapper divs but keep content
    clone.querySelectorAll('.inline-editor-wrapper').forEach(wrapper => {
      const content = wrapper.innerHTML;
      const span = document.createElement('span');
      span.innerHTML = content;
      wrapper.replaceWith(span);
    });

    // Remove focus ring styles
    clone.querySelectorAll('[class*="focus:ring"]').forEach(el => {
      el.className = el.className.replace(/focus:ring[^\s]*/g, '').trim();
    });

    // Remove editor-specific classes
    clone.querySelectorAll('.section-overlay').forEach(el => {
      el.className = 'resume-section-wrapper';
    });

    // Strip empty state message
    const emptyState = clone.querySelector('[class*="flex-col"][class*="items-center"][class*="justify-center"][class*="py-20"]');
    if (emptyState) emptyState.remove();

    return clone.innerHTML;
  };

  const handleExportPDF = async () => {
    try {
      // Save first
      await actions.saveResumeData();

      toast.loading('Generating PDF...', { id: 'pdf-export' });

      const response = await api.post(
        '/generate_pdf',
        {
          resume_id: state.resumeData?.id || window.location.pathname.split('/').find((_, i, arr) => arr[i - 1] === 'resume'),
          html_content: getCleanHTML(),
        },
        { responseType: 'blob' }
      );

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${state.resumeData.title || 'resume'}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);

      toast.success('PDF downloaded!', { id: 'pdf-export' });
    } catch (err) {
      console.error('PDF export failed:', err);
      toast.error('PDF export failed', { id: 'pdf-export' });
    }
    onClose();
  };

  const handleExportDOCX = async () => {
    try {
      await actions.saveResumeData();

      toast.loading('Generating DOCX...', { id: 'docx-export' });

      const response = await api.post(
        '/generate_docx',
        {
          resume_id: state.resumeData?.id || window.location.pathname.split('/').find((_, i, arr) => arr[i - 1] === 'resume'),
        },
        { responseType: 'blob' }
      );

      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${state.resumeData.title || 'resume'}.docx`;
      link.click();
      window.URL.revokeObjectURL(url);

      toast.success('DOCX downloaded!', { id: 'docx-export' });
    } catch (err) {
      console.error('DOCX export failed:', err);
      toast.error('DOCX export failed', { id: 'docx-export' });
    }
    onClose();
  };

  const handlePrint = () => {
    // Switch to preview mode to strip editor overlays / TipTap cursors.
    // The EditorPage.css @media print handles the transform/scale reset.
    const prevMode = state.editorMode;
    actions.setEditorMode('preview');

    // Inject a one-time <style> that enforces @page before window.print().
    // Browsers require @page at the document level; CSS @page inside
    // @media print blocks is ignored by some engines.
    const printStyle = document.createElement('style');
    printStyle.id = '__resume-print-page-rule';
    printStyle.textContent = `
      @page { size: A4 portrait; margin: 0; }
    `;
    document.head.appendChild(printStyle);

    // Double rAF ensures React has flushed and paint is committed
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.print();
        // Restore editor state and clean up injected style after print dialog closes
        actions.setEditorMode(prevMode);
        const injected = document.getElementById('__resume-print-page-rule');
        if (injected) injected.remove();
      });
    });
    onClose();
  };

  return (
    <div
      ref={menuRef}
      className="absolute right-0 top-full mt-1 w-56 bg-white rounded-xl border border-slate-200 shadow-xl py-2 z-50"
    >
      <p className="px-3 py-1 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
        Download As
      </p>

      <button
        onClick={handleExportPDF}
        className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
      >
        <span className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center text-red-600 text-xs font-bold flex-shrink-0">
          PDF
        </span>
        <div className="text-left">
          <p className="font-medium text-xs">PDF Document</p>
          <p className="text-[10px] text-slate-400">Best for sharing & printing</p>
        </div>
      </button>

      <button
        onClick={handleExportDOCX}
        className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
      >
        <span className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold flex-shrink-0">
          DOC
        </span>
        <div className="text-left">
          <p className="font-medium text-xs">Word Document</p>
          <p className="text-[10px] text-slate-400">Editable in Word/Google Docs</p>
        </div>
      </button>

      <div className="border-t border-slate-100 my-1" />

      <button
        onClick={handlePrint}
        className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
      >
        <span className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
        </span>
        <div className="text-left">
          <p className="font-medium text-xs">Print</p>
          <p className="text-[10px] text-slate-400">Send to printer</p>
        </div>
      </button>
    </div>
  );
}

export default ExportMenu;
