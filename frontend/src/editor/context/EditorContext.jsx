/**
 * EditorContext — Layered state management for the Resume Editor
 *
 * State layers:
 *   1. resumeData      — Content from backend (personal info, experiences, etc.)
 *   2. templateConfig   — Base template config from admin/DB
 *   3. layoutOverrides  — User's section ordering, visibility tweaks
 *   4. styleOverrides   — User's font, color, spacing tweaks
 *
 * Final Render = resumeData + templateConfig + layoutOverrides + styleOverrides
 */
import React, { createContext, useContext, useReducer, useCallback, useEffect, useMemo } from 'react';
import api from '../../utils/api';
import { TEMPLATES as LOCAL_TEMPLATES } from '../../utils/templates';

// ─── Initial State ──────────────────────────────────────────
const initialState = {
  // Resume content
  resumeData: {
    title: '',
    personalInfo: {},
    experiences: [],
    education: [],
    skills: [],
    additionalDetails: {},
  },

  // Template base config (from DB)
  templateConfig: {
    id: 1,
    name: '',
    sectionOrder: ['HeaderSection', 'SummarySection', 'ExperienceSection', 'EducationSection', 'SkillsSection'],
    styles: {},
    layoutConfig: {},
  },

  // User layout overrides
  layoutOverrides: {
    sectionOrder: null,        // null = use template default
    sectionVisibility: {       // true = visible
      HeaderSection: true,
      SummarySection: true,
      ExperienceSection: true,
      EducationSection: true,
      SkillsSection: true,
    },
  },

  // User style overrides
  styleOverrides: {
    fontFamily: null,          // null = use template default
    fontScale: 1.0,
    accentColor: null,
    headerColor: null,
    spacing: null,             // 'compact' | 'balanced' | 'spacious' | null
    lineHeight: null,
    margins: null,             // { top, bottom, left, right } in mm
  },

  // Editor UI state
  editorMode: 'preview',      // 'preview' | 'layout' | 'style'
  selectedSection: null,
  zoom: 1.0,
  isDirty: false,
  isLoading: true,
  isSaving: false,
  error: null,

  // Available templates (fetched list)
  availableTemplates: [],
};

// ─── Action Types ───────────────────────────────────────────
const ACTIONS = {
  // Data loading
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  LOAD_RESUME_DATA: 'LOAD_RESUME_DATA',
  LOAD_TEMPLATES: 'LOAD_TEMPLATES',
  SET_TEMPLATE: 'SET_TEMPLATE',

  // Resume data mutations
  UPDATE_PERSONAL_INFO: 'UPDATE_PERSONAL_INFO',
  UPDATE_EXPERIENCE: 'UPDATE_EXPERIENCE',
  UPDATE_EDUCATION: 'UPDATE_EDUCATION',
  UPDATE_SKILL: 'UPDATE_SKILL',

  // Layout overrides
  SET_SECTION_ORDER: 'SET_SECTION_ORDER',
  TOGGLE_SECTION_VISIBILITY: 'TOGGLE_SECTION_VISIBILITY',
  MOVE_SECTION: 'MOVE_SECTION',

  // Style overrides
  SET_STYLE_OVERRIDE: 'SET_STYLE_OVERRIDE',
  SET_SPACING_PRESET: 'SET_SPACING_PRESET',
  RESET_STYLES: 'RESET_STYLES',

  // Editor UI
  SET_EDITOR_MODE: 'SET_EDITOR_MODE',
  SET_SELECTED_SECTION: 'SET_SELECTED_SECTION',
  SET_ZOOM: 'SET_ZOOM',
  SET_SAVING: 'SET_SAVING',
  MARK_CLEAN: 'MARK_CLEAN',
  ZOOM_IN: 'ZOOM_IN',
  ZOOM_OUT: 'ZOOM_OUT',
};

// ─── Spacing Presets ────────────────────────────────────────
const SPACING_PRESETS = {
  compact: {
    fontScale: 0.9,
    lineHeight: 1.15,
    margins: { top: 12, bottom: 12, left: 12, right: 12 },
    sectionSpacing: 8,
    paragraphSpacing: 3,
  },
  balanced: {
    fontScale: 1.0,
    lineHeight: 1.3,
    margins: { top: 20, bottom: 20, left: 20, right: 20 },
    sectionSpacing: 14,
    paragraphSpacing: 6,
  },
  spacious: {
    fontScale: 1.05,
    lineHeight: 1.5,
    margins: { top: 25, bottom: 25, left: 25, right: 25 },
    sectionSpacing: 20,
    paragraphSpacing: 10,
  },
};

