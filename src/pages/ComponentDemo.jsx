import React, { useState, useMemo, useCallback } from 'react';
import { useTheme } from '@contexts/ThemeContext';
import {
    Page,
    Container,
    Button,
    ButtonGroup,
    FloatingActionButton,
    Card,
    Input,
    Typography,
    Select,
    Switch,
    Badge,
    ProgressBar,
    CircularProgress,
    Icon,
    Data,
    TreeView,
    Editor,
    Flow,
    Image,
    Video,
    Audio,
    Model3D,
    BACKGROUNDS,
    BACKGROUND_TONES,
    BACKGROUND_INTENSITIES,
    BACKGROUND_SIZES,
    BACKGROUND_MOTIONS,
    BACKGROUND_FADES,
} from '@components/Components';

/**
 * Component Demo Refactored - Interactive Component Playground
 * 
 * Three-Section Layout:
 * 1. Component Selector - ButtonGroup to choose which component to demo
 * 2. Live Demo Area - Visual display of the selected component with current props
 * 3. Props Control Panel - Dynamic tabs with inputs/selects to modify component props in real-time
 */

// =============================================================================
// COMPONENT METADATA CONFIGURATION
// =============================================================================

const STANDARD_SIZES = ['xs', 'sm', 'md', 'lg', 'xl'];
const EXTENDED_TEXT_SIZES = [...STANDARD_SIZES, '2xl', '3xl', '4xl'];
const STATUS_COLORS = ['primary', 'secondary', 'tertiary', 'success', 'warning', 'error'];
const BADGE_COLORS = ['default', ...STATUS_COLORS];
const PROGRESS_COLORS = ['default', ...STATUS_COLORS];
const TREEVIEW_COLORS = ['default', 'surface', 'background', 'primary', 'secondary', 'tertiary'];
const THEME_OVERRIDES = [null, 'modern', 'dark', 'minimal', 'vibrant', 'admin', 'pink'];
const THEME_OPTION_LABELS = {
    null: 'Inherit Theme',
    modern: 'Modern',
    dark: 'Dark',
    minimal: 'Minimal',
    vibrant: 'Vibrant',
    admin: 'Admin',
    pink: 'Pink'
};
const FAB_SIZES = STANDARD_SIZES; // ['xs', 'sm', 'md', 'lg', 'xl']
const FAB_VARIANTS = STATUS_COLORS;
const FAB_POSITIONS = ['top-left', 'top', 'top-right', 'left', 'center', 'right', 'bottom-left', 'bottom', 'bottom-right'];
const FAB_PARENT_TYPES = ['auto', 'page', 'card', 'container'];
const COMMON_LAYOUTS = ['block', 'flex', 'flex-column', 'grid', 'multicolumn', 'positioned'];
const COMMON_GAPS = ['none', 'xs', 'sm', 'md', 'lg', 'xl'];
const COMMON_PADDING = ['none', 'xs', 'sm', 'md', 'lg', 'xl'];
const ALIGN_OPTIONS = ['start', 'center', 'end', 'stretch'];
const JUSTIFY_OPTIONS = ['start', 'center', 'end', 'between', 'around', 'evenly', 'wrap'];

// Decorative background props shared by Page, Container and Card
const BACKGROUND_DEFAULT_PROPS = {
    background: null,
    backgroundTone: 'auto',
    backgroundIntensity: 'subtle',
    backgroundSize: 'md',
    backgroundMotion: null,
    backgroundFade: 'none'
};

const BACKGROUND_PROP_CONFIGS = {
    background: {
        type: 'select',
        label: 'Background',
        group: 'Background',
        options: [null, ...BACKGROUNDS],
        optionLabels: { null: 'None' }
    },
    backgroundTone: {
        type: 'select',
        label: 'Tone (theme color)',
        group: 'Background',
        options: BACKGROUND_TONES
    },
    backgroundIntensity: {
        type: 'select',
        label: 'Intensity',
        group: 'Background',
        options: BACKGROUND_INTENSITIES
    },
    backgroundSize: {
        type: 'select',
        label: 'Pattern Size',
        group: 'Background',
        options: BACKGROUND_SIZES
    },
    backgroundMotion: {
        type: 'select',
        label: 'Motion',
        group: 'Background',
        options: [null, ...BACKGROUND_MOTIONS],
        optionLabels: { null: 'Default' }
    },
    backgroundFade: {
        type: 'select',
        label: 'Fade',
        group: 'Background',
        options: BACKGROUND_FADES
    }
};

// Genie configuration helpers - these create the actual genie objects
// MUST be defined BEFORE COMPONENT_METADATA so they're available when defaultProps are set
const createDataRowGenieConfig = (trigger = 'click') => ({
    trigger,
    variant: 'card',
    position: 'auto',
    content: (item) => (
        <Container layout="flex-column" gap="xs" padding="sm" width="220px">
            <Typography size="sm" weight="semibold">{item.name}</Typography>
            <Typography size="xs">{item.email}</Typography>
            <Typography size="xs">Role: {item.role}</Typography>
            <Badge size="sm" color={item.status === 'Active' ? 'success' : 'warning'}>
                {item.status}
            </Badge>
        </Container>
    )
});

const createFabGenieConfig = (trigger = 'click') => ({
    trigger,
    variant: 'popover',
    position: 'auto',
    content: ({ onClose }) => (
        <Container layout="flex-column" gap="sm" padding="sm" width="200px">
            <Typography size="sm" weight="semibold">Quick Actions</Typography>
            <Button size="sm" variant="ghost" onClick={onClose}>
                <Icon name="FiEdit" size="sm" /> Compose
            </Button>
            <Button size="sm" variant="ghost" onClick={onClose}>
                <Icon name="FiShare2" size="sm" /> Share
            </Button>
            <Button size="sm" variant="ghost" onClick={onClose}>
                <Icon name="FiSettings" size="sm" /> Settings
            </Button>
        </Container>
    )
});

const createButtonGenieConfig = (trigger = 'click') => ({
    trigger,
    variant: 'popover',
    position: 'auto',
    content: ({ onClose }) => (
        <Container layout="flex-column" gap="xs" padding="sm" width="180px">
            <Typography size="xs" weight="semibold">Button Actions</Typography>
            <Button size="xs" variant="ghost" onClick={onClose}>
                <Icon name="FiCopy" size="xs" /> Copy
            </Button>
            <Button size="xs" variant="ghost" onClick={onClose}>
                <Icon name="FiEdit2" size="xs" /> Edit
            </Button>
        </Container>
    )
});

const createCardGenieConfig = (trigger = 'click') => ({
    trigger,
    variant: 'popover',
    position: 'auto',
    content: ({ onClose }) => (
        <Container layout="flex-column" gap="xs" padding="sm" width="180px">
            <Typography size="xs" weight="semibold">Card Actions</Typography>
            <Button size="xs" variant="ghost" onClick={onClose}>
                <Icon name="FiMaximize2" size="xs" /> Expand
            </Button>
            <Button size="xs" variant="ghost" onClick={onClose}>
                <Icon name="FiShare2" size="xs" /> Share
            </Button>
        </Container>
    )
});

const createContainerGenieConfig = (trigger = 'click') => ({
    trigger,
    variant: 'popover',
    position: 'auto',
    content: ({ onClose }) => (
        <Container layout="flex-column" gap="xs" padding="sm" width="180px">
            <Typography size="xs" weight="semibold">Container Actions</Typography>
            <Button size="xs" variant="ghost" onClick={onClose}>
                <Icon name="FiLayout" size="xs" /> Configure
            </Button>
            <Button size="xs" variant="ghost" onClick={onClose}>
                <Icon name="FiCopy" size="xs" /> Duplicate
            </Button>
        </Container>
    )
});

