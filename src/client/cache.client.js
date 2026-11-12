/**
 * Direct HTTP calls to server cache management endpoints
 */

import { sharedAPI as api } from './app.client.js';

export const cacheService = {
    async getStats() {
        return await api.get('/cache/stats');
    },

    async clearCache() {
        return await api.delete('/cache');
    },

    async getCleanupStatus() {
        return await api.get('/cache/cleanup');
    },

    async triggerCleanup() {
        return await api.post('/cache/cleanup');
    },

    async getCacheHealth() {
        return await api.get('/cache/health');
    }
};

export default cacheService;
