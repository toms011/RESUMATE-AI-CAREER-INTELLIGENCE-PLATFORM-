import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fabric } from 'fabric';
import { resumeDesignApi } from '../../services/api';
import ConfirmDialog from '../../components/ConfirmDialog';
import '../../styles/ResumeDesigner.css';

const CANVAS_W = 700;
const CANVAS_H = 990;

const PRESET_COLORS = [
    '#0f172a', '#1e293b', '#334155', '#64748b',
    '#2563eb', '#0891b2', '#16a34a', '#dc2626',
    '#9333ea', '#ea580c', '#ca8a04', '#ffffff',
];

const FONT_FAMILIES = [
    'Arial', 'Georgia', 'Times New Roman', 'Verdana',
    'Trebuchet MS', 'Palatino', 'Garamond', 'Courier New',
    'Lato', 'Roboto', 'Open Sans',
];

const ELEMENT_BTNS = [
    { label: 'Full Name',    type: 'full_name',    group: 'personal', icon: 'user' },
    { label: 'Job Title',    type: 'job_title',    group: 'personal', icon: 'briefcase' },
    { label: 'Email',        type: 'email',        group: 'personal', icon: 'mail' },
    { label: 'Phone',        type: 'phone',        group: 'personal', icon: 'phone' },
    { label: 'Location',     type: 'location',     group: 'personal', icon: 'pin' },
    { label: 'LinkedIn',     type: 'linkedin',     group: 'personal', icon: 'link' },
    { label: 'GitHub',       type: 'github',       group: 'personal', icon: 'code' },
    { label: 'Section Head', type: 'section_head', group: 'layout',   icon: 'heading' },
    { label: 'Body Text',    type: 'body',         group: 'layout',   icon: 'text' },
    { label: 'Bullet',       type: 'bullet',       group: 'layout',   icon: 'list' },
    { label: 'Date Range',   type: 'date_range',   group: 'layout',   icon: 'calendar' },
    { label: 'Free Text',    type: 'normal',       group: 'layout',   icon: 'type' },
];

