import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

/**
 * CircularProgress - Animated circular loading indicator
 * Features only an animated rotating bar with no deterministic progress values
 * Pure loading animation inspired by modern circular loaders
 */
export const CircularProgress = ({
    className = '',
    size = 'md', // 'xs', 'sm', 'md', 'lg', 'xl'
    color = 'primary', // 'primary', 'secondary', 'tertiary', 'success', 'warning', 'error'
    strokeWidth = null, // Override default stroke width
    speed = 'default', // 'slow', 'default', 'fast'
    theme = null, // Optional theme override
    justifySelf = null, // CSS justify-self property
    marginTop = null, // Margin top: 'none', 'xs', 'sm', 'md', 'lg', 'xl' or custom value
    marginBottom = null, // Margin bottom: 'none', 'xs', 'sm', 'md', 'lg', 'xl' or custom value
    ...props
}) => {
    const {currentTheme: globalTheme} = useTheme();
    const effectiveTheme = useTheme();

    // Use theme prop if provided, otherwise use effective theme from context
    const progressTheme = theme || effectiveTheme.currentTheme;

    // Helper functions for classes
    const getSizeClass = () => {
        switch (size) {
            case 'xs':
                return 'circular-progress-xs';
            case 'sm':
                return 'circular-progress-sm';
            case 'lg':
                return 'circular-progress-lg';
            case 'xl':
                return 'circular-progress-xl';
            case 'md':
            default:
                return 'circular-progress-md';
        }
    };

    const getSpeedClass = () => {
        switch (speed) {
            case 'slow':
                return 'circular-progress-slow';
            case 'fast':
                return 'circular-progress-fast';
            default:
                return 'circular-progress-default-speed';
        }
    };

    const getColorClass = () => `circular-progress-${color}`;

    const getJustifySelfClass = () => {
        if (!justifySelf) return '';
        return `justify-self-${justifySelf}`;
    };

    // Helper function for margin styles
    const getMarginStyle = () => {
        const style = {};

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

    // Combine all classes
    const circularProgressClasses = [
        'circular-progress',
        'themed-circular-progress',
        `theme-${progressTheme}`,
        getSizeClass(),
        getSpeedClass(),
        getColorClass(),
        getJustifySelfClass(),
        className
    ].filter(Boolean).join(' ');

    // Size-based dimensions, stroke widths, and dash lengths
    const getSizeDimensions = () => {
        switch (size) {
            case 'xs':
                return {size: 16, defaultStroke: 2, dashRatio: 0.15};
            case 'sm':
                return {size: 20, defaultStroke: 2.5, dashRatio: 0.15};
            case 'lg':
                return {size: 48, defaultStroke: 5, dashRatio: 0.35};
            case 'xl':
                return {size: 60, defaultStroke: 6, dashRatio: 0.4};
            case 'md':
            default:
                return {size: 32, defaultStroke: 3.5, dashRatio: 0.25};
        }
    };

    const {size: svgSize, defaultStroke, dashRatio} = getSizeDimensions();
    const actualStrokeWidth = strokeWidth || defaultStroke;
    const radius = (svgSize - actualStrokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;

    // Calculate dash length based on size-specific ratio
    const dashLength = circumference * dashRatio;
    const gapLength = circumference - dashLength;

    return (
        <div
            className={circularProgressClasses}
            data-theme={progressTheme}
            data-theme-source={theme ? 'local' : 'inherited'}
            style={getMarginStyle()}
            {...props}
        >
            <svg
                className="circular-progress-svg"
                width={svgSize}
                height={svgSize}
                viewBox={`0 0 ${svgSize} ${svgSize}`}
            >
                {/* Background circle */}
                <circle
                    className="circular-progress-track"
                    cx={svgSize / 2}
                    cy={svgSize / 2}
                    r={radius}
                    strokeWidth={actualStrokeWidth}
                    fill="none"
                />

                {/* Animated progress circle */}
                <circle
                    className="circular-progress-bar"
                    cx={svgSize / 2}
                    cy={svgSize / 2}
                    r={radius}
                    strokeWidth={actualStrokeWidth}
                    fill="none"
                    strokeDasharray={`${dashLength} ${gapLength}`}
                    strokeDashoffset="0"
                    strokeLinecap="round"
                    transform={`rotate(-90 ${svgSize / 2} ${svgSize / 2})`}
                />
            </svg>
        </div>
    );
};

export default CircularProgress;
