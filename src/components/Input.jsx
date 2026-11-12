import React, { useEffect, useId, useRef, useState } from 'react';
import { useTheme } from '@contexts/ThemeContext';
import Icon from './Icon';

const INPUT_VALIDATION_STATES = new Set(['default', 'success', 'warning', 'error']);
const INPUT_COLOR_OPTIONS = ['primary', 'secondary', 'tertiary'];

const sanitizeValidationState = (state) => (INPUT_VALIDATION_STATES.has(state) ? state : 'default');

/**
 * Input - Themed input component with modern layouts
 * Supports multiple variants, sizes, icons, and floating labels
 * Inherits styling from the current theme
 * Enhanced with theme inheritance support
 */
export const Input = ({
    className = '',
    type = 'text', // 'text', 'password', 'email', 'checkbox', 'search'.
    variant = 'default', // 'default', 'outline', 'filled', 'underline', 'floating'
    color = 'primary', // 'primary', 'secondary', 'tertiary'
    size = 'md', // 'xxs', 'xs', 'sm', 'md', 'lg', 'xl'
    flexFill = false, // Fill available space in flex layouts (matches Container)
    placeholder = '',
    label = '',
    value,
    onChange,
    disabled = false,
    required = false,
    helpText = '',
    validationState = 'default', // 'default', 'success', 'warning', 'error'
    icon = '',
    iconPosition = 'left', // 'left', 'right'
    width = null, // Width value (e.g., '100%', '200px', '10rem')
    minWidth = null, // Minimum width value
    theme = null, // Optional theme override for this input
    justifySelf = null, // CSS justify-self property: 'auto', 'start', 'end', 'center', 'stretch'
    marginTop = null, // 'none', 'xs', 'sm', 'md', 'lg', 'xl' or custom value
    marginBottom = null, // 'none', 'xs', 'sm', 'md', 'lg', 'xl' or custom value
    multiline = false, // Enable textarea for multiline input
    rows = 3, // Number of rows for textarea (when multiline is true)
    // Validation props
    validate = false, // Enable/disable validation - now defaults to false, auto-enabled by required
    minLength = null, // Minimum length validation
    maxLength = null, // Maximum length validation
    onValidation = null, // Callback for validation results
    confirmField = null, // For password confirmation - value to match against
    // Checkbox-specific props
    checked = false, // For checkbox variant
    indeterminate = false, // For checkbox variant - "some selected" state
    // Positioning props
    position = null, // 'top', 'bottom', 'left', 'right', 'top-left', 'top-right', 'bottom-left', 'bottom-right'
    positionOffset = 'default', // 'inset', 'default', 'extended' - distance from edges
    ...props
}) => {
    const {currentTheme: globalTheme} = useTheme();
    const effectiveTheme = useTheme();

    // Use theme prop if provided, otherwise use effective theme from context
    const inputTheme = theme || effectiveTheme.currentTheme;
    const inputVariant = variant || 'default';
    const effectiveColor = INPUT_COLOR_OPTIONS.includes(color) ? color : 'primary';
    const colorClass = `input-color-${effectiveColor}`;
    const sanitizedValidationState = sanitizeValidationState(validationState);
    const shouldValidateByProps = required || validate || type === 'email';

    // Generate a stable unique ID for the input element using React's useId hook
    const reactId = useId();
    const inputId = props.id || `input-${reactId}`;
    const inputName = props.name || inputId;
    // State for input
    const [isFocused, setIsFocused] = useState(false);
    const [hasValue, setHasValue] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [internalValidation, setInternalValidation] = useState({isValid: true, message: ''});
    const [isTouched, setIsTouched] = useState(false);

    // Simple validation function
    const validateField = (value) => {
        const fieldLabel = label || 'Field';

        // Check if required field is empty
        if (!value) {
            if (required) return {isValid: false, message: `${fieldLabel} is required`};
            return {isValid: true, message: ''};
        }

        // Email format validation for email type inputs
        if (type === 'email' && value) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
                return {isValid: false, message: `${fieldLabel} must be a valid email address`};
            }
        }

        // Check minimum length
        if (minLength && value.length < minLength) {
            return {isValid: false, message: `${fieldLabel} must be at least ${minLength} characters`};
        }

        // Check maximum length
        if (maxLength && value.length > maxLength) {
            return {isValid: false, message: `${fieldLabel} cannot exceed ${maxLength} characters`};
        }

        // For password confirmation
        if (confirmField !== null) {
            if (confirmField !== value) {
                return {isValid: false, message: 'Passwords do not match'};
            }
        }

        return {isValid: true, message: ''};
    };

    // Main validation function
    const performValidation = (inputValue) => {
        // Auto-enable validation if required, validate enabled, or email type
        if (!shouldValidateByProps || disabled) return {isValid: true, message: ''};

        // Use simple field validation for all cases
        return validateField(inputValue);
    };

    // Effect to validate on value change
    useEffect(() => {
        if (isTouched && shouldValidateByProps) {
            const validation = performValidation(value);
            setInternalValidation(validation);

            // Call validation callback if provided
            if (onValidation) {
                onValidation(validation, inputName);
            }
        }
    }, [value, isTouched, shouldValidateByProps, confirmField]);

    // Determine if this is a password type input
    const isPasswordType = type === 'password';

    // Determine if this is a search input
    const isSearchType = type === 'search';

    // Determine if this is a date-type input
    const isDateType = ['date', 'datetime-local', 'time', 'month', 'week'].includes(type);

    // Auto-provide calendar icon for date inputs if no icon is specified
    const effectiveIcon = icon || (isSearchType ? 'FiSearch' : (isDateType ? 'FiCalendar' : ''));
    const effectiveIconPosition = isDateType && !icon ? 'right' : iconPosition;

    // Calculate actual input type based on password type and showPassword state
    const actualType = isPasswordType ? (showPassword ? 'text' : 'password') : type;

    // Reference for the input element
    const inputRef = useRef(null);

    // Sync hasValue state with value prop
    useEffect(() => {
        // For checkbox inputs, don't use hasValue logic
        if (type !== 'checkbox') {
            // Handle both controlled and uncontrolled components
            if (value !== undefined) {
                // Controlled component - use value prop
                setHasValue(!!value);
            } else {
                // Uncontrolled component - check input element directly
                if (inputRef.current) {
                    setHasValue(!!inputRef.current.value);
                }
            }
        }
    }, [value, type]);

    const handleChange = (e) => {
        if (type === 'checkbox') {
            // For checkbox inputs, pass the event directly
            if (onChange) {
                onChange(e);
            }
        } else {
            // For text inputs, update hasValue state and call onChange
            const newValue = e.target.value;
            setHasValue(!!newValue);

            if (onChange) {
                onChange(e);
            }
        }
    };

    const handleFocus = (e) => {
        setIsFocused(true);
        if (props.onFocus) {
            props.onFocus(e);
        }
    };

    const handleBlur = (e) => {
        setIsFocused(false);
        setIsTouched(true); // Mark as touched for validation

        if (shouldValidateByProps) {
            const currentValue = value !== undefined
                ? value
                : inputRef.current
                    ? inputRef.current.value
                    : '';
            const validation = performValidation(currentValue);
            setInternalValidation(validation);

            if (onValidation) {
                onValidation(validation, inputName);
            }
        }

        if (props.onBlur) {
            props.onBlur(e);
        }
    };

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    // Handle keyboard shortcut for password toggle (Ctrl+Shift+P)
    const handleKeyDown = (e) => {
        if (isPasswordType && e.ctrlKey && e.shiftKey && e.key === 'P') {
            e.preventDefault();
            togglePasswordVisibility();
        }

        if (props.onKeyDown) {
            props.onKeyDown(e);
        }
    };

    const getVariantClass = () => {
        return `themed-input-${inputVariant}`;
    };

    const getColorClass = () => colorClass;

    const getSizeClass = () => {
        switch (size) {
            case 'xxs':
                return 'input-xxs';
            case 'xs':
                return 'input-xs';
            case 'sm':
                return 'input-sm';
            case 'lg':
                return 'input-lg';
            case 'xl':
                return 'input-xl';
            case 'md':
            default:
                return 'input-md';
        }
    };

    const getPositionClass = () => {
        if (!position) return '';

        let classes = ['positioned-child', `position-${position}`];

        if (positionOffset !== 'default') {
            classes.push(`offset-${positionOffset}`);
        }

        return classes.join(' ');
    };
    const getStateClasses = () => {
        const classes = [];
        if (isFocused) classes.push('input-focused');
        // For hasValue, check both the hasValue state and the actual value prop properly
        if (hasValue || (value !== undefined && value !== '')) classes.push('input-has-value');

        // Use internal validation state if touched and validation is enabled, otherwise use validationState prop
        if (shouldValidateByProps && isTouched) {
            if (!internalValidation.isValid) classes.push('input-error');
            else if (internalValidation.isValid && value) classes.push('input-success');
        } else {
            if (sanitizedValidationState === 'error') classes.push('input-error');
            if (sanitizedValidationState === 'success') classes.push('input-success');
            if (sanitizedValidationState === 'warning') classes.push('input-warning');
        }

        if (disabled) classes.push('input-disabled');
        if (effectiveIcon) classes.push(`input-with-icon-${effectiveIconPosition}`);
        return classes.join(' ');
    };
    const getHelpTextClass = () => {
        const baseClass = type === 'checkbox'
            ? `checkbox-help-text themed-help-text theme-${inputTheme}`
            : `input-help-text themed-help-text theme-${inputTheme}`;

        // Add size class for help text
        const sizeClass = getSizeClass().replace('input-', 'help-text-');

        let resultClass;
        const effectiveState = getEffectiveState();

        switch (effectiveState) {
            case 'success':
                resultClass = type === 'checkbox'
                    ? `${baseClass} checkbox-help-text-success ${sizeClass}`
                    : `${baseClass} input-help-text-success ${sizeClass}`;
                break;
            case 'warning':
                resultClass = type === 'checkbox'
                    ? `${baseClass} checkbox-help-text-warning ${sizeClass}`
                    : `${baseClass} input-help-text-warning ${sizeClass}`;
                break;
            case 'error':
                resultClass = type === 'checkbox'
                    ? `${baseClass} checkbox-help-text-error ${sizeClass}`
                    : `${baseClass} input-help-text-error ${sizeClass}`;
                break;
            default:
                resultClass = `${baseClass} ${sizeClass}`;
        }
        return `${resultClass} ${getColorClass()}`.trim();
    };

    // Get effective help text - validation message or default helpText
    const getEffectiveHelpText = () => {
        if (shouldValidateByProps && isTouched && internalValidation.message) {
            return internalValidation.message;
        }
        return helpText;
    };

    // Get effective state for styling - validation state or prop state
    const getEffectiveState = () => {
        if (shouldValidateByProps && isTouched) {
            return internalValidation.isValid ? (value ? 'success' : 'default') : 'error';
        }
        return sanitizedValidationState;
    };

    // Helper function to get margin styles
    const getMarginStyle = () => {
        const style = {};

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

    const getJustifySelfClass = () => {
        if (justifySelf) {
            return `justify-self-${justifySelf}`;
        }
        return '';
    };

    const renderInput = () => {
        // For textarea, filter out type since textarea doesn't accept type attribute
        const domProps = multiline ? props : {type: actualType, ...props};

        // Generate ARIA attributes for accessibility
    const isAriaInvalid = (shouldValidateByProps && isTouched && !internalValidation.isValid) || sanitizedValidationState === 'error';
        const ariaAttributes = {
            'aria-invalid': isAriaInvalid ? 'true' : 'false',
            'aria-required': required ? 'true' : 'false',
            'aria-describedby': (getEffectiveHelpText() || helpText) ? `${inputId}-help` : undefined
        };

        // For checkbox type, use different styling and props
        if (type === 'checkbox') {
            return (
                <input
                    ref={(element) => {
                        if (inputRef) {
                            inputRef.current = element;
                        }
                        // Set indeterminate property directly on DOM element
                        if (element) {
                            element.indeterminate = indeterminate;
                        }
                    }}
                    id={inputId}
                    name={inputName}
                    type="checkbox"
                    className={`themed-checkbox ${getPositionClass()} ${getColorClass()} theme-${inputTheme} ${className}`}
                    checked={checked}
                    onChange={handleChange}
                    disabled={disabled}
                    required={required}
                    data-theme={inputTheme}
                    data-theme-source={theme ? 'local' : 'inherited'}
                    style={{width, ...(minWidth ? { minWidth } : {})}}
                    {...ariaAttributes}
                    {...domProps}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                />
            );
        }

        // For date inputs, we need to handle the placeholder differently due to browser limitations
        const isDateInput = ['date', 'datetime-local', 'time', 'month', 'week'].includes(type);

        // For date inputs, we'll use a technique to overlay our placeholder when empty
        const dateInputProps = isDateInput ? {
            onFocus: (e) => {
                // Hide our custom placeholder when focused
                const overlay = e.target.parentElement.querySelector('.date-placeholder-overlay');
                if (overlay) overlay.style.display = 'none';
                handleFocus(e);
            },
            onBlur: (e) => {
                // Show our custom placeholder if still empty
                const overlay = e.target.parentElement.querySelector('.date-placeholder-overlay');
                if (overlay && !e.target.value) overlay.style.display = 'block';
                handleBlur(e);
            },
            style: {
                // Make the native date input completely transparent when empty
                color: value ? 'var(--text-color)' : 'transparent'
            }
        } : {};

        return (
            <>
                {multiline ? (
                    <textarea
                        ref={inputRef}
                        id={inputId}
                        name={inputName}
                        className={`input themed-input textarea ${getVariantClass()} ${getSizeClass()} ${getStateClasses()} ${getPositionClass()} ${getColorClass()} theme-${inputTheme} ${className}`}
                        placeholder={inputVariant === 'floating' && label ? '' : placeholder}
                        {...(value !== undefined ? {value} : {})}
                        onChange={handleChange}
                        disabled={disabled}
                        required={required}
                        data-theme={inputTheme}
                        data-theme-source={theme ? 'local' : 'inherited'}
                        {...ariaAttributes}
                        {...domProps}
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                        rows={rows}
                    />
                ) : (
                    <input
                        ref={inputRef}
                        id={inputId}
                        name={inputName}
                        className={`input themed-input ${getVariantClass()} ${getSizeClass()} ${getStateClasses()} ${getPositionClass()} ${getColorClass()} theme-${inputTheme} ${className}`}
                        placeholder={inputVariant === 'floating' && label ? '' : (isDateInput ? '' : placeholder)}
                        {...(value !== undefined ? {value} : {})}
                        onChange={handleChange}
                        disabled={disabled}
                        required={required}
                        data-theme={inputTheme}
                        data-theme-source={theme ? 'local' : 'inherited'}
                        {...ariaAttributes}
                        {...domProps}
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                    />
                )}
            </>
        );
    };
    if (inputVariant === 'floating' && label) {
        return (
            <div
                className={`input-container input-floating-container variant-${inputVariant} ${getColorClass()} ${getJustifySelfClass()} ${flexFill ? 'flex-fill' : ''} theme-${inputTheme}`}
                style={{width, ...(minWidth ? { minWidth } : {}), ...getMarginStyle()}} data-theme={inputTheme}
                data-theme-source={theme ? 'local' : 'inherited'}>
                <div
                    className={`input-field-wrapper ${effectiveIcon ? `has-icon has-icon-${effectiveIconPosition}` : ''} ${getStateClasses()} ${getColorClass()}`}>
                    {effectiveIcon && effectiveIconPosition === 'left' && (
                        <span className="input-icon input-icon-left">
              <Icon name={effectiveIcon} size="sm"/>
            </span>
                    )}
                    {renderInput()}
                    <label
                        htmlFor={inputId}
                        className={`input-floating-label themed-label theme-${inputTheme} ${isFocused || hasValue || (value !== undefined && value !== '') ? 'floating' : ''}`}
                        data-theme={inputTheme}
                    >
                        {label}
                        {required && <span className="input-required">*</span>}
                    </label>
                    {effectiveIcon && effectiveIconPosition === 'right' && (
                        <span className="input-icon input-icon-right">
              <Icon name={effectiveIcon} size="sm"/>
            </span>
                    )}
                    {isPasswordType && (
                        <button
                            type="button"
                            className="input-password-toggle"
                            onClick={togglePasswordVisibility}
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                            aria-pressed={showPassword}
                            title={`${showPassword ? 'Hide' : 'Show'} password (Ctrl+Shift+P)`}
                            tabIndex={0}
                        >
                            <Icon name={showPassword ? 'FiEyeOff' : 'FiEye'} size="sm"/>
                        </button>
                    )}
                </div>
                {(getEffectiveHelpText() || helpText) && (
                    <span
                        id={`${inputId}-help`}
                        className={getHelpTextClass()}
                        data-theme={inputTheme}
                    >
            {getEffectiveHelpText()}
          </span>
                )}
            </div>
        );
    }
    // Special handling for checkbox type
    if (type === 'checkbox') {
        return (
            <div className={`checkbox-wrapper input-container ${getColorClass()} ${getJustifySelfClass()} theme-${inputTheme}`}
                 style={{width, ...(minWidth ? { minWidth } : {}), ...getMarginStyle()}} data-theme={inputTheme}
                 data-theme-source={theme ? 'local' : 'inherited'}>
                <div className="checkbox-input-wrapper">
                    {renderInput()}
                    {label && (
                        <label
                            htmlFor={inputId}
                            className={`checkbox-label themed-label theme-${inputTheme}`}
                            data-theme={inputTheme}
                        >
                            {label}
                            {required && <span className="input-required">*</span>}
                        </label>
                    )}
                </div>
                {(getEffectiveHelpText() || helpText) && (
                    <span
                        id={`${inputId}-help`}
                        className={getHelpTextClass()}
                        data-theme={inputTheme}
                    >
            {getEffectiveHelpText()}
          </span>
                )}
            </div>
        );
    }
    return (
        <div className={`input-container ${getColorClass()} ${getJustifySelfClass()} ${flexFill ? 'flex-fill' : ''} theme-${inputTheme}`}
             style={{width, ...(minWidth ? { minWidth } : {}), ...getMarginStyle()}} data-theme={inputTheme}
             data-theme-source={theme ? 'local' : 'inherited'}>
            {label && (
                <label
                    htmlFor={inputId}
                    className={`input-label themed-label theme-${inputTheme}`}
                    data-theme={inputTheme}
                >
                    {label}
                    {required && <span className="input-required">*</span>}
                </label>
            )}
            <div
                className={`input-field-wrapper ${effectiveIcon ? `has-icon has-icon-${effectiveIconPosition}` : ''} ${getStateClasses()} ${getColorClass()}`}>
                {effectiveIcon && effectiveIconPosition === 'left' && (
                    <span className="input-icon input-icon-left">
            <Icon name={effectiveIcon} size="sm"/>
          </span>
                )}
                {renderInput()}
                                {effectiveIcon && effectiveIconPosition === 'right' && (
                                        <span className="input-icon input-icon-right">
                        <Icon name={effectiveIcon} size="sm"/>
                    </span>
                                )}
                                {isPasswordType && (
                <button
                    type="button"
                    className="input-password-toggle"
                    onClick={togglePasswordVisibility}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                    title={`${showPassword ? 'Hide' : 'Show'} password (Ctrl+Shift+P)`}
                    tabIndex={0}
                >
                    <Icon name={showPassword ? 'FiEyeOff' : 'FiEye'} size="sm"/>
                </button>)}
            </div>
            {(getEffectiveHelpText() || helpText) && (
                <span
                    id={`${inputId}-help`}
                    className={getHelpTextClass()}
                    data-theme={inputTheme}
                >
          {getEffectiveHelpText()}
        </span>)}
        </div>
    );
};

export default Input;
