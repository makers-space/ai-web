import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@contexts/ThemeContext';
import { AuthProvider } from '@contexts/AuthContext';
import { NotificationProvider } from '@contexts/NotificationContext';

// Import all pages
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import AdminPage from './pages/AdminPage';
import DevicesPage from './pages/DevicesPage';
import SettingsPage from './pages/SettingsPage';
import ModelsPage from './pages/ModelsPage';
import ChatPage from './pages/ChatPage';
import { OllamaBanner } from './components/OllamaBanner';
import { GuideProvider, ActivityProvider } from './client/ai.client';
import DashboardPage from './pages/DashboardPage';

// Import Navigation and NotificationDisplay components
import { Navigation, NotificationDisplay, RouteAccessControl } from '@components/Components';
import AppNotifications from '@components/AppNotifications';

// Main App Router
function AppRouter() {
  return (
    <>
      <OllamaBanner />
      <Routes>
        {/* Authentication routes */}
        <Route path="/login" element={
          <RouteAccessControl path="/login">
            <LoginPage />
          </RouteAccessControl>
        } />
        <Route path="/signup" element={
          <RouteAccessControl path="/signup">
            <SignupPage />
          </RouteAccessControl>
        } />
        <Route path="/forgot-password" element={
          <RouteAccessControl path="/forgot-password">
            <ForgotPasswordPage />
          </RouteAccessControl>
        } />

        {/* Application routes - access control handled by RouteAccessControl */}
        <Route path="/" element={
          <RouteAccessControl path="/">
            <HomePage />
          </RouteAccessControl>
        } />
        <Route path="/admin" element={
          <RouteAccessControl path="/admin">
            <AdminPage />
          </RouteAccessControl>
        } />

        <Route path="/chat/:id?" element={
          <RouteAccessControl path="/chat">
            <ChatPage />
          </RouteAccessControl>
        } />
        <Route path="/models" element={
          <RouteAccessControl path="/models">
            <ModelsPage />
          </RouteAccessControl>
        } />
        <Route path="/devices" element={
          <RouteAccessControl path="/devices">
            <DevicesPage />
          </RouteAccessControl>
        } />
        <Route path="/settings" element={
          <RouteAccessControl path="/settings">
            <SettingsPage />
          </RouteAccessControl>
        } />

        {/* Fallback redirects */}
        <Route path="/dashboard" element={
          <RouteAccessControl path="/dashboard">
            <DashboardPage />
          </RouteAccessControl>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      
      {/* Global Navigation FAB */}
      <Navigation 
        position="top-right"
        draggable={true}
        size="md"
      />
      
      {/* Global Notification Display */}
      <NotificationDisplay position="top-right" />
      <AppNotifications />
    </>
  );
}

function App() {
  return (
    <Router>
      <ThemeProvider> {/* Global theme provider - manages app-wide theme */}
        <NotificationProvider>
          <AuthProvider>
            <GuideProvider><ActivityProvider><AppRouter /></ActivityProvider></GuideProvider>
          </AuthProvider>
        </NotificationProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;
