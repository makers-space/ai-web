import React, { createContext, forwardRef, useContext, useMemo, useRef } from 'react';
import { useTheme } from '@contexts/ThemeContext';
import { useGeniePortal } from './Genie';

const BUTTON_COLOR_TOKENS = {
    primary: 'var(--primary-color)',
    secondary: 'var(--secondary-color)',
    tertiary: 'var(--tertiary-color)',
    success: 'var(--success-color)',
    warning: 'var(--warning-color)',
    error: 'var(--error-color)'
};

// Context for ButtonGroup to manage selection
export const ButtonGroupContext = createContext(null);

// Context for Button to share state with children (like Icon)
export const ButtonContext = createContext(null);

/**
 * Button - Enhanced themed button component with Genie integration
 * Automatically toggles selected state when clicked
 * Inherits colors and styling from the current theme
 *
 * Enhanced Features:
 * - Full Genie positioning support
 * - Corner-aware floating card positioning
 * - Built-in trigger capabilities for tooltips, popovers, context menus
 * - Automatic hover state management
 * - Theme inheritance support via theme prop
 */
export const Button = forwardRef(({
    children,
    className = '',
    color = 'primary', // 'primary', 'secondary', 'tertiary', 'success', 'warning', 'error'
    variant = null, // Special variant: 'border-shadow' for unique styling
    size = 'md', // 'xxs', 'xs', 'sm', 'md', 'lg', 'xl'
    disabled = false,
    selected: externalSelected = null, // Allow external control of selected state
    type = 'button',
    onClick,
    width = null, // Width value (e.g., '100%', '200px', '10rem')
    height = null, // Height value (e.g., '2.5rem', '40px')
    minWidth = null, // Minimum width (e.g., '100px', '5rem')
    minHeight = null, // Minimum height (e.g., '2rem', '32px')
    maxWidth = null, // Maximum width (e.g., '500px', '100%')
    maxHeight = null, // Maximum height (e.g., '10rem', '200px')
    theme = null, // Optional theme override for this button
    marginTop = null, // Margin top: 'none', 'xs', 'sm', 'md', 'lg', 'xl' or custom value
    marginBottom = null, // Margin bottom: 'none', 'xs', 'sm', 'md', 'lg', 'xl' or custom value
    justifySelf = null, // CSS justify-self property: 'auto', 'start', 'end', 'center', 'stretch'
    // Genie integration props
    genie = null, // Genie content to show
    genieTrigger = 'click', // 'click', 'hover', 'contextmenu'
    onGenieShow = null, // Callback when genie shows
    onGenieHide = null, // Callback when genie hides
    ...props
}, ref) => {
    const {currentTheme: globalTheme} = useTheme();
    // Use theme prop if provided, otherwise use effective theme from context
    const buttonTheme = theme || globalTheme;

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

    const buttonGroupContext = useContext(ButtonGroupContext);

    // Parse genie prop - support both old API and new object API
    const genieConfig = useMemo(() => {
        if (!genie) return null;

        if (typeof genie === 'object' && genie.content) {
            // New API: genie is an object with trigger, content
            return {
                content: genie.content,
                trigger: genie.trigger || genieTrigger
            };
        }

        // Old API: genie is just the content, other props are separate
        return {
            content: genie,
            trigger: genieTrigger
        };
    }, [genie, genieTrigger]);

    // Genie integration using simplified portal hook
    const buttonRef = ref || useRef(null);
    const {triggerProps: genieTriggerProps, GeniePortal} = useGeniePortal(
        genieConfig,
        buttonRef,
        onGenieShow,
        onGenieHide
    );
    // Determine the actual selected state - external selected prop takes priority over ButtonGroup
    const isSelected = externalSelected !== null
        ? externalSelected
        : (buttonGroupContext
            ? buttonGroupContext.selectedButton === buttonGroupContext.buttonId
            : false);

    const handleClick = (e) => {
        if (disabled) return;

        // Handle Genie click trigger first
        if (genieConfig && genieConfig.trigger === 'click') {
            // Call the genie click handler from triggerProps if it exists
            if (genieTriggerProps.onClick) {
                // Create a new event to prevent stopPropagation from affecting this event
                const genieEvent = {...e};
                genieTriggerProps.onClick(genieEvent);
            }
            // Continue with button logic instead of returning early
        }

        // Only participate in ButtonGroup selection if no external selected prop is provided
        if (buttonGroupContext && externalSelected === null) {
            // In a ButtonGroup - notify the group of selection
            buttonGroupContext.onButtonSelect(buttonGroupContext.buttonId);
        }

        // Call external onClick if provided
        if (onClick) {
            onClick(e);
        }
    };

    // Merge button onClick with genie trigger props (for non-click triggers)
    const combinedProps = {
        ...genieTriggerProps,
        onClick: handleClick // Always use our handleClick which handles both Genie and Button logic
    };
    const getVariantClass = () => {
        if (!variant) return '';
        if (variant === 'border-shadow') {
            return 'themed-button-border-shadow';
        }
        return `themed-button-variant-${variant}`;
    };

    const getColorClass = () => {
        return `themed-button-${color}`;
    };

    const getVariantColorValue = () => {
        return BUTTON_COLOR_TOKENS[color] || color || BUTTON_COLOR_TOKENS.primary;
    };

    const getSizeClass = () => ['xxs', 'xs', 'sm', 'lg', 'xl'].includes(size) ? size : 'md';

    const getSelectedClass = () => {
        return isSelected ? 'selected' : '';
    };

    const getJustifySelfClass = () => {
        if (justifySelf) {
            return `justify-self-${justifySelf}`;
        }
        return '';
    };

    const variantColorValue = getVariantColorValue();

    return (
        <ButtonContext.Provider value={{ size }}>
            <button
                ref={buttonRef}
                type={type}
                className={`button themed-button ${getVariantClass()} ${getColorClass()} ${getSizeClass()} ${getSelectedClass()} ${getJustifySelfClass()} ${genieConfig ? 'genie-trigger' : ''} theme-${buttonTheme} ${className}`}
                disabled={disabled}
                data-theme={buttonTheme}
                data-theme-source={theme ? 'local' : 'inherited'}
                data-genie-position={genieConfig?.position || 'auto'}
                {...props}
                {...combinedProps}
                style={{ ...getMarginStyle(), ...(variantColorValue ? { '--button-variant-color': variantColorValue } : {}) }}
            >
                <span className="button-content">
                    {children}
                </span>
            </button>
            {/* Genie Integration using Portal */}
            {GeniePortal}
        </ButtonContext.Provider>
    );
});

Button.displayName = 'Button';

export default Button;
