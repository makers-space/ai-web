import React from 'react';
import { useTheme } from '@contexts/ThemeContext';

/**
 * Badge - Themed badge component for status indicators
 * Inherits styling from the current theme
 * Enhanced with theme inheritance support
 */
export const Badge = ({
    children,
    className = '',
    color = 'default', // 'default', 'primary', 'secondary', 'tertiary', 'success', 'warning', 'error'
    size = 'md', // 'xs', 'sm', 'md', 'lg', 'xl'
    theme = null, // Optional theme override for this badge
    width = null, // Width value (e.g., '100%', '200px', 'auto')
    height = null, // Height value (e.g., '2rem', '32px', 'auto')
    minWidth = null, // Minimum width (e.g., '100px', '5rem')
    minHeight = null, // Minimum height (e.g., '2rem', '32px')
    maxWidth = null, // Maximum width (e.g., '500px', '100%')
    maxHeight = null, // Maximum height (e.g., '10rem', '200px')
    marginTop = null, // Margin top: 'none', 'xs', 'sm', 'md', 'lg', 'xl' or custom value
    marginBottom = null, // Margin bottom: 'none', 'xs', 'sm', 'md', 'lg', 'xl' or custom value
    justifySelf = null, // CSS justify-self property: 'auto', 'start', 'end', 'center', 'stretch'
    ...props
}) => {
    const {currentTheme: globalTheme} = useTheme();
    const effectiveTheme = useTheme();

    // Use theme prop if provided, otherwise use effective theme from context
    const badgeTheme = theme || effectiveTheme.currentTheme;

    // Helper function to convert margin prop to CSS style
    const getMarginStyle = () => {
        const style = {};

        // Width and height
        if (width !== null) style.width = width;
        if (height !== null) style.height = height;
        if (minWidth !== null) style.minWidth = minWidth;
        if (minHeight !== null) style.minHeight = minHeight;
        if (maxWidth !== null) style.maxWidth = maxWidth;
        if (maxHeight !== null) style.maxHeight = maxHeight;

        // Only apply margins if explicitly provided
        if (marginTop !== null) {
            if (marginTop === 'none') {
                style.marginTop = '0';
            } else if (['xs', 'sm', 'md', 'lg', 'xl'].includes(marginTop)) {
                style.marginTop = `var(--spacing-${marginTop})`;
            } else {
                style.marginTop = marginTop;
            }
        }

        // Only apply margins if explicitly provided
        if (marginBottom !== null) {
            if (marginBottom === 'none') {
                style.marginBottom = '0';
            } else if (['xs', 'sm', 'md', 'lg', 'xl'].includes(marginBottom)) {
                style.marginBottom = `var(--spacing-${marginBottom})`;
            } else {
                style.marginBottom = marginBottom;
            }
        }

        return style;
    };

    const getColorClass = () => {
        return `themed-badge-${color}`;
    };

    const getSizeClass = () => {
        switch (size) {
            case 'xs':
                return 'badge-xs';
            case 'sm':
                return 'badge-sm';
            case 'lg':
                return 'badge-lg';
            case 'xl':
                return 'badge-xl';
            case 'md':
            default:
                return 'badge-md';
        }
    };

    const getJustifySelfClass = () => {
        if (justifySelf) {
            return `justify-self-${justifySelf}`;
        }
        return '';
    };

    return (
        <span
            className={`badge themed-badge ${getColorClass()} ${getSizeClass()} ${getJustifySelfClass()} theme-${badgeTheme} ${className}`}
            data-theme={badgeTheme}
            data-theme-source={theme ? 'local' : 'inherited'}
            style={getMarginStyle()}
            {...props}
        >
            {children}
        </span>
    );
};

export default Badge;