// ─── Reducer ────────────────────────────────────────────────
function editorReducer(state, action) {
  switch (action.type) {
    case ACTIONS.SET_LOADING:
      return { ...state, isLoading: action.payload };

    case ACTIONS.SET_ERROR:
      return { ...state, error: action.payload, isLoading: false };

    case ACTIONS.LOAD_RESUME_DATA:
      return {
        ...state,
        resumeData: action.payload,
        isLoading: false,
        isDirty: false,
      };

    case ACTIONS.LOAD_TEMPLATES: {
      const templates = action.payload;
      // If we already have a templateConfig.id set but it wasn't resolved because
      // availableTemplates was empty, try to resolve it now
      const pendingId = state.templateConfig.id;
      const match = templates.find(t => t.id === pendingId);
      if (match && !state.templateConfig.name) {
        return {
          ...state,
          availableTemplates: templates,
          templateConfig: {
            id: match.id,
            name: match.name,
            sectionOrder: match.sectionOrder || match.section_order || ['HeaderSection', 'SummarySection', 'ExperienceSection', 'EducationSection', 'SkillsSection'],
            styles: match.styles || {},
            layoutConfig: match.layout_config || match.layoutConfig || {},
          },
        };
      }
      return { ...state, availableTemplates: templates };
    }

    case ACTIONS.SET_TEMPLATE: {
      // Search available templates first, then fall back to local templates
      let template = state.availableTemplates.find(t => t.id === action.payload);
      if (!template) {
        // Fallback: use local template definitions
        template = LOCAL_TEMPLATES.find(t => t.id === action.payload);
      }
      if (!template) {
        // Last resort: use first available or first local
        template = state.availableTemplates[0] || LOCAL_TEMPLATES[0];
      }
      if (!template) return state;
      return {
        ...state,
        templateConfig: {
          id: template.id,
          name: template.name,
          sectionOrder: template.sectionOrder || template.section_order || ['HeaderSection', 'SummarySection', 'ExperienceSection', 'EducationSection', 'SkillsSection'],
          styles: template.styles || {},
          layoutConfig: template.layout_config || template.layoutConfig || {},
        },
        // Reset overrides when switching template
        layoutOverrides: {
          ...state.layoutOverrides,
          sectionOrder: null,
        },
        isDirty: true,
      };
    }

    case ACTIONS.UPDATE_PERSONAL_INFO:
      return {
        ...state,
        resumeData: {
          ...state.resumeData,
          personalInfo: {
            ...state.resumeData.personalInfo,
            [action.payload.field]: action.payload.value,
          },
        },
        isDirty: true,
      };

    case ACTIONS.UPDATE_EXPERIENCE:
      return {
        ...state,
        resumeData: {
          ...state.resumeData,
          experiences: state.resumeData.experiences.map(exp =>
            exp.id === action.payload.id
              ? { ...exp, [action.payload.field]: action.payload.value }
              : exp
          ),
        },
        isDirty: true,
      };

    case ACTIONS.UPDATE_EDUCATION:
      return {
        ...state,
        resumeData: {
          ...state.resumeData,
          education: state.resumeData.education.map(edu =>
            edu.id === action.payload.id
              ? { ...edu, [action.payload.field]: action.payload.value }
              : edu
          ),
        },
        isDirty: true,
      };

    case ACTIONS.UPDATE_SKILL:
      return {
        ...state,
        resumeData: {
          ...state.resumeData,
          skills: state.resumeData.skills.map(skill =>
            skill.id === action.payload.id
              ? { ...skill, [action.payload.field]: action.payload.value }
              : skill
          ),
        },
        isDirty: true,
      };

    case ACTIONS.SET_SECTION_ORDER:
      return {
        ...state,
        layoutOverrides: {
          ...state.layoutOverrides,
          sectionOrder: action.payload,
        },
        isDirty: true,
      };

    case ACTIONS.TOGGLE_SECTION_VISIBILITY:
      return {
        ...state,
        layoutOverrides: {
          ...state.layoutOverrides,
          sectionVisibility: {
            ...state.layoutOverrides.sectionVisibility,
            [action.payload]: !state.layoutOverrides.sectionVisibility[action.payload],
          },
        },
        isDirty: true,
      };

    case ACTIONS.MOVE_SECTION: {
      const { fromIndex, toIndex } = action.payload;
      const currentOrder = state.layoutOverrides.sectionOrder
        || state.templateConfig.sectionOrder
        || [];
      const newOrder = [...currentOrder];
      const [moved] = newOrder.splice(fromIndex, 1);
      newOrder.splice(toIndex, 0, moved);
      return {
        ...state,
        layoutOverrides: {
          ...state.layoutOverrides,
          sectionOrder: newOrder,
        },
        isDirty: true,
      };
    }

    case ACTIONS.SET_STYLE_OVERRIDE:
      return {
        ...state,
        styleOverrides: {
          ...state.styleOverrides,
          [action.payload.key]: action.payload.value,
        },
        isDirty: true,
      };

    case ACTIONS.SET_SPACING_PRESET: {
      const preset = SPACING_PRESETS[action.payload];
      if (!preset) return state;
      return {
        ...state,
        styleOverrides: {
          ...state.styleOverrides,
          fontScale: preset.fontScale,
          lineHeight: preset.lineHeight,
          margins: preset.margins,
          spacing: action.payload,
        },
        isDirty: true,
      };
    }

    case ACTIONS.RESET_STYLES:
      return {
        ...state,
        styleOverrides: { ...initialState.styleOverrides },
        isDirty: true,
      };

    case ACTIONS.SET_EDITOR_MODE:
      return {
        ...state,
        editorMode: action.payload,
        selectedSection: action.payload === 'preview' ? null : state.selectedSection,
      };

    case ACTIONS.SET_SELECTED_SECTION:
      return { ...state, selectedSection: action.payload };

    case ACTIONS.SET_ZOOM:
      return { ...state, zoom: Math.max(0.25, Math.min(2.0, action.payload)) };

    case ACTIONS.SET_SAVING:
      return { ...state, isSaving: action.payload };

    case ACTIONS.MARK_CLEAN:
      return { ...state, isDirty: false, isSaving: false };

    case ACTIONS.ZOOM_IN:
      return { ...state, zoom: Math.max(0.25, Math.min(2.0, state.zoom + 0.1)) };

    case ACTIONS.ZOOM_OUT:
      return { ...state, zoom: Math.max(0.25, Math.min(2.0, state.zoom - 0.1)) };

    default:
      return state;
  }
}

