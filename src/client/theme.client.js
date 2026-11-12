/**
 * Direct HTTP calls to server theme endpoints (/api/v1/themes)
 */

import { sharedAPI as api } from './app.client.js';

export const themeService = {
    /** The six seeded built-in presets (public) */
    async getPresets() {
        return await api.get('/themes/presets');
    },

    /** Community gallery of public themes */
    async getPublicThemes(params = {}) {
        return await api.get('/themes/public', { params });
    },

    /** Themes owned by the current user */
    async getMyThemes() {
        return await api.get('/themes');
    },

    async getTheme(themeId) {
        return await api.get(`/themes/${themeId}`);
    },

    /** Create a theme. tokens is the full token document; forkedFrom optional */
    async createTheme({ name, slug, description = '', visibility = 'private', tokens, forkedFrom }) {
        return await api.post('/themes', { name, slug, description, visibility, tokens, forkedFrom });
    },

    async updateTheme(themeId, updates) {
        return await api.put(`/themes/${themeId}`, updates);
    },

    async deleteTheme(themeId) {
        return await api.delete(`/themes/${themeId}`);
    },

    /** Server-side fork (presets and non-private themes) */
    async forkTheme(themeId, overrides = {}) {
        return await api.post(`/themes/${themeId}/fork`, overrides);
    }
};

export default themeService;
