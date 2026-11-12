import React, { forwardRef, useMemo, useRef } from 'react';
import { ThemeProvider, useTheme } from '@contexts/ThemeContext';
import { useGeniePortal } from './Genie';
import { getBackgroundClass, STATUS_COLORS } from './Page';

/**
 * Container - Enhanced layout container with Genie integration
 *
 * Enhanced Features:
 * - Full Genie positioning support
 * - Corner-aware floating card positioning
 * - Layout-aware floating card integration
 * - Automatic hover state management
 * - Built-in trigger capabilities
 * - Theme inheritance: nested components inherit theme from Container
 */
export const Container = forwardRef(({
    children,
    className = '', // Additional classes for custom styling
    layout = 'block', // 'block', 'flex', 'flex-wrap', 'flex-column', 'grid', 'multicolumn', 'positioned'
    columns = 1, // 1-6 for grid layouts, or 'auto', 'auto-sm', 'auto-lg'
    gap = 'lg', // 'none', 'xs', 'sm', 'md', 'lg', 'xl'
    padding = 'md', // 'none', 'xs', 'sm', 'md', 'lg', 'xl'
    width = null, // Custom width: string value like '100px', '50%', 'auto', etc.
    height = null, // Custom height: string value like '100px', '50%', 'auto', '90vh', etc.
    minWidth = null, // Custom minimum width
    minHeight = null, // Custom minimum height: string value like '100px', '50%', 'auto', '90vh', etc.
    maxWidth = null, // Custom maximum width
    maxHeight = null, // Custom maximum height
    overflow = null, // Overflow behavior: 'auto', 'hidden', 'scroll', 'visible'
    align = 'start', // 'start', 'center', 'end', 'stretch', 'baseline'
    justify = 'start', // 'start', 'center', 'end', 'between', 'around', 'evenly', 'wrap'
    margin = 'none', // 'auto', 'none'
    marginTop = null, // Margin top: 'none', 'xs', 'sm', 'md', 'lg', 'xl' or custom value
    marginBottom = null, // Margin bottom: 'none', 'xs', 'sm', 'md', 'lg', 'xl' or custom value
    wrap = true, // true, false (for flex layouts)
    flexFill = false, // Whether the container should fill available space in flex layouts
    span = null, // Grid item spanning inside a parent grid: 2, 3, or 'full'
    // Decorative background drawn from the theme colors (defined in Page.jsx)
    background = null, // 'grid', 'graph', 'dots', 'lines', 'diagonal', 'crosshatch', 'checker', 'hex', 'plus', 'waves', 'zigzag', 'rings', 'aurora', 'gradient'
    backgroundTone = 'auto', // 'auto' contrasts with backgroundColor; or 'primary', 'secondary', 'tertiary', 'neutral', 'text', 'contrast'
    backgroundIntensity = 'subtle', // 'subtle', 'medium', 'strong'
    backgroundSize = 'md', // 'sm', 'md', 'lg' - scale of the repeating pattern
    backgroundMotion = null, // 'drift', 'pulse', or 'none' to stop an animated background
    backgroundFade = 'none', // 'none', 'radial', 'radial-inverse', 'top', 'bottom', 'left', 'right', 'center'
    hoverable = false, // true adds a themed hover background + pointer cursor (for list rows, chips)
    backgroundColor = 'transparent', // 'transparent', 'background', 'surface', 'surface-alt', 'primary', 'secondary', 'tertiary' (status colors are not fills)
    theme = null, // Optional theme override for this container and its children
    justifySelf = null, // CSS justify-self property: 'auto', 'start', 'end', 'center', 'stretch'
    as: Component = 'div', // Component to render as (default: div)
    // Genie integration props
    genie = null, // Genie content to show OR object with {trigger, content, position}
    genieTrigger = 'click', // 'click', 'hover', 'contextmenu'
    onGenieShow = null, // Callback when genie shows
    onGenieHide = null, // Callback when genie hides
    ...props
}, ref) => {
    const effectiveTheme = useTheme();

    // Use theme prop if provided, otherwise use effective theme from context
    const containerTheme = theme || effectiveTheme.currentTheme;

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

        // Handle overflow
        if (overflow !== null) {
            style.overflow = overflow;
        }

        // Handle margin top
        if (marginTop !== null) {
            if (marginTop === 'none') {
                style.marginTop = '0';
            } else if (['xs', 'sm', 'md', 'lg', 'xl'].includes(marginTop)) {
                style.marginTop = `var(--spacing-${marginTop})`;
            } else {
                style.marginTop = marginTop;
            }
        }

        // Handle margin bottom
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

    // Handle both old API (separate props) and new API (object with trigger, content, position)
    const genieConfig = useMemo(() => {
        if (!genie) return null;

        // New API: genie is an object with trigger, content, position
        if (typeof genie === 'object' && genie.content) {
            return {
                content: genie.content,
                trigger: genie.trigger || genieTrigger,
                position: genie.position || 'auto'
            };
        }

        // Old API: genie is just the content, other props are separate
        return {
            content: genie,
            trigger: genieTrigger,
            position: 'auto'
        };
    }, [genie, genieTrigger]);

    // Genie integration using simplified portal hook
    const containerRef = ref || useRef(null);
    const {triggerProps, GeniePortal} = useGeniePortal(
        genieConfig,
        containerRef,
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
                // Handle string-based column values
                return `grid-${columns}`;
            }
            if (typeof columns === 'number' && columns >= 1 && columns <= 6) {
                // Handle numeric column values
                return `grid-${columns}`;
            }
        }
        if (layout === 'multicolumn') {
            if (typeof columns === 'string' && columns === 'auto') {
                return 'columns-auto';
            }
            if (typeof columns === 'number' && columns >= 2 && columns <= 4) {
                return `columns-${columns}`;
            }
        }
        return '';
    };

    const getGapClass = () => {
        return `gap-${gap}`;
    };

    const getPaddingClass = () => {
        return `p-${padding}`;
    };

    const getMarginClass = () => {
        return `m-${margin}`;
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

    const getBackgroundStyle = () => {
        if (!backgroundColor || backgroundColor === 'transparent' || STATUS_COLORS.includes(backgroundColor)) {
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

    // Add flex-fill class if the flexFill prop is true
    const flexFillClass = flexFill ? 'flex-fill' : '';

    // Grid item spanning and hover affordance
    const spanClass = span ? `grid-span-${span}` : '';
    const hoverableClass = hoverable ? 'container-hoverable' : '';

    const backgroundClass = getBackgroundClass({
        background, backgroundTone, backgroundIntensity, backgroundSize, backgroundMotion, backgroundFade, backgroundColor
    });

    // Pass all props to DOM
    const domProps = props;

    // Merge background style with user style, giving precedence to backgroundColor prop
    const mergedStyle = {
        ...props.style,
        ...getBackgroundStyle(),
        ...getCustomStyle()
    };

    const containerElement = (
        <Component
            ref={containerRef}
            {...domProps}
            {...triggerProps}
            style={mergedStyle}
            className={`container themed-container ${getLayoutClass()} ${getColumnsClass()} ${getGapClass()} ${getPaddingClass()} ${getAlignClass()} ${getJustifyClass()} ${getMarginClass()} ${getWrapClass()} ${getJustifySelfClass()} ${flexFillClass} ${spanClass} ${hoverableClass} ${genieConfig ? 'genie-trigger' : ''} ${backgroundClass} theme-${containerTheme} ${className}`}
            data-theme={containerTheme}
            data-theme-source={theme ? 'local' : 'inherited'}
            data-genie-position={genieConfig?.position || 'auto'}

        >
            {children}

            {/* Genie Integration */}
            {GeniePortal}
        </Component>
    );

    // If theme prop is provided, wrap with ThemeProvider for inheritance
    if (theme) {
        return (
            <ThemeProvider theme={theme}>
                {containerElement}
            </ThemeProvider>
        );
    }

    return containerElement;
});

export default Container;
