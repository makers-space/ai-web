import React from 'react';
import { useTheme } from '@contexts/ThemeContext';
import { Typography } from './Typography';

/**
 * ProgressBar - Themed progress bar component
 * Shows progress with a single color that changes from error to warning to tertiary to success
 */
export const ProgressBar = ({
    value = 0,
    max = 100,
    className = '',
    size = 'md', // 'xs', 'sm', 'md', 'lg', 'xl'
    showLabel = false,
    label = '',
    showPercentage = false,
    animated = false,
    striped = false,
    color = 'default', // 'default', 'primary', 'secondary', 'tertiary', 'success', 'warning', 'error'
    width = null, // Width value (e.g., '100%', '500px')
    height = null, // Height value (e.g., '1rem', '16px')
    minWidth = null, // Minimum width
    minHeight = null, // Minimum height
    maxWidth = null, // Maximum width
    maxHeight = null, // Maximum height
    marginTop = null, // Margin top: 'none', 'xs', 'sm', 'md', 'lg', 'xl' or custom value
    marginBottom = null, // Margin bottom: 'none', 'xs', 'sm', 'md', 'lg', 'xl' or custom value
    theme = null, // Optional theme override
    justifySelf = null, // CSS justify-self property: 'auto', 'start', 'end', 'center', 'stretch'
    ...props
}) => {
    const {currentTheme: globalTheme} = useTheme();
    const effectiveTheme = useTheme();

    // Use theme prop if provided, otherwise use effective theme from context
    const progressTheme = theme || effectiveTheme.currentTheme;
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

    // Helper functions for classes
    const getSizeClass = () => {
        switch (size) {
            case 'xs':
                return 'progress-bar-xs';
            case 'sm':
                return 'progress-bar-sm';
            case 'lg':
                return 'progress-bar-lg';
            case 'xl':
                return 'progress-bar-xl';
            case 'md':
            default:
                return 'progress-bar-md';
        }
    };
    const getAnimatedClass = () => animated ? 'progress-animated' : '';
    const getStripedClass = () => striped ? 'progress-striped' : '';

    // For default color, pick color class based on percentage
    const getDynamicColorClass = () => {
        if (color !== 'default') return `progress-${color}`;
        if (percentage < 33) return 'progress-error';
        if (percentage < 66) return 'progress-warning';
        if (percentage < 85) return 'progress-tertiary';
        return 'progress-success';
    };

    const getJustifySelfClass = () => {
        if (justifySelf) {
            return `justify-self-${justifySelf}`;
        }
        return '';
    };

    // Helper function for styling
    const getWrapperStyle = () => {
        const style = {};

        if (width !== null) style.width = width;
        if (height !== null) style.height = height;
        if (minWidth !== null) style.minWidth = minWidth;
        if (minHeight !== null) style.minHeight = minHeight;
        if (maxWidth !== null) style.maxWidth = maxWidth;
        if (maxHeight !== null) style.maxHeight = maxHeight;

        if (marginTop !== null) {
            if (marginTop === 'none') {
                style.marginTop = '0';
            } else if (['xs', 'sm', 'md', 'lg', 'xl'].includes(marginTop)) {
                style.marginTop = `var(--spacing-${marginTop})`;
            } else {
                style.marginTop = marginTop;
            }
        }

        if (marginBottom !== null) {
            if (marginBottom === 'none') {
                style.marginBottom = '0';
            } else if (['xs', 'sm', 'md', 'lg', 'xl'].includes(marginBottom)) {
                style.marginBottom = `var(--spacing-${marginBottom})`;
            } else {
                style.marginBottom = marginBottom;
            }
        }

        if (justifySelf !== null) style.justifySelf = justifySelf;

        return style;
    };

    return (
        <div className={`progress-wrapper ${getJustifySelfClass()} ${className}`} style={getWrapperStyle()}>
            {(showLabel || label) && (
                <div className="progress-label flex justify-between mb-sm">
                    <Typography as="span" size="sm">{label}</Typography>
                    {showPercentage && (
                        <Typography as="span" size="sm">{Math.round(percentage)}%</Typography>
                    )}
                </div>
            )}
            <div
                className={`progress-bar themed-progress-bar ${getSizeClass()} ${getAnimatedClass()} ${getStripedClass()} theme-${progressTheme}`}
                data-theme={progressTheme}
                {...props}
            >
                <div
                    className={`progress-fill themed-progress-fill ${getDynamicColorClass()}${striped ? ' progress-striped' : ''}${striped && animated ? ' progress-striped-animated' : ''}`}
                    style={{
                        width: `${percentage}%`,
                        position: 'relative',
                        overflow: 'hidden'
                    }}
                    role="progressbar"
                    aria-valuenow={value}
                    aria-valuemin={0}
                    aria-valuemax={max}
                    aria-label={label || `Progress: ${Math.round(percentage)}%`}
                >
                    {/* No overlay for default striped, let CSS handle stripes/animation */}
                </div>
            </div>
        </div>
    );
};

export default ProgressBar;
