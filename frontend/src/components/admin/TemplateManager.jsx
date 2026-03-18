import React, { useState, useEffect, useRef } from 'react';
import api from '../../utils/api';
import { toast } from 'react-hot-toast';

const DEFAULT_SECTION_ORDER = ['HeaderSection', 'SummarySection', 'ExperienceSection', 'EducationSection', 'SkillsSection'];
const DEFAULT_PADDING = { top: 15, left: 18, right: 18, bottom: 15 };

const TemplateManager = () => {
    const [templates, setTemplates] = useState([]);
    const [isEditing, setIsEditing] = useState(false);
    const [currentTemplate, setCurrentTemplate] = useState(null);
    const [loading, setLoading] = useState(true);
    const [bgUploading, setBgUploading] = useState(false);
    const [bgPreview, setBgPreview] = useState(null);
    const bgInputRef = useRef(null);

    useEffect(() => { fetchTemplates(); }, []);

    const fetchTemplates = async () => {
        try {
            const response = await api.get('/templates');
            setTemplates(response.data);
        } catch (error) {
            toast.error('Failed to load templates');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = () => {
        setCurrentTemplate({
            name: '',
            description: '',
            thumbnail_url: '',
            section_order: DEFAULT_SECTION_ORDER,
            styles: {},
            is_active: true,
            template_type: 'ATS',
            background_image: null,
            content_padding: { ...DEFAULT_PADDING },
        });
        setBgPreview(null);
        setIsEditing(true);
    };

    const handleEdit = (template) => {
        setCurrentTemplate({ ...template });
        setBgPreview(template.background_image
            ? `http://localhost:5000${template.background_image}`
            : null);
        setIsEditing(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Deactivate this template?')) return;
        try {
            await api.delete(`/templates/${id}`);
            toast.success('Template deactivated');
            fetchTemplates();
        } catch {
            toast.error('Failed to deactivate template');
        }
    };

    // ── Background image upload ──────────────────────────────────────────────
    const handleBgImageSelect = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
        if (!allowedTypes.includes(file.type)) {
            toast.error('Only JPG and PNG images are allowed');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            toast.error('Image must be under 5 MB');
            return;
        }

        // Local preview
        const reader = new FileReader();
        reader.onload = (ev) => setBgPreview(ev.target.result);
        reader.readAsDataURL(file);

        // Upload to server
        setBgUploading(true);
        try {
            const formData = new FormData();
            formData.append('image', file);
            // Do NOT set Content-Type manually — axios must auto-generate
            // multipart/form-data with the correct boundary
            const res = await api.post('/templates/upload-background', formData);
            setCurrentTemplate(prev => ({ ...prev, background_image: res.data.url }));
            toast.success('Background image uploaded');
        } catch (err) {
            toast.error(err.response?.data?.error || 'Upload failed');
            setBgPreview(null);
        } finally {
            setBgUploading(false);
        }
    };

    // ── Save template ────────────────────────────────────────────────────────
    const handleSave = async (e) => {
        e.preventDefault();

        // Validate DESIGN templates have a background image
        if (currentTemplate.template_type === 'DESIGN' && !currentTemplate.background_image) {
            toast.error('Please upload a background image for Design templates');
            return;
        }

        try {
            const parsedSectionOrder = typeof currentTemplate.section_order === 'string'
                ? JSON.parse(currentTemplate.section_order)
                : currentTemplate.section_order;
            const parsedStyles = typeof currentTemplate.styles === 'string'
                ? JSON.parse(currentTemplate.styles)
                : currentTemplate.styles;

            const dataToSave = {
                ...currentTemplate,
                section_order: parsedSectionOrder,
                styles: parsedStyles,
            };

            if (currentTemplate.id) {
                await api.put(`/templates/${currentTemplate.id}`, dataToSave);
                toast.success('Template updated');
            } else {
                await api.post('/templates', dataToSave);
                toast.success('Template created');
            }
            setIsEditing(false);
            fetchTemplates();
        } catch (error) {
            console.error(error);
            toast.error('Error saving template — check JSON fields');
        }
    };

    const updatePadding = (side, value) => {
        setCurrentTemplate(prev => ({
            ...prev,
            content_padding: { ...(prev.content_padding || DEFAULT_PADDING), [side]: Number(value) },
        }));
    };

    if (loading) return <div className="p-6 text-gray-500">Loading templates...</div>;

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6 text-gray-800">Template Manager</h1>

            {!isEditing ? (
                <>
                    <button
                        onClick={handleCreate}
                        className="bg-blue-600 text-white px-4 py-2 rounded mb-6 hover:bg-blue-700 font-medium"
                    >
                        + Add New Template
                    </button>

                    {/* ── Template grid split by type ── */}
                    {['ATS', 'DESIGN'].map(type => {
                        const group = templates.filter(t => (t.template_type || 'ATS') === type);
                        if (group.length === 0) return null;
                        return (
                            <div key={type} className="mb-8">
                                <div className="flex items-center gap-3 mb-4">
                                    <h2 className="text-lg font-semibold text-gray-700">
                                        {type === 'ATS' ? '✓ ATS Templates' : '◆ Design Templates'}
                                    </h2>
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                                        ${type === 'ATS' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'}`}>
                                        {group.length}
                                    </span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                    {group.map(t => (
                                        <div key={t.id} className="border rounded-xl p-4 shadow-sm bg-white hover:shadow-md transition-shadow">
                                            {/* Preview */}
                                            <div className="h-32 rounded-lg mb-3 overflow-hidden bg-gray-100 flex items-center justify-center relative">
                                                {t.background_image ? (
                                                    <img
                                                        src={`http://localhost:5000${t.background_image}`}
                                                        alt={t.name}
                                                        className="object-cover h-full w-full"
                                                        onError={e => { e.target.style.display = 'none'; }}
                                                    />
                                                ) : t.thumbnail_url ? (
                                                    <img src={t.thumbnail_url} alt={t.name} className="object-cover h-full w-full" />
                                                ) : (
                                                    <span className="text-4xl">{type === 'ATS' ? '▤' : '▢'}</span>
                                                )}
                                                {/* Type badge overlay */}
                                                <span className={`absolute top-2 right-2 text-xs px-2 py-0.5 rounded-full font-bold
                                                    ${type === 'ATS' ? 'bg-green-500 text-white' : 'bg-purple-500 text-white'}`}>
                                                    {type}
                                                </span>
                                            </div>
                                            <h3 className="font-bold text-gray-800">{t.name}</h3>
                                            <p className="text-gray-500 text-sm mb-3 line-clamp-2">{t.description}</p>
                                            <div className="flex gap-3">
                                                <button onClick={() => handleEdit(t)} className="text-blue-600 hover:underline text-sm font-medium">Edit</button>
                                                <button onClick={() => handleDelete(t.id)} className="text-red-500 hover:underline text-sm font-medium">Deactivate</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}

                    {templates.length === 0 && (
                        <p className="text-gray-400 text-center py-12">No templates yet. Create one above.</p>
                    )}
                </>
            ) : (
                <form onSubmit={handleSave} className="bg-white p-6 rounded-xl shadow-md max-w-2xl space-y-5">
                    <h2 className="text-xl font-bold text-gray-800">
                        {currentTemplate.id ? 'Edit Template' : 'New Template'}
                    </h2>

                    {/* ── Template type selector ── */}
                    <div>
                        <label className="block text-sm font-semibold mb-2 text-gray-700">Template Type</label>
                        <div className="flex gap-3">
                            {['ATS', 'DESIGN'].map(type => (
                                <button
                                    key={type}
                                    type="button"
                                    onClick={() => setCurrentTemplate(prev => ({ ...prev, template_type: type }))}
                                    className={`flex-1 py-2.5 rounded-lg border-2 font-semibold text-sm transition-all
                                        ${currentTemplate.template_type === type
                                            ? (type === 'ATS' ? 'border-green-500 bg-green-50 text-green-700' : 'border-purple-500 bg-purple-50 text-purple-700')
                                            : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                                >
                                    {type === 'ATS' ? '✓ ATS Safe' : '◆ Design Template'}
                                </button>
                            ))}
                        </div>
                        {currentTemplate.template_type === 'DESIGN' && (
                            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded p-2 mt-2">
                                ⚠ Design templates use a decorative background image. Users will be warned about reduced ATS compatibility.
                            </p>
                        )}
                    </div>

                    {/* ── Name ── */}
                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-700">Name</label>
                        <input
                            type="text"
                            className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-blue-300 outline-none"
                            value={currentTemplate.name}
                            onChange={e => setCurrentTemplate(prev => ({ ...prev, name: e.target.value }))}
                            required
                        />
                    </div>

                    {/* ── Description ── */}
                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-700">Description</label>
                        <textarea
                            className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-blue-300 outline-none resize-none"
                            rows={2}
                            value={currentTemplate.description || ''}
                            onChange={e => setCurrentTemplate(prev => ({ ...prev, description: e.target.value }))}
                        />
                    </div>

                    {/* ── Background image (DESIGN only) ── */}
                    {currentTemplate.template_type === 'DESIGN' && (
                        <div>
                            <label className="block text-sm font-semibold mb-2 text-gray-700">
                                Background Image <span className="text-red-500">*</span>
                            </label>
                            <p className="text-xs text-gray-500 mb-3">
                                JPG or PNG · Recommended: 1240×1754 px (A4) · Max 5 MB
                            </p>

                            {/* Upload area */}
                            <div
                                onClick={() => bgInputRef.current?.click()}
                                className={`relative border-2 border-dashed rounded-xl cursor-pointer transition-colors
                                    ${bgPreview ? 'border-purple-400' : 'border-gray-300 hover:border-purple-400'}`}
                            >
                                {bgPreview ? (
                                    <div className="relative h-48 rounded-xl overflow-hidden">
                                        <img src={bgPreview} alt="Background preview" className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                            <span className="text-white font-medium text-sm">Click to replace</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="h-32 flex flex-col items-center justify-center text-gray-400">
                                        <span className="text-3xl mb-2">▢</span>
                                        <span className="text-sm font-medium">Click to upload background image</span>
                                    </div>
                                )}
                                {bgUploading && (
                                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-xl">
                                        <span className="text-purple-600 font-medium animate-pulse">Uploading...</span>
                                    </div>
                                )}
                            </div>
                            <input
                                ref={bgInputRef}
                                type="file"
                                accept="image/jpeg,image/jpg,image/png"
                                className="hidden"
                                onChange={handleBgImageSelect}
                            />
                            {currentTemplate.background_image && (
                                <p className="text-xs text-green-600 mt-1">✓ Saved: {currentTemplate.background_image}</p>
                            )}

                            {/* Content padding */}
                            <div className="mt-4">
                                <label className="block text-sm font-semibold mb-2 text-gray-700">Content Padding (mm)</label>
                                <div className="grid grid-cols-4 gap-3">
                                    {['top', 'left', 'right', 'bottom'].map(side => (
                                        <div key={side}>
                                            <label className="block text-xs text-gray-500 mb-1 capitalize">{side}</label>
                                            <input
                                                type="number"
                                                min="0"
                                                max="60"
                                                className="w-full border rounded-lg p-2 text-center focus:ring-2 focus:ring-purple-300 outline-none"
                                                value={(currentTemplate.content_padding || DEFAULT_PADDING)[side] ?? 15}
                                                onChange={e => updatePadding(side, e.target.value)}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Section Order ── */}
                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-700">Section Order (JSON Array)</label>
                        <textarea
                            className="w-full border rounded-lg p-2.5 font-mono text-sm h-24 focus:ring-2 focus:ring-blue-300 outline-none"
                            value={typeof currentTemplate.section_order === 'string'
                                ? currentTemplate.section_order
                                : JSON.stringify(currentTemplate.section_order, null, 2)}
                            onChange={e => setCurrentTemplate(prev => ({ ...prev, section_order: e.target.value }))}
                        />
                        <p className="text-xs text-gray-400 mt-1">Example: ["HeaderSection", "SummarySection", ...]</p>
                    </div>

                    {/* ── Styles ── */}
                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-700">Styles (JSON Object)</label>
                        <textarea
                            className="w-full border rounded-lg p-2.5 font-mono text-sm h-32 focus:ring-2 focus:ring-blue-300 outline-none"
                            value={typeof currentTemplate.styles === 'string'
                                ? currentTemplate.styles
                                : JSON.stringify(currentTemplate.styles, null, 2)}
                            onChange={e => setCurrentTemplate(prev => ({ ...prev, styles: e.target.value }))}
                        />
                        <p className="text-xs text-gray-400 mt-1">{"{"}"accentColor": "#ff0000", "fontFamily": "Arial"{"}"}</p>
                    </div>

                    {/* ── Actions ── */}
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => setIsEditing(false)}
                            className="px-5 py-2.5 border rounded-lg hover:bg-gray-50 text-gray-600 font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                        >
                            Save Template
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
};

export default TemplateManager;
