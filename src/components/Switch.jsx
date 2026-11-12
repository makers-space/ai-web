import React from 'react';
import { useTheme } from '@contexts/ThemeContext';
import { Typography } from './Typography';

/**
 * Switch - Themed toggle switch component
 * Inherits styling from the current theme
 * Enhanced with theme inheritance support
 */
export const Switch = ({
    className = '',
    checked,
    defaultChecked,
    onChange,
    label = '',
    disabled = false,
    id,
    size = 'md', // 'xs', 'sm', 'md', 'lg', 'xl'
    theme = null, // Optional theme override for this switch
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
    const switchTheme = theme || effectiveTheme.currentTheme;
    const switchId = id || `switch-${Math.random().toString(36).substr(2, 9)}`;

    // Determine if this is a controlled or uncontrolled component
    const isControlled = checked !== undefined;
    const switchValue = isControlled ? checked : defaultChecked;

    // Remove defaultChecked from props to avoid conflicts
    const {defaultChecked: _, ...inputProps} = props;

    const getSizeClass = () => {
        return `switch-${size}`;
    };

    const getJustifySelfClass = () => {
        if (justifySelf) {
            return `justify-self-${justifySelf}`;
        }
        return '';
    };

    const getSwitchStyle = () => {
        const style = {};

        // Sizing
        if (width !== null) style.width = width;
        if (height !== null) style.height = height;
        if (minWidth !== null) style.minWidth = minWidth;
        if (minHeight !== null) style.minHeight = minHeight;
        if (maxWidth !== null) style.maxWidth = maxWidth;
        if (maxHeight !== null) style.maxHeight = maxHeight;

        // Margins
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
        <div 
            className={`switch-wrapper flex items-center gap-sm ${getJustifySelfClass()} ${className}`}
            style={getSwitchStyle()}
        >
            <div 
                className={`switch-container themed-switch ${getSizeClass()} theme-${switchTheme}`}
                data-theme={switchTheme} 
                data-theme-source={theme ? 'local' : 'inherited'}
            >
                <input
                    type="checkbox"
                    id={switchId}
                    className="switch-input sr-only"
                    {...(isControlled ? { checked } : { defaultChecked })}
                    onChange={onChange}
                    disabled={disabled}
                    {...inputProps}
                />
                <label
                    htmlFor={switchId}
                    className={`switch-track ${switchValue ? 'checked' : ''} ${disabled ? 'disabled' : ''}`}
                >
                    <span className="switch-thumb" />
                </label>
            </div>
            {label && (
                <Typography
                    as="label"
                    htmlFor={switchId}
                    className={`switch-label themed-label theme-${switchTheme}`}
                    data-theme={switchTheme}
                >
                    {label}
                </Typography>
            )}
        </div>
    );
};

export default Switch;
