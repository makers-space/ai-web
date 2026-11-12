import React, { forwardRef, useMemo, useRef } from 'react';
import { ThemeProvider, useTheme } from '@contexts/ThemeContext';
import Typography from './Typography';
import Container from './Container';
import { useGeniePortal } from './Genie';

// =============================================================================
// DECORATIVE BACKGROUNDS
// =============================================================================
// Shared by Page, Container and Card through the `background*` props. Every
// pattern is drawn in CSS (styles/Page.css) from the active theme's color
// variables, so it follows theme changes and nested themes.

export const BACKGROUND_PATTERNS = [
    'grid', 'graph', 'dots', 'lines', 'diagonal', 'crosshatch',
    'checker', 'hex', 'plus', 'waves', 'zigzag', 'rings'
];

// Animated by default; pass backgroundMotion="none" for a still version.
export const BACKGROUND_DYNAMIC = ['aurora', 'gradient'];

export const BACKGROUNDS = [...BACKGROUND_PATTERNS, ...BACKGROUND_DYNAMIC];
export const BACKGROUND_TONES = ['auto', 'primary', 'secondary', 'tertiary', 'neutral', 'text', 'contrast'];

// Fill colors a pattern has to stay readable against (the backgroundColor prop).
const BACKGROUND_SURFACES = ['primary', 'secondary', 'tertiary'];

// Success, warning and error signal state; Page, Container and Card do not
// accept them as a fill color.
export const STATUS_COLORS = ['success', 'warning', 'error'];
export const BACKGROUND_INTENSITIES = ['subtle', 'medium', 'strong'];
export const BACKGROUND_SIZES = ['sm', 'md', 'lg'];
export const BACKGROUND_MOTIONS = ['none', 'drift', 'pulse'];
export const BACKGROUND_FADES = ['none', 'radial', 'radial-inverse', 'top', 'bottom', 'left', 'right', 'center'];

const pick = (value, allowed, fallback) => (allowed.includes(value) ? value : fallback);

/**
 * Class names for the background props shared by Page, Container and Card.
 *
 * background          pattern or dynamic background name ('none' / null for no background)
 * backgroundTone      theme color the pattern is drawn in; 'auto' picks one that contrasts with backgroundColor
 * backgroundColor     the component's own fill color, used by the 'auto' tone
 * backgroundIntensity how strongly the pattern shows
 * backgroundSize      scale of the repeating pattern
 * backgroundMotion    'drift' scrolls a pattern, 'pulse' breathes it, 'none' stops any animation
 * backgroundFade      fades the background out: 'radial' toward the edges, 'radial-inverse' toward a clear centre,
 *                     'top' / 'bottom' / 'left' / 'right' toward that side, 'center' from the left and right
 *                     edges toward a clear middle
 */
export function getBackgroundClass({
    background = null,
    backgroundTone = 'auto',
    backgroundIntensity = 'subtle',
    backgroundSize = 'md',
    backgroundMotion = null,
    backgroundFade = 'none',
    backgroundColor = null
} = {}) {
    if (!background || !BACKGROUNDS.includes(background)) return '';

    const classes = [
        'has-background',
        `bg-${background}`,
        `bg-tone-${pick(backgroundTone, BACKGROUND_TONES, 'auto')}`,
        `bg-intensity-${pick(backgroundIntensity, BACKGROUND_INTENSITIES, 'subtle')}`,
        `bg-size-${pick(backgroundSize, BACKGROUND_SIZES, 'md')}`
    ];
    if (BACKGROUND_SURFACES.includes(backgroundColor)) classes.push(`bg-on-${backgroundColor}`);
    if (BACKGROUND_MOTIONS.includes(backgroundMotion)) classes.push(`bg-motion-${backgroundMotion}`);
    if (backgroundFade && backgroundFade !== 'none' && BACKGROUND_FADES.includes(backgroundFade)) {
        classes.push(`bg-fade-${backgroundFade}`);
    }
    return classes.join(' ');
}

/**
 * Page - Enhanced base container component for all pages
 * Provides consistent layout structure and theme integration
 * Now includes Container-like layout capabilities and Genie integration
 *
 * Enhanced Features:
 * - Full layout support (flex, grid, multicolumn, etc.)
 * - Genie integration for page-level interactions
 * - Theme inheritance for nested components
 * - All Container layout props available at page level
 */
