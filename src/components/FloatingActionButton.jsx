import React, { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTheme } from '@contexts/ThemeContext';
import { useGeniePortal } from './Genie';
import Icon from './Icon';
import Badge from './Badge';

/**
 * FloatingActionButton - Enhanced floating action button with complete positional awareness
 * Based on Button component but with fixed positioning and parent container awareness
 *
 * Key Features:
 * - Built on Button component foundation with consistent styling
 * - Complete positional awareness of parent (Container, Card, Page)
 * - Persistent positioning within scrollview of parent container
 * - Higher z-index than other components but below Genie
 * - Full Genie integration for tooltips, menus, etc.
 * - Responsive positioning with mobile optimizations
 * - Theme inheritance support
 * - Accessibility support
 * - Draggable functionality within parent container boundaries
 * - Icon-based design with standardized icon prop (no children support)
 * - Optional badge support with auto-positioning (max 10 characters)
 *
 * Positioning System:
 * - Automatically detects parent container type (Page, Card, Container)
 * - Positions relative to parent container bounds
 * - Stays persistent during scrolling within parent
 * - Supports 9 position variants: corners, edges, and center
 * - Responsive adjustments for mobile devices
 * - Optional drag and drop repositioning within parent container
 */
export const FloatingActionButton = forwardRef(({
    className = '',
    variant = 'primary', // Button variant: 'primary', 'secondary', etc.
    size = 'md', // Button size: 'xs', 'sm', 'md', 'lg', 'xl'
    disabled = false,
    type = 'button',
    onClick,
    icon = 'FiPlus', // Default icon for the FAB
    badge = null, // Badge text (max 10 characters) to display
    badgeColor = 'error', // Badge color variant
    position = 'bottom-right', // 'top-left', 'top', 'top-right', 'left', 'right', 'bottom-left', 'bottom', 'bottom-right'
    theme = null, // Optional theme override
    width = null, // Width value (e.g., '100%', '200px', 'auto')
    height = null, // Height value (e.g., '2rem', '32px', 'auto')
    minWidth = null, // Minimum width (e.g., '100px', '5rem')
    minHeight = null, // Minimum height (e.g., '2rem', '32px')
    maxWidth = null, // Maximum width (e.g., '500px', '100%')
    maxHeight = null, // Maximum height (e.g., '10rem', '200px')
    marginTop = null, // Margin top: 'none', 'xs', 'sm', 'md', 'lg', 'xl' or custom value
    marginBottom = null, // Margin bottom: 'none', 'xs', 'sm', 'md', 'lg', 'xl' or custom value
    justifySelf = null, // CSS justify-self property: 'auto', 'start', 'end', 'center', 'stretch'
    // Genie integration props
    genie = null, // Genie content to show
    genieTrigger = 'click', // 'click', 'hover', 'contextmenu'
    onGenieShow = null, // Callback when genie shows
    onGenieHide = null, // Callback when genie hides
    // Parent awareness props
    parentType = 'auto', // 'auto', 'page', 'card', 'container' - auto-detects if not specified
    // Draggable functionality
    draggable = false, // Enable dragging of the FAB within its container
    snapToEdges = true, // Enable snapping to container edges when dragging ends
    snapThreshold = 100, // Distance from edge (in pixels) to trigger snapping
    edgePadding = 16, // Padding from edges when snapping
    ...props
}, ref) => {
    const effectiveTheme = useTheme();

    // Use theme prop if provided, otherwise use effective theme from context
    const fabTheme = theme || effectiveTheme.currentTheme;

    const fabRef = ref || useRef(null);
    const fabContainerRef = useRef(null);
    const [detectedParentType, setDetectedParentType] = useState('container');

    // Draggable state
    const [isDragging, setIsDragging] = useState(false);
    const [isSnapping, setIsSnapping] = useState(false);
    const [isNearEdge, setIsNearEdge] = useState(false);
    const [snapPreview, setSnapPreview] = useState(null);
    const [dragPosition, setDragPosition] = useState({x: 0, y: 0});
    const [offset, setOffset] = useState({x: 0, y: 0});
    const [initialPosition, setInitialPosition] = useState({x: 0, y: 0});

    // Auto-detect parent container type
    useEffect(() => {
        if (parentType !== 'auto' || !fabRef.current) return;

        let element = fabRef.current.parentElement;
        while (element) {
            const classList = element.classList;
            if (classList.contains('page') || classList.contains('themed-page')) {
                setDetectedParentType('page');
                break;
            } else if (classList.contains('card') || classList.contains('themed-card')) {
                setDetectedParentType('card');
                break;
            } else if (classList.contains('container') || classList.contains('themed-container')) {
                setDetectedParentType('container');
                break;
            }
            element = element.parentElement;
        }
    }, [parentType]);

    // Determine effective parent type
    const effectiveParentType = parentType === 'auto' ? detectedParentType : parentType;

    // Genie integration using the portal hook
    const genieConfig = useMemo(() => {
        if (!genie) return null;

        if (typeof genie === 'object' && genie.content) {
            // New API: genie is an object with trigger, content, position
            return {
                ...genie,
                trigger: genie.trigger ?? genieTrigger,
                position: genie.position ?? 'auto',
                variant: genie.variant ?? 'popover',
                size: genie.size ?? 'medium',
                theme: genie.theme ?? fabTheme // Inherit FAB's theme if not explicitly set
            };
        }

        // Old API: genie is just the content, other props are separate
        return {
            content: genie,
            trigger: genieTrigger,
            position: 'auto',
            variant: 'popover',
            size: 'medium',
            theme: fabTheme // Always inherit FAB's theme for old API
        };
    }, [genie, genieTrigger, fabTheme]);

    const {triggerProps, GeniePortal} = useGeniePortal(genieConfig, fabRef, onGenieShow, onGenieHide);

    // Generate CSS classes
    const getVariantClass = () => {
        return `themed-button-${variant}`;
    };

    const getSizeClass = () => {
        switch (size) {
            case 'xs':
                return 'xs';
            case 'sm':
                return 'sm';
            case 'lg':
                return 'lg';
            case 'xl':
                return 'xl';
            case 'md':
            default:
                return 'md';
        }
    };

    const getPositionClass = () => {
        return `fab-position-${position}`;
    };

    const getParentTypeClass = () => {
        return `fab-parent-${effectiveParentType}`;
    };

    // Calculate snap position based on current position and container bounds
    const calculateSnapPosition = useCallback((currentX, currentY, containerWidth, containerHeight, fabWidth, fabHeight) => {
        if (!snapToEdges) {
            return {x: currentX, y: currentY, willSnap: false, snapEdge: null};
        }

        const distanceToLeft = currentX - edgePadding;
        const distanceToRight = containerWidth - currentX - fabWidth - edgePadding;
        const distanceToTop = currentY - edgePadding;
        const distanceToBottom = containerHeight - currentY - fabHeight - edgePadding;

        // Find the minimum distance to any edge (accounting for padding)
        const minDistance = Math.min(
            Math.abs(distanceToLeft),
            Math.abs(distanceToRight),
            Math.abs(distanceToTop),
            Math.abs(distanceToBottom)
        );

        // Only snap if we're within the threshold
        if (minDistance > snapThreshold) {
            return {x: currentX, y: currentY, willSnap: false, snapEdge: null};
        }

        let snapX = currentX;
        let snapY = currentY;
        let snapEdge = null;

        // Snap to the nearest edge (with padding)
        if (Math.abs(distanceToLeft) === minDistance) {
            // Snap to left edge
            snapX = edgePadding;
            snapEdge = 'left';
        } else if (Math.abs(distanceToRight) === minDistance) {
            // Snap to right edge
            snapX = containerWidth - fabWidth - edgePadding;
            snapEdge = 'right';
        } else if (Math.abs(distanceToTop) === minDistance) {
            // Snap to top edge
            snapY = edgePadding;
            snapEdge = 'top';
        } else if (Math.abs(distanceToBottom) === minDistance) {
            // Snap to bottom edge
            snapY = containerHeight - fabHeight - edgePadding;
            snapEdge = 'bottom';
        }

        return {x: snapX, y: snapY, willSnap: true, snapEdge};
    }, [snapToEdges, snapThreshold, edgePadding]);

    // Calculate initial position for draggable FAB within snap boundaries
    const calculateInitialPosition = useCallback(() => {
        if (!fabContainerRef.current || !fabContainerRef.current.parentElement) {
            return {x: edgePadding, y: edgePadding};
        }

        const containerRect = fabContainerRef.current.parentElement.getBoundingClientRect();
        const fabRect = fabContainerRef.current.getBoundingClientRect();

        // Use the position prop to determine initial placement
        let initialX, initialY;

        switch (position) {
            case 'top-left':
                initialX = edgePadding;
                initialY = edgePadding;
                break;
            case 'top':
                initialX = (containerRect.width - fabRect.width) / 2;
                initialY = edgePadding;
                break;
            case 'top-right':
                initialX = containerRect.width - fabRect.width - edgePadding;
                initialY = edgePadding;
                break;
            case 'left':
                initialX = edgePadding;
                initialY = (containerRect.height - fabRect.height) / 2;
                break;
            case 'right':
                initialX = containerRect.width - fabRect.width - edgePadding;
                initialY = (containerRect.height - fabRect.height) / 2;
                break;
            case 'bottom-left':
                initialX = edgePadding;
                initialY = containerRect.height - fabRect.height - edgePadding;
                break;
            case 'bottom':
                initialX = (containerRect.width - fabRect.width) / 2;
                initialY = containerRect.height - fabRect.height - edgePadding;
                break;
            case 'bottom-right':
            default:
                initialX = containerRect.width - fabRect.width - edgePadding;
                initialY = containerRect.height - fabRect.height - edgePadding;
                break;
        }

        // Ensure we stay within boundaries
        initialX = Math.max(edgePadding, Math.min(initialX, containerRect.width - fabRect.width - edgePadding));
        initialY = Math.max(edgePadding, Math.min(initialY, containerRect.height - fabRect.height - edgePadding));

        return {x: initialX, y: initialY};
    }, [position, edgePadding]);

    // Unified drag handlers that work for both mouse and touch events
    const handleDragStart = useCallback(
        (e) => {
            if (!draggable || disabled) return;

            // Don't initiate drag on right-click
            if (e.button === 2) return;

            e.preventDefault();
            e.stopPropagation();

            // Get client coordinates from either mouse or touch event
            const clientX = e.clientX ?? e.touches?.[0]?.clientX;
            const clientY = e.clientY ?? e.touches?.[0]?.clientY;

            if (clientX === undefined || clientY === undefined) return;

            const containerRect = fabContainerRef.current.parentElement.getBoundingClientRect();
            const fabRect = fabContainerRef.current.getBoundingClientRect();
            
            setInitialPosition({
                x: fabRect.left - containerRect.left,
                y: fabRect.top - containerRect.top
            });

            setOffset({
                x: clientX - fabRect.left,
                y: clientY - fabRect.top
            });

            setIsDragging(true);
        },
        [draggable, disabled]
    );

    const handleDragMove = useCallback(
        (e) => {
            if (!isDragging) return;

            // Get client coordinates from either mouse or touch event
            const clientX = e.clientX ?? e.touches?.[0]?.clientX;
            const clientY = e.clientY ?? e.touches?.[0]?.clientY;

            if (clientX === undefined || clientY === undefined) return;

            const containerRect = fabContainerRef.current.parentElement.getBoundingClientRect();
            const fabRect = fabContainerRef.current.getBoundingClientRect();

            let newX = clientX - containerRect.left - offset.x;
            let newY = clientY - containerRect.top - offset.y;

            newX = Math.max(edgePadding, Math.min(newX, containerRect.width - fabRect.width - edgePadding));
            newY = Math.max(edgePadding, Math.min(newY, containerRect.height - fabRect.height - edgePadding));

            setDragPosition({x: newX, y: newY});

            if (snapToEdges) {
                const snapInfo = calculateSnapPosition(
                    newX,
                    newY,
                    containerRect.width,
                    containerRect.height,
                    fabRect.width,
                    fabRect.height
                );

                setIsNearEdge(snapInfo.willSnap);
                setSnapPreview(snapInfo.willSnap ? snapInfo : null);
            }
        },
        [isDragging, offset, edgePadding, snapToEdges, calculateSnapPosition]
    );

    const handleDragEnd = useCallback(() => {
        if (!isDragging) return;

        setIsDragging(false);
        setIsNearEdge(false);
        setSnapPreview(null);

        if (snapToEdges && fabContainerRef.current) {
            const containerRect = fabContainerRef.current.parentElement.getBoundingClientRect();
            const fabRect = fabContainerRef.current.getBoundingClientRect();

            const snapInfo = calculateSnapPosition(
                dragPosition.x,
                dragPosition.y,
                containerRect.width,
                containerRect.height,
                fabRect.width,
                fabRect.height
            );

            if (snapInfo.willSnap && (snapInfo.x !== dragPosition.x || snapInfo.y !== dragPosition.y)) {
                setIsSnapping(true);
                setDragPosition({x: snapInfo.x, y: snapInfo.y});

                setTimeout(() => {
                    setIsSnapping(false);
                }, 300);
            }
        }
    }, [isDragging, snapToEdges, dragPosition, calculateSnapPosition]);

    // Add and remove event listeners for drag operations
    useEffect(() => {
        if (isDragging) {
            document.addEventListener('mousemove', handleDragMove);
            document.addEventListener('mouseup', handleDragEnd);
            document.addEventListener('touchmove', handleDragMove, {passive: false});
            document.addEventListener('touchend', handleDragEnd);
        } else {
            document.removeEventListener('mousemove', handleDragMove);
            document.removeEventListener('mouseup', handleDragEnd);
            document.removeEventListener('touchmove', handleDragMove);
            document.removeEventListener('touchend', handleDragEnd);
        }

        return () => {
            document.removeEventListener('mousemove', handleDragMove);
            document.removeEventListener('mouseup', handleDragEnd);
            document.removeEventListener('touchmove', handleDragMove);
            document.removeEventListener('touchend', handleDragEnd);
        };
    }, [isDragging, handleDragMove, handleDragEnd]);

    // When draggable prop changes, set proper initial position
    useEffect(() => {
        if (!draggable) {
            setDragPosition({x: 0, y: 0});
            setIsDragging(false);
            setIsSnapping(false);
        } else {
            // Set initial position based on position prop and snap boundaries
            const initialPos = calculateInitialPosition();
            setDragPosition(initialPos);
        }
    }, [draggable, calculateInitialPosition]);

    // Recalculate position when container resizes or position changes for draggable FABs
    useEffect(() => {
        if (draggable && fabContainerRef.current) {
            const handleResize = () => {
                const initialPos = calculateInitialPosition();
                setDragPosition(initialPos);
            };

            // Use ResizeObserver to detect container size changes
            const resizeObserver = new ResizeObserver(handleResize);
            const parentElement = fabContainerRef.current.parentElement;

            if (parentElement) {
                resizeObserver.observe(parentElement);
            }

            return () => {
                if (parentElement) {
                    resizeObserver.unobserve(parentElement);
                }
                resizeObserver.disconnect();
            };
        }
    }, [draggable, position, calculateInitialPosition]);

    const getFABStyle = () => {
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

    // Calculate position styles for non-draggable FABs
    const getPositionStyles = () => {
        if (draggable) return {};

        const styles = {};
        
        switch (position) {
            case 'top-left':
                styles.top = `${edgePadding}px`;
                styles.left = `${edgePadding}px`;
                break;
            case 'top':
                styles.top = `${edgePadding}px`;
                styles.left = '50%';
                styles.transform = 'translateX(-50%)';
                break;
            case 'top-right':
                styles.top = `${edgePadding}px`;
                styles.right = `${edgePadding}px`;
                break;
            case 'left':
                styles.top = '50%';
                styles.left = `${edgePadding}px`;
                styles.transform = 'translateY(-50%)';
                break;
            case 'right':
                styles.top = '50%';
                styles.right = `${edgePadding}px`;
                styles.transform = 'translateY(-50%)';
                break;
            case 'bottom-left':
                styles.bottom = `${edgePadding}px`;
                styles.left = `${edgePadding}px`;
                break;
            case 'bottom':
                styles.bottom = `${edgePadding}px`;
                styles.left = '50%';
                styles.transform = 'translateX(-50%)';
                break;
            case 'bottom-right':
            default:
                styles.bottom = `${edgePadding}px`;
                styles.right = `${edgePadding}px`;
                break;
        }
        
        return styles;
    };

    return (
        <div
            ref={fabContainerRef}
            className={`
        fab-container
        ${!isDragging && !draggable ? getPositionClass() : ''}
        ${getParentTypeClass()}
        fab-scroll-with-parent
        ${draggable ? 'fab-draggable' : ''}
        ${isDragging ? 'fab-dragging' : ''}
        ${isNearEdge ? 'fab-near-edge' : ''}
        ${isSnapping ? 'fab-snapping' : ''}
        theme-${fabTheme}
      `.trim().replace(/\s+/g, ' ')}
            data-theme={fabTheme}
            data-parent-type={effectiveParentType}
            data-position={!draggable ? position : 'custom'}
            data-snap-enabled={snapToEdges}
            data-edge-padding={edgePadding}
            style={
                draggable
                    ? {
                        left: `${dragPosition.x}px`,
                        top: `${dragPosition.y}px`,
                        transform: 'none',
                        transition: isDragging ? 'none' : isSnapping ? 'left 0.3s ease-out, top 0.3s ease-out' : 'all 0.3s ease'
                    }
                    : getPositionStyles()
            }
        >
            {/* Snap Preview Indicator - Shows a shadow/ghost of the button where it will snap to */}
            {isDragging && snapPreview && snapPreview.willSnap && (
                <button
                    className={`
            fab-snap-preview
            floating-action-button
            button
            themed-button
            ${getVariantClass()}
            ${getSizeClass()}
            theme-${fabTheme}
          `.trim().replace(/\s+/g, ' ')}
                    style={{
                        position: 'absolute',
                        left: `${snapPreview.x - dragPosition.x}px`,
                        top: `${snapPreview.y - dragPosition.y}px`,
                        pointerEvents: 'none',
                        zIndex: -1,
                        transform: 'none',
                        transition: 'none'
                    }}
                    disabled
                >
          <span className="button-content">
            <Icon name={icon} size={size}/>
          </span>
                </button>
            )}

            <button
                ref={fabRef}
                type={type}
                className={`
          floating-action-button 
          button 
          themed-button 
          ${getVariantClass()} 
          ${getSizeClass()} 
          ${genieConfig ? 'genie-trigger' : ''} 
          ${draggable ? 'fab-handle' : ''}
          theme-${fabTheme} 
          ${className}
        `.trim().replace(/\s+/g, ' ')}
                disabled={disabled}
                onClick={(e) => {
                    if (onClick) onClick(e);
                    if (triggerProps?.onClick) triggerProps.onClick(e);
                }}
                onMouseDown={draggable ? handleDragStart : undefined}
                onTouchStart={draggable ? handleDragStart : undefined}
                data-theme={fabTheme}
                data-theme-source={theme ? 'local' : 'inherited'}
                data-draggable={draggable}
                style={getFABStyle()}
                {...props}
                {...(genieConfig?.trigger !== 'click' ? triggerProps : {})}
            >
        <span className="button-content">
          <Icon name={icon} size={size}/>
        </span>
        </button>

            {/* Badge - positioned absolutely on top-right of FAB */}
            {badge && (
                <Badge
                    color={badgeColor}
                    size="sm"
                    className="fab-badge"
                >
                    {String(badge).slice(0, 10)}
                </Badge>
            )}

            {/* Genie Integration - Rendered within the same positioned container */}
            {GeniePortal}
        </div>
    );
});

FloatingActionButton.displayName = 'FloatingActionButton';

export default FloatingActionButton;