const COMPONENT_METADATA = {
    Typography: {
        component: Typography,
        defaultProps: {
            children: 'Sample Text for Animation Demo ',
            as: 'p',
            size: 'xl',
            weight: 'bold',
            color: 'default',
            font: 'primary',
            theme: null,
            animation: 'blur',
            animateOn: 'mount',
            animationDelay: 0,
            animationDuration: 600,
            animationStagger: 50,
            animationConfig: {
                splitBy: 'words',
                direction: 'top',
                sequential: false,
                revealDirection: 'start',
                loop: false,
                showCursor: true,
                typingSpeed: 50,
                deletingSpeed: 30,
                borderColor: null,
            }
        },
        propConfigs: {
            children: { type: 'text', label: 'Text Content', group: 'Content' },
            size: {
                type: 'select',
                label: 'Size',
                group: 'Appearance',
                options: EXTENDED_TEXT_SIZES
            },
            weight: {
                type: 'select',
                label: 'Font Weight',
                group: 'Appearance',
                options: ['thin', 'extralight', 'light', 'normal', 'regular', 'medium', 'semibold', 'bold', 'extrabold', 'black']
            },
            color: {
                type: 'select',
                label: 'Color',
                group: 'Appearance',
                options: ['default', 'primary', 'secondary', 'tertiary', 'success', 'warning', 'error']
            },
            font: {
                type: 'select',
                label: 'Font Family',
                group: 'Appearance',
                options: ['primary', 'secondary', 'monospace']
            },
            theme: {
                type: 'select',
                label: 'Theme Override',
                group: 'Appearance',
                options: THEME_OVERRIDES,
                optionLabels: THEME_OPTION_LABELS
            },
            animation: {
                type: 'select',
                label: 'Animation Type',
                group: 'Animation',
                options: ['none', 'blur', 'fade', 'slide', 'decrypt', 'gradient', 'shiny', 'glitch', 'typewriter', 'circular', 'proximity', 'focus', 'scramble']
            },
            animateOn: {
                type: 'select',
                label: 'Trigger',
                group: 'Animation',
                options: ['mount', 'hover']
            },
            animationDelay: {
                type: 'number',
                label: 'Delay (ms)',
                group: 'Animation',
                min: 0,
                max: 5000
            },
            animationDuration: {
                type: 'number',
                label: 'Duration (ms)',
                group: 'Animation',
                min: 100,
                max: 5000
            },
            animationStagger: {
                type: 'number',
                label: 'Stagger (ms)',
                group: 'Animation',
                min: 0,
                max: 500
            },
            'animationConfig.splitBy': {
                type: 'select',
                label: 'Split By',
                group: 'Animation Config',
                options: ['chars', 'words'],
                applyTo: ['blur', 'fade', 'slide']
            },
            'animationConfig.direction': {
                type: 'select',
                label: 'Direction',
                group: 'Animation Config',
                options: ['top', 'bottom', 'left', 'right'],
                applyTo: ['blur', 'slide']
            },
            'animationConfig.sequential': {
                type: 'boolean',
                label: 'Sequential Reveal',
                group: 'Animation Config',
                applyTo: ['decrypt']
            },
            'animationConfig.revealDirection': {
                type: 'select',
                label: 'Reveal From',
                group: 'Animation Config',
                options: ['start', 'end', 'center'],
                applyTo: ['decrypt']
            },
            'animationConfig.loop': {
                type: 'boolean',
                label: 'Loop Animation',
                group: 'Animation Config',
                applyTo: ['typewriter']
            },
            'animationConfig.showCursor': {
                type: 'boolean',
                label: 'Show Cursor',
                group: 'Animation Config',
                applyTo: ['typewriter']
            },
            'animationConfig.typingSpeed': {
                type: 'number',
                label: 'Typing Speed (ms)',
                group: 'Animation Config',
                min: 10,
                max: 500,
                applyTo: ['typewriter']
            },
            'animationConfig.deletingSpeed': {
                type: 'number',
                label: 'Deleting Speed (ms)',
                group: 'Animation Config',
                min: 10,
                max: 500,
                applyTo: ['typewriter']
            },
            'animationConfig.spinDuration': {
                type: 'number',
                label: 'Spin Duration (ms)',
                group: 'Animation Config',
                min: 1000,
                max: 30000,
                applyTo: ['circular']
            },
            'animationConfig.onHover': {
                type: 'select',
                label: 'Hover Effect',
                group: 'Animation Config',
                options: ['speedUp', 'pause', 'reverse', 'grow'],
                applyTo: ['circular']
            },
            'animationConfig.circularSize': {
                type: 'number',
                label: 'Circle Size (px)',
                group: 'Animation Config',
                min: 100,
                max: 500,
                applyTo: ['circular']
            },
            'animationConfig.circularFontSize': {
                type: 'number',
                label: 'Font Size (px)',
                group: 'Animation Config',
                min: 12,
                max: 48,
                applyTo: ['circular']
            },
            'animationConfig.proximityRadius': {
                type: 'number',
                label: 'Proximity Radius (px)',
                group: 'Animation Config',
                min: 50,
                max: 300,
                applyTo: ['proximity']
            },
            'animationConfig.fromFontWeight': {
                type: 'number',
                label: 'Min Font Weight',
                group: 'Animation Config',
                min: 100,
                max: 900,
                step: 100,
                applyTo: ['proximity']
            },
            'animationConfig.toFontWeight': {
                type: 'number',
                label: 'Max Font Weight',
                group: 'Animation Config',
                min: 100,
                max: 900,
                step: 100,
                applyTo: ['proximity']
            },
            // Focus animation config
            'animationConfig.blurAmount': {
                type: 'number',
                label: 'Blur Amount (px)',
                group: 'Animation Config',
                min: 0,
                max: 20,
                step: 1,
                applyTo: ['focus']
            },
            'animationConfig.focusMode': {
                type: 'select',
                label: 'Focus Mode',
                group: 'Animation Config',
                options: ['auto', 'manual'],
                applyTo: ['focus']
            },
            'animationConfig.borderColor': {
                type: 'select',
                label: 'Border Color',
                group: 'Animation Config',
                options: [null, 'primary', 'secondary', 'tertiary', 'success', 'warning', 'error'],
                optionLabels: { null: 'None' },
                applyTo: ['focus']
            },
            'animationConfig.pauseDuration': {
                type: 'number',
                label: 'Pause Duration (ms)',
                group: 'Animation Config',
                min: 0,
                max: 5000,
                step: 100,
                applyTo: ['focus', 'typewriter']
            },
            // Scramble animation config
            'animationConfig.scrambleRadius': {
                type: 'number',
                label: 'Scramble Radius (px)',
                group: 'Animation Config',
                min: 50,
                max: 300,
                step: 10,
                applyTo: ['scramble']
            },
            'animationConfig.scrambleSpeed': {
                type: 'number',
                label: 'Scramble Speed',
                group: 'Animation Config',
                min: 0.1,
                max: 5,
                step: 0.1,
                applyTo: ['scramble']
            },
            'animationConfig.scrambleChars': {
                type: 'text',
                label: 'Scramble Characters',
                group: 'Animation Config',
                applyTo: ['scramble']
            }
        },
        description: 'Flexible typography component for all text content with animations'
    },
    Button: {
        component: Button,
        defaultProps: {
            children: 'Click Me',
            color: 'primary',
            variant: null,
            size: 'md',
            disabled: false,
            selected: false,
            icon: '',
            iconPosition: 'left',
            theme: null,
            genie: createButtonGenieConfig('click'),
            genieTrigger: 'click'
        },
        propConfigs: {
            children: { type: 'text', label: 'Button Text', group: 'Content' },
            icon: {
                type: 'text',
                label: 'Icon Name (Demo Only)',
                group: 'Content',
                placeholder: 'e.g., FiSave, FiEdit, FiTrash - Leave empty for no icon'
            },
            iconPosition: {
                type: 'select',
                label: 'Icon Position (Demo Only)',
                group: 'Content',
                options: ['left', 'right']
            },
            color: { 
                type: 'select', 
                label: 'Color', 
                group: 'Appearance',
                options: STATUS_COLORS
            },
            variant: {
                type: 'select',
                label: 'Variant',
                group: 'Appearance',
                options: [null, 'border-shadow', 'ghost', 'solid'],
                optionLabels: { null: 'Default', 'border-shadow': 'Border Shadow', 'ghost': 'Ghost', 'solid': 'Solid' }
            },
            size: {
                type: 'select',
                label: 'Size',
                group: 'Size',
                options: STANDARD_SIZES
            },
            theme: {
                type: 'select',
                label: 'Theme Override',
                group: 'Appearance',
                options: THEME_OVERRIDES,
                optionLabels: THEME_OPTION_LABELS
            },
            disabled: { type: 'boolean', label: 'Disabled', group: 'State' },
            selected: { type: 'boolean', label: 'Selected', group: 'State' },
            genieTrigger: {
                type: 'select',
                label: 'Genie Trigger',
                group: 'Genie',
                options: ['click', 'hover', 'contextmenu']
            }
        },
        description: 'Interactive button with theme support and multiple variants'
    },
    
    Input: {
        component: Input,
        defaultProps: {
            type: 'text',
            variant: 'default',
            color: 'primary',
            size: 'md',
            placeholder: 'Enter text...',
            label: 'Input Label',
            value: '',
            disabled: false,
            required: false,
            validationState: 'default',
            helpText: '',
            icon: '',
            iconPosition: 'left',
            multiline: false,
            rows: 3,
            theme: null
        },
        propConfigs: {
            type: {
                type: 'select',
                label: 'Input Type',
                group: 'Basic',
                options: ['text', 'password', 'email', 'search', 'checkbox', 'range']
            },
            variant: {
                type: 'select',
                label: 'Variant',
                group: 'Appearance',
                options: ['default', 'outline', 'filled', 'underline', 'floating']
            },
            color: {
                type: 'select',
                label: 'Color',
                group: 'Appearance',
                options: ['primary', 'secondary', 'tertiary']
            },
            size: {
                type: 'select',
                label: 'Size',
                group: 'Size',
                options: STANDARD_SIZES
            },
            placeholder: { type: 'text', label: 'Placeholder', group: 'Content' },
            label: { type: 'text', label: 'Label', group: 'Content' },
            helpText: { type: 'text', label: 'Help Text', group: 'Content' },
            icon: { type: 'text', label: 'Icon Name', group: 'Content', placeholder: 'e.g., FiSearch' },
            iconPosition: {
                type: 'select',
                label: 'Icon Position',
                group: 'Appearance',
                options: ['left', 'right']
            },
            disabled: { type: 'boolean', label: 'Disabled', group: 'State' },
            required: { type: 'boolean', label: 'Required', group: 'State' },
            validationState: {
                type: 'select',
                label: 'Validation State',
                group: 'State',
                options: ['default', 'success', 'warning', 'error']
            },
            multiline: { type: 'boolean', label: 'Multiline (Textarea)', group: 'Basic' },
            rows: { type: 'number', label: 'Rows (for Multiline)', group: 'Basic', min: 1, max: 20 },
            theme: {
                type: 'select',
                label: 'Theme Override',
                group: 'Appearance',
                options: THEME_OVERRIDES,
                optionLabels: THEME_OPTION_LABELS
            }
        },
        description: 'Versatile input component with multiple styles and validation states'
    },

    Select: {
        component: Select,
        defaultProps: {
            variant: 'default',
            color: 'primary',
            size: 'md',
            multiSelect: false,
            options: [
                { value: 'option1', label: 'Option 1' },
                { value: 'option2', label: 'Option 2' },
                { value: 'option3', label: 'Option 3' },
                { value: 'option4', label: 'Option 4' }
            ],
            value: 'option1',
            placeholder: 'Search options...',
            label: 'Select Label',
            disabled: false,
            validationState: 'default',
            helpText: '',
            theme: null
        },
        propConfigs: {
            variant: {
                type: 'select',
                label: 'Variant',
                group: 'Appearance',
                options: ['default', 'outline', 'filled', 'underline']
            },
            color: {
                type: 'select',
                label: 'Color',
                group: 'Appearance',
                options: ['primary', 'secondary', 'tertiary']
            },
            size: {
                type: 'select',
                label: 'Size',
                group: 'Size',
                options: STANDARD_SIZES
            },
            multiSelect: { type: 'boolean', label: 'Multi-Select Mode', group: 'Basic' },
            label: { type: 'text', label: 'Label', group: 'Content' },
            placeholder: { type: 'text', label: 'Placeholder', group: 'Content' },
            helpText: { type: 'text', label: 'Help Text', group: 'Content' },
            disabled: { type: 'boolean', label: 'Disabled', group: 'State' },
            validationState: {
                type: 'select',
                label: 'Validation State',
                group: 'State',
                options: ['default', 'success', 'warning', 'error']
            },
            theme: {
                type: 'select',
                label: 'Theme Override',
                group: 'Appearance',
                options: THEME_OVERRIDES,
                optionLabels: THEME_OPTION_LABELS
            }
        },
        description: 'Searchable dropdown with single or multi-select support'
    },

    Switch: {
        component: Switch,
        defaultProps: {
            checked: false,
            label: 'Toggle Switch',
            disabled: false,
            size: 'md',
            theme: null
        },
        propConfigs: {
            label: { type: 'text', label: 'Label', group: 'Content' },
            checked: { type: 'boolean', label: 'Checked', group: 'State' },
            disabled: { type: 'boolean', label: 'Disabled', group: 'State' },
            size: {
                type: 'select',
                label: 'Size',
                group: 'Size',
                options: STANDARD_SIZES
            },
            theme: {
                type: 'select',
                label: 'Theme Override',
                group: 'Appearance',
                options: THEME_OVERRIDES,
                optionLabels: THEME_OPTION_LABELS
            }
        },
        description: 'Toggle switch component for binary choices'
    },

    Badge: {
        component: Badge,
        defaultProps: {
            children: 'Badge',
            color: 'default',
            size: 'md',
            theme: null
        },
        propConfigs: {
            children: { type: 'text', label: 'Badge Text', group: 'Content' },
            color: {
                type: 'select',
                label: 'Color',
                group: 'Appearance',
                options: BADGE_COLORS
            },
            size: {
                type: 'select',
                label: 'Size',
                group: 'Size',
                options: STANDARD_SIZES
            },
            theme: {
                type: 'select',
                label: 'Theme Override',
                group: 'Appearance',
                options: THEME_OVERRIDES,
                optionLabels: THEME_OPTION_LABELS
            }
        },
        description: 'Small status indicator with theme colors'
    },

    ProgressBar: {
        component: ProgressBar,
        defaultProps: {
            value: 65,
            max: 100,
            size: 'md',
            showPercentage: true,
            showLabel: false,
            label: '',
            animated: false,
            striped: false,
            color: 'default',
            theme: null
        },
        propConfigs: {
            value: { type: 'number', label: 'Current Value', group: 'Content', min: 0, max: 100 },
            max: { type: 'number', label: 'Max Value', group: 'Content', min: 1, max: 100 },
            size: {
                type: 'select',
                label: 'Size',
                group: 'Size',
                options: STANDARD_SIZES
            },
            color: {
                type: 'select',
                label: 'Color',
                group: 'Appearance',
                options: PROGRESS_COLORS
            },
            showPercentage: { type: 'boolean', label: 'Show Percentage', group: 'Display' },
            showLabel: { type: 'boolean', label: 'Show Label', group: 'Display' },
            label: { type: 'text', label: 'Label Text', group: 'Content' },
            animated: { type: 'boolean', label: 'Animated', group: 'Appearance' },
            striped: { type: 'boolean', label: 'Striped Pattern', group: 'Appearance' },
            theme: {
                type: 'select',
                label: 'Theme Override',
                group: 'Appearance',
                options: THEME_OVERRIDES,
                optionLabels: THEME_OPTION_LABELS
            }
        },
        description: 'Progress indicator with multiple visual styles'
    },

    CircularProgress: {
        component: CircularProgress,
        defaultProps: {
            size: 'md',
            color: 'primary',
            speed: 'default',
            theme: null
        },
        propConfigs: {
            size: {
                type: 'select',
                label: 'Size',
                group: 'Size',
                options: STANDARD_SIZES
            },
            color: {
                type: 'select',
                label: 'Color',
                group: 'Appearance',
                options: STATUS_COLORS
            },
            speed: {
                type: 'select',
                label: 'Animation Speed',
                group: 'Appearance',
                options: ['slow', 'default', 'fast']
            },
            theme: {
                type: 'select',
                label: 'Theme Override',
                group: 'Appearance',
                options: THEME_OVERRIDES,
                optionLabels: THEME_OPTION_LABELS
            }
        },
        description: 'Circular loading spinner with animated rotation'
    },



    Icon: {
        component: Icon,
        defaultProps: {
            name: 'FiHome',
            size: 'md',
            color: 'primary',
            hover: false,
            clickable: false,
            theme: null
        },
        propConfigs: {
            name: { 
                type: 'text', 
                label: 'Icon Name (react-icons)', 
                group: 'Content',
                placeholder: 'e.g., FiHome, MdSettings'
            },
            size: {
                type: 'select',
                label: 'Size',
                group: 'Size',
                options: [...STANDARD_SIZES, '2xl']
            },
            color: {
                type: 'select',
                label: 'Color',
                group: 'Appearance',
                options: ['primary', 'secondary', 'tertiary', 'success', 'warning', 'error', 'text']
            },
            hover: { type: 'boolean', label: 'Hover Effect', group: 'Behavior' },
            clickable: { type: 'boolean', label: 'Clickable Style', group: 'Behavior' },
            theme: {
                type: 'select',
                label: 'Theme Override',
                group: 'Appearance',
                options: THEME_OVERRIDES,
                optionLabels: THEME_OPTION_LABELS
            }
        },
        description: 'Icon component supporting react-icons library'
    },

    Page: {
        component: Page,
        defaultProps: {
            layout: 'flex-column',
            gap: 'lg',
            padding: 'lg',
            align: 'start',
            justify: 'start',
            theme: null,
            backgroundColor: null,
            ...BACKGROUND_DEFAULT_PROPS
        },
        propConfigs: {
            layout: {
                type: 'select',
                label: 'Layout Type',
                group: 'Layout',
                options: COMMON_LAYOUTS
            },
            align: {
                type: 'select',
                label: 'Align Items',
                group: 'Layout',
                options: ALIGN_OPTIONS
            },
            justify: {
                type: 'select',
                label: 'Justify Content',
                group: 'Layout',
                options: JUSTIFY_OPTIONS
            },
            gap: {
                type: 'select',
                label: 'Gap',
                group: 'Spacing',
                options: COMMON_GAPS
            },
            padding: {
                type: 'select',
                label: 'Padding',
                group: 'Spacing',
                options: COMMON_PADDING
            },
            theme: {
                type: 'select',
                label: 'Theme Override',
                group: 'Appearance',
                options: THEME_OVERRIDES,
                optionLabels: THEME_OPTION_LABELS
            },
            backgroundColor: {
                type: 'select',
                label: 'Background Variant',
                group: 'Appearance',
                options: [null, 'surface', 'background', 'primary', 'secondary', 'tertiary'],
                optionLabels: { null: 'Theme Default' }
            },
            ...BACKGROUND_PROP_CONFIGS
        },
        description: 'Top-level page wrapper; changes here apply to this demo page itself'
    },
    Card: {
        component: Card,
        defaultProps: {
            padding: 'lg',
            layout: 'flex',
            gap: 'lg',
            columns: 1,
            align: 'center',
            justify: 'center',
            hover: true,
            elevation: 'md',
            width: '70%',
            innerWidth: '50%',
            innerHeight: '',
            backgroundColor: null,
            ...BACKGROUND_DEFAULT_PROPS,
            background: 'plus',
            genie: createCardGenieConfig('click'),
            genieTrigger: 'click'
        },
        propConfigs: {
            padding: {
                type: 'select',
                label: 'Padding',
                group: 'Spacing',
                options: COMMON_PADDING
            },
            elevation: {
                type: 'select',
                label: 'Elevation',
                group: 'Appearance',
                options: ['none', 'sm', 'md', 'lg', 'xl']
            },
            width: {
                type: 'text',
                label: 'Width',
                group: 'Layout',
                placeholder: 'e.g., fit-content, 300px'
            },
            height: {
                type: 'text',
                label: 'Height',
                group: 'Layout',
                placeholder: 'e.g., fit-content, 200px'
            },
            innerWidth: {
                type: 'text',
                label: 'Inner Cards Width',
                group: 'Layout',
                placeholder: 'e.g., 50%, 160px'
            },
            innerHeight: {
                type: 'text',
                label: 'Inner Cards Height',
                group: 'Layout',
                placeholder: 'e.g., 80px'
            },
            layout: {
                type: 'select',
                label: 'Layout Type',
                group: 'Layout',
                options: COMMON_LAYOUTS
            },
            gap: {
                type: 'select',
                label: 'Gap',
                group: 'Spacing',
                options: COMMON_GAPS
            },
            columns: {
                type: 'select',
                label: 'Grid Columns',
                group: 'Layout',
                options: [1, 2, 3, 4, 5, 6, 'auto']
            },
            align: {
                type: 'select',
                label: 'Align Items',
                group: 'Layout',
                options: ALIGN_OPTIONS
            },
            justify: {
                type: 'select',
                label: 'Justify Content',
                group: 'Layout',
                options: JUSTIFY_OPTIONS
            },
            hover: { type: 'boolean', label: 'Enable Hover Effects', group: 'Appearance' },
            backgroundColor: {
                type: 'select',
                label: 'Background Variant',
                group: 'Appearance',
                options: [null, 'surface', 'background', 'primary', 'secondary', 'tertiary'],
                optionLabels: { null: 'Theme Default' }
            },
            ...BACKGROUND_PROP_CONFIGS,
            genieTrigger: {
                type: 'select',
                label: 'Genie Trigger',
                group: 'Genie',
                options: ['click', 'hover', 'contextmenu']
            }
        },
        description: 'Container with visible styling for content grouping'
    },

    Container: {
        component: Container,
        defaultProps: {
            layout: 'flex',
            align: 'center',
            justify: 'center',
            backgroundColor: null,
            ...BACKGROUND_DEFAULT_PROPS,
            genie: createContainerGenieConfig('click'),
            genieTrigger: 'click'
        },
        propConfigs: {
            width: {
                type: 'text',
                label: 'Width',
                group: 'Layout',
                placeholder: 'e.g., 100%, 300px'
            },
            height: {
                type: 'text',
                label: 'Height',
                group: 'Layout',
                placeholder: 'e.g., 100%, 200px'
            },
            align: {
                type: 'select',
                label: 'Align Items',
                group: 'Layout',
                options: ALIGN_OPTIONS
            },
            justify: {
                type: 'select',
                label: 'Justify Content',
                group: 'Layout',
                options: JUSTIFY_OPTIONS
            },
            backgroundColor: {
                type: 'select',
                label: 'Background Variant',
                group: 'Appearance',
                options: [null, 'surface', 'background', 'primary', 'secondary', 'tertiary'],
                optionLabels: { null: 'Theme Default' }
            },
            ...BACKGROUND_PROP_CONFIGS,
            genieTrigger: {
                type: 'select',
                label: 'Genie Trigger',
                group: 'Genie',
                options: ['click', 'hover', 'contextmenu']
            }
        },
        description: 'Flexible layout container with multiple layout modes'
    },

    ButtonGroup: {
        component: ButtonGroup,
        defaultProps: {
            children: null, // Will be handled specially
            size: 'md',
            spaced: false,
            theme: null
        },
        propConfigs: {
            size: {
                type: 'select',
                label: 'Size',
                group: 'Size',
                options: STANDARD_SIZES
            },
            spaced: { type: 'boolean', label: 'Add Spacing Between Buttons', group: 'Layout' },
            theme: {
                type: 'select',
                label: 'Theme Override',
                group: 'Appearance',
                options: THEME_OVERRIDES,
                optionLabels: THEME_OPTION_LABELS
            }
        },
        description: 'Groups buttons together with consistent sizing and shared styling'
    },

    TreeView: {
        component: TreeView,
        defaultProps: {
            data: {
                Documents: {
                    type: 'directory',
                    item: {
                        filePath: '/Documents',
                        type: 'directory',
                        fileName: 'Documents',
                        depth: 1,
                    },
                    children: {
                        Projects: {
                            type: 'directory',
                            item: {
                                filePath: '/Documents/Projects',
                                type: 'directory',
                                fileName: 'Projects',
                                depth: 2,
                            },
                            children: {
                                'Project Alpha.pdf': {
                                    type: 'file',
                                    item: {
                                        filePath: '/Documents/Projects/Project Alpha.pdf',
                                        type: 'file',
                                        fileName: 'Project Alpha.pdf',
                                        depth: 3,
                                    },
                                },
                                'Project Beta.docx': {
                                    type: 'file',
                                    item: {
                                        filePath: '/Documents/Projects/Project Beta.docx',
                                        type: 'file',
                                        fileName: 'Project Beta.docx',
                                        depth: 3,
                                    },
                                },
                            },
                        },
                        'Archive.zip': {
                            type: 'file',
                            item: {
                                filePath: '/Documents/Archive.zip',
                                type: 'file',
                                fileName: 'Archive.zip',
                                depth: 2,
                            },
                        },
                    },
                },
                Media: {
                    type: 'directory',
                    item: {
                        filePath: '/Media',
                        type: 'directory',
                        fileName: 'Media',
                        depth: 1,
                    },
                    children: {
                        'Logo.png': {
                            type: 'file',
                            item: {
                                filePath: '/Media/Logo.png',
                                type: 'file',
                                fileName: 'Logo.png',
                                depth: 2,
                            },
                        },
                    },
                },
            },
            expandedNodes: ['/Documents'],
            selectedNodes: [],
            searchable: false,
            color: 'default',
            size: 'md',
            showIcons: true,
            showConnectors: false,
            multiSelect: false,
            allowDragDrop: false,
            theme: null,
            getNodeGenie: (node) => ({
                trigger: 'contextmenu',
                variant: 'popover',
                position: 'auto',
                content: () => (
                    <Container layout="flex-column" gap="xs" padding="sm" width="220px">
                        <Typography size="sm" weight="semibold">{node.label}</Typography>
                        <Button size="sm" variant="ghost">
                            <Icon name="FiEye" size="sm" /> View
                        </Button>
                    </Container>
                )
            })
        },
        propConfigs: {
            searchable: { type: 'boolean', label: 'Enable Search', group: 'Features' },
            color: {
                type: 'select',
                label: 'Background Color',
                group: 'Appearance',
                options: TREEVIEW_COLORS
            },
            size: {
                type: 'select',
                label: 'Size',
                group: 'Appearance',
                options: STANDARD_SIZES
            },
            theme: {
                type: 'select',
                label: 'Theme Override',
                group: 'Appearance',
                options: THEME_OVERRIDES,
                optionLabels: THEME_OPTION_LABELS
            },
            showIcons: { type: 'boolean', label: 'Show Expand Icons', group: 'Features' },
            showConnectors: { type: 'boolean', label: 'Show Connectors', group: 'Features' },
            multiSelect: { type: 'boolean', label: 'Allow Multi-Select', group: 'Features' },
            allowDragDrop: { type: 'boolean', label: 'Enable Drag & Drop', group: 'Features' }
        },
        description: 'Hierarchical tree view for displaying nested data structures'
    },

    Data: {
        component: Data,
        defaultProps: {
            data: [
                { 
                    id: 1, 
                    name: 'John Doe', 
                    email: 'john@example.com', 
                    role: 'Admin', 
                    status: 'Active',
                    department: 'Engineering',
                    joinDate: '2022-01-15',
                    salary: 120000,
                    address: {
                        street: '123 Main St',
                        city: 'San Francisco',
                        state: 'CA',
                        zip: '94102'
                    },
                    skills: ['React', 'Node.js', 'Python', 'AWS'],
                    projects: [
                        { name: 'Project Alpha', role: 'Lead', status: 'Completed' },
                        { name: 'Project Beta', role: 'Contributor', status: 'In Progress' }
                    ],
                    metrics: {
                        tasksCompleted: 247,
                        avgRating: 4.8,
                        efficiency: 92
                    }
                },
                { 
                    id: 2, 
                    name: 'Jane Smith', 
                    email: 'jane@example.com', 
                    role: 'User', 
                    status: 'Active',
                    department: 'Design',
                    joinDate: '2021-06-20',
                    salary: 95000,
                    address: {
                        street: '456 Oak Ave',
                        city: 'Portland',
                        state: 'OR',
                        zip: '97201'
                    },
                    skills: ['Figma', 'Adobe XD', 'Sketch', 'CSS'],
                    projects: [
                        { name: 'UI Redesign', role: 'Lead', status: 'Completed' },
                        { name: 'Mobile App', role: 'Lead', status: 'In Progress' }
                    ],
                    metrics: {
                        tasksCompleted: 189,
                        avgRating: 4.9,
                        efficiency: 95
                    }
                },
                { 
                    id: 3, 
                    name: 'Bob Johnson', 
                    email: 'bob@example.com', 
                    role: 'User', 
                    status: 'Inactive',
                    department: 'Marketing',
                    joinDate: '2020-03-10',
                    salary: 75000,
                    address: {
                        street: '789 Pine Rd',
                        city: 'Austin',
                        state: 'TX',
                        zip: '78701'
                    },
                    skills: ['SEO', 'Content Marketing', 'Analytics'],
                    projects: [
                        { name: 'Campaign 2024', role: 'Manager', status: 'Completed' }
                    ],
                    metrics: {
                        tasksCompleted: 156,
                        avgRating: 4.5,
                        efficiency: 88
                    }
                },
                { 
                    id: 4, 
                    name: 'Alice Chen', 
                    email: 'alice@example.com', 
                    role: 'Manager', 
                    status: 'Active',
                    department: 'Engineering',
                    joinDate: '2019-09-01',
                    salary: 145000,
                    address: {
                        street: '321 Elm St',
                        city: 'Seattle',
                        state: 'WA',
                        zip: '98101'
                    },
                    skills: ['Leadership', 'System Design', 'Go', 'Kubernetes', 'DevOps'],
                    projects: [
                        { name: 'Infrastructure V2', role: 'Architect', status: 'In Progress' },
                        { name: 'Security Audit', role: 'Lead', status: 'Planning' },
                        { name: 'API Gateway', role: 'Lead', status: 'Completed' }
                    ],
                    metrics: {
                        tasksCompleted: 312,
                        avgRating: 4.95,
                        efficiency: 97
                    }
                },
                { 
                    id: 5, 
                    name: 'Carlos Rivera', 
                    email: 'carlos@example.com', 
                    role: 'User', 
                    status: 'Active',
                    department: 'Sales',
                    joinDate: '2023-02-14',
                    salary: 85000,
                    address: {
                        street: '555 Beach Blvd',
                        city: 'Miami',
                        state: 'FL',
                        zip: '33139'
                    },
                    skills: ['Salesforce', 'Negotiation', 'Client Relations'],
                    projects: [
                        { name: 'Q1 Sales Drive', role: 'Lead', status: 'Completed' },
                        { name: 'Enterprise Deals', role: 'Contributor', status: 'In Progress' }
                    ],
                    metrics: {
                        tasksCompleted: 98,
                        avgRating: 4.6,
                        efficiency: 89
                    }
                }
            ],
            fieldConfig: {
                name: {
                    component: Typography,
                    props: { weight: 'semibold', color: 'primary' }
                },
                email: {
                    component: Typography,
                    props: { font: 'monospace', color: 'muted' }
                },
                role: {
                    component: Badge,
                    transform: (value) => ({
                        color: value === 'Admin' ? 'error' : value === 'Manager' ? 'warning' : 'default',
                        children: value
                    })
                },
                status: {
                    component: Badge,
                    transform: (value) => ({
                        color: value === 'Active' ? 'success' : 'warning',
                        children: value
                    })
                },
                department: {
                    component: Badge,
                    transform: (value) => ({
                        color: value === 'Engineering' ? 'primary' : value === 'Design' ? 'secondary' : 'tertiary',
                        children: value
                    })
                },
                salary: {
                    component: Typography,
                    transform: (value) => ({
                        weight: 'semibold',
                        color: value >= 100000 ? 'success' : 'default',
                        children: `$${value.toLocaleString()}`
                    })
                }
            },
            variant: 'table',
            sortable: true,
            selector: false,
            pageSize: 10,
            theme: null,
            genie: createDataRowGenieConfig('click')
        },
        propConfigs: {
            size: {
                type: 'select',
                label: 'Component Size',
                group: 'Size',
                options: STANDARD_SIZES
            },
            variant: {
                type: 'select',
                label: 'Display Variant',
                group: 'Layout',
                options: ['table', 'cards', 'list']
            },
            sortable: { type: 'boolean', label: 'Enable Sorting', group: 'Features' },
            selector: { type: 'boolean', label: 'Enable Row Selection', group: 'Features' },
            pageSize: {
                type: 'number',
                label: 'Rows Per Page',
                group: 'Layout',
                min: 1,
                max: 100
            },
            theme: {
                type: 'select',
                label: 'Theme Override',
                group: 'Appearance',
                options: THEME_OVERRIDES,
                optionLabels: THEME_OPTION_LABELS
            }
        },
    description: 'Flexible data display with table, cards, and list variants'
    },

    Editor: {
        component: Editor,
        defaultProps: {
            mode: 'markdown',
            content: '# Hello World\n\nStart editing...',
            placeholder: 'Write something amazing...',
            readOnly: false,
            showToolbar: true,
            toolbarPosition: 'top',
            theme: null,
            filePath: 'example.js',
            diffContent: '# Previous Version\n\nThis version highlights what changed.',
            width: '100%',
            minHeight: '320px'
        },
        propConfigs: {
            mode: {
                type: 'select',
                label: 'Mode',
                group: 'Content',
                options: ['markdown', 'code', 'document'],
                optionLabels: {
                    markdown: 'Markdown (MDX)',
                    code: 'Code (Monaco)',
                    document: 'Document (Rich Text)'
                }
            },
            placeholder: { type: 'text', label: 'Placeholder', group: 'Content' },
            filePath: { type: 'text', label: 'File Path (code mode)', group: 'Content' },
            readOnly: { type: 'boolean', label: 'Read Only', group: 'Behavior' },
            showToolbar: { type: 'boolean', label: 'Show Toolbar', group: 'Toolbar' },
            toolbarPosition: {
                type: 'select',
                label: 'Toolbar Position',
                group: 'Toolbar',
                options: ['top', 'bottom', 'none']
            },
            theme: {
                type: 'select',
                label: 'Theme Override',
                group: 'Appearance',
                options: THEME_OVERRIDES,
                optionLabels: THEME_OPTION_LABELS
            },
            width: {
                type: 'select',
                label: 'Width',
                group: 'Layout',
                options: ['100%', '80%', '640px'],
                optionLabels: {
                    '100%': 'Full Width',
                    '80%': '80%',
                    '640px': '640px'
                }
            },
            minHeight: {
                type: 'select',
                label: 'Minimum Height',
                group: 'Layout',
                options: ['240px', '320px', '480px'],
                optionLabels: {
                    '240px': '240px',
                    '320px': '320px',
                    '480px': '480px'
                }
            },
            diffContent: { type: 'text', label: 'Diff Content', group: 'Advanced' }
        },
    description: 'Tri-modal editor: rich Markdown (MDX), code (Monaco), and rich-text document modes'
    },

    Flow: {
        component: Flow,
        defaultProps: {
            nodes: [
                // Backend Services Group (Subflow Container)
                {
                    id: 'backend-group',
                    type: 'group',
                    position: { x: 400, y: 100 },
                    style: { width: 600, height: 450 },
                    data: { 
                        label: 'Backend Services', 
                        color: 'primary',
                        fontSize: 'lg',
                        fontWeight: 'bold'
                    }
                },
                // Entry Point
                {
                    id: 'start',
                    type: 'editable',
                    position: { x: 50, y: 200 },
                    data: { 
                        label: 'Client Request', 
                        shape: 'circle', 
                        color: 'success',
                        fontSize: 'md',
                        fontWeight: 'bold',
                        textAlign: 'center'
                    }
                },
                // Nodes inside Backend Group (positions are relative to group)
                {
                    id: 'gateway',
                    type: 'editable',
                    position: { x: 30, y: 80 },
                    parentId: 'backend-group',
                    extent: 'parent',
                    data: { 
                        label: 'API Gateway', 
                        shape: 'rectangle', 
                        color: 'primary',
                        fontSize: 'md',
                        fontWeight: 'semibold',
                        textAlign: 'center'
                    }
                },
                {
                    id: 'auth',
                    type: 'editable',
                    position: { x: 230, y: 80 },
                    parentId: 'backend-group',
                    extent: 'parent',
                    data: { 
                        label: 'Auth Service', 
                        shape: 'rectangle', 
                        color: 'warning',
                        fontSize: 'sm',
                        fontWeight: 'medium',
                        textAlign: 'center'
                    }
                },
                {
                    id: 'business-logic',
                    type: 'editable',
                    position: { x: 430, y: 80 },
                    parentId: 'backend-group',
                    extent: 'parent',
                    data: { 
                        label: 'Business Logic', 
                        shape: 'rectangle', 
                        color: 'secondary',
                        fontSize: 'sm',
                        fontWeight: 'medium',
                        textAlign: 'center'
                    }
                },
                {
                    id: 'database',
                    type: 'editable',
                    position: { x: 230, y: 280 },
                    parentId: 'backend-group',
                    extent: 'parent',
                    data: { 
                        label: 'Database', 
                        shape: 'cylinder', 
                        color: 'tertiary',
                        fontSize: 'md',
                        fontWeight: 'bold',
                        textAlign: 'center'
                    }
                },
                // External nodes
                {
                    id: 'response',
                    type: 'editable',
                    position: { x: 1150, y: 200 },
                    data: { 
                        label: 'Response', 
                        shape: 'circle', 
                        color: 'success',
                        fontSize: 'md',
                        fontWeight: 'bold',
                        textAlign: 'center'
                    }
                }
            ],
            edges: [
                // External to group
                { 
                    id: 'e-start-gateway', 
                    source: 'start', 
                    target: 'gateway',
                    sourceHandle: 'right-source',
                    targetHandle: 'left-target',
                    label: 'HTTP Request',
                    type: 'default', 
                    animated: true,
                    data: { color: 'primary' },
                    markerEnd: { type: 'arrowclosed' }
                },
                // Internal group connections
                { 
                    id: 'e-gateway-auth', 
                    source: 'gateway', 
                    target: 'auth',
                    sourceHandle: 'right-source',
                    targetHandle: 'left-target',
                    type: 'default', 
                    animated: true,
                    data: { color: 'primary' },
                    markerEnd: { type: 'arrowclosed' }
                },
                { 
                    id: 'e-auth-logic', 
                    source: 'auth', 
                    target: 'business-logic',
                    sourceHandle: 'right-source',
                    targetHandle: 'left-target',
                    type: 'default', 
                    animated: true,
                    data: { color: 'success' },
                    markerEnd: { type: 'arrowclosed' }
                },
                { 
                    id: 'e-logic-db', 
                    source: 'business-logic', 
                    target: 'database',
                    sourceHandle: 'bottom-source',
                    targetHandle: 'top-target',
                    label: 'Query',
                    type: 'default', 
                    animated: true,
                    data: { color: 'secondary' },
                    markerEnd: { type: 'arrowclosed' }
                },
                { 
                    id: 'e-db-logic', 
                    source: 'database', 
                    target: 'business-logic',
                    sourceHandle: 'right-source',
                    targetHandle: 'bottom-target',
                    label: 'Data',
                    type: 'default', 
                    animated: true,
                    data: { color: 'tertiary' },
                    markerEnd: { type: 'arrowclosed' }
                },
                // Group to external
                { 
                    id: 'e-logic-response', 
                    source: 'business-logic', 
                    target: 'response',
                    sourceHandle: 'right-source',
                    targetHandle: 'left-target',
                    label: 'Success',
                    type: 'default', 
                    animated: true,
                    data: { color: 'success' },
                    markerEnd: { type: 'arrowclosed' }
                }
            ],
            size: 'md',
            fitView: true,
            draggable: true,
            connectable: true,
            deletable: true,
            zoomable: true,
            pannable: false,
            selectable: true,
            enableNodeCreation: false,
            nodeCreationKey: 'ctrl',
            defaultNodeData: {
                label: 'New Node',
                color: 'primary',
                shape: 'rectangle'
            },
            controls: true,
            minimap: false,
            background: true,
            backgroundVariant: 'dots',
            theme: null,
            width: '100%'
        },
        propConfigs: {
            size: {
                type: 'select',
                label: 'Height Size',
                group: 'Layout',
                options: STANDARD_SIZES
            },
            fitView: { type: 'boolean', label: 'Fit View', group: 'Viewport' },
            draggable: { type: 'boolean', label: 'Draggable Nodes', group: 'Interaction' },
            connectable: { type: 'boolean', label: 'Connectable Nodes', group: 'Interaction' },
            deletable: { type: 'boolean', label: 'Deletable Elements', group: 'Interaction' },
            zoomable: { type: 'boolean', label: 'Enable Zoom', group: 'Interaction' },
            pannable: { type: 'boolean', label: 'Enable Panning', group: 'Interaction' },
            selectable: { type: 'boolean', label: 'Selectable Elements', group: 'Interaction' },
            enableNodeCreation: { type: 'boolean', label: 'Enable Node Creation', group: 'Interaction' },
            nodeCreationKey: {
                type: 'select',
                label: 'Node Creation Key',
                group: 'Interaction',
                options: ['ctrl', 'alt', 'none'],
                optionLabels: {
                    'ctrl': 'Ctrl/Cmd + Click',
                    'alt': 'Alt + Click',
                    'none': 'Click Only'
                }
            },
            controls: { type: 'boolean', label: 'Show Controls', group: 'UI Elements' },
            minimap: { type: 'boolean', label: 'Show Minimap', group: 'UI Elements' },
            background: { type: 'boolean', label: 'Show Background', group: 'UI Elements' },
            backgroundVariant: {
                type: 'select',
                label: 'Background Pattern',
                group: 'UI Elements',
                options: ['dots', 'lines', 'cross']
            },
            theme: {
                type: 'select',
                label: 'Theme Override',
                group: 'Appearance',
                options: THEME_OVERRIDES,
                optionLabels: THEME_OPTION_LABELS
            },
            width: {
                type: 'select',
                label: 'Container Width',
                group: 'Layout',
                options: ['100%', '80%', '600px', '800px'],
                optionLabels: {
                    '100%': 'Full Width',
                    '80%': '80%',
                    '600px': '600px',
                    '800px': '800px'
                }
            }
        },
        description: 'Interactive flow diagrams with React Flow - draggable, zoomable, connectable nodes. Features:\n\n• Right-click nodes to edit: label, color, shape, type, font size/weight/align\n• Right-click edges to customize: type, color, width, animation, labels\n• Double-click nodes for quick label editing\n• Create subflows: Right-click a node → Set "Node Type" to "Group (Subflow)" → Then assign other nodes as children by selecting a parent in their menu\n• Ctrl+Click to add new nodes (when enabled)\n• Drag nodes to reposition, connect handles to create edges\n\nSubflow Demo: The "Backend Services" group contains Auth, API Gateway, Business Logic, and Database nodes. Child nodes are constrained within parent bounds and can be edited independently.'
    },

    FloatingActionButton: {
        component: FloatingActionButton,
        defaultProps: {
            icon: 'FiPlus',
            variant: 'primary',
            size: 'md',
            position: 'bottom-right',
            disabled: false,
            draggable: false,
            badge: null,
            snapToEdges: true,
            snapThreshold: 100,
            edgePadding: 15,
            parentType: 'auto',
            theme: null,
            genie: createFabGenieConfig('click'),
            genieTrigger: 'click'
        },
        propConfigs: {
            icon: { 
                type: 'text', 
                label: 'Icon Name', 
                group: 'Content',
                placeholder: 'e.g., FiPlus, FiEdit, FiSettings, FiHeart, FiMail'
            },
            variant: {
                type: 'select',
                label: 'Variant',
                group: 'Appearance',
                options: FAB_VARIANTS
            },
            size: {
                type: 'select',
                label: 'Size',
                group: 'Size',
                options: FAB_SIZES
            },
            position: {
                type: 'select',
                label: 'Position',
                group: 'Layout',
                options: FAB_POSITIONS
            },
            disabled: { type: 'boolean', label: 'Disabled', group: 'State' },
            draggable: { type: 'boolean', label: 'Draggable', group: 'Behavior' },
            badge: {
                type: 'text',
                label: 'Badge Text',
                group: 'Content',
                placeholder: 'e.g., 5, New, !'
            },
            snapToEdges: { type: 'boolean', label: 'Snap To Edges', group: 'Behavior' },
            snapThreshold: { type: 'number', label: 'Snap Threshold (px)', group: 'Behavior', min: 10, max: 300 },
            edgePadding: { type: 'number', label: 'Edge Padding (px)', group: 'Behavior', min: 0, max: 100 },
            parentType: {
                type: 'select',
                label: 'Parent Type',
                group: 'Layout',
                options: FAB_PARENT_TYPES
            },
            theme: {
                type: 'select',
                label: 'Theme Override',
                group: 'Appearance',
                options: THEME_OVERRIDES,
                optionLabels: THEME_OPTION_LABELS
            },
            genieTrigger: {
                type: 'select',
                label: 'Genie Trigger',
                group: 'Genie',
                options: ['click', 'hover', 'contextmenu']
            }
        },
    description: 'Floating action button with fixed positioning and drag support'
    },

    Image: {
        component: Image,
        defaultProps: {
            src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop',
            alt: 'Demo landscape image',
            editable: true,
            size: 'md',
            fit: 'contain',
            controlsPlacement: 'bottom-right',
            allowDownload: true,
            fileName: 'edited-image',
            outputFormat: 'image/png',
            outputQuality: 0.92,
            theme: null
        },
        propConfigs: {
            src: {
                type: 'select',
                label: 'Image Source',
                group: 'Content',
                options: [
                    'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop',
                    'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&h=600&fit=crop',
                    'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=800&h=600&fit=crop',
                    'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=800&h=600&fit=crop'
                ],
                optionLabels: {
                    'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop': 'Mountain Landscape',
                    'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&h=600&fit=crop': 'Forest Scene',
                    'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=800&h=600&fit=crop': 'Beach Sunset',
                    'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=800&h=600&fit=crop': 'Desert Vista'
                }
            },
            alt: { type: 'text', label: 'Alt Text', group: 'Content' },
            editable: { type: 'boolean', label: 'Editable', group: 'Behavior' },
            size: {
                type: 'select',
                label: 'Size',
                group: 'Size',
                options: [null, 'xs', 'sm', 'md', 'lg', 'xl', 'full'],
                optionLabels: { null: 'Natural Size', xs: 'XS', sm: 'SM', md: 'MD', lg: 'LG', xl: 'XL', full: 'Full Width' }
            },
            fit: {
                type: 'select',
                label: 'Object Fit',
                group: 'Appearance',
                options: ['contain', 'cover', 'fill', 'none', 'scale-down']
            },
            controlsPlacement: {
                type: 'select',
                label: 'Controls Placement',
                group: 'Layout',
                options: ['top-left', 'top-right', 'bottom-left', 'bottom-right']
            },
            allowDownload: { type: 'boolean', label: 'Allow Download', group: 'Behavior' },
            fileName: { type: 'text', label: 'Download File Name', group: 'Behavior' },
            outputFormat: {
                type: 'select',
                label: 'Output Format',
                group: 'Behavior',
                options: ['image/png', 'image/jpeg', 'image/webp']
            },
            outputQuality: { type: 'number', label: 'Output Quality', group: 'Behavior', min: 0.1, max: 1, step: 0.1 },
            theme: {
                type: 'select',
                label: 'Theme Override',
                group: 'Appearance',
                options: THEME_OVERRIDES,
                optionLabels: THEME_OPTION_LABELS
            }
        },
        description: 'Enhanced image component with CSS-based editing (rotation, filters, transforms, crop)'
    },

    Video: {
        component: Video,
        defaultProps: {
            src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
            poster: 'https://images.unsplash.com/photo-1611162616475-46b635cb6868?w=1200&auto=format&fit=crop',
            autoPlay: false,
            loop: false,
            muted: false,
            volume: 0.8,
            aspectRatio: '16/9',
            width: '100%',
            color: 'default',
            theme: null
        },
        propConfigs: {
            src: {
                type: 'text',
                label: 'Video Source URL',
                group: 'Content',
                placeholder: 'https://example.com/video.mp4'
            },
            poster: {
                type: 'text',
                label: 'Poster Image URL',
                group: 'Content',
                placeholder: 'Optional poster image shown before playback'
            },
            autoPlay: { type: 'boolean', label: 'Autoplay', group: 'Playback' },
            loop: { type: 'boolean', label: 'Loop', group: 'Playback' },
            muted: { type: 'boolean', label: 'Muted', group: 'Playback' },
            volume: {
                type: 'number',
                label: 'Initial Volume',
                group: 'Playback',
                min: 0,
                max: 1,
                step: 0.05
            },
            aspectRatio: {
                type: 'select',
                label: 'Aspect Ratio',
                group: 'Layout',
                options: ['21/9', '16/9', '4/3', '1/1', '9/16'],
                optionLabels: {
                    '21/9': '21:9 Wide',
                    '16/9': '16:9 Standard',
                    '4/3': '4:3 Classic',
                    '1/1': 'Square',
                    '9/16': '9:16 Portrait'
                }
            },
            width: {
                type: 'select',
                label: 'Width',
                group: 'Layout',
                options: ['100%', '80%', '640px', '960px']
            },
            color: {
                type: 'select',
                label: 'Control Bar Color',
                group: 'Appearance',
                options: ['default', 'primary', 'secondary', 'tertiary'],
                optionLabels: {
                    'default': 'Default (Surface)',
                    'primary': 'Primary',
                    'secondary': 'Secondary',
                    'tertiary': 'Tertiary'
                }
            },
            theme: {
                type: 'select',
                label: 'Theme Override',
                group: 'Appearance',
                options: THEME_OVERRIDES,
                optionLabels: THEME_OPTION_LABELS
            }
        },
        description: 'Slim horizontal video player with hover-revealed controls and color variants'
    },

    Audio: {
        component: Audio,
        defaultProps: {
            src: 'https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3',
            title: 'Lofi Study',
            artist: 'FASSounds',
            album: 'Chill Beats Vol. 1',
            cover: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400&auto=format&fit=crop&q=80',
            autoPlay: false,
            loop: false,
            muted: false,
            initialVolume: 0.8,
            color: 'default',
            size: 'md',
            theme: null
        },
        propConfigs: {
            src: {
                type: 'text',
                label: 'Audio Source URL',
                group: 'Content',
                placeholder: 'https://example.com/audio.mp3'
            },
            title: {
                type: 'text',
                label: 'Track Title',
                group: 'Content',
                placeholder: 'Enter track title'
            },
            artist: {
                type: 'text',
                label: 'Artist Name',
                group: 'Content',
                placeholder: 'Enter artist name'
            },
            album: {
                type: 'text',
                label: 'Album Name',
                group: 'Content',
                placeholder: 'Enter album name'
            },
            cover: {
                type: 'text',
                label: 'Cover Image URL',
                group: 'Content',
                placeholder: 'Album or track cover image'
            },
            autoPlay: { type: 'boolean', label: 'Autoplay', group: 'Playback' },
            loop: { type: 'boolean', label: 'Loop', group: 'Playback' },
            muted: { type: 'boolean', label: 'Muted', group: 'Playback' },
            initialVolume: {
                type: 'number',
                label: 'Initial Volume',
                group: 'Playback',
                min: 0,
                max: 1,
                step: 0.05
            },
            size: {
                type: 'select',
                label: 'Size',
                group: 'Appearance',
                options: ['xs', 'sm', 'md', 'lg', 'xl'],
                optionLabels: {
                    'xs': 'XS (100px)',
                    'sm': 'Small (120px)',
                    'md': 'Medium (160px)',
                    'lg': 'Large (200px)',
                    'xl': 'XL (240px)'
                }
            },
            color: {
                type: 'select',
                label: 'Color Variant',
                group: 'Appearance',
                options: ['default', 'primary', 'secondary', 'tertiary'],
                optionLabels: {
                    'default': 'Default',
                    'primary': 'Primary',
                    'secondary': 'Secondary',
                    'tertiary': 'Tertiary'
                }
            },
            theme: {
                type: 'select',
                label: 'Theme Override',
                group: 'Appearance',
                options: THEME_OVERRIDES,
                optionLabels: THEME_OPTION_LABELS
            }
        },
        description: 'Spinning disc audio player with minimalist design and centered controls'
    },

    Model3D: {
        component: Model3D,
        defaultProps: {
            src: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/DamagedHelmet/glTF-Binary/DamagedHelmet.glb',
            alt: '3D Model Viewer',
            controls: true,
            autoRotate: false,
            autoRotateSpeed: 1,
            width: '100%',
            height: '500px',
            aspectRatio: null,
            backgroundColor: null,
            environment: 'studio',
            showGrid: false,
            showShadows: true,
            cameraFov: 50,
            theme: null
        },
        propConfigs: {
            src: {
                type: 'text',
                label: '3D Model URL',
                group: 'Content',
                placeholder: 'https://example.com/model.glb'
            },
            controls: {
                type: 'boolean',
                label: 'Orbit Controls',
                group: 'Interaction'
            },
            autoRotate: {
                type: 'boolean',
                label: 'Auto Rotate',
                group: 'Interaction'
            },
            autoRotateSpeed: {
                type: 'number',
                label: 'Rotation Speed',
                group: 'Interaction',
                min: 0.1,
                max: 5,
                step: 0.1
            },
            width: {
                type: 'select',
                label: 'Width',
                group: 'Layout',
                options: ['100%', '80%', '600px', '800px']
            },
            height: {
                type: 'select',
                label: 'Height',
                group: 'Layout',
                options: ['400px', '500px', '600px', '800px']
            },
            aspectRatio: {
                type: 'select',
                label: 'Aspect Ratio',
                group: 'Layout',
                options: [null, '16/9', '4/3', '1/1'],
                optionLabels: {
                    'null': 'None (use height)',
                    '16/9': '16:9',
                    '4/3': '4:3',
                    '1/1': 'Square'
                }
            },
            backgroundColor: {
                type: 'select',
                label: 'Background Color',
                group: 'Appearance',
                options: [null, 'transparent', 'background', 'surface', 'primary', 'secondary', 'tertiary', 'success', 'warning', 'error', 'neutral'],
                optionLabels: {
                    'null': 'Theme Default',
                    'transparent': 'Transparent',
                    'background': 'Background',
                    'surface': 'Surface',
                    'primary': 'Primary',
                    'secondary': 'Secondary',
                    'tertiary': 'Tertiary',
                    'success': 'Success',
                    'warning': 'Warning',
                    'error': 'Error',
                    'neutral': 'Neutral'
                }
            },
            environment: {
                type: 'select',
                label: 'Lighting Environment',
                group: 'Appearance',
                options: ['studio', 'sunset', 'dawn', 'night', 'warehouse', 'forest', 'apartment', 'city', 'park', 'lobby'],
                optionLabels: {
                    'studio': 'Studio (Neutral)',
                    'sunset': 'Sunset (Warm)',
                    'dawn': 'Dawn (Cool)',
                    'night': 'Night (Dark)',
                    'warehouse': 'Warehouse (Industrial)',
                    'forest': 'Forest (Natural)',
                    'apartment': 'Apartment (Interior)',
                    'city': 'City (Urban)',
                    'park': 'Park (Outdoor)',
                    'lobby': 'Lobby (Bright)'
                }
            },
            showGrid: {
                type: 'boolean',
                label: 'Show Ground Grid',
                group: 'Appearance'
            },
            showShadows: {
                type: 'boolean',
                label: 'Show Contact Shadows',
                group: 'Appearance'
            },
            cameraFov: {
                type: 'number',
                label: 'Camera FOV',
                group: 'Camera',
                min: 20,
                max: 100,
                step: 5
            },
            theme: {
                type: 'select',
                label: 'Theme Override',
                group: 'Appearance',
                options: THEME_OVERRIDES,
                optionLabels: THEME_OPTION_LABELS
            }
        },
        description: 'Interactive 3D model viewer with orbit controls, multiple lighting presets, and auto-rotation'
    },
};
const DEFAULT_COMPONENT = Object.keys(COMPONENT_METADATA)[0];

