import React, { forwardRef, useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '@contexts/ThemeContext';
import { Card } from './Card';

// Simple global z-index counter for nested Genies
let globalGenieZIndex = 999999;

/**
 * Genie - High-level utility component for displaying content above all other elements
 * 
 * This component provides a floating card that sits at the highest z-index level,
 * making it perfect for tooltips, popovers, context menus, modals, and any content
 * that needs to appear above all other page elements including FABs.
 * 
 * Key Features:
 * - Highest z-index positioning (above FABs and all other components)
 * - Intelligent auto-positioning system that detects optimal placement
 * - Corner positioning that expands outward from the trigger element
 * - Layout support (block, flex, grid, multicolumn, positioned)
 * - Flexible sizing with custom width/height support (vh, %, px values)
 * - Animation variants (scale, slide-up, slide-down, fade)
 * - Optional backdrop for modal-like behavior
 * - Responsive design with mobile optimizations
 * - Accessibility support with proper ARIA attributes
 * - Auto-positioning to stay within viewport bounds
 * - Click-outside-to-close functionality
 * - ESC key support
 * - Theme integration with CSS variables
 * - Automatic theme inheritance from trigger component (reads data-theme attributes and themed-* classes)
 *
 * Auto-Positioning Behavior:
 * The component automatically determines the best position based on:
 * - Trigger element location within viewport quadrants (simple and consistent)
 * - Expands outward from the trigger element to maintain visual flow
 * 
 * Position mapping by viewport quadrant:
 * - Top-left quadrant → bottom-left (appears below, aligned with left edge)
 * - Top-right quadrant → bottom-right (appears below, aligned with right edge)
 * - Bottom-left quadrant → top-left (appears above, aligned with left edge)
 * - Bottom-right quadrant → top-right (appears above, aligned with right edge)
 * 
 * Possible auto-detected positions:
 * - top-left: Genie appears above the trigger, aligned with left border edge
 * - top-right: Genie appears above the trigger, aligned with right border edge  
 * - bottom-left: Genie appears below the trigger, aligned with left border edge
 * - bottom-right: Genie appears below the trigger, aligned with right border edge
 * 
 * Layout Support:
 * - layout="block": Standard block layout
 * - layout="flex": Flexbox layout with configurable direction and wrapping
 * - layout="grid": CSS Grid layout with configurable columns
 * - layout="multicolumn": CSS multicolumn layout
 * - layout="positioned": Absolute/relative positioning
 * 
 * Usage Examples:
 * 
 * // Basic tooltip with auto-positioning
 * <Genie visible={showTooltip} variant="tooltip">
 *   <p>This is a tooltip</p>
 * </Genie>
 * 
 * // Context menu with custom size
 * <Genie visible={showMenu} variant="menu" width="200px" height="300px">
 *   <ul><li>Edit</li><li>Delete</li></ul>
 * </Genie>
 * 
 * // Modal-like dialog with backdrop
 * <Genie visible={showModal} variant="modal" backdrop width="90vw" height="90vh">
 *   <div>Modal content here</div>
 * </Genie>
 * 
 * // Grid layout floating card
 * <Genie visible={show} layout="grid" columns={2} gap="md">
 *   <div>Item 1</div>
 *   <div>Item 2</div>
 *   <div>Item 3</div>
 *   <div>Item 4</div>
 * </Genie>
 */
export const Genie = forwardRef(({
    children,
    className = '',
    visible = false, // Controls whether the floating card is shown or hidden
    animation = 'scale', // Animation type: 'scale', 'slide-up', 'slide-down', 'fade'
    variant = 'default', // Visual variant: 'tooltip', 'popover', 'menu', 'modal', 'notification', 'dropdown'
    backdrop = false, // Whether to show a semi-transparent backdrop behind the card (modal-like behavior)
    onClose, // Callback function called when the card should close
    onBackdropClick, // Callback function called when the backdrop is clicked
    triggerRef = null, // Reference to the element that triggers this Genie
    offset = 8, // Legacy prop - no longer used but kept for compatibility
    closeOnClickOutside = true, // Whether clicking outside the card should close it
    closeOnEscape = true, // Whether pressing ESC key should close the card
    autoClose = null, // Auto-close after specified milliseconds (null = no auto-close)
    role = 'dialog', // ARIA role for accessibility
    ariaLabel, // ARIA label for accessibility
    ariaLabelledBy, // ARIA labelledby for accessibility
    theme = null, // Optional theme override
    justifySelf = null, // CSS justify-self property: 'auto', 'start', 'end', 'center', 'stretch'

    // Layout and styling props
    layout = 'block', // Layout type: 'block', 'flex', 'flex-wrap', 'flex-column', 'grid', 'multicolumn', 'positioned'
    columns = 1, // Grid columns: 1-6 for grid layouts, or 'auto', 'auto-sm', 'auto-lg'
    gap = 'lg', // Spacing between child elements: 'none', 'xs', 'sm', 'md', 'lg', 'xl'
    justify = 'start', // Content justification: 'start', 'center', 'end', 'between', 'around', 'evenly'
    align = 'start', // Content alignment: 'start', 'center', 'end', 'stretch', 'baseline'
    padding = 'medium', // Internal padding: 'none', 'xs', 'sm', 'md', 'lg', 'xl'
    margin = 'none', // External margin: 'none', 'xs', 'sm', 'md', 'lg', 'xl' or custom CSS value
    backgroundColor = null, // Background color: null (theme default), 'transparent', 'background', 'surface', etc.
    width = null, // Custom width: string value like '100px', '50%', 'auto', '90vw', etc.
    height = null, // Custom height: string value like '100px', '50%', 'auto', '90vh', etc.
    minWidth = null, // Minimum width
    minHeight = null, // Minimum height
    maxWidth = null, // Maximum width
    maxHeight = null, // Maximum height
    marginTop = null, // Margin top: 'none', 'xs', 'sm', 'md', 'lg', 'xl' or custom value
    marginBottom = null, // Margin bottom: 'none', 'xs', 'sm', 'md', 'lg', 'xl' or custom value
    ...props
}, ref) => {
  const { currentTheme: globalTheme } = useTheme();
  const effectiveTheme = useTheme();
  
  // Auto-detect theme from trigger element if no theme prop is provided
  // This allows Genie to automatically inherit the theme from any component that triggers it
  // Priority: 1) explicit theme prop, 2) data-theme attribute, 3) themed-* classes, 4) context theme
  const genieTheme = useMemo(() => {
    if (theme) return theme; // Use explicit theme prop if provided
    
    // Try to get theme from trigger element
    const triggerElement = triggerRef?.current;
    if (triggerElement) {
      // Check for data-theme attribute on trigger element
      const triggerTheme = triggerElement.getAttribute('data-theme');
      if (triggerTheme) return triggerTheme;
      
      // Check for themed class names (e.g., themed-button-dark, themed-card-primary)
      const classList = Array.from(triggerElement.classList);
      const themedClass = classList.find(cls => cls.startsWith('themed-'));
      if (themedClass) {
        const parts = themedClass.split('-');
        if (parts.length >= 3) {
          return parts[parts.length - 1]; // Get last part as theme name
        }
      }
    }
    
    // Fall back to effective theme from context
    return effectiveTheme.currentTheme;
  }, [theme, triggerRef, effectiveTheme.currentTheme, visible]); // Add visible to re-check when Genie opens
  const containerRef = useRef(null);
  
  // Simple z-index management for nested Genies
  const [assignedZIndex, setAssignedZIndex] = useState(null);
  
  // Assign z-index when Genie becomes visible
  useEffect(() => {
    if (visible && !assignedZIndex) {
      globalGenieZIndex += 1;
      setAssignedZIndex(globalGenieZIndex);
    }
  }, [visible, assignedZIndex]);

  // Separate DOM props from component-specific props
  const {
    style,
    ...domProps
  } = props;

  // Handle escape key
  useEffect(() => {
    if (!visible || !closeOnEscape) return;

    const handleEscape = (e) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [visible, closeOnEscape, onClose]);

  // Handle click outside
  useEffect(() => {
    if (!visible || !closeOnClickOutside) return;

    const handleClickOutside = (e) => {
      // Only close if click is outside Genie and target is still in DOM
      if (containerRef.current && 
          !containerRef.current.contains(e.target) && 
          document.body.contains(e.target)) {
        onClose?.();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [visible, closeOnClickOutside, onClose]);

  // Handle auto-close timer
  useEffect(() => {
    if (!visible || !autoClose || !onClose) return;

    const timer = setTimeout(() => {
      onClose();
    }, autoClose);

    return () => clearTimeout(timer);
  }, [visible, autoClose, onClose]);

  // Focus management and parent card hover interference prevention
  useEffect(() => {
    if (visible && containerRef.current) {
      // Find parent card and disable hover transform
      const parentCard = containerRef.current.closest('.card.themed-card-hover');
      if (parentCard) {
        parentCard.classList.add('no-hover-transform');
      }

      // Only focus the Genie if it's a modal or dialog that should receive focus
      // Don't steal focus for tooltips or other non-modal variants
      const shouldTakeFocus = role === 'dialog' && variant !== 'tooltip' && variant !== 'modal';
      
      if (shouldTakeFocus) {
        // Small delay to ensure element is fully rendered and positioned
        const timer = setTimeout(() => {
          if (containerRef.current && visible) {
            containerRef.current.focus();
          }
        }, 50);
        
        return () => {
          clearTimeout(timer);
          // Re-enable hover transform when floating card is hidden
          if (parentCard) {
            parentCard.classList.remove('no-hover-transform');
          }
        };
      } else {
        // Just clean up the parent card styling without taking focus
        return () => {
          if (parentCard) {
            parentCard.classList.remove('no-hover-transform');
          }
        };
      }
    }
  }, [visible, role, variant]);

  // Helper: Find nearest scrollable parent
  const findScrollableParent = useCallback((element) => {
    let parent = element?.parentElement;
    while (parent && parent !== document.body) {
      const style = window.getComputedStyle(parent);
      if (['auto', 'scroll'].some(v => [style.overflow, style.overflowX, style.overflowY].includes(v))) {
        return parent;
      }
      parent = parent.parentElement;
    }
    return null;
  }, []);

  // Helper: Get visible bounds - always returns page viewport bounds
  // Genies should only be prevented from escaping the page, not parent containers
  const getVisibleBounds = useCallback((scrollableParent) => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    // Always return viewport bounds - don't constrain to parent containers
    return { left: 0, right: vw, top: 0, bottom: vh };
  }, []);

  // Helper: Clamp value between min and max
  const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

  const convertToPixels = useCallback((value, axis = 'vertical') => {
    if (value === null || value === undefined) return Number.POSITIVE_INFINITY;
    if (typeof value === 'number') return value;

    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return Number.POSITIVE_INFINITY;
    }

    const trimmed = String(value).trim();
    if (!trimmed) return Number.POSITIVE_INFINITY;

    const numeric = parseFloat(trimmed);
    if (Number.isNaN(numeric)) {
      return Number.POSITIVE_INFINITY;
    }

    if (trimmed.endsWith('px')) {
      return numeric;
    }

    if (trimmed.endsWith('vh')) {
      return (window.innerHeight * numeric) / 100;
    }

    if (trimmed.endsWith('vw')) {
      return (window.innerWidth * numeric) / 100;
    }

    if (trimmed.endsWith('%')) {
      const base = axis === 'horizontal' ? window.innerWidth : window.innerHeight;
      return (base * numeric) / 100;
    }

    if (trimmed.endsWith('rem')) {
      const rootFontSize = parseFloat(
        window.getComputedStyle(document.documentElement).fontSize || '16'
      );
      return rootFontSize * numeric;
    }

    if (trimmed.endsWith('em')) {
      const rootFontSize = parseFloat(
        window.getComputedStyle(document.body).fontSize || '16'
      );
      return rootFontSize * numeric;
    }

    return numeric;
  }, []);

  const [positionData, setPositionData] = useState({
    position: 'bottom-left',
    styles: {},
    availableHeight: Number.POSITIVE_INFINITY,
    availableWidth: Number.POSITIVE_INFINITY
  });

  // Simple and intuitive positioning logic - uses viewport quadrants for consistent behavior
  const calculatePosition = useCallback(() => {
    if (!containerRef.current) {
      return {
        position: 'bottom-left',
        styles: {},
        availableHeight: Number.POSITIVE_INFINITY,
        availableWidth: Number.POSITIVE_INFINITY
      };
    }

    const triggerElement = triggerRef?.current || containerRef.current.parentElement;
    if (!triggerElement) {
      return {
        position: 'bottom-left',
        styles: {},
        availableHeight: Number.POSITIVE_INFINITY,
        availableWidth: Number.POSITIVE_INFINITY
      };
    }
    
    const triggerRect = triggerElement.getBoundingClientRect();
    const scrollableParent = findScrollableParent(triggerElement);
    const bounds = getVisibleBounds(scrollableParent);
    const viewportPadding = 12;
    const anchorOffset = 8;
    
    // Hide if trigger is not visible
    if (triggerRect.bottom < bounds.top || triggerRect.top > bounds.bottom || 
        triggerRect.right < bounds.left || triggerRect.left > bounds.right) {
      return {
        position: 'hidden',
        styles: { display: 'none' },
        availableHeight: Number.POSITIVE_INFINITY,
        availableWidth: Number.POSITIVE_INFINITY
      };
    }
    
    // Clamp trigger rect to visible bounds - this ensures Genie stays at edge when content scrolls out
    const visibleTriggerLeft = clamp(triggerRect.left, bounds.left, bounds.right);
    const visibleTriggerRight = clamp(triggerRect.right, bounds.left, bounds.right);
    const visibleTriggerTop = clamp(triggerRect.top, bounds.top, bounds.bottom);
    const visibleTriggerBottom = clamp(triggerRect.bottom, bounds.top, bounds.bottom);
    
    // Calculate center from visible bounds
    const triggerCenterX = (visibleTriggerLeft + visibleTriggerRight) / 2;
    const triggerCenterY = (visibleTriggerTop + visibleTriggerBottom) / 2;
    
    // Determine quadrant
    const isLeft = triggerCenterX < (bounds.left + bounds.right) / 2;
    const isTop = triggerCenterY < (bounds.top + bounds.bottom) / 2;
    
    // Build position and styles based on quadrant using visible trigger bounds
    const position = `${isTop ? 'bottom' : 'top'}-${isLeft ? 'left' : 'right'}`;
    const styles = {
      position: 'fixed',
      [isTop ? 'bottom' : 'top']: 'auto',
      [isLeft ? 'right' : 'left']: 'auto'
    };

    if (isTop) {
      const anchorTop = visibleTriggerBottom + anchorOffset;
      styles.top = Math.max(anchorTop, bounds.top + viewportPadding);
      styles.bottom = 'auto';
    } else {
      const anchorBottom = window.innerHeight - visibleTriggerTop + anchorOffset;
      const maxBottom = Math.max(viewportPadding, window.innerHeight - bounds.top - viewportPadding);
      styles.bottom = clamp(anchorBottom, viewportPadding, maxBottom);
      styles.top = 'auto';
    }

    if (isLeft) {
      const anchorLeft = visibleTriggerLeft;
      styles.left = Math.max(anchorLeft, bounds.left + viewportPadding);
      styles.right = 'auto';
    } else {
      const anchorRight = window.innerWidth - visibleTriggerRight;
      const maxRight = Math.max(viewportPadding, window.innerWidth - bounds.left - viewportPadding);
      styles.right = clamp(anchorRight, viewportPadding, maxRight);
      styles.left = 'auto';
    }

    const availableHeight = isTop
      ? Math.max(0, bounds.bottom - viewportPadding - (visibleTriggerBottom + anchorOffset))
      : Math.max(0, (visibleTriggerTop - anchorOffset) - (bounds.top + viewportPadding));

    const availableWidth = isLeft
      ? Math.max(0, bounds.right - viewportPadding - visibleTriggerLeft)
      : Math.max(0, visibleTriggerRight - (bounds.left + viewportPadding));

    return { position, styles, availableHeight, availableWidth };
  }, [triggerRef, findScrollableParent, getVisibleBounds]);

  const areStylesEqual = useCallback((nextStyles, prevStyles) => {
    const keys = new Set([...Object.keys(nextStyles || {}), ...Object.keys(prevStyles || {})]);
    for (const key of keys) {
      if (nextStyles?.[key] !== prevStyles?.[key]) {
        return false;
      }
    }
    return true;
  }, []);

  const updatePosition = useCallback(() => {
    const nextPosition = calculatePosition();
    setPositionData(prev => {
      if (
        prev.position === nextPosition.position &&
        prev.availableHeight === nextPosition.availableHeight &&
        prev.availableWidth === nextPosition.availableWidth &&
        areStylesEqual(prev.styles, nextPosition.styles)
      ) {
        return prev;
      }
      return nextPosition;
    });
  }, [calculatePosition, areStylesEqual]);

  useEffect(() => {
    if (visible) {
      updatePosition();
    }
  }, [visible, updatePosition]);

  // Handle scroll repositioning - keep Genie attached to trigger
  useEffect(() => {
    if (!visible) return;

    const handleScroll = () => {
      updatePosition();
    };

    const handlePageChange = () => {
      if (onClose) onClose();
    };

    // Collect all scroll containers
    const scrollContainers = [window, '.page', '.container', '.data-item-container']
      .map(s => typeof s === 'string' ? document.querySelector(s) : s)
      .filter(Boolean);
    
    // Add scrollable parent of trigger if exists
    const scrollableParent = findScrollableParent(triggerRef?.current);
    if (scrollableParent && !scrollContainers.includes(scrollableParent)) {
      scrollContainers.push(scrollableParent);
    }

    // Listen for pagination events
    const paginationButtons = document.querySelectorAll(
      '.pagination-button, .page-button, [data-pagination], .table-pagination button, .list-pagination button'
    );

    // Add scroll listeners
    scrollContainers.forEach(container => {
      container.addEventListener('scroll', handleScroll, { passive: true });
    });

    // Add pagination listeners
    paginationButtons.forEach(button => {
      button.addEventListener('click', handlePageChange);
    });

    window.addEventListener('resize', handleScroll);

    // Listen for React Router navigation or hash changes
    window.addEventListener('popstate', handlePageChange);
    window.addEventListener('hashchange', handlePageChange);

    // Clean up listeners
    return () => {
      scrollContainers.forEach(container => {
        container.removeEventListener('scroll', handleScroll);
      });
      
      paginationButtons.forEach(button => {
        button.removeEventListener('click', handlePageChange);
      });
      
      window.removeEventListener('resize', handleScroll);
      window.removeEventListener('popstate', handlePageChange);
      window.removeEventListener('hashchange', handlePageChange);
    };
  }, [visible, onClose, triggerRef, updatePosition]);

  const resolveMaxDimension = useCallback((propValue, available, axis) => {
    const viewportLimit = Number.isFinite(available) ? Math.max(available, 0) : null;
    const hasViewportLimit = viewportLimit !== null;
    const hasPropValue = propValue !== null && propValue !== undefined;

    if (!hasPropValue) {
      // Default to viewport-constrained size when no explicit limit is provided
      return hasViewportLimit ? `${viewportLimit}px` : undefined;
    }

    const propLimit = convertToPixels(propValue, axis);
    const hasPropLimit = Number.isFinite(propLimit);

    if (!hasViewportLimit && !hasPropLimit) {
      return propValue ?? undefined;
    }

    if (!hasViewportLimit) {
      return `${Math.max(propLimit, 0)}px`;
    }

    if (!hasPropLimit) {
      return `${viewportLimit}px`;
    }

    return `${Math.max(Math.min(propLimit, viewportLimit), 0)}px`;
  }, [convertToPixels]);

  const resolvedMaxHeight = useMemo(() => (
    resolveMaxDimension(maxHeight, positionData.availableHeight, 'vertical')
  ), [resolveMaxDimension, maxHeight, positionData.availableHeight]);

  const resolvedMaxWidth = useMemo(() => (
    resolveMaxDimension(maxWidth, positionData.availableWidth, 'horizontal')
  ), [resolveMaxDimension, maxWidth, positionData.availableWidth]);
  
  // No need to adjust justify anymore since we're using container alignment

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      if (onBackdropClick) {
        onBackdropClick();
      } else if (onClose) {
        onClose();
      }
    }
  };

  const getJustifySelfClass = () => {
    if (justifySelf) {
      return `justify-self-${justifySelf}`;
    }
    return '';
  };

  // Helper function to generate custom styles for background only
  const getCustomStyles = () => {
    const styles = {};
    
    // Apply background color only - let Card handle width/height/margin
    if (backgroundColor) {
      if (backgroundColor === 'transparent') {
        styles.backgroundColor = 'transparent';
      } else {
        // Use CSS variable for theme colors
        styles.backgroundColor = `var(--color-${backgroundColor})`;
      }
    }
    
    return styles;
  };

  const positionClass = positionData.position && positionData.position !== 'hidden'
    ? `position-${positionData.position}`
    : '';

  const shouldShow = visible && positionData.position !== 'hidden';

  const containerClasses = [
    'genie-container',
    positionClass,
    `animation-${animation}`,
    `variant-${variant}`,
    shouldShow ? 'visible' : '',
    getJustifySelfClass(),
    className
  ].filter(Boolean).join(' ');

  // Build content classes with layout support (no size class since size prop was removed)
  const contentClasses = [
    'genie-content'
  ].filter(Boolean).join(' ');

  return (
    <>
      {/* Backdrop */}
      {backdrop && (
        <div
          className={`genie-backdrop ${shouldShow ? 'visible' : ''}`}
          onClick={handleBackdropClick}
          aria-hidden="true"
        />
      )}

      {/* Genie Container */}        <div
          ref={containerRef}
          className={containerClasses}
          role={shouldShow ? role : undefined}
          aria-label={shouldShow ? ariaLabel : undefined}
          aria-labelledby={shouldShow ? ariaLabelledBy : undefined}
          data-genie-portal="true"
          tabIndex={-1}
          style={{ 
            ...style, 
            ...positionData.styles, 
            ...getCustomStyles(),
            ...(assignedZIndex && { zIndex: assignedZIndex })
          }}
          {...domProps}
        >
        <Card
          className={contentClasses}
          layout={layout}
          columns={columns}
          gap={gap}
          padding={padding}
          margin={margin}
          align={align}
          justify={justify}
          backgroundColor={backgroundColor}
          width={width || "fit-content"}
          height={height}
          minWidth={minWidth}
          minHeight={minHeight}
          maxWidth={resolvedMaxWidth ?? maxWidth}
          maxHeight={resolvedMaxHeight ?? maxHeight}
          theme={genieTheme}
        >
          {children}
        </Card>
      </div>
    </>
  );
});

Genie.displayName = 'Genie';

export default Genie;

/**
 * useGenieTrigger - Unified trigger system for all components
 * 
 * This hook provides consistent trigger behavior across all components that use Genies.
 * It standardizes the trigger props and event handling for different trigger types.
 * 
 * @param {Object} options - Configuration options
 * @param {string} options.trigger - Trigger type ('click', 'hover', 'contextmenu')
 * @param {function} options.onShow - Callback when genie should show
 * @param {function} options.onHide - Callback when genie should hide
 * @param {boolean} options.disabled - Whether the trigger is disabled
 * 
 * @returns {Object} Trigger props to spread on the trigger element
 */
export const useGenieTrigger = ({
  trigger = 'click',
  onShow = null,
  onHide = null,
  disabled = false
} = {}) => {
  const triggerProps = useMemo(() => {
    if (disabled) return {};
    
    const props = {};
    
    switch (trigger) {
      case 'hover':
        props.onMouseEnter = onShow;
        props.onMouseLeave = onHide;
        break;
      case 'click':
        props.onClick = (e) => {
          // No longer calling e.stopPropagation() to allow the event to bubble
          // This allows parent components to also handle the click
          if (onShow) onShow(e);
        };
        break;
      case 'contextmenu':
        props.onContextMenu = (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (onShow) onShow(e);
        };
        break;
    }
    
    return props;
  }, [trigger, onShow, onHide, disabled]);
  
  return triggerProps;
};

/**
 * useGenie - Custom hook for managing Genie state and behavior
 * 
 * This hook provides a convenient way to manage Genie state and behavior
 * for components that need to display floating content.
 * 
 * @param {Object} options - Configuration options
 * @param {string} options.trigger - Trigger type ('click', 'hover', 'contextmenu')
 * @param {string} options.variant - Genie variant
 * @param {function} options.onShow - Callback when genie shows
 * @param {function} options.onHide - Callback when genie hides
 * 
 * @returns {Object} Hook return object
 * - visible: boolean - Whether the genie is visible
 * - show: function - Function to show the genie
 * - hide: function - Function to hide the genie
 * - toggle: function - Function to toggle the genie
 * - triggerProps: object - Props to spread on the trigger element
 * - genieProps: object - Props to spread on the Genie component
 */
export const useGenie = ({
  trigger = 'click',
  variant = 'popover',
  onShow = null,
  onHide = null,
  closeOnClickOutside = true,
  closeOnEscape = true,
  autoClose = null
} = {}) => {
  const [visible, setVisible] = useState(false);
  const triggerRef = useRef(null);

  const show = useCallback(() => {
    setVisible(true);
    if (onShow) onShow();
  }, [onShow]);

  const hide = useCallback(() => {
    setVisible(false);
    if (onHide) onHide();
  }, [onHide]);

  const toggle = useCallback(() => {
    if (visible) {
      hide();
    } else {
      show();
    }
  }, [visible, show, hide]);  // Generate trigger props based on trigger type using unified system
  const baseTriggerProps = useGenieTrigger({
    trigger,
    onShow: trigger === 'click' ? toggle : show,
    onHide: hide,
    disabled: false
  });
  
  // Add ref to trigger props
  const triggerProps = useMemo(() => ({
    ref: triggerRef,
    ...baseTriggerProps
  }), [baseTriggerProps]);
  
  // Generate Genie props (removed position and size since those props were removed)
  const genieProps = useMemo(() => ({
    visible,
    variant,
    onClose: hide,
    triggerRef,
    closeOnClickOutside,
    closeOnEscape,
    autoClose
  }), [visible, variant, hide, closeOnClickOutside, closeOnEscape, autoClose]);

  return {
    visible,
    show,
    hide,
    toggle,
    triggerProps,
    genieProps,
    triggerRef
  };
};

/**
 * withGenie - Higher-Order Component for adding Genie functionality
 * 
 * This HOC wraps a component with Genie functionality, making it easy to add
 * floating content to any existing component without modifying its internal structure.
 * 
 * @param {React.Component} WrappedComponent - The component to wrap
 * @param {Object} defaultOptions - Default Genie options
 * 
 * @returns {React.Component} Enhanced component with Genie support
 */
export const withGenie = (WrappedComponent, defaultOptions = {}) => {
  const GenieEnhanced = forwardRef((props, ref) => {
    const {
      genie,
      genieTrigger = defaultOptions.trigger || 'click',
      genieCloseOnClickOutside = defaultOptions.closeOnClickOutside !== false,
      genieCloseOnEscape = defaultOptions.closeOnEscape !== false,
      genieAutoClose = defaultOptions.autoClose || null,
      onGenieShow,
      onGenieHide,
    } = props;

    const {
      triggerProps,
      genieProps
    } = useGenie({
      trigger: genieTrigger,
      variant: 'popover',
      onShow: onGenieShow,
      onHide: onGenieHide,
      closeOnClickOutside: genieCloseOnClickOutside,
      closeOnEscape: genieCloseOnEscape,
      autoClose: genieAutoClose
    });

    return (
      <>
        <WrappedComponent
          ref={ref}
          {...props}
          {...(genie ? triggerProps : {})}
        />
        
        {genie && (
          <Genie {...genieProps}>
            {genie}
          </Genie>
        )}
      </>
    );
  });

  GenieEnhanced.displayName = `withGenie(${WrappedComponent.displayName || WrappedComponent.name})`;
  
  return GenieEnhanced;
};

/**
 * GenieTrigger - Utility component for creating Genie triggers
 * 
 * This component creates a trigger element that can display a Genie when activated.
 * It's useful for creating custom triggers or when you need more control over the trigger element.
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Trigger element content
 * @param {React.ReactNode} props.genie - Genie content
 * @param {string} props.trigger - Trigger type
 * @param {string} props.variant - Genie variant
 * @param {string} props.as - HTML element type for the trigger (default: 'div')
 * @param {string} props.layout - Layout type for the Genie content
 * @param {number|string} props.columns - Grid columns for grid layout
 * @param {string} props.gap - Gap between child elements
 * @param {string} props.width - Custom width (supports vh, %, px values)
 * @param {string} props.height - Custom height (supports vh, %, px values)
 * 
 * @returns {React.Component} Genie trigger component
 */
export const GenieTrigger = forwardRef(({
    children,
    genie,
    trigger = 'click',
    variant = 'popover',
    as: Component = 'div',
    className = '',
    onShow,
    onHide,
    closeOnClickOutside = true,
    closeOnEscape = true,
    autoClose = null,
    // Layout and styling props for the Genie
    layout = 'block',
    columns = 1,
    gap = 'lg',
    justify = 'start',
    align = 'start',
    padding = 'medium',
    margin = 'none',
    backgroundColor = null,
    width = null,
    height = null,
    ...props
}, ref) => {
    const {
        triggerProps,
        genieProps
    } = useGenie({
        trigger,
        variant,
        onShow,
        onHide,
        closeOnClickOutside,
        closeOnEscape,
        autoClose
    });

    return (
        <>
            <Component
                ref={ref}
                className={`genie-trigger ${className}`}
                {...props}
                {...triggerProps}
            >
                {children}
            </Component>

            {genie && (
                <Genie
                    {...genieProps}
                    layout={layout}
                    columns={columns}
                    gap={gap}
                    justify={justify}
                    align={align}
                    padding={padding}
                    margin={margin}
                    backgroundColor={backgroundColor}
                    width={width}
                    height={height}
                >
                    {genie}
                </Genie>
            )}
        </>
    );
});

GenieTrigger.displayName = 'GenieTrigger';

/**
 * useGeniePortal - Simplified portal-based Genie integration hook
 * 
 * This hook provides a clean way to integrate Genie with any component using React Portal
 * to avoid DOM nesting issues. Perfect for table rows, complex components, or anywhere
 * clean DOM structure is needed.
 * 
 * @param {Object|null} genieConfig - Genie configuration object with content, trigger, variant, etc.
 * @param {React.RefObject} triggerRef - Reference to the trigger element
 * @param {Function} onShow - Callback when Genie shows
 * @param {Function} onHide - Callback when Genie hides
 * @returns {Object} - { isActive, triggerProps, GeniePortal, handleShow, handleHide }
 */
export const useGeniePortal = (genieConfig, triggerRef, onShow = null, onHide = null) => {
  const [isActive, setIsActive] = useState(false);

  // Event handlers with CSS class management
  const handleShow = useCallback(() => {
    setIsActive(true);
    if (triggerRef?.current) {
      triggerRef.current.classList.add('has-genie-active');
    }
    if (onShow) onShow();
  }, [onShow, triggerRef]);

  const handleHide = useCallback(() => {
    setIsActive(false);
    if (triggerRef?.current) {
      triggerRef.current.classList.remove('has-genie-active');
    }
    if (onHide) onHide();
  }, [onHide, triggerRef]);

  // Generate trigger props based on trigger type
  const triggerProps = useMemo(() => {
    if (!genieConfig) return {};
    
    const props = { style: { cursor: 'pointer' } };
    
    // Use default trigger if not specified
    const trigger = genieConfig.trigger || 'click';
    
    switch (trigger) {
      case 'hover':
        props.onMouseEnter = handleShow;
        props.onMouseLeave = handleHide;
        break;
      case 'click':
        // For click triggers, provide both onClick and handleShow/handleHide
        // This allows components to choose their integration pattern
        props.onClick = (e) => {
          if (isActive) {
            handleHide();
          } else {
            handleShow();
          }
        };
        break;
      case 'contextmenu':
        props.onContextMenu = (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (isActive) {
            handleHide();
          } else {
            handleShow();
          }
        };
        break;
    }
    
    return props;
  }, [genieConfig, handleShow, handleHide, isActive]);

  // Portal component for rendering Genie
  const GeniePortal = useMemo(() => {
    if (!genieConfig || typeof document === 'undefined') return null;
    
    return createPortal(
      <Genie
        visible={isActive}
        onClose={handleHide}
        triggerRef={triggerRef}
        variant={genieConfig.variant || 'popover'}
        animation={genieConfig.animation}
        backdrop={genieConfig.backdrop}
        width={genieConfig.width}
        height={genieConfig.height}
        minWidth={genieConfig.minWidth}
        minHeight={genieConfig.minHeight}
        maxWidth={genieConfig.maxWidth}
        maxHeight={genieConfig.maxHeight}
        layout={genieConfig.layout}
        padding={genieConfig.padding}
        theme={genieConfig.theme}
        margin={genieConfig.margin}
        backgroundColor={genieConfig.backgroundColor}
        columns={genieConfig.columns}
        gap={genieConfig.gap}
        justify={genieConfig.justify}
        align={genieConfig.align}
        closeOnClickOutside={genieConfig.closeOnClickOutside}
        closeOnEscape={genieConfig.closeOnEscape}
        autoClose={genieConfig.autoClose}
        role={genieConfig.role}
        ariaLabel={genieConfig.ariaLabel}
        ariaLabelledBy={genieConfig.ariaLabelledBy}
      >
        {typeof genieConfig.content === 'function' 
          ? genieConfig.content({ onClose: handleHide })
          : genieConfig.content}
      </Genie>,
      document.fullscreenElement || document.body
    );
  }, [
    genieConfig, 
    isActive, 
    handleHide, 
    triggerRef
  ]);

  return {
    isActive,
    handleShow,
    handleHide,
    triggerProps,
    GeniePortal
  };
};
