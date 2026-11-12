import React, { createContext, useContext, useEffect, useState } from 'react';
import authService from '../client/auth.client';
import { useNotification } from './NotificationContext';

const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const { error: showError, success: showSuccess } = useNotification();

    // Simple initialization - just check if user is logged in
    useEffect(() => {
        const initAuth = async () => {
            try {
                const response = await authService.getUserProfile();
                setUser(response.user || response);
            } catch (error) {
                setUser(null);
            } finally {
                setIsLoading(false);
            }
        };

        initAuth();
    }, []);

    // Clear user state when the refresh interceptor gives up
    // (e.g. refresh token expired or all retries exhausted)
    useEffect(() => {
        const handleAuthFailure = () => setUser(null);
        window.addEventListener('authFailure', handleAuthFailure);
        return () => window.removeEventListener('authFailure', handleAuthFailure);
    }, []);

    // Simple login
    // Deliberately does NOT toggle the global isLoading: RouteAccessControl
    // unmounts the current page while it is true, which would destroy the
    // login form's state mid-flow (e.g. the 2FA step).
    const login = async (credentials) => {
        try {
            const response = await authService.login(credentials);
            // Password accepted but a 2FA code is still required — no session yet
            if (response.requiresTwoFactor) {
                return response;
            }
            setUser(response.user || response);
            return response;
        } catch (error) {
            showError(error.response?.data?.message || 'Login failed');
            throw error;
        }
    };

    // Simple signup
    const signup = async (userData) => {
        setIsLoading(true);
        try {
            const response = await authService.signup(userData);
            setUser(response.user || response);
            showSuccess('Account created successfully');
            return response;
        } catch (error) {
            showError(error.response?.data?.message || 'Signup failed');
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    // Simple logout
    const logout = async () => {
        try {
            await authService.logout();
        } catch (error) {
            // Continue with logout even if server call fails
        } finally {
            setUser(null);
            showSuccess('Logged out successfully');
        }
    };

    // Simple forgot password
    const forgotPassword = async (email) => {
        try {
            const response = await authService.forgotPassword(email);
            showSuccess('Password reset email sent');
            return response;
        } catch (error) {
            showError(error.response?.data?.message || 'Failed to send reset email');
            throw error;
        }
    };

    // Simple reset password
    const resetPassword = async (token, newPassword) => {
        setIsLoading(true);
        try {
            const response = await authService.resetPassword({ token, newPassword });
            setUser(response.user || response);
            showSuccess('Password reset successfully');
            return response;
        } catch (error) {
            showError(error.response?.data?.message || 'Password reset failed');
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    // Simple role checking
    const hasRole = (role) => {
        return user?.roles?.includes(role) || false;
    };

    const value = {
        user,
        isLoading,
        login,
        signup,
        logout,
        forgotPassword,
        resetPassword,
        hasRole,
        isAdmin: () => hasRole('ADMIN'),
        isOwner: () => hasRole('OWNER'),
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
