import React, { forwardRef, useMemo, useRef } from 'react';
import { ThemeProvider, useTheme } from '@contexts/ThemeContext';
import { useGeniePortal } from './Genie';
import { getBackgroundClass, STATUS_COLORS } from './Page';

/**
 * Card - Themed card component for content containers
 * Visible variant of Container with background, border, and shadow styling
 * Supports all the same layouts as Container: flex, grid, multi-column, positioned
 *
 * Enhanced with theme inheritance: nested components inherit theme from Card
 */
export const Card = forwardRef(({
    children,
    className = '',
    layout = 'block', // 'block', 'flex', 'flex-wrap', 'flex-column', 'grid', 'multicolumn', 'positioned'
    columns = 1, // 1-6 for grid layouts, or 'auto', 'auto-sm', 'auto-lg'
    gap = 'lg', // 'none', 'xs', 'sm', 'md', 'lg', 'xl'
    padding = 'lg', // 'none', 'xs', 'sm', 'md', 'lg', 'xl'
    hover = true, // true, false - enable/disable hover effects
    bordered = true, // false removes the outline, for a card that is only a filled surface
    width = null, // Custom width: string value like '100px', '50%', 'auto', etc.
    height = null, // Custom height: string value like '100px', '50%', 'auto', '90vh', etc.
    minWidth = null, // Custom minimum width
    minHeight = null, // Custom minimum height: string value like '100px', '50%', 'auto', '90vh', etc.
    maxWidth = null, // Custom maximum width
    maxHeight = null, // Custom maximum height
    align = 'start', // 'start', 'center', 'end', 'stretch', 'baseline'
    justify = 'start', // 'start', 'center', 'end', 'between', 'around', 'evenly', 'wrap'
    wrap = true, // true, false (for flex layouts)
    backgroundColor, // Fill color: 'surface', 'background', 'primary', 'secondary', 'tertiary' (status colors are not fills)
    theme = null, // Optional theme override for this card and its children
    margin = 'none', // 'auto', 'none' or null - none prevents interference with parent flex alignment
    marginTop = null, // Margin top: 'none', 'xs', 'sm', 'md', 'lg', 'xl' or custom value
    marginBottom = null, // Margin bottom: 'none', 'xs', 'sm', 'md', 'lg', 'xl' or custom value
    justifySelf = null, // CSS justify-self property: 'auto', 'start', 'end', 'center', 'stretch'
    flexFill = false, // Whether the card should fill available space in flex layouts
    span = null, // Grid item spanning inside a parent grid: 2, 3, or 'full'
    // Decorative background drawn from the theme colors (defined in Page.jsx)
    background = null, // 'grid', 'graph', 'dots', 'lines', 'diagonal', 'crosshatch', 'checker', 'hex', 'plus', 'waves', 'zigzag', 'rings', 'aurora', 'gradient'
    backgroundTone = 'auto', // 'auto' contrasts with backgroundColor; or 'primary', 'secondary', 'tertiary', 'neutral', 'text', 'contrast'
    backgroundIntensity = 'subtle', // 'subtle', 'medium', 'strong'
    backgroundSize = 'md', // 'sm', 'md', 'lg' - scale of the repeating pattern
    backgroundMotion = null, // 'drift', 'pulse', or 'none' to stop an animated background
    backgroundFade = 'none', // 'none', 'radial', 'radial-inverse', 'top', 'bottom', 'left', 'right', 'center'
    // Genie integration props
    genie = null, // Genie content to show
    genieTrigger = 'click', // 'click', 'hover', 'contextmenu'
    onGenieShow = null, // Callback when genie shows
    onGenieHide = null, // Callback when genie hides
    ...props
}, ref) => {
    const {currentTheme: globalTheme} = useTheme();
    const effectiveTheme = useTheme();

    // Use theme prop if provided, otherwise use effective theme from context
    const cardTheme = theme || effectiveTheme.currentTheme;

    // Helper function to convert margin and width props to CSS style
    const getCustomStyle = () => {
        const style = {};

        // Handle width
        if (width !== null) {
            style.width = width;
        }

        // Handle height
        if (height !== null) {
            style.height = height;
        }

        // Handle minWidth
        if (minWidth !== null) {
            style.minWidth = minWidth;
        }

        // Handle minHeight
        if (minHeight !== null) {
            style.minHeight = minHeight;
        }

        // Handle maxWidth
        if (maxWidth !== null) {
            style.maxWidth = maxWidth;
        }

        // Handle maxHeight
        if (maxHeight !== null) {
            style.maxHeight = maxHeight;
        }

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

    // Get margin class for horizontal centering
    const getMarginClass = () => {
        if (margin === 'auto') {
            return 'm-auto';
        } else if (margin === 'none') {
            return 'm-none';
        }
        return '';
    };

    // Parse genie prop - support both old API and new object API
    const genieConfig = useMemo(() => {
        if (!genie) return null;

        if (typeof genie === 'object' && genie.content) {
            // New API: genie is an object with trigger, content, position
            return {
                content: genie.content,
                trigger: genie.trigger || genieTrigger,
                position: genie.position || 'auto',
                variant: genie.variant || 'popover',
                size: genie.size || 'medium'
            };
        }

        // Old API: genie is just the content, other props are separate
        // Make sure we're not accidentally treating a config object as content
        if (typeof genie === 'object' && (genie.trigger || genie.variant) && !genie.content) {
            console.warn('Card: Invalid genie configuration. Expected genie.content property.');
            return null;
        }

        return {
            content: genie,
            trigger: genieTrigger,
            position: 'auto',
            variant: 'popover',
            size: 'medium'
        };
    }, [genie, genieTrigger]);

    // Genie integration using simplified portal hook
    const cardRef = ref || useRef(null);
    const {triggerProps, GeniePortal} = useGeniePortal(
        genieConfig,
        cardRef,
        onGenieShow,
        onGenieHide
    );

    const getLayoutClass = () => {
        switch (layout) {
            case 'grid':
                return 'layout-grid';
            case 'flex':
                return 'layout-flex';
            case 'flex-column':
                return 'layout-flex-column';
            case 'multicolumn':
                return 'layout-multicolumn';
            case 'positioned':
                return 'layout-positioned';
            default:
                return 'layout-block';
        }
    };

    const getColumnsClass = () => {
        if (layout === 'grid') {
            if (typeof columns === 'string') {
                return `grid-${columns}`;
            }
            if (columns >= 1 && columns <= 6) {
                return `grid-${columns}`;
            }
        }
        if (layout === 'multicolumn') {
            if (typeof columns === 'string' && columns === 'auto') {
                return 'columns-auto';
            }
            if (columns >= 2 && columns <= 4) {
                return `columns-${columns}`;
            }
        }
        return '';
    };

    const getGapClass = () => {
        return `gap-${gap}`;
    };

    const getPaddingClass = () => {
        switch (padding) {
            case 'none':
                return 'p-none';
            case 'xs':
                return 'p-xs';
            case 'sm':
            case 'small':
                return 'p-sm';
            case 'md':
            case 'medium':
                return 'p-md';
            case 'xl':
            case 'large':
                return 'p-xl';
            default:
                return 'p-lg';
        }
    };

    const getAlignClass = () => {
        return `align-${align}`;
    };

    const getJustifyClass = () => {
        return `justify-${justify}`;
    };

    const getWrapClass = () => {
        if (layout === 'flex' || layout === 'flex-column') {
            return wrap ? 'flex-wrap' : 'flex-nowrap';
        }
        return '';
    };

    const hoverClass = hover ? 'themed-card-hover' : '';
    const borderClass = bordered ? '' : 'card-borderless';
    // Get background color style
    const getBackgroundStyle = () => {
        if (!backgroundColor || STATUS_COLORS.includes(backgroundColor)) {
            return {};
        }

        return {backgroundColor: `var(--${backgroundColor}-color)`};
    };

    const getJustifySelfClass = () => {
        if (justifySelf) {
            return `justify-self-${justifySelf}`;
        }
        return '';
    };

    const backgroundClass = getBackgroundClass({
        background, backgroundTone, backgroundIntensity, backgroundSize, backgroundMotion, backgroundFade, backgroundColor
    });

    // Pass all props to DOM
    const domProps = {...props};

    // Add flex-fill class if the flexFill prop is true
    const flexFillClass = flexFill ? 'flex-fill' : '';

    // Grid item spanning inside a parent grid
    const spanClass = span ? `grid-span-${span}` : '';

    const cardElement = (
        <div
            ref={cardRef}
            {...domProps}
            {...triggerProps}
            className={`card themed-card ${getLayoutClass()} ${getColumnsClass()} ${getGapClass()} ${getPaddingClass()} ${getAlignClass()} ${getJustifyClass()} ${getWrapClass()} ${getMarginClass()} ${hoverClass} ${borderClass} ${flexFillClass} ${spanClass} ${getJustifySelfClass()} ${genie ? 'genie-trigger' : ''} ${backgroundClass} theme-${cardTheme} ${className}`}
            data-theme={cardTheme}
            data-theme-source={theme ? 'local' : 'inherited'}

            style={{...getBackgroundStyle(), ...getCustomStyle(), ...domProps.style}}

        >
            {children}

            {/* Genie Integration */}
            {GeniePortal}
        </div>
    );

    // If theme prop is provided, wrap with ThemeProvider for inheritance
    if (theme) {
        return (
            <ThemeProvider theme={theme}>
                {cardElement}
            </ThemeProvider>
        );
    }

    return cardElement;
});

export default Card;
