import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fabric } from 'fabric';
import { certificateApi, programApi } from '../../../services/api';
import ConfirmDialog from '../../../components/ConfirmDialog';
import '../../../styles/CertificateDesigner.css';

const CertificateDesigner = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const canvasRef = useRef(null);
    const fabricCanvasRef = useRef(null);
    const canvasAreaRef = useRef(null);
    const designerRef = useRef(null);

    const [layoutName, setLayoutName] = useState('');
    const [selectedProgram, setSelectedProgram] = useState('');
    const [programs, setPrograms] = useState([]);
    const [isDefault, setIsDefault] = useState(false);
    const [selectedElement, setSelectedElement] = useState(null);
    const [templates, setTemplates] = useState([]);
    const [showTemplates, setShowTemplates] = useState(false);
    const [isCanvasFullscreen, setIsCanvasFullscreen] = useState(false);
    const [canvasScale, setCanvasScale] = useState(1);
    const CANVAS_W = 1000;
    const CANVAS_H = 700;

    const [confirmDialog, setConfirmDialog] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: null,
        variant: 'danger'
    });

    // Text properties
    const [textContent, setTextContent] = useState('');
    const [fontSize, setFontSize] = useState(24);
    const [fontFamily, setFontFamily] = useState('Arial');
    const [fontColor, setFontColor] = useState('#000000');
    const [fontWeight, setFontWeight] = useState('normal');
    const [fontStyle, setFontStyle] = useState('normal');

    // --- Helper Functions ---

    const loadBackgroundImage = (url) => {
        if (!url || !fabricCanvasRef.current) return;

        // Handle data URLs or regular URLs
        fabric.Image.fromURL(url, (img) => {
            if (!img) return;

            // scale to fit canvas width (assuming standard width)
            img.scaleToWidth(1000);

            // If image is too tall, scale to height maybe?
            // For now, mirroring logic from handleBackgroundUpload roughly

            fabricCanvasRef.current.setBackgroundImage(img, fabricCanvasRef.current.renderAll.bind(fabricCanvasRef.current), {
                originX: 'left',
                originY: 'top',
            });
        }, { crossOrigin: 'anonymous' });
    };

    const updateElementProperties = () => {
        if (fabricCanvasRef.current) {
            fabricCanvasRef.current.renderAll();
        }
    };

    const getFallbackTemplateData = (name = 'Certificate Template') => ({
        version: '5.3.0',
        objects: [
            {
                type: 'rect',
                left: 30,
                top: 30,
                width: 940,
                height: 640,
                fill: '',
                stroke: '#2c3e50',
                strokeWidth: 4,
                rx: 12,
                ry: 12,
            },
            {
                type: 'i-text',
                left: 500,
                top: 90,
                text: name,
                fontSize: 36,
                fontFamily: 'Georgia',
                fontWeight: 'bold',
                fill: '#2c3e50',
                textAlign: 'center',
                originX: 'center',
            },
            {
                type: 'i-text',
                left: 500,
                top: 170,
                text: '{student_name}',
                fontSize: 48,
                fontFamily: 'Times New Roman',
                fontWeight: 'bold',
                fill: '#1f2937',
                textAlign: 'center',
                originX: 'center',
            },
            {
                type: 'i-text',
                left: 500,
                top: 235,
                text: '{course_name}',
                fontSize: 28,
                fontFamily: 'Arial',
                fontWeight: 'bold',
                fill: '#374151',
                textAlign: 'center',
                originX: 'center',
            },
            {
                type: 'i-text',
                left: 500,
                top: 275,
                text: '{program_name} • {academic_year}',
                fontSize: 20,
                fontFamily: 'Arial',
                fill: '#4b5563',
                textAlign: 'center',
                originX: 'center',
            },
            {
                type: 'i-text',
                left: 500,
                top: 338,
                text: 'Exam Marks: {exam_marks}',
                fontSize: 22,
                fontFamily: 'Arial',
                fill: '#2563eb',
                textAlign: 'center',
                originX: 'center',
            },
            {
                type: 'i-text',
                left: 500,
                top: 374,
                text: 'Assignment Marks: {assignment_marks}',
                fontSize: 22,
                fontFamily: 'Arial',
                fill: '#0ea5e9',
                textAlign: 'center',
                originX: 'center',
            },
            {
                type: 'i-text',
                left: 500,
                top: 430,
                text: '{final_marks}',
                fontSize: 28,
                fontFamily: 'Georgia',
                fontWeight: 'bold',
                fill: '#111827',
                textAlign: 'center',
                originX: 'center',
            },
            {
                type: 'i-text',
                left: 110,
                top: 620,
                text: '{date}',
                fontSize: 14,
                fontFamily: 'Arial',
                fill: '#6b7280',
            },
            {
                type: 'i-text',
                left: 730,
                top: 620,
                text: '{certificate_number}',
                fontSize: 14,
                fontFamily: 'Arial',
                fill: '#6b7280',
            },
        ],
    });

    const normalizeTemplateData = (content, fallbackName = 'Certificate Template') => {
        if (!content) return getFallbackTemplateData(fallbackName);

        let parsed = content;
        if (typeof content === 'string') {
            parsed = JSON.parse(content);
        }

        if (parsed && Array.isArray(parsed.objects) && parsed.objects.length > 0) {
            return parsed;
        }

        // Legacy HTML-based template payloads are not directly renderable in Fabric
        return getFallbackTemplateData(fallbackName);
    };

    const handleSelection = (e) => {
        const obj = e.selected[0];
        setSelectedElement(obj);

        if (obj.type === 'i-text' || obj.type === 'text') {
            setTextContent(obj.text);
            setFontSize(obj.fontSize);
            setFontFamily(obj.fontFamily);
            setFontColor(obj.fill);
            setFontWeight(obj.fontWeight);
            setFontStyle(obj.fontStyle);
        }
    };

    const initCanvas = () => {
        const canvas = new fabric.Canvas(canvasRef.current, {
            width: 1000,
            height: 700,
            backgroundColor: '#ffffff',
        });

        fabricCanvasRef.current = canvas;

        canvas.on('selection:created', handleSelection);
        canvas.on('selection:updated', handleSelection);
        canvas.on('selection:cleared', () => setSelectedElement(null));
        canvas.on('object:modified', updateElementProperties);
    };

    const loadPrograms = async () => {
        try {
            const data = await programApi.getAll();
            setPrograms(data);
        } catch (err) {
            console.error('Error loading programs:', err);
        }
    };

    const loadTemplates = async () => {
        try {
            const data = await certificateApi.getAll();
            setTemplates(data);
        } catch (err) {
            console.error('Error loading templates:', err);
        }
    };

    const loadLayout = async (layoutId) => {
        try {
            const data = await certificateApi.getOne(layoutId);

            setLayoutName(data.layout_name);
            setSelectedProgram(data.program_id);
            setIsDefault(data.is_default);

            if (data.template_content) {
                const templateData = normalizeTemplateData(data.template_content, data.layout_name || 'Certificate Layout');
                fabricCanvasRef.current.clear();
                fabricCanvasRef.current.backgroundColor = '#ffffff';
                fabricCanvasRef.current.loadFromJSON(templateData, () => {
                    fabricCanvasRef.current.renderAll();
                });
            }

            if (data.background_image) {
                loadBackgroundImage(data.background_image);
            }
        } catch (err) {
            console.error('Error loading layout:', err);
        }
    };

    const loadTemplate = (template) => {
        setConfirmDialog({
            isOpen: true,
            title: 'Load Template',
            message: `Load template "${template.layout_name}"? This will replace your current design.`,
            variant: 'warning',
            onConfirm: () => {
                setLayoutName(template.layout_name + ' (Copy)');

                if (template.template_content) {
                    const templateData = normalizeTemplateData(template.template_content, template.layout_name || 'Certificate Layout');
                    fabricCanvasRef.current.clear();
                    fabricCanvasRef.current.backgroundColor = '#ffffff';
                    fabricCanvasRef.current.loadFromJSON(templateData, () => {
                        fabricCanvasRef.current.renderAll();
                    });
                }

                if (template.background_image) {
                    loadBackgroundImage(template.background_image);
                }

                setShowTemplates(false);
                setConfirmDialog(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    // --- Effects ---

    useEffect(() => {
        loadPrograms();
        loadTemplates();
        initCanvas();

        return () => {
            if (fabricCanvasRef.current) {
                fabricCanvasRef.current.dispose();
            }
        };
    }, []);  // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (id) {
            loadLayout(id);
        }
    }, [id]);  // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsCanvasFullscreen(!!document.fullscreenElement);
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    useEffect(() => {
        if (!canvasAreaRef.current) return;
        const ro = new ResizeObserver(entries => {
            const { width, height } = entries[0].contentRect;
            const pad = 48;
            const sx = (width  - pad * 2) / CANVAS_W;
            const sy = (height - pad * 2) / CANVAS_H;
            setCanvasScale(Math.max(0.15, Math.min(sx, sy, 1)));
        });
        ro.observe(canvasAreaRef.current);
        return () => ro.disconnect();
    }, []);  // eslint-disable-line react-hooks/exhaustive-deps

    // --- Action Functions ---

    const addText = (type = 'normal') => {
        let text;

        const options = {
            left: 100,
            top: 100,
            fontSize: 24,
            fontFamily: 'Arial',
            fill: '#000000',
        };

        switch (type) {
            case 'student_name':
                text = new fabric.IText('{student_name}', {
                    ...options,
                    fontSize: 36,
                    fontWeight: 'bold',
                    fill: '#2563eb',
                });
                break;
            case 'program_name':
                text = new fabric.IText('{program_name}', {
                    ...options,
                    fontSize: 28,
                    fontWeight: 'bold',
                });
                break;
            case 'course_name':
                text = new fabric.IText('{course_name}', {
                    ...options,
                    fontSize: 26,
                    fontWeight: 'bold',
                    fill: '#1a1a1a',
                });
                break;
            case 'academic_year':
                text = new fabric.IText('{academic_year}', {
                    ...options,
                    fontSize: 20,
                    fontStyle: 'italic',
                    fill: '#4b5563',
                });
                break;
            case 'final_marks':
                text = new fabric.IText('{final_marks}', {
                    ...options,
                    fontSize: 32,
                    fontWeight: 'bold',
                    fill: '#10b981',
                });
                break;
            case 'exam_marks':
                text = new fabric.IText('{exam_marks}', {
                    ...options,
                    fontSize: 24,
                    fontWeight: 'bold',
                    fill: '#2563eb',
                });
                break;
            case 'assignment_marks':
                text = new fabric.IText('{assignment_marks}', {
                    ...options,
                    fontSize: 24,
                    fontWeight: 'bold',
                    fill: '#0ea5e9',
                });
                break;
            case 'date':
                text = new fabric.IText('{date}', { ...options, fontSize: 18 });
                break;
            case 'certificate_number':
                text = new fabric.IText('{certificate_number}', { ...options, fontSize: 16 });
                break;
            default:
                text = new fabric.IText('Double click to edit', options);
        }

        fabricCanvasRef.current.add(text);
        fabricCanvasRef.current.setActiveObject(text);
        fabricCanvasRef.current.renderAll();
    };

    const addShape = (type) => {
        let shape;

        switch (type) {
            case 'rectangle':
                shape = new fabric.Rect({
                    left: 100,
                    top: 100,
                    width: 200,
                    height: 100,
                    fill: 'transparent',
                    stroke: '#000000',
                    strokeWidth: 2,
                });
                break;
            case 'circle':
                shape = new fabric.Circle({
                    left: 100,
                    top: 100,
                    radius: 50,
                    fill: 'transparent',
                    stroke: '#000000',
                    strokeWidth: 2,
                });
                break;
            case 'line':
                shape = new fabric.Line([50, 100, 200, 100], {
                    stroke: '#000000',
                    strokeWidth: 2,
                });
                break;
            default:
                break;
        }

        if (shape) {
            fabricCanvasRef.current.add(shape);
            fabricCanvasRef.current.setActiveObject(shape);
            fabricCanvasRef.current.renderAll();
        }
    };

    const handleBackgroundUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            fabric.Image.fromURL(event.target.result, (img) => {
                img.scaleToWidth(1000);
                img.scaleToHeight(700);
                fabricCanvasRef.current.setBackgroundImage(img, fabricCanvasRef.current.renderAll.bind(fabricCanvasRef.current), {
                    originX: 'left',
                    originY: 'top',
                });
            });
        };
        reader.readAsDataURL(file);
    };

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            fabric.Image.fromURL(event.target.result, (img) => {
                img.scaleToWidth(200);
                img.set({
                    left: 100,
                    top: 100,
                });
                fabricCanvasRef.current.add(img);
                fabricCanvasRef.current.setActiveObject(img);
                fabricCanvasRef.current.renderAll();
            });
        };
        reader.readAsDataURL(file);
    };

    const deleteSelected = () => {
        const activeObjects = fabricCanvasRef.current.getActiveObjects();
        if (activeObjects.length) {
            activeObjects.forEach(obj => fabricCanvasRef.current.remove(obj));
            fabricCanvasRef.current.discardActiveObject();
            fabricCanvasRef.current.renderAll();
        }
    };

    const bringToFront = () => {
        const activeObject = fabricCanvasRef.current.getActiveObject();
        if (activeObject) {
            fabricCanvasRef.current.bringToFront(activeObject);
            fabricCanvasRef.current.renderAll();
        }
    };

    const sendToBack = () => {
        const activeObject = fabricCanvasRef.current.getActiveObject();
        if (activeObject) {
            fabricCanvasRef.current.sendToBack(activeObject);
            fabricCanvasRef.current.renderAll();
        }
    };

    const clearCanvas = () => {
        setConfirmDialog({
            isOpen: true,
            title: 'Clear Canvas',
            message: 'Are you sure you want to clear the entire canvas?',
            variant: 'danger',
            onConfirm: () => {
                fabricCanvasRef.current.clear();
                fabricCanvasRef.current.backgroundColor = '#ffffff';
                fabricCanvasRef.current.renderAll();
                setConfirmDialog(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const handleSave = async () => {
        if (!layoutName.trim()) {
            alert('Please enter a layout name');
            return;
        }

        const templateContent = JSON.stringify(fabricCanvasRef.current.toJSON());
        const backgroundImage = fabricCanvasRef.current.backgroundImage ?
            fabricCanvasRef.current.backgroundImage.getSrc() : null;

        const data = {
            layout_name: layoutName,
            program_id: selectedProgram || null,
            template_content: templateContent,
            background_image: backgroundImage,
            is_default: isDefault,
        };

        try {
            if (id) {
                await certificateApi.update(id, data);
            } else {
                await certificateApi.create(data);
            }
            alert('Certificate layout saved successfully!');
            navigate('/admin/certificates');
        } catch (err) {
            console.error('Error saving layout:', err);
            alert('Error saving certificate layout');
        }
    };

    const toggleCanvasFullscreen = async () => {
        try {
            if (!document.fullscreenElement) {
                await designerRef.current?.requestFullscreen();
            } else {
                await document.exitFullscreen();
            }
        } catch (err) {
            console.error('Error toggling fullscreen:', err);
        }
    };

    const ELEMENT_BTNS = [
        { label: 'Free Text',    type: 'normal',             icon: 'T'  },
        { label: 'Student Name', type: 'student_name',       icon: '●' },
        { label: 'Course',       type: 'course_name',        icon: '≡' },
        { label: 'Program',      type: 'program_name',       icon: '△' },
        { label: 'Acad. Year',   type: 'academic_year',      icon: '▦' },
        { label: 'Final Marks',  type: 'final_marks',        icon: '⭐' },
        { label: 'Exam Marks',   type: 'exam_marks',         icon: '▦' },
        { label: 'Assignment',   type: 'assignment_marks',   icon: '≡' },
        { label: 'Issue Date',   type: 'date',               icon: '▦' },
        { label: 'Cert No.',     type: 'certificate_number', icon: '#'  },
    ];

    const PRESET_COLORS = ['#000000','#ffffff','#c0392b','#2980b9','#27ae60','#8e44ad','#f39c12','#2c3e50'];

    const VARIABLES = [
        ['{{student_name}}',      'Student name'],
        ['{{course_name}}',       'Course name'],
        ['{{program_name}}',      'Program'],
        ['{{academic_year}}',     'Academic year'],
        ['{{exam_marks}}',        'Exam marks'],
        ['{{assignment_marks}}',  'Assignment marks'],
        ['{{final_marks}}',       'Final marks'],
        ['{{issue_date}}',        'Issue date'],
        ['{{certificate_number}}','Cert ID'],
    ];

    return (
        <div ref={designerRef} className={`cd-root${isCanvasFullscreen ? ' cd-fullscreen' : ''}`}>

            {/* ── Header ── */}
            <div className="cd-header">
                <div className="cd-header-left">
                    <h2 className="cd-title">{id ? 'Edit' : 'New'} Certificate Layout</h2>
                    {layoutName && <span className="cd-name-pill">{layoutName}</span>}
                </div>
                <div className="cd-header-right">
                    <button className="cd-btn cd-btn-ghost" onClick={() => setShowTemplates(v => !v)}>
                        ≡ Templates
                    </button>
                    <button className="cd-btn cd-btn-ghost" onClick={toggleCanvasFullscreen}>
                        {isCanvasFullscreen ? '⤡ Exit' : '⤢ Full Screen'}
                    </button>
                    <button className="cd-btn cd-btn-ghost" onClick={() => navigate('/admin/certificates')}>
                        Cancel
                    </button>
                    <button className="cd-btn cd-btn-save" onClick={handleSave}>
                        ▪ Save Layout
                    </button>
                </div>
            </div>

            {/* ── Template Overlay ── */}
            {showTemplates && (
                <div className="cd-overlay" onClick={() => setShowTemplates(false)}>
                    <div className="cd-tpl-panel" onClick={e => e.stopPropagation()}>
                        <div className="cd-tpl-header">
                            <span className="cd-tpl-title">≡ Choose a Template</span>
                            <button className="cd-close-btn" onClick={() => setShowTemplates(false)}>✕</button>
                        </div>
                        <div className="cd-tpl-grid">
                            {templates.map((tpl, i) => (
                                <div key={tpl.id} className="cd-tpl-card" onClick={() => { loadTemplate(tpl); setShowTemplates(false); }}>
                                    <div className="cd-tpl-swatch" style={{ background: `hsl(${(i * 47) % 360},55%,50%)` }} />
                                    <div className="cd-tpl-info">
                                        <div className="cd-tpl-name">{tpl.layout_name}</div>
                                        <div className="cd-tpl-hint">Click to apply →</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ── Main 3-column layout ── */}
            <div className="cd-body">

                {/* LEFT: Elements Panel */}
                <div className="cd-side cd-left">

                    <div className="cd-section">
                        <div className="cd-section-hd">Text Elements</div>
                        <div className="cd-elem-grid">
                            {ELEMENT_BTNS.map(({ label, type, icon }) => (
                                <button key={type} className="cd-elem-btn" onClick={() => addText(type)}>
                                    <span className="cd-elem-icon">{icon}</span>
                                    <span className="cd-elem-lbl">{label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="cd-section">
                        <div className="cd-section-hd">Shapes</div>
                        <div className="cd-elem-grid cd-elem-grid-3">
                            <button className="cd-elem-btn" onClick={() => addShape('rectangle')}>
                                <span className="cd-elem-icon">▭</span>
                                <span className="cd-elem-lbl">Rect</span>
                            </button>
                            <button className="cd-elem-btn" onClick={() => addShape('circle')}>
                                <span className="cd-elem-icon">◯</span>
                                <span className="cd-elem-lbl">Circle</span>
                            </button>
                            <button className="cd-elem-btn" onClick={() => addShape('line')}>
                                <span className="cd-elem-icon">─</span>
                                <span className="cd-elem-lbl">Line</span>
                            </button>
                        </div>
                    </div>

                    <div className="cd-section">
                        <div className="cd-section-hd">Images</div>
                        <div className="cd-elem-grid cd-elem-grid-2">
                            <label className="cd-elem-btn">
                                <span className="cd-elem-icon">▢</span>
                                <span className="cd-elem-lbl">Background</span>
                                <input type="file" accept="image/*" onChange={handleBackgroundUpload} style={{ display: 'none' }} />
                            </label>
                            <label className="cd-elem-btn">
                                <span className="cd-elem-icon">▢</span>
                                <span className="cd-elem-lbl">Logo</span>
                                <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
                            </label>
                        </div>
                    </div>

                    <div className="cd-section">
                        <div className="cd-section-hd">Canvas Actions</div>
                        <div className="cd-action-row">
                            <button className="cd-act-btn cd-act-front" onClick={bringToFront} title="Bring to front">⬆ Front</button>
                            <button className="cd-act-btn cd-act-back"  onClick={sendToBack}   title="Send to back">⬇ Back</button>
                        </div>
                        <div className="cd-action-row">
                            <button className="cd-act-btn cd-act-del"   onClick={deleteSelected} title="Delete selected">⊘ Delete</button>
                            <button className="cd-act-btn cd-act-clear" onClick={clearCanvas}    title="Clear all">⊘ Clear All</button>
                        </div>
                    </div>
                </div>

                {/* CENTER: Canvas */}
                <div ref={canvasAreaRef} className="cd-canvas-area">
                    <div
                        className="cd-canvas-inner"
                        style={{ width: Math.round(CANVAS_W * canvasScale), height: Math.round(CANVAS_H * canvasScale) }}
                    >
                        <div
                            className="cd-canvas-wrap"
                            style={{ transform: `scale(${canvasScale})`, transformOrigin: 'top left', width: CANVAS_W, height: CANVAS_H }}
                        >
                            <canvas ref={canvasRef} />
                        </div>
                    </div>
                    {!selectedElement && (
                        <div className="cd-canvas-hint">← Add elements from the left panel</div>
                    )}
                </div>

                {/* RIGHT: Properties Panel */}
                <div className="cd-side cd-right">

                    {/* Layout Settings */}
                    <div className="cd-section">
                        <div className="cd-section-hd">⚙ Layout Settings</div>
                        <div className="cd-field">
                            <label>Layout Name</label>
                            <input type="text" value={layoutName} onChange={e => setLayoutName(e.target.value)} placeholder="e.g. Gold Prestige" />
                        </div>
                        <div className="cd-field">
                            <label>Program</label>
                            <select value={selectedProgram} onChange={e => setSelectedProgram(e.target.value)}>
                                <option value="">All Programs</option>
                                {programs.map(prog => (
                                    <option key={prog.id} value={prog.id}>{prog.program_name}</option>
                                ))}
                            </select>
                        </div>
                        <label className="cd-check-label">
                            <input type="checkbox" checked={isDefault} onChange={e => setIsDefault(e.target.checked)} />
                            Set as default for program
                        </label>
                    </div>

                    {/* Text Properties — shown only when text element selected */}
                    {selectedElement && (selectedElement.type === 'i-text' || selectedElement.type === 'text') ? (
                        <div className="cd-section cd-text-props">
                            <div className="cd-section-hd cd-section-hd-active">✏ Text Properties</div>

                            <div className="cd-field">
                                <label>Content</label>
                                <input type="text" value={textContent} onChange={e => {
                                    setTextContent(e.target.value);
                                    selectedElement.set('text', e.target.value);
                                    fabricCanvasRef.current.renderAll();
                                }} />
                            </div>

                            <div className="cd-field-row">
                                <div className="cd-field cd-field-grow">
                                    <label>Font</label>
                                    <select value={fontFamily} onChange={e => {
                                        setFontFamily(e.target.value);
                                        selectedElement.set('fontFamily', e.target.value);
                                        fabricCanvasRef.current.renderAll();
                                    }}>
                                        {['Arial','Georgia','Times New Roman','Verdana','Trebuchet MS','Palatino','Garamond','Courier New'].map(f => (
                                            <option key={f} value={f}>{f}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="cd-field cd-field-size">
                                    <label>Size</label>
                                    <div className="cd-spinner">
                                        <button onClick={() => {
                                            const s = Math.max(8, Number(fontSize) - 2);
                                            setFontSize(s);
                                            selectedElement.set('fontSize', s);
                                            fabricCanvasRef.current.renderAll();
                                        }}>−</button>
                                        <input type="number" value={fontSize} min="8" max="200" onChange={e => {
                                            const s = parseInt(e.target.value) || 24;
                                            setFontSize(s);
                                            selectedElement.set('fontSize', s);
                                            fabricCanvasRef.current.renderAll();
                                        }} />
                                        <button onClick={() => {
                                            const s = Math.min(200, Number(fontSize) + 2);
                                            setFontSize(s);
                                            selectedElement.set('fontSize', s);
                                            fabricCanvasRef.current.renderAll();
                                        }}>+</button>
                                    </div>
                                </div>
                            </div>

                            <div className="cd-field">
                                <label>Style &amp; Align</label>
                                <div className="cd-fmt-bar">
                                    <button className={`cd-fmt-btn${fontWeight === 'bold' ? ' cd-fmt-on' : ''}`} onClick={() => {
                                        const v = fontWeight === 'bold' ? 'normal' : 'bold';
                                        setFontWeight(v);
                                        selectedElement.set('fontWeight', v);
                                        fabricCanvasRef.current.renderAll();
                                    }}><b>B</b></button>
                                    <button className={`cd-fmt-btn${fontStyle === 'italic' ? ' cd-fmt-on' : ''}`} onClick={() => {
                                        const v = fontStyle === 'italic' ? 'normal' : 'italic';
                                        setFontStyle(v);
                                        selectedElement.set('fontStyle', v);
                                        fabricCanvasRef.current.renderAll();
                                    }}><i>I</i></button>
                                    <div className="cd-fmt-sep" />
                                    {[['left','◀'],['center','≡'],['right','▶']].map(([align, icon]) => (
                                        <button key={align} className="cd-fmt-btn" title={`Align ${align}`} onClick={() => {
                                            selectedElement.set('textAlign', align);
                                            fabricCanvasRef.current.renderAll();
                                        }}>{icon}</button>
                                    ))}
                                </div>
                            </div>

                            <div className="cd-field">
                                <label>Color</label>
                                <div className="cd-color-bar">
                                    <input type="color" value={fontColor} onChange={e => {
                                        setFontColor(e.target.value);
                                        selectedElement.set('fill', e.target.value);
                                        fabricCanvasRef.current.renderAll();
                                    }} />
                                    <span className="cd-hex">{fontColor.toUpperCase()}</span>
                                </div>
                                <div className="cd-swatches">
                                    {PRESET_COLORS.map(c => (
                                        <button key={c} className={`cd-swatch${fontColor === c ? ' cd-swatch-on' : ''}`}
                                            style={{ background: c, border: c === '#ffffff' ? '1px solid #ccc' : 'none' }}
                                            onClick={() => {
                                                setFontColor(c);
                                                selectedElement.set('fill', c);
                                                fabricCanvasRef.current.renderAll();
                                            }} />
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="cd-no-selection">
                            <div className="cd-no-sel-icon">◇</div>
                            <div>Select an element on the canvas to edit its properties</div>
                        </div>
                    )}

                    {/* Variables reference */}
                    <div className="cd-section cd-vars-section">
                        <div className="cd-section-hd">※ Variables</div>
                        <div className="cd-vars">
                            {VARIABLES.map(([v, d]) => (
                                <div key={v} className="cd-var">
                                    <code>{v}</code>
                                    <span>{d}</span>
                                </div>
                            ))}
                        </div>
                        <div className="cd-tips">
                            <div>✦ Double-click text to edit inline</div>
                            <div>✦ <kbd>Del</kbd> removes selection</div>
                            <div>✦ Drag handles to resize</div>
                        </div>
                    </div>

                </div>
            </div>

            <ConfirmDialog
                isOpen={confirmDialog.isOpen}
                title={confirmDialog.title}
                message={confirmDialog.message}
                onConfirm={confirmDialog.onConfirm}
                onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                confirmVariant={confirmDialog.variant}
            />
        </div>
    );
};

export default CertificateDesigner;