const cloneDefaultPropsForComponent = (componentName) => {
    const metadata = COMPONENT_METADATA[componentName];
    if (!metadata?.defaultProps) {
        return {};
    }

    return { ...metadata.defaultProps };
};

const generateJSXPreview = (componentName, props = {}) => {
    if (!componentName) {
        return '';
    }

    // Extract complex props that need special handling
    // We'll add genie props back in a readable format
    const { 
        children, 
        genie, 
        getNodeGenie, 
        data, 
        options, 
        expandedNodes, 
        selectedNodes, 
        content, 
        diffContent, 
        fieldConfig, 
        genieTrigger, 
        onGenieShow, 
        onGenieHide, 
        nodes, 
        edges, 
        innerWidth,
        innerHeight,
        ...restProps 
    } = props;
    
    // Create a mutable copy of props to display
    const displayProps = { ...restProps };

    // Special handling for Button icon props which are not native to Button but used in demo
    if (componentName === 'Button') {
        delete displayProps.icon;
        delete displayProps.iconPosition;
    }

    // Generate JSX props with proper formatting
    const propStrings = Object.entries(displayProps)
        .filter(([_, value]) => value !== null && value !== undefined)
        .map(([key, value]) => {
            if (typeof value === 'boolean') {
                return value ? key : `${key}={false}`;
            }
            if (typeof value === 'string') {
                return `${key}="${value}"`;
            }
            if (typeof value === 'number') {
                return `${key}={${value}}`;
            }
            return `${key}={${JSON.stringify(value)}}`;
        });
    
    // Add options for Select
    if (componentName === 'Select' && options) {
        const optionsPreview = JSON.stringify(options, null, 2).split('\n').join('\n  ');
        propStrings.push(`options={${optionsPreview}}`);
    }

    // Add content and diffContent for Editor
    if (componentName === 'Editor') {
        if (content) propStrings.push(`content={${JSON.stringify(content)}}`);
        if (diffContent) propStrings.push(`diffContent={${JSON.stringify(diffContent)}}`);
    }

    // Add nodes and edges for Flow
    if (componentName === 'Flow') {
        if (nodes) {
             // Abbreviate nodes if too many
             const nodesPreview = nodes.length > 2 
                ? `[\n    ${JSON.stringify(nodes[0], null, 2).split('\n').join('\n    ')},\n    // ... ${nodes.length - 1} more nodes\n  ]`
                : JSON.stringify(nodes, null, 2).split('\n').join('\n  ');
             propStrings.push(`nodes={${nodesPreview}}`);
        }
        if (edges) {
             const edgesPreview = edges.length > 2
                ? `[\n    ${JSON.stringify(edges[0], null, 2).split('\n').join('\n    ')},\n    // ... ${edges.length - 1} more edges\n  ]`
                : JSON.stringify(edges, null, 2).split('\n').join('\n  ');
             propStrings.push(`edges={${edgesPreview}}`);
        }
    }

    // Add genie props if present (show in readable format)
    if (genie && typeof genie === 'object') {
        propStrings.push(`genie={{
    trigger: '${genie.trigger || genieTrigger || 'click'}',
    variant: '${genie.variant || 'popover'}',
    position: '${genie.position || 'auto'}',
    content: (props) => <YourGenieContent {...props} />
  }}`);
    } else if (genieTrigger) {
        propStrings.push(`genieTrigger="${genieTrigger}"`);
    }
    
    // Add getNodeGenie for TreeView
    if (getNodeGenie && typeof getNodeGenie === 'function') {
        const actualTrigger = genieTrigger || 'click';
        propStrings.push(`getNodeGenie={(node) => ({
    trigger: '${actualTrigger}',
    variant: 'popover',
    content: (props) => <YourGenieContent node={node} {...props} />
  })}`);
    }
    
    let childrenText = typeof children === 'string' ? children : '';

    // Special case: Button with icons
    if (componentName === 'Button' && (props.icon || childrenText)) {
        const iconElement = props.icon ? `<Icon name="${props.icon}" />` : '';
        const iconPos = props.iconPosition || 'left';
        
        if (props.icon) {
            if (iconPos === 'left') {
                childrenText = iconElement ? `${iconElement} ${childrenText}` : childrenText;
            } else {
                childrenText = iconElement ? `${childrenText} ${iconElement}` : childrenText;
            }
        }
    }
    
    // Special case: Data component - show abbreviated data and fieldConfig
    if (componentName === 'Data') {
        const complexProps = [];
        
        // Add data prop with abbreviated content
        if (data && Array.isArray(data) && data.length > 0) {
            const dataPreview = data.length <= 2 
                ? JSON.stringify(data, null, 2)
                : `[\n    ${JSON.stringify(data[0], null, 2).split('\n').join('\n    ')},\n    // ... ${data.length - 1} more items\n  ]`;
            complexProps.push(`  data={${dataPreview.split('\n').join('\n    ')}}`);
        }
        
        // Add fieldConfig prop with abbreviated content
        if (fieldConfig && Object.keys(fieldConfig).length > 0) {
            const fields = Object.keys(fieldConfig);
            const fieldConfigPreview = `{\n    ${fields.slice(0, 2).map(field => {
                const config = fieldConfig[field];
                if (config.transform) {
                    return `${field}: {\n      component: ${config.component.name},\n      transform: (value) => ({ /* styling logic */ })\n    }`;
                }
                return `${field}: {\n      component: ${config.component.name},\n      props: ${JSON.stringify(config.props)}\n    }`;
            }).join(',\n    ')}${fields.length > 2 ? `,\n    // ... ${fields.length - 2} more fields` : ''}\n  }`;
            complexProps.push(`  fieldConfig={${fieldConfigPreview.split('\n').join('\n    ')}}`);
        }
        
        // Combine all props
        const allProps = [...complexProps, ...propStrings.map(prop => `  ${prop}`)].join('\n');
        
        if (complexProps.length === 0 && propStrings.length === 0) {
            return `<Data />`;
        }
        
        return `<Data\n${allProps}\n/>`;
    }
    
    // Special case: TreeView - show abbreviated data prop
    if (componentName === 'TreeView') {
        const complexProps = [];
        
        // Add data prop with abbreviated content
        if (data && typeof data === 'object') {
            const topLevelKeys = Object.keys(data);
            const firstKey = topLevelKeys[0];
            const firstNode = data[firstKey];
            
            // Show first node structure with children abbreviated
            const dataPreview = `{\n    ${firstKey}: {\n      type: "${firstNode.type}",\n      item: { /* node metadata */ },\n      children: { /* nested nodes */ }\n    }${topLevelKeys.length > 1 ? `,\n    // ... ${topLevelKeys.length - 1} more nodes` : ''}\n  }`;
            complexProps.push(`  data={${dataPreview.split('\n').join('\n    ')}}`);
        }
        
        // Combine all props
        const allProps = [...complexProps, ...propStrings.map(prop => `  ${prop}`)].join('\n');
        
        if (complexProps.length === 0 && propStrings.length === 0) {
            return `<TreeView />`;
        }
        
        return `<TreeView\n${allProps}\n/>`;
    }
    
    // Special case: ButtonGroup always shows nested buttons
    if (componentName === 'ButtonGroup') {
        const buttonGroupChildren = `  <Button color="primary">Option 1</Button>
  <Button color="secondary">Option 2</Button>
  <Button color="tertiary">Option 3</Button>`;
        
        if (propStrings.length === 0) {
            return `<ButtonGroup>\n${buttonGroupChildren}\n</ButtonGroup>`;
        }
        if (propStrings.length === 1) {
            return `<ButtonGroup ${propStrings[0]}>\n${buttonGroupChildren}\n</ButtonGroup>`;
        }
        const propsFormatted = propStrings.map(prop => `  ${prop}`).join('\n');
        return `<ButtonGroup\n${propsFormatted}\n>\n${buttonGroupChildren}\n</ButtonGroup>`;
    }
    
    // Standard formatting for all other components
    if (propStrings.length === 0) {
        return childrenText 
            ? `<${componentName}>${childrenText}</${componentName}>`
            : `<${componentName} />`;
    }
    
    if (propStrings.length === 1) {
        const propsLine = propStrings[0];
        return childrenText
            ? `<${componentName} ${propsLine}>${childrenText}</${componentName}>`
            : `<${componentName} ${propsLine} />`;
    }
    
    // Multiple props - format on separate lines
    const propsFormatted = propStrings.map(prop => `  ${prop}`).join('\n');
    
    if (childrenText) {
        return `<${componentName}
${propsFormatted}
>
  ${childrenText}
</${componentName}>`;
    }
    
    return `<${componentName}
${propsFormatted}
/>`;
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const ComponentDemoRefactoredNew = () => {
    const { currentTheme, switchTheme, availableThemes } = useTheme();
    
    // State management
    const [selectedComponent, setSelectedComponent] = useState(DEFAULT_COMPONENT);
    const [componentProps, setComponentProps] = useState(() => cloneDefaultPropsForComponent(DEFAULT_COMPONENT));
    const [pageProps, setPageProps] = useState(() => cloneDefaultPropsForComponent('Page'));
    const activePageProps = selectedComponent === 'Page' ? componentProps : pageProps;

    const jsxPreview = useMemo(
        () => generateJSXPreview(selectedComponent, componentProps),
        [selectedComponent, componentProps]
    );


    // Handle prop change from controls
    const handlePropChange = (propName, value) => {
        setComponentProps(prev => {
            const updated = {
                ...prev,
                [propName]: value
            };
            
            // If genieTrigger changes, rebuild the genie object with new trigger
            if (propName === 'genieTrigger') {
                switch (selectedComponent) {
                    case 'Button':
                        if (prev.genie) updated.genie = createButtonGenieConfig(value);
                        break;
                    case 'Card':
                        if (prev.genie) updated.genie = createCardGenieConfig(value);
                        break;
                    case 'Container':
                        if (prev.genie) updated.genie = createContainerGenieConfig(value);
                        break;
                    case 'Data':
                        if (prev.genie) updated.genie = createDataRowGenieConfig(value);
                        break;
                    case 'FloatingActionButton':
                        if (prev.genie) updated.genie = createFabGenieConfig(value);
                        break;
                    case 'TreeView':
                        // TreeView uses getNodeGenie, which receives trigger from the function
                        updated.getNodeGenie = (node) => ({
                            trigger: value,
                            variant: 'popover',
                            position: 'auto',
                            content: () => (
                                <Container layout="flex-column" gap="xs" padding="sm" width="220px">
                                    <Typography size="sm" weight="semibold">{node.label}</Typography>
                                    <Button size="sm" variant="ghost">
                                        <Icon name="FiEye" size="sm" /> View
                                    </Button>
                                </Container>
                            )
                        });
                        break;
                }
            }
            
            return updated;
        });
    };

    const handleComponentSelect = (componentName) => {
        const metadata = COMPONENT_METADATA[componentName];
        if (!metadata) return;

        // Page props drive the real page, so they outlive the Page section.
        if (selectedComponent === 'Page') setPageProps(componentProps);

        setSelectedComponent(componentName);
        setComponentProps(componentName === 'Page' ? pageProps : cloneDefaultPropsForComponent(componentName));
    };

    const handleTreeNodeExpand = useCallback((nodeId, isExpanded) => {
        setComponentProps(prev => {
            const previous = Array.isArray(prev.expandedNodes) ? prev.expandedNodes : [];
            const updated = new Set(previous);

            if (isExpanded) {
                updated.add(nodeId);
            } else {
                updated.delete(nodeId);
            }

            return {
                ...prev,
                expandedNodes: Array.from(updated)
            };
        });
    }, [setComponentProps]);

    const handleTreeNodeSelect = useCallback((nodeId, _isSelected, selectedIds) => {
        setComponentProps(prev => ({
            ...prev,
            selectedNodes: Array.isArray(selectedIds) ? selectedIds : []
        }));
    }, [setComponentProps]);

    // Render prop control based on type
    const renderPropControl = (propName, config) => {
        // Handle nested animationConfig properties
        const isNestedConfig = propName.startsWith('animationConfig.');
        const actualPropName = isNestedConfig ? propName.split('.')[1] : propName;
        
        // For animation config props, check if they apply to current animation
        if (isNestedConfig && config.applyTo) {
            const currentAnimation = componentProps.animation;
            if (!config.applyTo.includes(currentAnimation)) {
                return null; // Don't render this control for current animation type
            }
        }
        
        const value = isNestedConfig 
            ? componentProps.animationConfig?.[actualPropName]
            : componentProps[propName];

        const handleChange = (newValue) => {
            if (isNestedConfig) {
                handlePropChange('animationConfig', {
                    ...componentProps.animationConfig,
                    [actualPropName]: newValue
                });
            } else {
                handlePropChange(propName, newValue);
            }
        };

        switch (config.type) {
            case 'boolean':
                return (
                    <Container 
                        layout="flex-column" 
                        align="start" 
                        gap="xs" 
                        padding="none"
                        minWidth="200px"
                        key={propName}
                    >
                        <Switch
                            checked={value || false}
                            onChange={(e) => handleChange(e.target.checked)}
                            label={config.label}
                            size="sm"
                        />
                    </Container>
                );

            case 'select':
                return (
                    <Container 
                        layout="flex-column" 
                        gap="xs" 
                        padding="none"
                        minWidth="200px"
                        key={propName}
                    >
                        <Select
                            label={config.label}
                            value={value === null ? 'null' : value}
                            onChange={(selectedValue) => {
                                // Convert 'null' string back to actual null
                                const normalized = Array.isArray(selectedValue)
                                    ? selectedValue.map(v => v === 'null' ? null : v)
                                    : selectedValue === 'null' ? null : selectedValue;
                                handleChange(normalized);
                            }}
                            options={config.options.map(opt => ({
                                value: opt === null ? 'null' : opt,
                                label: config.optionLabels?.[opt] || (opt === null ? 'None' : String(opt))
                            }))}
                            size="sm"
                            variant="outline"
                        />
                    </Container>
                );

            case 'number':
                return (
                    <Container 
                        layout="flex-column" 
                        gap="xs" 
                        padding="none"
                        minWidth="200px"
                        key={propName}
                    >
                        <Input
                            type="number"
                            label={config.label}
                            value={value || ''}
                            onChange={(e) => handleChange(parseFloat(e.target.value) || 0)}
                            size="sm"
                            variant="outline"
                            {...(config.min !== undefined && { min: config.min })}
                            {...(config.max !== undefined && { max: config.max })}
                        />
                    </Container>
                );

            case 'text':
            default:
                return (
                    <Container 
                        layout="flex-column" 
                        gap="xs" 
                        padding="none"
                        minWidth="200px"
                        key={propName}
                    >
                        <Input
                            type="text"
                            label={config.label}
                            value={value || ''}
                            onChange={(e) => handleChange(e.target.value)}
                            placeholder={config.placeholder}
                            size="sm"
                            variant="outline"
                        />
                    </Container>
                );
        }
    };

    // Render live demo based on selected component - using useMemo for proper re-rendering
    const liveDemo = useMemo(() => {
        const metadata = COMPONENT_METADATA[selectedComponent];
        if (!metadata) return null;

        const ComponentToRender = metadata.component;
        const effectiveProps = componentProps;

        if (selectedComponent === 'Select') {
            return (
                <ComponentToRender
                    {...effectiveProps}
                    onChange={(selectedValue) => handlePropChange('value', selectedValue)}
                />
            );
        }

        if (selectedComponent === 'Switch') {
            return (
                <ComponentToRender
                    {...effectiveProps}
                    onChange={(e) => handlePropChange('checked', e.target.checked)}
                />
            );
        }

        if (selectedComponent === 'Input') {
            return (
                <ComponentToRender
                    {...effectiveProps}
                    onChange={(e) => handlePropChange('value', e.target.value)}
                />
            );
        }

        if (selectedComponent === 'Button') {
            const { icon, iconPosition, children, ...restProps } = effectiveProps;
            
            return (
                <ComponentToRender {...restProps}>
                    {icon && iconPosition === 'left' && <Icon name={icon} />}
                    {children}
                    {icon && iconPosition === 'right' && <Icon name={icon} />}
                </ComponentToRender>
            );
        }

        if (selectedComponent === 'ButtonGroup') {
            return (
                <ComponentToRender {...effectiveProps}>
                    <Button color="primary">Option 1</Button>
                    <Button color="secondary">Option 2</Button>
                    <Button color="tertiary">Option 3</Button>
                </ComponentToRender>
            );
        }

        if (selectedComponent === 'TreeView') {
            return (
                <Container width="100%" maxWidth="400px" padding="none">
                    <ComponentToRender
                        {...effectiveProps}
                        onNodeExpand={handleTreeNodeExpand}
                        onNodeSelect={handleTreeNodeSelect}
                    />
                </Container>
            );
        }

        if (selectedComponent === 'Data') {
            return (
                <Container width="100%" padding="none">
                    <ComponentToRender {...effectiveProps} />
                </Container>
            );
        }

        if (selectedComponent === 'Editor') {
            return (
                <Container width="100%" minHeight="300px" padding="none">
                    <ComponentToRender
                        {...effectiveProps}
                        onChange={(content) => handlePropChange('content', content)}
                    />
                </Container>
            );
        }

        if (selectedComponent === 'Flow') {
            return (
                <Container width="100%" minHeight="300px" padding="none">
                    <ComponentToRender
                        {...effectiveProps}
                        onChange={({ nodes, edges }) => {
                            handlePropChange('nodes', nodes);
                            handlePropChange('edges', edges);
                        }}
                    />
                </Container>
            );
        }

        if (selectedComponent === 'FloatingActionButton') {
            return (
                <Container
                    width="100%"
                    height="300px"
                    padding="md"
                    layout="positioned"
                    style={{
                        border: '1px dashed var(--border-color)',
                        borderRadius: 'var(--border-radius)'
                    }}
                >
                    <Container padding="none" width="100%">
                        <Typography size="sm">
                            FAB is positioned relative to this container
                        </Typography>
                    </Container>
                    <ComponentToRender
                        {...effectiveProps}
                    />
                </Container>
            );
        }

        if (selectedComponent === 'Page') {
            return (
                <Container layout="flex-column" align="center" gap="xs" padding="none">
                    <Icon name="FiLayout" size="lg" color="primary" />
                    <Typography weight="semibold">Page</Typography>
                    <Typography size="sm" color="muted" align="center">
                        These props are applied to the page behind this demo.
                    </Typography>
                </Container>
            );
        }

        if (selectedComponent === 'Card') {
            // Extract layout-related props from componentProps
            const { layout, gap, align, justify, columns, padding, elevation, backgroundColor, children, width, height, innerWidth, innerHeight, genie, genieTrigger, ...restProps } = effectiveProps;
            // The genie belongs to the inner cards; the outer card stays a plain surface.
            const innerSize = { width: innerWidth || undefined, height: innerHeight || undefined, genie, genieTrigger };
            
            return (
                <ComponentToRender
                    layout={layout}
                    gap={gap}
                    align={align}
                    justify={justify}
                    columns={columns}
                    padding={padding}
                    elevation={elevation}
                    backgroundColor={backgroundColor}
                    width={width || 'fit-content'}
                    height={height || 'fit-content'}
                    {...restProps}
                >
                    <Card padding="md" backgroundColor="primary" {...innerSize}>
                        <Typography weight="bold" color="white">Primary</Typography>
                    </Card>
                    
                    <Card padding="md" backgroundColor="secondary" {...innerSize}>
                        <Typography weight="bold" color="white">Secondary</Typography>
                    </Card>

                    <Card padding="md" backgroundColor="tertiary" {...innerSize}>
                        <Typography weight="bold" color="white">Tertiary</Typography>
                    </Card>

                    <Card padding="md" backgroundColor="surface" {...innerSize}>
                        <Typography weight="bold">Surface</Typography>
                    </Card>

                    <Card padding="md" backgroundColor="background" {...innerSize}>
                        <Typography weight="bold">Background</Typography>
                    </Card>
                </ComponentToRender>
            );
        }

        if (selectedComponent === 'Container') {
            // Extract layout-related props from componentProps
            const { layout, align, justify, backgroundColor, children, width, height, ...restProps } = effectiveProps;
            
            return (
                <ComponentToRender
                    layout={layout}
                    align={align}
                    justify={justify}
                    backgroundColor={backgroundColor}
                    width={width || "300px"}
                    height={height || "200px"}
                    style={{
                        border: '1px dashed var(--border-color)',
                        borderRadius: 'var(--border-radius)'
                    }}
                    {...restProps}
                >
                    <Typography color="muted" align="center" size="sm">
                        Invisible Container
                        <br/>
                        (Borders added for visibility)
                    </Typography>
                </ComponentToRender>
            );
        }

        return <ComponentToRender {...effectiveProps} />;
    }, [selectedComponent, componentProps, handleTreeNodeExpand, handleTreeNodeSelect]);

    const componentKeys = Object.keys(COMPONENT_METADATA);
    const metadata = COMPONENT_METADATA[selectedComponent];
    const propEntries = metadata?.propConfigs ? Object.entries(metadata.propConfigs) : [];

    return (
        <Page {...activePageProps}>
            <ButtonGroup
                size="sm"
                spaced
                className="component-selector"
                justify="center"
                width="100%"
            >
                {componentKeys.map((componentName) => (
                    <Button
                        key={componentName}
                        variant={selectedComponent === componentName ? 'solid' : 'ghost'}
                        color={selectedComponent === componentName ? 'primary' : 'secondary'}
                        size="sm"
                        selected={selectedComponent === componentName}
                        onClick={() => handleComponentSelect(componentName)}
                    >
                        {componentName}
                    </Button>
                ))}
            </ButtonGroup>

            {/* Demo and controls layout */}
            <Container layout="flex-column" gap="lg" width="100%">
                {/* Section 2: Live Demo Area */}
                <Container layout="flex-column" gap="none" padding="none" width="100%">
                    <Typography size="xl" weight="bold" color="primary" margin="none">
                        Component Live Demo
                    </Typography>

                    {/* Demo Container */}
                    <Container
                        padding="xl"
                        width="100%"
                        layout="flex"
                        minHeight="60vh"
                        align="center"
                        justify="center"
                        overflow="scroll"
                        style={{
                            border: '2px dashed var(--border-color)',
                            borderRadius: 'var(--border-radius)'
                        }}
                    >
                        
                        {liveDemo}

                        <FloatingActionButton
                            variant="secondary"
                            size="sm"
                            icon="FiCode"
                            position="top-left"
                            parentType="container"
                            snapToEdges={false}
                            genie={{
                                trigger: 'click',
                                variant: 'popover',
                                position: 'auto',
                                content: () => (
                                    <Container
                                        layout="flex-column"
                                        gap="xs"
                                        padding="sm"
                                        width="fit-content"
                                        maxWidth="320px"
                                    >
                                        <Typography size="xs" weight="semibold">
                                            Current Props (JSX)
                                        </Typography>
                                        <Typography
                                            as="pre"
                                            size="xs"
                                            font="monospace"
                                            style={{
                                                whiteSpace: 'pre',
                                                overflowX: 'auto',
                                                overflowY: 'auto',
                                                margin: 0,
                                                maxHeight: '320px'
                                            }}
                                        >
                                            {jsxPreview}
                                        </Typography>
                                    </Container>
                                )
                            }}
                        />
                    </Container>

                </Container>

                {/* Section 3: Props Control Panel */}
                <Container layout="flex" justify="center" align="center" padding="none" width="100%">
                    <Card padding="md" elevation="md" gap="md">
                           <Typography color="primary" size="xl" weight="semibold">
                                Properties
                            </Typography>

                            {/* Props Controls */}
                            <Container
                                layout="flex"
                                gap="sm"
                                padding="xs"
                                wrap
                                align="center"
                                justify="center"
                            >
                                {metadata && propEntries.length > 0 ? (
                                    propEntries.map(([propName, config]) => renderPropControl(propName, config))
                                ) : (
                                    <Typography size="sm">
                                        No configurable props for this component.
                                    </Typography>
                                )}
                            </Container>
                    </Card>
                </Container>
            </Container>

            {/* Theme Switcher FAB */}
            <FloatingActionButton
                position="bottom-right"
                color="primary"
                draggable={true}
                icon="FaPaintBrush"
                genie={{
                    content: (
                        <Container gap="sm">
                            <Typography color="primary">
                                Theme Switcher
                            </Typography>
                            <Container layout="flex-column" align="stretch" gap="xs">
                                {availableThemes.map((theme) => (
                                    <Button
                                        key={theme}
                                        variant={currentTheme === theme ? "ghost" : "solid"}
                                        size="sm"
                                        onClick={() => switchTheme(theme)}
                                        justify="center"
                                        theme={theme}
                                    >
                                        <Icon name={
                                            theme === 'modern' ? 'FiMonitor' :
                                            theme === 'dark' ? 'FiMoon' :
                                            theme === 'minimal' ? 'FiCircle' :
                                            theme === 'vibrant' ? 'FiSun' :
                                            theme === 'admin' ? 'FiBriefcase' :
                                            theme === 'pink' ? 'FiHeart' :
                                            'FiSettings'
                                        } />
                                        {theme.charAt(0).toUpperCase() + theme.slice(1)}
                                        {currentTheme === theme && (
                                            <Badge color="success" size="sm">Active</Badge>
                                        )}
                                    </Button>
                                ))}
                            </Container>
                        </Container>
                    )
                }}
            />
        </Page>
    );
};

export default ComponentDemoRefactoredNew;
