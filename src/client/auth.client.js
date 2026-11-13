import { sharedAPI as api, API_BASE_URL, refreshCsrfToken } from './app.client.js';
import axios from 'axios';

// Simple auth service - just API calls
export const authService = {
    async login(credentials) {
        const response = await api.post('/auth/login', credentials);
        // Refresh CSRF token after login (server may issue new one)
        await refreshCsrfToken();
        return response;
    },

    async signup(userData) {
        const response = await api.post('/auth/signup', userData);
        // Refresh CSRF token after signup (server may issue new one)
        await refreshCsrfToken();
        return response;
    },

    async logout() {
        return await api.post('/auth/logout');
    },

    async getUserProfile() {
        return await api.get('/auth/me');
    },

    async forgotPassword(email) {
        return await api.post('/auth/forgot-password', { email });
    },

    async resetPassword(resetData) {
        const { token, newPassword } = resetData;
        return await api.post(`/auth/reset-password/${token}`, { newPassword });
    },

    async sendVerificationEmail() {
        return await api.post('/auth/send-verification-email');
    },

    async get2FAStatus() {
        return await api.get('/auth/2fa/status');
    },

    async getDevices() {
        return await api.get('/auth/devices');
    },

    async setup2FA() {
        return await api.post('/auth/2fa/setup');
    },

    async verifySetup2FA(token, password) {
        return await api.post('/auth/2fa/verify-setup', { token, password });
    },

    async disable2FA(password, twoFactorToken) {
        return await api.post('/auth/2fa/disable', { password, token: twoFactorToken });
    },

    async getBackupCodes(password, twoFactorToken) {
        return await api.post('/auth/2fa/backup-codes', { password, token: twoFactorToken });
    },

    async requestRoleElevation(requestedRoles, reason = '') {
        return await api.post('/auth/roles/request-elevation', { roles: requestedRoles, reason });
    },

    async getPendingRoleRequests(params = {}) {
        return await api.get('/auth/roles/pending-requests', { params });
    },

    async approveRoleRequest(userId, approvalData = {}) {
        return await api.post(`/auth/roles/approve/${userId}`, approvalData);
    },

    async rejectRoleRequest(userId, reason = '') {
        return await api.post(`/auth/roles/reject/${userId}`, { reason });
    },

    async refreshToken() {
        try {
            return await api.post('/auth/refresh-token');
        } catch (error) {
            throw error;
        }
    }
};

export default authService;
