import React, { useContext } from 'react';
import { useTheme } from '@contexts/ThemeContext';
import { ButtonContext } from './Button';
import * as Icons from 'react-icons/fi'; // Feather icons
import * as MdIcons from 'react-icons/md'; // Material Design icons
import * as HiIcons from 'react-icons/hi'; // Heroicons
import * as FaIcons from 'react-icons/fa'; // Font Awesome icons
import * as GrIcons from 'react-icons/gr';
import * as TbIcons from 'react-icons/tb';

// Get icon component from libraries
const getIcon = (iconName) => {
    // Try each library in order
    return Icons[iconName] ||
        MdIcons[iconName] ||
        HiIcons[iconName] ||
        FaIcons[iconName] ||
        GrIcons[iconName] ||
        TbIcons[iconName] ||
        Icons.FiHelpCircle; // fallback
};

/**
 * Icon - Themed icon component
 * Uses react-icons with direct icon names - no abstraction layer!
 *
 * Usage examples:
 * <Icon name="FiHome" />                  // Feather Home icon
 * <Icon name="MdSettings" />             // Material Design Settings icon
 * <Icon name="HiUser" />                 // Heroicons User icon
 * <Icon name="FaSpinner" />              // Font Awesome Spinner icon
 */
export const Icon = ({
    name = 'FiHelpCircle',
    color = 'primary', // 'primary', 'secondary', 'tertiary', 'success', 'warning', 'error', 'text'
    size, // 'xs', 'sm', 'md', 'lg', 'xl', '2xl' - defaults to 'md' or inherits from ButtonContext
    className = '',
    hover = false,
    clickable = false,
    onClick,
    style = {},
    width = null, // Width value (e.g., '1.5rem', '24px')
    height = null, // Height value (e.g., '1.5rem', '24px')
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
    const buttonContext = useContext(ButtonContext);

    // Determine effective size: prop > context > default
    const effectiveSize = size || buttonContext?.size || 'md';

    // Use theme prop if provided, otherwise use effective theme from context
    const iconTheme = theme || effectiveTheme.currentTheme;

    // Get the icon component directly
    const IconComponent = getIcon(name);

    // Helper function to build style object
    const getIconStyle = () => {
        const iconStyle = { ...style };

        // Sizing
        if (width !== null) iconStyle.width = width;
        if (height !== null) iconStyle.height = height;
        if (minWidth !== null) iconStyle.minWidth = minWidth;
        if (minHeight !== null) iconStyle.minHeight = minHeight;
        if (maxWidth !== null) iconStyle.maxWidth = maxWidth;
        if (maxHeight !== null) iconStyle.maxHeight = maxHeight;

        // Margins
        if (marginTop !== null) {
            if (marginTop === 'none') {
                iconStyle.marginTop = '0';
            } else if (['xs', 'sm', 'md', 'lg', 'xl'].includes(marginTop)) {
                iconStyle.marginTop = `var(--spacing-${marginTop})`;
            } else {
                iconStyle.marginTop = marginTop;
            }
        }

        if (marginBottom !== null) {
            if (marginBottom === 'none') {
                iconStyle.marginBottom = '0';
            } else if (['xs', 'sm', 'md', 'lg', 'xl'].includes(marginBottom)) {
                iconStyle.marginBottom = `var(--spacing-${marginBottom})`;
            } else {
                iconStyle.marginBottom = marginBottom;
            }
        }

        if (justifySelf !== null) iconStyle.justifySelf = justifySelf;

        return iconStyle;
    };

    const getJustifySelfClass = () => {
        if (justifySelf) {
            return `justify-self-${justifySelf}`;
        }
        return '';
    };

    // Build class names
    const classes = ['themed-icon', `icon-${color}`, `icon-${effectiveSize}`, hover && 'icon-hover', clickable && 'icon-clickable', getJustifySelfClass(), className].filter(Boolean).join(' ');

    return (
        <IconComponent
            className={classes}
            onClick={onClick}
            style={getIconStyle()}
            {...props}
        />
    );
};

export default Icon;