/* ── Inline SVG icons ────────────────────────────────────────── */
const I = {
    user:      <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" width="15" height="15"><circle cx="9" cy="6" r="3"/><path d="M3 16c0-3.3 2.7-5 6-5s6 1.7 6 5"/></svg>,
    briefcase: <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" width="15" height="15"><rect x="2" y="6" width="14" height="9" rx="2"/><path d="M6 6V4a2 2 0 012-2h2a2 2 0 012 2v2"/></svg>,
    mail:      <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" width="15" height="15"><rect x="2" y="4" width="14" height="10" rx="2"/><path d="M2 6l7 4 7-4"/></svg>,
    phone:     <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" width="15" height="15"><path d="M4 2h3l2 4-2.5 1.5A8.4 8.4 0 0010.5 11.5L12 9l4 2v3a2 2 0 01-2 2A14 14 0 012 4a2 2 0 012-2z"/></svg>,
    pin:       <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" width="15" height="15"><path d="M9 16s-5-4.35-5-8a5 5 0 0110 0c0 3.65-5 8-5 8z"/><circle cx="9" cy="8" r="1.5"/></svg>,
    link:      <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" width="15" height="15"><path d="M7.5 10.5l3-3M6 12l-1.5 1.5a2.12 2.12 0 003 3L9 15M12 6l1.5-1.5a2.12 2.12 0 00-3-3L9 3"/></svg>,
    code:      <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" width="15" height="15"><polyline points="5,5 2,9 5,13"/><polyline points="13,5 16,9 13,13"/><line x1="10" y1="3" x2="8" y2="15"/></svg>,
    heading:   <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" width="15" height="15"><path d="M4 3v12M14 3v12M4 9h10"/></svg>,
    text:      <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" width="15" height="15"><path d="M4 4h10M7 4v10M11 4v10"/></svg>,
    list:      <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" width="15" height="15"><circle cx="4" cy="5" r="1" fill="currentColor"/><circle cx="4" cy="9" r="1" fill="currentColor"/><circle cx="4" cy="13" r="1" fill="currentColor"/><line x1="8" y1="5" x2="15" y2="5"/><line x1="8" y1="9" x2="15" y2="9"/><line x1="8" y1="13" x2="15" y2="13"/></svg>,
    calendar:  <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" width="15" height="15"><rect x="2" y="4" width="14" height="12" rx="2"/><line x1="6" y1="2" x2="6" y2="6"/><line x1="12" y1="2" x2="12" y2="6"/><line x1="2" y1="8" x2="16" y2="8"/></svg>,
    type:      <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" width="15" height="15"><polyline points="4,15 9,3 14,15"/><line x1="6" y1="11" x2="12" y2="11"/></svg>,
    save:      <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" width="16" height="16"><path d="M15 6.3V14a2 2 0 01-2 2H5a2 2 0 01-2-2V4a2 2 0 012-2h6.7L15 5.3z"/><path d="M13 16v-5H5v5"/><path d="M5 2v3h6"/></svg>,
    undo:      <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" width="16" height="16"><polyline points="4,8 2,6 4,4"/><path d="M2 6h10a4 4 0 010 8H8"/></svg>,
    redo:      <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" width="16" height="16"><polyline points="14,8 16,6 14,4"/><path d="M16 6H6a4 4 0 000 8h4"/></svg>,
    zoomIn:    <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" width="16" height="16"><circle cx="8" cy="8" r="5"/><line x1="13" y1="13" x2="16" y2="16"/><line x1="6" y1="8" x2="10" y2="8"/><line x1="8" y1="6" x2="8" y2="10"/></svg>,
    zoomOut:   <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" width="16" height="16"><circle cx="8" cy="8" r="5"/><line x1="13" y1="13" x2="16" y2="16"/><line x1="6" y1="8" x2="10" y2="8"/></svg>,
    expand:    <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" width="15" height="15"><polyline points="6,2 2,2 2,6"/><polyline points="12,16 16,16 16,12"/><line x1="2" y1="2" x2="7" y2="7"/><line x1="16" y1="16" x2="11" y2="11"/></svg>,
    compress:  <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" width="15" height="15"><polyline points="4,8 8,8 8,4"/><polyline points="14,10 10,10 10,14"/><line x1="8" y1="8" x2="2" y2="2"/><line x1="10" y1="10" x2="16" y2="16"/></svg>,
    front:     <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14"><rect x="2" y="6" width="8" height="8" rx="1"/><rect x="8" y="2" width="8" height="8" rx="1"/><path d="M12 6v4H8"/></svg>,
    back2:     <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14"><rect x="8" y="6" width="8" height="8" rx="1"/><rect x="2" y="2" width="8" height="8" rx="1"/><path d="M6 10V6h4"/></svg>,
    trash:     <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14"><polyline points="3,5 15,5"/><path d="M6 5V3h6v2"/><path d="M4 5l1 10a1 1 0 001 1h6a1 1 0 001-1l1-10"/><line x1="7" y1="8" x2="7" y2="13"/><line x1="11" y1="8" x2="11" y2="13"/></svg>,
    clear:     <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14"><line x1="4" y1="4" x2="14" y2="14"/><line x1="14" y1="4" x2="4" y2="14"/></svg>,
    download:  <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" width="15" height="15"><path d="M9 2v10"/><polyline points="5,9 9,13 13,9"/><path d="M2 14v1a1 1 0 001 1h12a1 1 0 001-1v-1"/></svg>,
    image:     <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14"><rect x="2" y="3" width="14" height="12" rx="2"/><circle cx="6" cy="7" r="1.5"/><path d="M2 13l4-4 3 3 2-2 5 5"/></svg>,
    bg:        <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14"><rect x="2" y="2" width="14" height="14" rx="2"/><line x1="2" y1="9" x2="16" y2="9"/><line x1="9" y1="2" x2="9" y2="16"/></svg>,
    cursor:    <svg viewBox="0 0 20 20" fill="currentColor" width="28" height="28" style={{opacity:0.15}}><path d="M6.672 1.911a1 1 0 10-1.932.518l.259.966a1 1 0 001.932-.518l-.26-.966zM2.429 4.74a1 1 0 10-.517 1.932l.966.259a1 1 0 00.517-1.932l-.966-.26zm8.814-.569a1 1 0 00-1.415-1.414l-.707.707a1 1 0 101.415 1.415l.707-.708zm-7.071 7.072l.707-.707A1 1 0 003.465 9.12l-.708.707a1 1 0 001.415 1.415zm3.2-5.171a1 1 0 00-1.3 1.3l4 10a1 1 0 001.823.075l1.38-2.759 3.018 3.02a1 1 0 001.414-1.415l-3.019-3.02 2.76-1.379a1 1 0 00-.076-1.822l-10-4z"/></svg>,
    divider:   <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" width="15" height="15"><line x1="2" y1="9" x2="16" y2="9"/></svg>,
    rect:      <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" width="15" height="15"><rect x="3" y="4" width="12" height="10" rx="2"/></svg>,
    circle:    <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" width="15" height="15"><circle cx="9" cy="9" r="6"/></svg>,
    line:      <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" width="15" height="15"><line x1="2" y1="14" x2="16" y2="4"/></svg>,
};

const MAX_HISTORY = 40;

