import React from 'react';
import { useTheme } from '@contexts/ThemeContext';
import './styles/Divider.css';

/**
 * Divider - Themed divider component for visual separation
 *
 * Features:
 * - Horizontal and vertical orientation
 * - Theme color system integration (primary, secondary, tertiary, success, warning, error)
 * - Multiple variants: solid (default), dashed, dotted
 * - Animated variants: shimmer, pulse, gradient, expand
 * - Thickness sizes: xs, sm, md, lg, xl
 * - Optional centered label text
 * - Spacing control via margin prop
 * - Theme inheritance support
 */
export const Divider = ({
    className = '',
    orientation = 'horizontal', // 'horizontal', 'vertical'
    color = 'default',          // 'default', 'primary', 'secondary', 'tertiary', 'success', 'warning', 'error', 'surface'
    size = 'sm',                // 'xs', 'sm', 'md', 'lg', 'xl' — controls thickness
    variant = 'solid',          // 'solid', 'dashed', 'dotted'
    animated = null,            // null, 'shimmer', 'pulse', 'gradient', 'expand'
    label = null,               // Optional text label displayed centered on the divider
    margin = 'none',            // 'none', 'xs', 'sm', 'md', 'lg', 'xl'
    marginTop = null,           // Override top margin
    marginBottom = null,        // Override bottom margin
    theme = null,               // Optional theme override
    justifySelf = null,         // CSS justify-self property
    ...props
}) => {
    const effectiveTheme = useTheme();
    const dividerTheme = theme || effectiveTheme.currentTheme;

    const getMarginStyle = () => {
        const style = {};

        if (marginTop !== null) {
            if (marginTop === 'none') style.marginTop = '0';
            else if (['xs', 'sm', 'md', 'lg', 'xl'].includes(marginTop)) style.marginTop = `var(--spacing-${marginTop})`;
            else style.marginTop = marginTop;
        }

        if (marginBottom !== null) {
            if (marginBottom === 'none') style.marginBottom = '0';
            else if (['xs', 'sm', 'md', 'lg', 'xl'].includes(marginBottom)) style.marginBottom = `var(--spacing-${marginBottom})`;
            else style.marginBottom = marginBottom;
        }

        return style;
    };

    const classes = [
        'divider',
        `theme-${dividerTheme}`,
        orientation === 'vertical' ? 'divider-vertical' : '',
        `divider-${size}`,
        `divider-color-${color}`,
        variant !== 'solid' ? `divider-${variant}` : '',
        animated ? `divider-animated-${animated}` : '',
        !marginTop && !marginBottom ? `divider-margin-${margin}` : '',
        justifySelf ? `justify-self-${justifySelf}` : '',
        className
    ].filter(Boolean).join(' ');

    return (
        <div
            className={classes}
            role="separator"
            aria-orientation={orientation}
            data-theme={dividerTheme}
            style={getMarginStyle()}
            {...props}
        >
            {label ? (
                <>
                    <span className="divider-line" />
                    <span className="divider-label">{label}</span>
                    <span className="divider-line" />
                </>
            ) : (
                <span className="divider-line" />
            )}
        </div>
    );
};

export default Divider;
