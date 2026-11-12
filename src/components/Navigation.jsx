import React, { useEffect, useState } from 'react';
import { useAuth } from '@contexts/AuthContext';
import { useTheme } from '@contexts/ThemeContext';
import { Badge, Button, ButtonGroup, CircularProgress, Container, FloatingActionButton, Icon, Page, Typography } from './Components';

const LOADING_MESSAGES = [
    'Loading page',
    'Fetching page',
    'Retrieving page',
    'Rendering page',
    'Preparing page',
    'Assembling page',
    'Requesting page',
    'Building page',
    'Opening page',
    'Initializing page',
];

export const LoadingText = ({ children, messages = LOADING_MESSAGES, interval = 1400, size = '2xl', ...props }) => {
    const [index, setIndex] = useState(() => Math.floor(Math.random() * messages.length));

    useEffect(() => {
        if (children || messages.length < 2) return undefined;
        const timer = setInterval(() => setIndex(i => (i + 1) % messages.length), interval);
        return () => clearInterval(timer);
    }, [children, messages, interval]);

    return (
        <Typography as="div" size={size} weight="bold" font="monospace" color="primary" animation="glitch" animationDuration={900} {...props}>
            {children || `${messages[index % messages.length]}...`}
        </Typography>
    );
};

// Standardized loading component for consistent UI across all pages
export const PageLoading = () => {
    return (
        <Page layout="flex" align="center" justify="center">
            <Container layout="flex-column" align="center" justify="center" gap="md">
                <LoadingText/>
            </Container>
        </Page>
    );
};

// Route role configuration - simplified for role checking only
const getRouteConfig = () => {
    return {
        '/admin': {roles: ['ADMIN', 'OWNER']}
    };
};

const PUBLIC_PAGES = ['/', '/components'];

/**
 * Navigation - App navigation component with draggable FAB and Genie integration
 *
 * Features:
 * - Draggable floating action button for navigation
 * - Genie popup with navigation menu
 * - Authentication-aware navigation options
 * - Theme switching capability
 * - User profile quick access
 * - Contextual navigation based on user roles
 */
