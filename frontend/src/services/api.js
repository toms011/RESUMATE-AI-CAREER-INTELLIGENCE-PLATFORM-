/**
 * Centralised API service layer.
 * Re-exports the base axios instance and defines domain-specific API helpers.
 */
import axiosInstance from '../utils/api';

export default axiosInstance;

// ── Certificate Layouts ─────────────────────────────────────────────────────
export const certificateApi = {
    getAll: async () => {
        const res = await axiosInstance.get('/api/certificates');
        return res.data;
    },
    getOne: async (id) => {
        const res = await axiosInstance.get(`/api/certificates/${id}`);
        return res.data;
    },
    create: async (data) => {
        const res = await axiosInstance.post('/api/certificates', data);
        return res.data;
    },
    update: async (id, data) => {
        const res = await axiosInstance.put(`/api/certificates/${id}`, data);
        return res.data;
    },
    delete: async (id) => {
        const res = await axiosInstance.delete(`/api/certificates/${id}`);
        return res.data;
    },
};

// ── Programs ────────────────────────────────────────────────────────────────
export const programApi = {
    getAll: async () => {
        const res = await axiosInstance.get('/api/programs');
        return res.data;
    },
    getOne: async (id) => {
        const res = await axiosInstance.get(`/api/programs/${id}`);
        return res.data;
    },
};

// ── Resume Design (Fabric.js canvas) ────────────────────────────────────────
export const resumeDesignApi = {
    getResume: async (id) => {
        const res = await axiosInstance.get(`/resume/${id}`);
        return res.data;
    },
    saveCanvasDesign: async (id, canvasJson) => {
        const res = await axiosInstance.post(`/resume/${id}`, { canvas_design: canvasJson });
        return res.data;
    },
};