export const Page = forwardRef(({
    children,
    className = '',
    title = '',
    // Layout props (same as Container)
    layout = 'block', // 'block', 'flex', 'flex-wrap', 'flex-column', 'grid', 'multicolumn', 'positioned'
    columns = 1, // 1-6 for grid layouts, or 'auto', 'auto-sm', 'auto-lg'
    gap = 'lg', // 'none', 'xs', 'sm', 'md', 'lg', 'xl'
    padding = 'lg', // 'none', 'xs', 'sm', 'md', 'lg', 'xl'
    align = 'start', // 'start', 'center', 'end', 'stretch', 'baseline'
    justify = 'start', // 'start', 'center', 'end', 'between', 'around', 'evenly', 'wrap'
    width = null, // Custom width
    height = null, // Custom height
    minWidth = null, // Minimum width
    minHeight = null, // Minimum height
    maxWidth = null, // Maximum width
    maxHeight = null, // Maximum height
    theme = null, // Optional theme override for this page and its children
    // Decorative background drawn from the theme colors
    background = null, // 'grid', 'graph', 'dots', 'lines', 'diagonal', 'crosshatch', 'checker', 'hex', 'plus', 'waves', 'zigzag', 'rings', 'aurora', 'gradient'
    backgroundTone = 'auto', // 'auto' contrasts with backgroundColor; or 'primary', 'secondary', 'tertiary', 'neutral', 'text', 'contrast'
    backgroundIntensity = 'subtle', // 'subtle', 'medium', 'strong'
    backgroundSize = 'md', // 'sm', 'md', 'lg' - scale of the repeating pattern
    backgroundMotion = null, // 'drift', 'pulse', or 'none' to stop an animated background
    backgroundFade = 'none', // 'none', 'radial', 'radial-inverse', 'top', 'bottom', 'left', 'right', 'center'
    backgroundColor = null, // Fill color: 'background' (the default), 'surface', 'primary', 'secondary', 'tertiary' (status colors are not fills)
    // Genie integration props
    genie = null, // Genie content to show OR object with {trigger, content, position}
    genieTrigger = 'click', // 'click', 'hover', 'contextmenu'
    onGenieShow = null, // Callback when genie shows
    onGenieHide = null, // Callback when genie hides
    ...props
}, ref) => {
    const {currentTheme: globalTheme} = useTheme();
    const effectiveTheme = useTheme();

    // Use theme prop if provided, otherwise use effective theme from context
    const pageTheme = theme || effectiveTheme.currentTheme;

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
    const pageRef = ref || useRef(null);
    const {triggerProps, GeniePortal} = useGeniePortal(
        genieConfig,
        pageRef,
        onGenieShow,
        onGenieHide
    );

    // Layout class generation functions (same as Container)
    const getLayoutClass = () => {
        switch (layout) {
            case 'grid':
                return 'layout-grid';
            case 'flex':
                return 'layout-flex';
            case 'flex-wrap':
                return 'layout-flex-wrap';
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
            if (typeof columns === 'number' && columns >= 1 && columns <= 6) {
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

    const getAlignClass = () => {
        return `align-${align}`;
    };

    const getJustifyClass = () => {
        return `justify-${justify}`;
    };

    const backgroundClass = getBackgroundClass({
        background, backgroundTone, backgroundIntensity, backgroundSize, backgroundMotion, backgroundFade, backgroundColor
    });

    // Pass all props to DOM
    const domProps = props;

    // Merge user style
    const hasFill = backgroundColor && !STATUS_COLORS.includes(backgroundColor);
    const mergedStyle = {
        ...(hasFill && { backgroundColor: `var(--${backgroundColor}-color)` }),
        ...props.style
    };

    const pageElement = (
        <div
            ref={pageRef}
            {...domProps}
            {...triggerProps}
            style={mergedStyle}
            className={`page themed-page ${getLayoutClass()} ${getColumnsClass()} ${getGapClass()} ${getPaddingClass()} ${getAlignClass()} ${getJustifyClass()} ${genieConfig ? 'genie-trigger' : ''} ${backgroundClass} theme-${pageTheme} ${className}`}
            data-theme={pageTheme}
            data-theme-source={theme ? 'local' : 'inherited'}
            data-genie-position={genieConfig?.position || 'auto'}
        >
            {title && (
                <Container className="page-header">
                    <Typography as="h1" color='primary'>{title}</Typography>
                </Container>
            )}
            {children}

            {/* Genie Integration */}
            {GeniePortal}
        </div>
    );

    // If theme prop is provided, wrap with ThemeProvider for inheritance
    if (theme) {
        return (
            <ThemeProvider theme={theme}>
                {pageElement}
            </ThemeProvider>
        );
    }

    return pageElement;
});

export default Page;