export const Navigation = ({
                               className = '',
                               position = 'top-right',
                               variant = 'primary',
                               size = 'md',
                               draggable = true,
                               theme = null,
                               ...props
                           }) => {
    const {user, isLoading, logout, hasRole} = useAuth();
    const {currentTheme, switchTheme, availableThemes, themes} = useTheme();
    const [isNavigating, setIsNavigating] = useState(false);

    // Navigation menu items based on authentication and roles
    const getNavigationItems = () => {
        const items = [];

        if (user) {
            // Dashboard/Home
            items.push({
                id: 'home',
                label: 'Home',
                icon: 'FiHome',
                path: '/',
                roles: ['USER', 'CREATOR', 'ADMIN', 'OWNER'],
                requireAuth: true
            });

            items.push({
                id: 'components',
                label: 'Components',
                icon: 'FiCode',
                path: '/components',
                roles: ['USER', 'CREATOR', 'ADMIN', 'OWNER'],
                requireAuth: true
            });

            // Admin panel for admin users
            if (hasRole('ADMIN') || hasRole('OWNER')) {
                items.push({
                    id: 'admin',
                    label: 'Admin Panel',
                    icon: 'FiSettings',
                    path: '/admin',
                    roles: ['ADMIN', 'OWNER'],
                    requireAuth: true,
                    badge: 'Admin'
                });
            }
        } else {
            items.push({
                id: 'home-guest',
                label: 'Home',
                icon: 'FiHome',
                path: '/',
                publicOnly: true
            });

            items.push({
                id: 'components-demo',
                label: 'Explore Components',
                icon: 'FiGrid',
                path: '/components',
                publicOnly: true
            });

            // Guest navigation
            items.push({
                id: 'login',
                label: 'Sign In',
                icon: 'FiLogIn',
                path: '/login',
                publicOnly: true
            });

            items.push({
                id: 'signup',
                label: 'Sign Up',
                icon: 'FiUserPlus',
                path: '/signup',
                publicOnly: true
            });
        }

        return items.filter(item =>
            !item.roles || item.roles.some(role => hasRole(role))
        );
    };

    const navigationItems = getNavigationItems();

    const handleNavigation = (path) => {
        setIsNavigating(true);
        // Simulate navigation loading
        setTimeout(() => {
            window.location.href = path;
            setIsNavigating(false);
        }, 200);
    };

    const handleLogout = async () => {
        try {
            await logout();
            window.location.href = '/login';
        } catch (error) {
            // Silent error handling
        }
    };

    const handleThemeChange = (themeName) => {
        switchTheme(themeName);
    };

    // Genie content with navigation menu
    const genieContent = (
        <Container layout="flex-column" gap="sm" padding="sm">
            {/* Header */}
            <Container layout="flex" justify="between" align="center" gap="md" width="100%">
                <Typography as="h4" size="sm" weight="semibold">
                    Navigation
                </Typography>
                {user && (
                    <Badge color="primary" size="sm">
                        {user.username || user.email}
                    </Badge>
                )}
            </Container>

            {/* User info for authenticated users */}
            {user && (
                <Container
                    layout="flex"
                    gap="sm"
                    justify="around"
                    align="center"
                    padding="sm"
                    backgroundColor="background"
                    width="100%"
                >
                    <Icon name="FiUser" size="md"/>
                    <Container layout="flex-column" gap="xs">
                        <Typography as="p" size="sm" weight="medium">
                            {user.firstName} {user.lastName}
                        </Typography>
                        <Container layout="flex" gap="xs">
                            {user.roles?.map(role => (
                                <Badge
                                    key={role}
                                    color={role === 'OWNER' ? 'primary' : 'secondary'}
                                    size="sm"
                                >
                                    {role}
                                </Badge>
                            )) || <Badge color="secondary" size="sm">USER</Badge>}
                        </Container>
                    </Container>
                </Container>
            )}

            {/* Navigation Items */}
            <Container layout="flex-column" gap="xs" width="100%">
                <Typography as="p" size="xs" weight="medium">
                    MENU
                </Typography>
                {navigationItems.map(item => (
                    <Button
                        key={item.id}
                        size="sm"
                        align="left"
                        width="100%"
                        onClick={() => handleNavigation(item.path)}
                        disabled={isNavigating}
                    >
                        <Icon name={item.icon} size="xs"/>
                        {item.label}
                        {item.badge && (
                            <Badge color="tertiary" size="xs">
                                {item.badge}
                            </Badge>
                        )}
                    </Button>
                ))}
            </Container>

            {/* Theme Switcher */}
            <Container layout="flex-column" gap="xs">
                <Typography as="p" size="xs" weight="medium">
                    THEME
                </Typography>
                <Container layout="flex" gap="xs" wrap justify="center" maxWidth="480px" width="100%">
                    {availableThemes.map(themeName => (
                        <Button
                            key={themeName}
                            variant='ghost'
                            size="sm"
                            selected={currentTheme === themeName}
                            onClick={() => handleThemeChange(themeName)}
                        >
                            {themes[themeName]?.name || themeName.charAt(0).toUpperCase() + themeName.slice(1)}
                        </Button>
                    ))}
                </Container>
            </Container>

            {/* Actions */}
            {user ? (
                <Container layout="flex-column" gap="xs" width="100%">
                    <Typography as="p" size="xs" weight="medium">
                        ACCOUNT
                    </Typography>
                    <Button
                        variant="ghost"
                        size="sm"
                        align="left"
                        width="100%"
                        onClick={handleLogout}
                        color="error"
                        disabled={isNavigating}
                    >
                        <Icon name="FiLogOut" size="xs"/>
                        Sign Out
                    </Button>
                </Container>
            ) : (
                <Container layout="flex">
                    <ButtonGroup spaced selectable={false} justify="start">
                        <Button
                            color="primary"
                            size="sm"
                            onClick={() => handleNavigation('/login')}
                            disabled={isNavigating}
                        >
                            <Icon name="FiLogIn" size="sm"/>
                            Sign In
                        </Button>
                        <Button
                            color="secondary"
                            size="sm"
                            onClick={() => handleNavigation('/signup')}
                            disabled={isNavigating}
                        >
                            <Icon name="FiUserPlus" size="sm"/>
                            Sign Up
                        </Button>
                    </ButtonGroup>
                </Container>
            )}
        </Container>
    );

    return (
        <FloatingActionButton
            className={`navigation-fab ${className}`}
            color={variant}
            size={size}
            position={position}
            draggable={draggable}
            icon={isNavigating ? 'FiLoader' : 'FiMap'}
            theme={theme}
            disabled={isNavigating}
            genie={{
                trigger: 'click',
                content: genieContent,
                variant: 'menu',
                maxHeight: '48vh'
            }}
            title="Navigation Menu"
            aria-label="Open navigation menu"
            {...props}
        />
    );
};

// Simple route access control - just basic checks
export const RouteAccessControl = ({children, path}) => {
    const {user, isLoading} = useAuth();

    // Show loading during auth check
    if (isLoading) {
        return <PageLoading message="Loading..."/>;
    }

    // Simple auth pages list
    const authPages = ['/login', '/signup', '/forgot-password'];
    const isAuthPage = authPages.includes(path);

    // Redirect logic
    const isPublicPage = PUBLIC_PAGES.includes(path);
    if (!isAuthPage && !isPublicPage && !user) {
        // Protected page, no user - go to login
        window.location.href = '/login';
        return null;
    }

    if (isAuthPage && user) {
        // Auth page, but user is logged in - go to dashboard
        window.location.href = '/';
        return null;
    }

    // Simple role check for admin pages
    if (path === '/admin' && user && !user.roles?.includes('ADMIN') && !user.roles?.includes('OWNER')) {
        return (
            <Page layout="flex-column" align="center" justify="center" gap="lg" padding="xl">
                <Icon name="FiLock" size="xl" variant="error"/>
                <Typography size="xl" weight="bold">Access Denied</Typography>
                <Typography size="md" align="center">
                    Admin access required.
                </Typography>
            </Page>
        );
    }

    return children;
};

export default Navigation;