const ResumeDesigner = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const canvasRef     = useRef(null);
    const fabricRef     = useRef(null);
    const canvasAreaRef = useRef(null);
    const designerRef   = useRef(null);

    const [resumeTitle,    setResumeTitle]    = useState('');
    const [resumeData,     setResumeData]     = useState(null);
    const [saveStatus,     setSaveStatus]     = useState('');
    const [selectedEl,     setSelectedEl]     = useState(null);
    const [isFullscreen,   setIsFullscreen]   = useState(false);
    const [canvasScale,    setCanvasScale]    = useState(1);
    const [activeTab,      setActiveTab]      = useState('personal');
    const [rightTab,       setRightTab]       = useState('properties');
    const [collapsedSects, setCollapsedSects] = useState({});

    // text controls
    const [textContent, setTextContent] = useState('');
    const [fontSize,    setFontSize]    = useState(16);
    const [fontFamily,  setFontFamily]  = useState('Arial');
    const [fontColor,   setFontColor]   = useState('#000000');
    const [fontWeight,  setFontWeight]  = useState('normal');
    const [fontStyle,   setFontStyle]   = useState('normal');

    // undo / redo
    const historyRef     = useRef([]);
    const historyIdxRef  = useRef(-1);
    const skipHistoryRef = useRef(false);
    const [canUndo, setCanUndo] = useState(false);
    const [canRedo, setCanRedo] = useState(false);

    const [confirmDialog, setConfirmDialog] = useState({
        isOpen: false, title: '', message: '', onConfirm: null, variant: 'danger',
    });

    // ── Helpers ─────────────────────────────────────────────────

    const stripHtml = (raw) => {
        if (!raw) return '';
        return String(raw)
            .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
            .replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"')
            .replace(/<[^>]*>/g, '').trim();
    };

    const set = (prop, val) => {
        if (!selectedEl) return;
        selectedEl.set(prop, val);
        fabricRef.current?.renderAll();
    };

    const toggleSection = (key) => setCollapsedSects(p => ({ ...p, [key]: !p[key] }));

    // ── History ─────────────────────────────────────────────────

    const pushHistory = useCallback(() => {
        const canvas = fabricRef.current;
        if (!canvas || skipHistoryRef.current) return;
        const json = JSON.stringify(canvas.toJSON());
        historyRef.current = historyRef.current.slice(0, historyIdxRef.current + 1);
        historyRef.current.push(json);
        if (historyRef.current.length > MAX_HISTORY) historyRef.current.shift();
        historyIdxRef.current = historyRef.current.length - 1;
        setCanUndo(historyIdxRef.current > 0);
        setCanRedo(false);
    }, []);

    const undo = useCallback(() => {
        if (historyIdxRef.current <= 0) return;
        historyIdxRef.current -= 1;
        skipHistoryRef.current = true;
        fabricRef.current?.loadFromJSON(JSON.parse(historyRef.current[historyIdxRef.current]), () => {
            fabricRef.current?.renderAll();
            skipHistoryRef.current = false;
            setCanUndo(historyIdxRef.current > 0);
            setCanRedo(historyIdxRef.current < historyRef.current.length - 1);
        });
    }, []);

    const redo = useCallback(() => {
        if (historyIdxRef.current >= historyRef.current.length - 1) return;
        historyIdxRef.current += 1;
        skipHistoryRef.current = true;
        fabricRef.current?.loadFromJSON(JSON.parse(historyRef.current[historyIdxRef.current]), () => {
            fabricRef.current?.renderAll();
            skipHistoryRef.current = false;
            setCanUndo(historyIdxRef.current > 0);
            setCanRedo(historyIdxRef.current < historyRef.current.length - 1);
        });
    }, []);

    // ── Canvas ──────────────────────────────────────────────────

    const handleSelection = (e) => {
        const obj = e.selected?.[0];
        if (!obj) return;
        setSelectedEl(obj);
        if (obj.type === 'i-text' || obj.type === 'text') {
            setTextContent(obj.text ?? '');
            setFontSize(obj.fontSize ?? 16);
            setFontFamily(obj.fontFamily ?? 'Arial');
            setFontColor(obj.fill ?? '#000000');
            setFontWeight(obj.fontWeight ?? 'normal');
            setFontStyle(obj.fontStyle ?? 'normal');
        }
    };

    const initCanvas = () => {
        const canvas = new fabric.Canvas(canvasRef.current, {
            width: CANVAS_W, height: CANVAS_H, backgroundColor: '#ffffff',
            preserveObjectStacking: true,
        });
        fabricRef.current = canvas;
        canvas.on('selection:created', handleSelection);
        canvas.on('selection:updated', handleSelection);
        canvas.on('selection:cleared', () => setSelectedEl(null));
        canvas.on('object:modified', () => { fabricRef.current?.renderAll(); pushHistory(); });
        canvas.on('object:added',    () => pushHistory());
        canvas.on('object:removed',  () => pushHistory());
    };

    const loadResume = async () => {
        if (!id) return;
        try {
            const data = await resumeDesignApi.getResume(id);
            setResumeTitle(data.title || 'Untitled Resume');
            setResumeData(data);
            if (data.canvas_design) {
                const parsed = typeof data.canvas_design === 'string' ? JSON.parse(data.canvas_design) : data.canvas_design;
                fabricRef.current?.loadFromJSON(parsed, () => { fabricRef.current?.renderAll(); pushHistory(); });
            } else {
                autoPopulateCanvas(data);
                pushHistory();
            }
        } catch (err) { console.error('Error loading resume:', err); }
    };

    const autoPopulateCanvas = (data) => {
        const canvas = fabricRef.current;
        if (!canvas) return;
        canvas.clear();
        canvas.backgroundColor = '#ffffff';

        const pi    = data?.personal_info      ?? {};
        const exps  = data?.experiences        ?? [];
        const edus  = data?.education          ?? [];
        const skills= data?.skills             ?? [];
        const addl  = data?.additional_details ?? {};
        const strip = (v) => stripHtml(v);
        const W = CANVAS_W, PAD = 48, BODY = W - PAD * 2, ACCENT = '#2563eb';
        let y = PAD;
        const add = (obj) => canvas.add(obj);

        const name = strip(pi.full_name) || 'Your Name';
        add(new fabric.IText(name, { left: PAD, top: y, fontSize: 30, fontFamily: 'Georgia', fontWeight: 'bold', fill: '#0f172a', width: BODY }));
        y += 38;

        const jobTitle = strip(pi.job_title);
        if (jobTitle) {
            add(new fabric.IText(jobTitle, { left: PAD, top: y, fontSize: 14, fontFamily: 'Arial', fontStyle: 'italic', fill: ACCENT, width: BODY }));
            y += 22;
        }

        const contactParts = [strip(pi.email), strip(pi.phone), strip(pi.location), strip(pi.linkedin)].filter(Boolean);
        if (contactParts.length) {
            add(new fabric.IText(contactParts.join('   \u2022   '), { left: PAD, top: y, fontSize: 10, fontFamily: 'Arial', fill: '#475569', width: BODY }));
            y += 18;
        }

        y += 6;
        add(new fabric.Rect({ left: PAD, top: y, width: BODY, height: 1.5, fill: ACCENT }));
        y += 12;

        const sectionHead = (label) => {
            add(new fabric.IText(label.toUpperCase(), { left: PAD, top: y, fontSize: 10, fontFamily: 'Arial', fontWeight: 'bold', fill: ACCENT, charSpacing: 80 }));
            y += 14;
            add(new fabric.Rect({ left: PAD, top: y, width: BODY, height: 0.75, fill: '#e2e8f0' }));
            y += 8;
        };
        const bodyText = (text, opts = {}) => {
            for (const ln of text.split('\n').filter(l => l.trim())) {
                if (y > CANVAS_H - PAD) return;
                add(new fabric.IText(ln.substring(0, 120), {
                    left: PAD + (opts.indent || 0), top: y,
                    fontSize: opts.fontSize || 10, fontFamily: 'Arial',
                    fill: opts.fill || '#334155',
                    fontStyle: opts.italic ? 'italic' : 'normal',
                    fontWeight: opts.bold ? 'bold' : 'normal',
                    width: BODY - (opts.indent || 0),
                }));
                y += (opts.lineH || 14);
            }
        };

        const summary = strip(pi.summary);
        if (summary) {
            sectionHead('Professional Summary');
            const w = summary.split(' ');
            for (let i = 0; i < Math.min(w.length, 52); i += 13) bodyText(w.slice(i, i + 13).join(' '));
            y += 8;
        }

        if (exps.length) {
            sectionHead('Experience');
            for (const exp of exps) {
                if (y > CANVAS_H - PAD * 3) break;
                const t = strip(exp.job_title), c = strip(exp.company);
                const d = [strip(exp.start_date), strip(exp.end_date)].filter(Boolean).join(' \u2013 ');
                if (t) bodyText(t, { bold: true, fontSize: 11, fill: '#1e293b' });
                const sub = [c, d].filter(Boolean).join('   ');
                if (sub) bodyText(sub, { italic: true, fontSize: 10, fill: '#64748b', lineH: 13 });
                const desc = strip(exp.description);
                if (desc) { const ws = desc.split(' '); for (let i = 0; i < Math.min(ws.length, 39); i += 13) bodyText('\u2022 ' + ws.slice(i, i + 13).join(' '), { indent: 8, fontSize: 10, fill: '#475569', lineH: 13 }); }
                y += 6;
            }
            y += 4;
        }

        if (edus.length) {
            sectionHead('Education');
            for (const edu of edus) {
                if (y > CANVAS_H - PAD * 2) break;
                const deg = strip(edu.degree), inst = strip(edu.institution), yr = strip(edu.year), grd = strip(edu.grade);
                if (deg) bodyText(deg, { bold: true, fontSize: 11, fill: '#1e293b', lineH: 14 });
                const sub = [inst, yr, grd ? `Grade: ${grd}` : ''].filter(Boolean).join('   ');
                if (sub) bodyText(sub, { italic: true, fontSize: 10, fill: '#64748b', lineH: 13 });
                y += 6;
            }
            y += 4;
        }

        if (skills.length) {
            sectionHead('Skills');
            const ns = skills.map(s => strip(s.name)).filter(Boolean);
            for (let i = 0; i < ns.length; i += 6) bodyText(ns.slice(i, i + 6).join('   \u2022   '), { fontSize: 10, fill: '#334155', lineH: 14 });
            y += 6;
        }

        const certs = addl.certification || addl.certifications || [];
        if (certs.length) {
            sectionHead('Certifications');
            for (const cert of certs) {
                const nm = typeof cert === 'string' ? cert : (cert.name || cert.title || JSON.stringify(cert));
                bodyText('\u2022 ' + strip(nm), { indent: 8, fontSize: 10, fill: '#475569', lineH: 14 });
            }
        }

        canvas.renderAll();
    };

    // ── Effects ─────────────────────────────────────────────────

    useEffect(() => { initCanvas(); return () => fabricRef.current?.dispose(); }, []); // eslint-disable-line
    useEffect(() => { if (fabricRef.current) loadResume(); }, [id]); // eslint-disable-line
    useEffect(() => {
        const fn = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', fn);
        return () => document.removeEventListener('fullscreenchange', fn);
    }, []);
    useEffect(() => {
        if (!canvasAreaRef.current) return;
        const ro = new ResizeObserver(entries => {
            const { width, height } = entries[0].contentRect;
            setCanvasScale(Math.max(0.15, Math.min((width - 96) / CANVAS_W, (height - 96) / CANVAS_H, 1)));
        });
        ro.observe(canvasAreaRef.current);
        return () => ro.disconnect();
    }, []);
    useEffect(() => {
        const handler = (e) => {
            if (e.key === 'Delete' && selectedEl) { e.preventDefault(); deleteSelected(); return; }
            if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'z') { e.preventDefault(); undo(); }
            if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) { e.preventDefault(); redo(); }
            if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); handleSave(); }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [selectedEl, undo, redo]); // eslint-disable-line

    // ── Element creators ────────────────────────────────────────

    const addText = (type = 'normal') => {
        const pi = resumeData?.personal_info ?? {};
        const base = { left: 60, top: 80, fontFamily: 'Arial', fill: '#1e293b' };
        const map = {
            full_name:    { text: stripHtml(pi.full_name)  || 'Your Full Name',      fontSize: 32, fontWeight: 'bold', fill: '#0f172a' },
            job_title:    { text: stripHtml(pi.job_title)  || 'Professional Title',  fontSize: 16, fontStyle: 'italic', fill: '#475569' },
            email:        { text: stripHtml(pi.email)      || 'email@example.com',   fontSize: 12, fill: '#1e293b' },
            phone:        { text: stripHtml(pi.phone)      || '+1 234 567 8900',     fontSize: 12, fill: '#1e293b' },
            location:     { text: stripHtml(pi.location)   || 'City, Country',       fontSize: 12, fill: '#1e293b' },
            linkedin:     { text: stripHtml(pi.linkedin)   || 'linkedin.com/in/you', fontSize: 12, fill: '#2563eb' },
            github:       { text: stripHtml(pi.github)     || 'github.com/you',      fontSize: 12, fill: '#2563eb' },
            section_head: { text: 'SECTION HEADING', fontSize: 13, fontWeight: 'bold', fill: '#2563eb', top: 120, charSpacing: 80 },
            body:         { text: 'Body text goes here. Double-click to edit.', fontSize: 11, fill: '#334155' },
            bullet:       { text: '\u2022  Bullet point description', fontSize: 11, fill: '#334155' },
            date_range:   { text: 'Jan 2020 \u2013 Dec 2022', fontSize: 11, fontStyle: 'italic', fill: '#64748b' },
            normal:       { text: 'Double-click to edit', fontSize: 13, fill: '#1e293b' },
        };
        const cfg = map[type] ?? map.normal;
        const t = new fabric.IText(cfg.text, { ...base, ...cfg });
        fabricRef.current.add(t);
        fabricRef.current.setActiveObject(t);
        fabricRef.current.renderAll();
    };

    const addShape = (type) => {
        const shapes = {
            divider: new fabric.Rect({ left: 60, top: 120, width: 580, height: 1.5, fill: '#2563eb' }),
            circle:  new fabric.Circle({ left: 60, top: 60, radius: 36, fill: 'transparent', stroke: '#2563eb', strokeWidth: 2 }),
            line:    new fabric.Line([60, 100, 640, 100], { stroke: '#cbd5e1', strokeWidth: 1 }),
            rect:    new fabric.Rect({ left: 60, top: 60, width: 200, height: 80, fill: '#eff6ff', stroke: '#bfdbfe', strokeWidth: 1, rx: 6, ry: 6 }),
        };
        const s = shapes[type];
        if (s) { fabricRef.current.add(s); fabricRef.current.setActiveObject(s); fabricRef.current.renderAll(); }
    };

    // ── Actions ─────────────────────────────────────────────────

    const handleBgUpload = (e) => {
        const file = e.target.files?.[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => fabric.Image.fromURL(ev.target.result, img => {
            img.scaleToWidth(CANVAS_W);
            fabricRef.current.setBackgroundImage(img, fabricRef.current.renderAll.bind(fabricRef.current), { originX: 'left', originY: 'top' });
            pushHistory();
        });
        reader.readAsDataURL(file);
    };

    const handleImgUpload = (e) => {
        const file = e.target.files?.[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => fabric.Image.fromURL(ev.target.result, img => {
            img.scaleToWidth(120);
            img.set({ left: 60, top: 60 });
            fabricRef.current.add(img);
            fabricRef.current.setActiveObject(img);
            fabricRef.current.renderAll();
        });
        reader.readAsDataURL(file);
    };

    const deleteSelected = () => {
        const objs = fabricRef.current.getActiveObjects();
        if (objs.length) { objs.forEach(o => fabricRef.current.remove(o)); fabricRef.current.discardActiveObject(); fabricRef.current.renderAll(); }
    };

    const bringToFront = () => { const o = fabricRef.current.getActiveObject(); if (o) { fabricRef.current.bringToFront(o); fabricRef.current.renderAll(); } };
    const sendToBack   = () => { const o = fabricRef.current.getActiveObject(); if (o) { fabricRef.current.sendToBack(o);  fabricRef.current.renderAll(); } };

    const clearCanvas = () => setConfirmDialog({
        isOpen: true, title: 'Clear Canvas', message: 'Remove all elements from the canvas?', variant: 'danger',
        onConfirm: () => {
            fabricRef.current.clear();
            fabricRef.current.backgroundColor = '#ffffff';
            fabricRef.current.renderAll();
            pushHistory();
            setConfirmDialog(p => ({ ...p, isOpen: false }));
        },
    });

    const toggleFullscreen = async () => {
        try {
            if (!document.fullscreenElement) await designerRef.current?.requestFullscreen();
            else await document.exitFullscreen();
        } catch (err) { console.error(err); }
    };

    const handleSave = async () => {
        if (!id) return;
        setSaveStatus('saving');
        try {
            await resumeDesignApi.saveCanvasDesign(id, JSON.stringify(fabricRef.current.toJSON()));
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus(''), 2500);
        } catch (err) {
            console.error(err);
            setSaveStatus('error');
            setTimeout(() => setSaveStatus(''), 3000);
        }
    };

    const downloadPNG = () => {
        const canvas = fabricRef.current;
        if (!canvas) return;
        canvas.discardActiveObject();
        canvas.renderAll();
        const url = canvas.toDataURL({ format: 'png', quality: 1, multiplier: 2 });
        const a = document.createElement('a');
        a.href = url;
        a.download = `${resumeTitle || 'resume'}.png`;
        a.click();
    };

    const manualZoom = (dir) => {
        setCanvasScale(prev => Math.max(0.2, Math.min(dir === 'in' ? prev + 0.1 : prev - 0.1, 1.5)));
    };

    const personalBtns = ELEMENT_BTNS.filter(b => b.group === 'personal');
    const layoutBtns   = ELEMENT_BTNS.filter(b => b.group === 'layout');
    const isText       = selectedEl && (selectedEl.type === 'i-text' || selectedEl.type === 'text');

    // ── Render ──────────────────────────────────────────────────

    return (
        <div ref={designerRef} className={`rd-root${isFullscreen ? ' rd-fullscreen' : ''}`}>

            {/* ═══ HEADER ═══ */}
            <header className="rd-header">
                <div className="rd-header-left">
                    <button className="rd-back-btn" onClick={() => navigate('/design-studio')} title="Back to studio">
                        <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M11 4L6 9l5 5"/></svg>
                    </button>
                    <div className="rd-header-brand">
                        {I.save}
                        <span className="rd-header-title">Resume Designer</span>
                    </div>
                    {resumeTitle && (
                        <div className="rd-header-crumb">
                            <span className="rd-crumb-sep">/</span>
                            <span className="rd-crumb-name">{resumeTitle}</span>
                        </div>
                    )}
                </div>

                <div className="rd-header-center">
                    <div className="rd-tool-group">
                        <button className="rd-tool-btn" onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)">{I.undo}</button>
                        <button className="rd-tool-btn" onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Y)">{I.redo}</button>
                    </div>
                    <div className="rd-tool-sep" />
                    <div className="rd-tool-group">
                        <button className="rd-tool-btn" onClick={() => manualZoom('out')} title="Zoom out">{I.zoomOut}</button>
                        <span className="rd-zoom-label">{Math.round(canvasScale * 100)}%</span>
                        <button className="rd-tool-btn" onClick={() => manualZoom('in')} title="Zoom in">{I.zoomIn}</button>
                    </div>
                </div>

                <div className="rd-header-right">
                    <button className="rd-tool-btn" onClick={downloadPNG} title="Download as PNG">{I.download}</button>
                    <button className="rd-tool-btn" onClick={toggleFullscreen} title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
                        {isFullscreen ? I.compress : I.expand}
                    </button>
                    <button
                        className={`rd-save-btn${saveStatus === 'saved' ? ' rd-saved' : saveStatus === 'error' ? ' rd-save-err' : ''}`}
                        onClick={handleSave}
                        disabled={saveStatus === 'saving'}
                    >
                        {I.save}
                        <span>{saveStatus === 'saving' ? 'Saving\u2026' : saveStatus === 'saved' ? 'Saved!' : saveStatus === 'error' ? 'Error' : 'Save'}</span>
                    </button>
                </div>
            </header>

            {/* ═══ BODY ═══ */}
            <div className="rd-body">

                {/* ── LEFT SIDEBAR ── */}
                <aside className="rd-sidebar rd-sidebar-left">
                    <div className="rd-sidebar-tabs">
                        {[['personal', 'Personal'], ['layout', 'Layout'], ['shapes', 'Shapes']].map(([k, label]) => (
                            <button key={k} className={`rd-stab${activeTab === k ? ' rd-stab-on' : ''}`} onClick={() => setActiveTab(k)}>
                                {label}
                            </button>
                        ))}
                    </div>

                    <div className="rd-sidebar-scroll">
                        {activeTab === 'personal' && (
                            <Section title="Contact & Identity" id="contact" collapsed={collapsedSects} toggle={toggleSection}>
                                {personalBtns.map(({ label, type, icon }) => (
                                    <ElemRow key={type} icon={I[icon]} label={label} onClick={() => addText(type)} />
                                ))}
                            </Section>
                        )}

                        {activeTab === 'layout' && (
                            <Section title="Content Blocks" id="blocks" collapsed={collapsedSects} toggle={toggleSection}>
                                {layoutBtns.map(({ label, type, icon }) => (
                                    <ElemRow key={type} icon={I[icon]} label={label} onClick={() => addText(type)} />
                                ))}
                            </Section>
                        )}

                        {activeTab === 'shapes' && (<>
                            <Section title="Shapes & Lines" id="shapes" collapsed={collapsedSects} toggle={toggleSection}>
                                {[['divider', 'Accent Divider'], ['rect', 'Box / Card'], ['circle', 'Circle'], ['line', 'Separator Line']].map(([t, l]) => (
                                    <ElemRow key={t} icon={I[t]} label={l} onClick={() => addShape(t)} />
                                ))}
                            </Section>
                            <Section title="Images" id="images" collapsed={collapsedSects} toggle={toggleSection}>
                                <label className="rd-elem-row rd-elem-upload">
                                    {I.bg}
                                    <span>Background Image</span>
                                    <input type="file" accept="image/*" onChange={handleBgUpload} hidden />
                                </label>
                                <label className="rd-elem-row rd-elem-upload">
                                    {I.image}
                                    <span>Profile Photo</span>
                                    <input type="file" accept="image/*" onChange={handleImgUpload} hidden />
                                </label>
                            </Section>
                        </>)}
                    </div>

                    <div className="rd-sidebar-footer">
                        <div className="rd-footer-label">Object Actions</div>
                        <div className="rd-obj-actions">
                            <button className="rd-obj-btn" onClick={bringToFront} title="Bring to front">{I.front}<span>Front</span></button>
                            <button className="rd-obj-btn" onClick={sendToBack} title="Send to back">{I.back2}<span>Back</span></button>
                            <button className="rd-obj-btn rd-obj-danger" onClick={deleteSelected}>{I.trash}<span>Delete</span></button>
                            <button className="rd-obj-btn rd-obj-warn" onClick={clearCanvas}>{I.clear}<span>Clear</span></button>
                        </div>
                    </div>
                </aside>

                {/* ── CANVAS ── */}
                <main ref={canvasAreaRef} className="rd-canvas-area">
                    <div className="rd-canvas-frame" style={{ width: Math.round(CANVAS_W * canvasScale), height: Math.round(CANVAS_H * canvasScale) }}>
                        <div style={{ transform: `scale(${canvasScale})`, transformOrigin: 'top left', width: CANVAS_W, height: CANVAS_H }}>
                            <canvas ref={canvasRef} />
                        </div>
                    </div>
                </main>

                {/* ── RIGHT SIDEBAR ── */}
                <aside className="rd-sidebar rd-sidebar-right">
                    <div className="rd-sidebar-tabs">
                        {[['properties', 'Properties'], ['data', 'Resume Data']].map(([k, label]) => (
                            <button key={k} className={`rd-stab${rightTab === k ? ' rd-stab-on' : ''}`} onClick={() => setRightTab(k)}>
                                {label}
                            </button>
                        ))}
                    </div>

                    <div className="rd-sidebar-scroll">
                        {rightTab === 'properties' && (<>
                            {!isText && (
                                <div className="rd-empty-state">
                                    {I.cursor}
                                    <p>{selectedEl ? 'Select a text element to edit its properties' : 'Click an element on the canvas'}</p>
                                </div>
                            )}
                            {isText && (
                                <div className="rd-props-panel">
                                    <div className="rd-prop-group">
                                        <label className="rd-prop-label">Content</label>
                                        <textarea className="rd-textarea" rows={2} value={textContent}
                                            onChange={e => { setTextContent(e.target.value); set('text', e.target.value); }} />
                                    </div>
                                    <div className="rd-prop-group">
                                        <label className="rd-prop-label">Typography</label>
                                        <div className="rd-prop-row">
                                            <select className="rd-select" value={fontFamily}
                                                onChange={e => { setFontFamily(e.target.value); set('fontFamily', e.target.value); }}>
                                                {FONT_FAMILIES.map(f => <option key={f} value={f}>{f}</option>)}
                                            </select>
                                            <div className="rd-num-input">
                                                <button onClick={() => { const s = Math.max(6, fontSize - 1); setFontSize(s); set('fontSize', s); }}>&minus;</button>
                                                <input type="number" value={fontSize} min="6" max="200"
                                                    onChange={e => { const s = parseInt(e.target.value) || 12; setFontSize(s); set('fontSize', s); }} />
                                                <button onClick={() => { const s = Math.min(200, fontSize + 1); setFontSize(s); set('fontSize', s); }}>+</button>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="rd-prop-group">
                                        <label className="rd-prop-label">Style</label>
                                        <div className="rd-style-bar">
                                            <button className={`rd-style-btn${fontWeight === 'bold' ? ' rd-style-on' : ''}`}
                                                onClick={() => { const v = fontWeight === 'bold' ? 'normal' : 'bold'; setFontWeight(v); set('fontWeight', v); }}
                                                title="Bold"><b>B</b></button>
                                            <button className={`rd-style-btn${fontStyle === 'italic' ? ' rd-style-on' : ''}`}
                                                onClick={() => { const v = fontStyle === 'italic' ? 'normal' : 'italic'; setFontStyle(v); set('fontStyle', v); }}
                                                title="Italic"><i>I</i></button>
                                            <div className="rd-style-divider" />
                                            <button className="rd-style-btn" title="Align left"  onClick={() => set('textAlign', 'left')}>
                                                <svg viewBox="0 0 16 16" fill="currentColor" width="12" height="12"><path d="M2 3h12v1.5H2zm0 4h8v1.5H2zm0 4h10v1.5H2z"/></svg>
                                            </button>
                                            <button className="rd-style-btn" title="Center" onClick={() => set('textAlign', 'center')}>
                                                <svg viewBox="0 0 16 16" fill="currentColor" width="12" height="12"><path d="M2 3h12v1.5H2zm2 4h8v1.5H4zm1 4h6v1.5H5z"/></svg>
                                            </button>
                                            <button className="rd-style-btn" title="Align right" onClick={() => set('textAlign', 'right')}>
                                                <svg viewBox="0 0 16 16" fill="currentColor" width="12" height="12"><path d="M2 3h12v1.5H2zm4 4h8v1.5H6zm2 4h6v1.5H8z"/></svg>
                                            </button>
                                        </div>
                                    </div>
                                    <div className="rd-prop-group">
                                        <label className="rd-prop-label">Color</label>
                                        <div className="rd-color-row">
                                            <input type="color" className="rd-color-input" value={fontColor}
                                                onChange={e => { setFontColor(e.target.value); set('fill', e.target.value); }} />
                                            <span className="rd-color-hex">{fontColor.toUpperCase()}</span>
                                        </div>
                                        <div className="rd-swatches">
                                            {PRESET_COLORS.map(c => (
                                                <button key={c} title={c}
                                                    className={`rd-swatch${fontColor === c ? ' rd-swatch-active' : ''}`}
                                                    style={{ background: c, boxShadow: c === '#ffffff' ? 'inset 0 0 0 1px #e2e8f0' : 'none' }}
                                                    onClick={() => { setFontColor(c); set('fill', c); }} />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>)}

                        {rightTab === 'data' && resumeData?.personal_info && (
                            <div className="rd-data-panel">
                                <p className="rd-data-hint">Click any field to insert it onto the canvas</p>
                                {[
                                    ['Name',     stripHtml(resumeData.personal_info.full_name)],
                                    ['Title',    stripHtml(resumeData.personal_info.job_title)],
                                    ['Email',    stripHtml(resumeData.personal_info.email)],
                                    ['Phone',    stripHtml(resumeData.personal_info.phone)],
                                    ['Location', stripHtml(resumeData.personal_info.location)],
                                    ['LinkedIn', stripHtml(resumeData.personal_info.linkedin)],
                                    ['GitHub',   stripHtml(resumeData.personal_info.github)],
                                ].filter(([, v]) => v).map(([label, value]) => (
                                    <button key={label} className="rd-data-row"
                                        onClick={() => {
                                            const t = new fabric.IText(value, { left: 60, top: 80, fontFamily: 'Arial', fontSize: 13, fill: '#1e293b' });
                                            fabricRef.current.add(t);
                                            fabricRef.current.setActiveObject(t);
                                            fabricRef.current.renderAll();
                                        }}>
                                        <span className="rd-data-key">{label}</span>
                                        <span className="rd-data-val">{value}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="rd-sidebar-tips">
                        <div className="rd-tips-title">Shortcuts</div>
                        <div className="rd-tips-grid">
                            <kbd>Ctrl+Z</kbd><span>Undo</span>
                            <kbd>Ctrl+Y</kbd><span>Redo</span>
                            <kbd>Del</kbd><span>Delete</span>
                            <kbd>Ctrl+S</kbd><span>Save</span>
                        </div>
                    </div>
                </aside>
            </div>

            <ConfirmDialog
                isOpen={confirmDialog.isOpen}
                title={confirmDialog.title}
                message={confirmDialog.message}
                onConfirm={confirmDialog.onConfirm}
                onCancel={() => setConfirmDialog(p => ({ ...p, isOpen: false }))}
                confirmVariant={confirmDialog.variant}
            />
        </div>
    );
};

/* ── Sub-components ────────────────────────────────────────── */

function Section({ title, id, collapsed, toggle, children }) {
    const isOpen = !collapsed[id];
    return (
        <div className="rd-section">
            <button className="rd-section-head" onClick={() => toggle(id)}>
                <span className="rd-section-chevron" style={{ transform: isOpen ? 'rotate(0)' : 'rotate(-90deg)' }}>
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" width="10" height="10"><path d="M4 6l4 4 4-4"/></svg>
                </span>
                <span>{title}</span>
            </button>
            {isOpen && <div className="rd-section-body">{children}</div>}
        </div>
    );
}

function ElemRow({ icon, label, onClick }) {
    return (
        <button className="rd-elem-row" onClick={onClick}>
            <span className="rd-elem-icon">{icon}</span>
            <span className="rd-elem-label">{label}</span>
            <svg className="rd-elem-add" viewBox="0 0 16 16" fill="currentColor" width="12" height="12"><path d="M8 4a.5.5 0 01.5.5v3h3a.5.5 0 010 1h-3v3a.5.5 0 01-1 0v-3h-3a.5.5 0 010-1h3v-3A.5.5 0 018 4z"/></svg>
        </button>
    );
}

export default ResumeDesigner;