// ─── Context ────────────────────────────────────────────────
const EditorContext = createContext(null);

export function EditorProvider({ resumeId, children }) {
  const [state, dispatch] = useReducer(editorReducer, initialState);

  // ── Computed: Merged config (template + overrides) — all memoized ──
  const mergedSectionOrder = useMemo(
    () => state.layoutOverrides.sectionOrder || state.templateConfig.sectionOrder || [],
    [state.layoutOverrides.sectionOrder, state.templateConfig.sectionOrder]
  );

  const visibleSections = useMemo(
    () => mergedSectionOrder.filter(s => state.layoutOverrides.sectionVisibility[s] !== false),
    [mergedSectionOrder, state.layoutOverrides.sectionVisibility]
  );

  const mergedStyles = useMemo(() => ({
    ...state.templateConfig.styles,
    ...(state.styleOverrides.fontFamily  && { fontFamily:   state.styleOverrides.fontFamily }),
    ...(state.styleOverrides.accentColor && { accentColor:  state.styleOverrides.accentColor }),
    ...(state.styleOverrides.headerColor && { headerColor:  state.styleOverrides.headerColor }),
  }), [
    state.templateConfig.styles,
    state.styleOverrides.fontFamily,
    state.styleOverrides.accentColor,
    state.styleOverrides.headerColor,
  ]);

  const effectiveFontScale  = state.styleOverrides.fontScale  ?? 1.0;
  const effectiveLineHeight = state.styleOverrides.lineHeight ?? 1.3;
  // Memoize margins so it's not a new object reference on every render
  const effectiveMargins = useMemo(
    () => state.styleOverrides.margins ?? { top: 20, bottom: 20, left: 20, right: 20 },
    [state.styleOverrides.margins]
  );

  // ── Load resume data ──
  const loadResumeData = useCallback(async () => {
    if (!resumeId) return;
    dispatch({ type: ACTIONS.SET_LOADING, payload: true });
    try {
      const response = await api.get(`/resume/${resumeId}`);
      const d = response.data;
      dispatch({
        type: ACTIONS.LOAD_RESUME_DATA,
        payload: {
          title: d.title || '',
          personalInfo: d.personal_info || {},
          experiences: d.experiences || [],
          education: d.education || [],
          skills: d.skills || [],
          additionalDetails: {},
          designSettings: d.design_settings || {},
        },
      });

      // Set the template from resume data
      if (d.design_settings?.template) {
        dispatch({ type: ACTIONS.SET_TEMPLATE, payload: Number(d.design_settings.template) });
      }
    } catch (err) {
      dispatch({ type: ACTIONS.SET_ERROR, payload: err.message });
    }
  }, [resumeId]);

  // ── Load available templates ──
  const loadTemplates = useCallback(async () => {
    try {
      const response = await api.get('/templates');
      if (response.data && Array.isArray(response.data) && response.data.length > 0) {
        dispatch({ type: ACTIONS.LOAD_TEMPLATES, payload: response.data });
      } else {
        console.warn('API returned empty templates, using local fallback');
        dispatch({ type: ACTIONS.LOAD_TEMPLATES, payload: LOCAL_TEMPLATES });
      }
    } catch (err) {
      console.error('Failed to load templates, using local fallback:', err);
      dispatch({ type: ACTIONS.LOAD_TEMPLATES, payload: LOCAL_TEMPLATES });
    }
  }, []);

  // ── Init: load data + templates ──
  useEffect(() => {
    const init = async () => {
      await loadTemplates();
      await loadResumeData();
    };
    init();
  }, [loadTemplates, loadResumeData]);

  // ── Save resume data ──
  const saveResumeData = useCallback(async () => {
    if (!resumeId) return;
    dispatch({ type: ACTIONS.SET_SAVING, payload: true });
    try {
      const { personalInfo, experiences, education, skills } = state.resumeData;
      const user = JSON.parse(localStorage.getItem('user') || '{}');

      await api.post(`/resume/${resumeId}`, {
        title: state.resumeData.title,
        personal_info: personalInfo,
        experiences: experiences,
        education: education,
        skills: skills.map(s => (typeof s === 'string' ? { name: s } : s)),
        design_settings: {
          template: state.templateConfig.id,
          layoutOverrides: state.layoutOverrides,
          styleOverrides: state.styleOverrides,
        },
      });

      dispatch({ type: ACTIONS.MARK_CLEAN });
      return true;
    } catch (err) {
      dispatch({ type: ACTIONS.SET_SAVING, payload: false });
      console.error('Save failed:', err);
      return false;
    }
  }, [resumeId, state.resumeData, state.templateConfig.id, state.layoutOverrides, state.styleOverrides]);

  // ── Inline update handler (compatible with section components) ──
  const handleInlineUpdate = useCallback((section, itemId, field, value) => {
    switch (section) {
      case 'personal_info':
        dispatch({ type: ACTIONS.UPDATE_PERSONAL_INFO, payload: { field, value } });
        break;
      case 'experience':
        dispatch({ type: ACTIONS.UPDATE_EXPERIENCE, payload: { id: itemId, field, value } });
        break;
      case 'education':
        dispatch({ type: ACTIONS.UPDATE_EDUCATION, payload: { id: itemId, field, value } });
        break;
      case 'skills':
        dispatch({ type: ACTIONS.UPDATE_SKILL, payload: { id: itemId, field, value } });
        break;
      default:
        console.warn(`Unknown section: ${section}`);
    }
  }, []);

  // ── Action creators — memoized so consumers don't re-render due to new action refs ──
  const actions = useMemo(() => ({
    setEditorMode: (mode) => dispatch({ type: ACTIONS.SET_EDITOR_MODE, payload: mode }),
    setSelectedSection: (s) => dispatch({ type: ACTIONS.SET_SELECTED_SECTION, payload: s }),
    setZoom: (z) => dispatch({ type: ACTIONS.SET_ZOOM, payload: z }),
    zoomIn:  () => dispatch({ type: ACTIONS.ZOOM_IN }),
    zoomOut: () => dispatch({ type: ACTIONS.ZOOM_OUT }),
    zoomFit: () => dispatch({ type: ACTIONS.SET_ZOOM, payload: 1.0 }),

    setTemplate: (id) => dispatch({ type: ACTIONS.SET_TEMPLATE, payload: id }),
    toggleSectionVisibility: (name) => dispatch({ type: ACTIONS.TOGGLE_SECTION_VISIBILITY, payload: name }),
    moveSection: (from, to) => dispatch({ type: ACTIONS.MOVE_SECTION, payload: { fromIndex: from, toIndex: to } }),
    setSectionOrder: (order) => dispatch({ type: ACTIONS.SET_SECTION_ORDER, payload: order }),

    setStyleOverride: (key, value) => dispatch({ type: ACTIONS.SET_STYLE_OVERRIDE, payload: { key, value } }),
    setSpacingPreset: (preset) => dispatch({ type: ACTIONS.SET_SPACING_PRESET, payload: preset }),
    resetStyles: () => dispatch({ type: ACTIONS.RESET_STYLES }),

    handleInlineUpdate,
    saveResumeData,
    loadResumeData,
  }), [dispatch, handleInlineUpdate, saveResumeData, loadResumeData]);

  const value = useMemo(() => ({
    state,
    actions,
    mergedSectionOrder,
    visibleSections,
    mergedStyles,
    effectiveFontScale,
    effectiveLineHeight,
    effectiveMargins,
    SPACING_PRESETS,
  }), [state, actions, mergedSectionOrder, visibleSections, mergedStyles, effectiveFontScale, effectiveLineHeight, effectiveMargins]);

  return (
    <EditorContext.Provider value={value}>
      {children}
    </EditorContext.Provider>
  );
}

export function useEditor() {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error('useEditor must be used within EditorProvider');
  return ctx;
}

export { ACTIONS, SPACING_PRESETS };
export default EditorContext;
