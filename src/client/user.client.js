/**
 * Direct HTTP calls to server user endpoints
 */

import { sharedAPI as api } from './app.client.js';

export const userService = {
    async getProfile() {
        return await api.get('/auth/me'); // Profile is handled by auth endpoint
    },

    async updateProfile(profileData) {
        // Get current user ID first, then update via users/:id
        const profile = await this.getProfile();
        const user = profile?.data?.user || profile?.user || {};
        return await api.put(`/users/${user._id || user.id}`, profileData);
    },

    async getUsers(params = {}) {
        return await api.get('/users', { params });
    },

    async getPublicUsers(params = {}) {
        return await api.get('/users/public', { params });
    },

    async getUserById(userId) {
        return await api.get(`/users/${userId}`);
    },

    async updateUser(userId, userData) {
        return await api.put(`/users/${userId}`, userData);
    },

    async deleteUser(userId) {
        return await api.delete(`/users/${userId}`);
    },

    async getStats(params = {}) {
        return await api.get('/users/stats/overview', { params });
    },

    async getUserStatsByUserId(userId, params = {}) {
        return await api.get(`/users/${userId}/stats`, { params });
    },

    // Role request management (owner only)
    async getRoleRequests(params = {}) {
        return await api.get('/auth/roles/pending-requests', { params });
    },

    async approveRoleRequest(userId, reason = '') {
        return await api.post(`/auth/roles/approve/${userId}`, { reason });
    },

    async rejectRoleRequest(userId, reason = '') {
        return await api.post(`/auth/roles/reject/${userId}`, { reason });
    },

    async createRoleRequest(roleData) {
        return await api.post('/auth/roles/request-elevation', roleData);
    }
};

export default userService;
