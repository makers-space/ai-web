import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useTheme } from '@contexts/ThemeContext';
import { useSpring, useSprings, animated } from '@react-spring/web';

// Hook to handle animation configuration defaults
const useAnimationConfig = (config, duration, stagger, length) => {
    return useMemo(() => {
        const defaults = {
            splitBy: 'characters',
            direction: 'top',
            characters: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+',
            maxIterations: 10,
            sequential: false,
            revealDirection: 'start',
            colors: [],
            showBorder: false,
            typingSpeed: 50,
            deletingSpeed: 30,
            loop: true,
            showCursor: true,
            cursorCharacter: '|',
            pauseDuration: 2000,
            spinDuration: duration || 5000,
            onHover: 'speedUp',
            circularSize: 200,
            circularFontSize: 24,
            proximityRadius: 100,
            fromFontWeight: 400,
            toFontWeight: 900,
            blurAmount: 5,
            focusMode: 'auto',
            borderColor: 'primary',
            scrambleRadius: 100,
            scrambleSpeed: 30,
            scrambleChars: '!<>-_\\/[]{}—=+*^?#________'
        };
        return { ...defaults, ...config };
    }, [config, duration]);
};

const TEXT_BLOCK_ANIMATIONS = ['typewriter', 'decrypt', 'scramble', 'proximity', 'circular', 'focus', 'gradient', 'shiny', 'glitch'];

// Hook to handle text splitting
const useTextSplitting = (text, animation, splitBy) => {
    return useMemo(() => {
        if (!text) return [];
        
        // For animations that don't use springs per character (like typewriter), 
        // we might still want to split for consistency or return a single segment
        if (TEXT_BLOCK_ANIMATIONS.includes(animation)) {
             return [{
                key: 'full-text',
                displayValue: text,
                springIndex: null,
                isLineBreak: false
            }];
        }

        if (splitBy === 'words') {
            // Split on breakable whitespace; non-breaking spaces stay glued to their word
            const parts = text.split(/([^\S\u00A0]+)/);
            let springIndexCounter = 0;
            
            return parts.map((part, index) => {
                // Check if the part is purely whitespace
                const isSpace = /^\s+$/.test(part);
                
                // Only assign a spring index to non-whitespace parts (actual words)
                const currentSpringIndex = isSpace ? null : springIndexCounter++;
                
                return {
                    key: index,
                    displayValue: part,
                    springIndex: currentSpringIndex,
                    isLineBreak: false
                };
            });
        }

        // Default character splitting
        return text.split('').map((char, index) => ({
            key: index,
            displayValue: char,
            springIndex: index,
            isLineBreak: false
        }));
    }, [text, animation, splitBy]);
};

// Hook to handle animation triggers
const useAnimationTrigger = (ref, animation, animateOn, onStart) => {
    const [shouldAnimate, setShouldAnimate] = useState(animation !== 'none' && animateOn === 'mount');
    const [isHovering, setIsHovering] = useState(false);
    const hasStartedRef = useRef(false);
    
    useEffect(() => {
        if (animation === 'none') {
            setShouldAnimate(false);
            return;
        }

        if (animateOn === 'mount') {
            setShouldAnimate(true);
            if (!hasStartedRef.current && onStart) {
                onStart();
                hasStartedRef.current = true;
            }
        } else if (animateOn === 'hover') {
            setShouldAnimate(isHovering);
            if (isHovering && !hasStartedRef.current && onStart) {
                onStart();
                hasStartedRef.current = true;
            }
            if (!isHovering) {
                hasStartedRef.current = false;
            }
        }
    }, [animation, animateOn, isHovering, onStart]);

    return { shouldAnimate, isHovering, setIsHovering };
};

// Convert an animation config object (which may use react-spring style x/y
// shorthands) into a plain CSS style object.
const toCssAnimationStyle = (config) => {
    if (!config) return {};
    const { x, y, ...rest } = config;
    const style = { ...rest };
    if (x !== undefined || y !== undefined) {
        style.transform = `translate3d(${x || 0}px, ${y || 0}px, 0)`;
    }
    return style;
};

// Staggered entrance engine for blur/fade/slide. CSS transitions, not
// react-spring: spring frameloop bindings break under StrictMode double-mount.
const StaggeredTransitionAnimation = React.memo(({
    fromStyle,
    toStyle,
    shouldAnimate,
    animationDelay,
    animationStagger,
    animationDuration,
    animatedSegmentCount,
    notifyAnimationComplete,
    renderSegmentsWithSprings
}) => {
    const [active, setActive] = useState(false);

    useEffect(() => {
        if (!shouldAnimate) {
            setActive(false);
            return undefined;
        }
        // Render one frame at "from" so the transition has a start point
        let raf2;
        const raf1 = requestAnimationFrame(() => {
            raf2 = requestAnimationFrame(() => setActive(true));
        });
        return () => {
            cancelAnimationFrame(raf1);
            if (raf2) cancelAnimationFrame(raf2);
        };
    }, [shouldAnimate]);

    useEffect(() => {
        if (!active) return undefined;
        const total = animationDelay + animationStagger * Math.max(0, animatedSegmentCount - 1) + animationDuration;
        const timer = setTimeout(notifyAnimationComplete, total);
        return () => clearTimeout(timer);
    }, [active, animationDelay, animationStagger, animationDuration, animatedSegmentCount, notifyAnimationComplete]);

    const segmentStyles = useMemo(() => (
        Array.from({ length: animatedSegmentCount }, (_, index) => ({
            ...(active ? toStyle : fromStyle),
            transition: `all ${animationDuration}ms ease`,
            transitionDelay: `${active
                ? animationDelay + animationStagger * index
                : animationStagger * (animatedSegmentCount - 1 - index)}ms`,
        }))
    ), [active, toStyle, fromStyle, animationDelay, animationStagger, animationDuration, animatedSegmentCount]);

    return renderSegmentsWithSprings(segmentStyles);
});

// External Animation Components to prevent remounting on state changes
const BlurAnimation = React.memo(({ animConfig, animateOn, ...rest }) => {
    const fromStyle = useMemo(() => {
        if (animConfig.from) return toCssAnimationStyle(animConfig.from);
        // If hover trigger, keep visible but blurred
        return { opacity: animateOn === 'hover' ? 1 : 0, filter: 'blur(10px)' };
    }, [animConfig.from, animateOn]);

    const toStyle = useMemo(() => (
        animConfig.to ? toCssAnimationStyle(animConfig.to) : { opacity: 1, filter: 'blur(0px)' }
    ), [animConfig.to]);

    return <StaggeredTransitionAnimation fromStyle={fromStyle} toStyle={toStyle} {...rest} />;
});

const FadeAnimation = React.memo(({ animConfig, animateOn, ...rest }) => {
    const fromStyle = useMemo(() => {
        if (animConfig.from) return toCssAnimationStyle(animConfig.from);
        // If hover trigger, keep partially visible
        return { opacity: animateOn === 'hover' ? 0.4 : 0 };
    }, [animConfig.from, animateOn]);

    const toStyle = useMemo(() => (
        animConfig.to ? toCssAnimationStyle(animConfig.to) : { opacity: 1 }
    ), [animConfig.to]);

    return <StaggeredTransitionAnimation fromStyle={fromStyle} toStyle={toStyle} {...rest} />;
});

const SlideAnimation = React.memo(({ animConfig, animateOn, ...rest }) => {
    const fromStyle = useMemo(() => {
        if (animConfig.from) return toCssAnimationStyle(animConfig.from);

        // If hover trigger, keep partially visible
        const defaultOpacity = animateOn === 'hover' ? 0.4 : 0;

        switch (animConfig.direction) {
            case 'left':
                return toCssAnimationStyle({ opacity: defaultOpacity, x: -50 });
            case 'right':
                return toCssAnimationStyle({ opacity: defaultOpacity, x: 50 });
            case 'bottom':
                return toCssAnimationStyle({ opacity: defaultOpacity, y: 50 });
            case 'top':
            default:
                return toCssAnimationStyle({ opacity: defaultOpacity, y: -50 });
        }
    }, [animConfig.from, animConfig.direction, animateOn]);

    const toStyle = useMemo(() => (
        animConfig.to ? toCssAnimationStyle(animConfig.to) : toCssAnimationStyle({ opacity: 1, x: 0, y: 0 })
    ), [animConfig.to]);

    return <StaggeredTransitionAnimation fromStyle={fromStyle} toStyle={toStyle} {...rest} />;
});

// Helper for color styles
const getColorStyle = (color) => {
    if (color === 'default') {
        return {};
    }

    const colorMapping = {
        'primary': 'var(--primary-color)',
        'secondary': 'var(--secondary-color)',
        'tertiary': 'var(--tertiary-color)',
        'success': 'var(--success-color)',
        'warning': 'var(--warning-color)',
        'error': 'var(--error-color)',
        'muted': 'var(--text-muted, color-mix(in srgb, var(--text-color) 65%, transparent))',
        'neutral': 'var(--neutral-color)',
        'info': 'var(--tertiary-color)',
        'header': 'var(--header-text-color, var(--text-color))',
        'contrast': 'var(--text-contrast-color)'
    };

    return {color: colorMapping[color] || 'inherit'};
};

const getSizeClass = (size) => {
    const sizeMap = { 'small': 'sm', 'large': 'lg', 'extra-large': 'xl' };
    return `typography-size-${sizeMap[size] || size}`;
};

const getMarginClasses = (margin, marginTop, marginBottom) => {
    const classes = [];
    if (margin) classes.push(`margin-${margin}`);
    if (marginTop) classes.push(`margin-top-${marginTop}`);
    if (marginBottom) classes.push(`margin-bottom-${marginBottom}`);
    return classes.join(' ');
};

const DecryptAnimation = React.memo(({
    stringContent,
    shouldAnimate,
    animConfig,
    animationStagger,
    animationDuration,
    notifyAnimationComplete,
    animationDelay
}) => {
    const [displayText, setDisplayText] = useState(stringContent);

    useEffect(() => {
        setDisplayText(stringContent);
    }, [stringContent]);

    useEffect(() => {
        if (!shouldAnimate || !stringContent) {
            setDisplayText(stringContent);
            return;
        }

        const availableChars = animConfig.characters.split('');
        const revealableIndices = [];
        const initialRevealed = new Set();

        for (let i = 0; i < stringContent.length; i += 1) {
            const char = stringContent[i];
            if (/\s/.test(char)) {
                initialRevealed.add(i);
            } else {
                revealableIndices.push(i);
            }
        }

        const totalRevealable = revealableIndices.length || 1;
        const maxIterationCount = Math.max(animConfig.maxIterations, 1);
        
        const steps = animConfig.sequential ? totalRevealable : maxIterationCount;
        const intervalDelay = Math.max(16, Math.round(animationDuration / steps));

        let revealedIndices = new Set(initialRevealed);
        let currentIteration = 0;
        let intervalId;
        let delayTimeoutId;

        const shuffleText = (target, revealedSet) => target
            .split('')
            .map((char, index) => {
                if (revealedSet.has(index) || /\s/.test(char)) {
                    return target[index];
                }
                const randomIndex = Math.floor(Math.random() * availableChars.length);
                return availableChars[randomIndex];
            })
            .join('');

        const getNextIndex = (revealedSet) => {
            if (revealableIndices.length === 0) {
                return null;
            }

            switch (animConfig.revealDirection) {
                case 'end': {
                    for (let idx = revealableIndices.length - 1; idx >= 0; idx -= 1) {
                        const candidate = revealableIndices[idx];
                        if (!revealedSet.has(candidate)) {
                            return candidate;
                        }
                    }
                    break;
                }
                case 'center': {
                    const middle = Math.floor((revealableIndices.length - 1) / 2);
                    for (let offset = 0; offset <= revealableIndices.length; offset += 1) {
                        const forward = revealableIndices[middle + offset];
                        if (forward !== undefined && !revealedSet.has(forward)) {
                            return forward;
                        }
                        const backward = revealableIndices[middle - offset];
                        if (backward !== undefined && !revealedSet.has(backward)) {
                            return backward;
                        }
                    }
                    break;
                }
                case 'start':
                default: {
                    for (let idx = 0; idx < revealableIndices.length; idx += 1) {
                        const candidate = revealableIndices[idx];
                        if (!revealedSet.has(candidate)) {
                            return candidate;
                        }
                    }
                    break;
                }
            }

            return null;
        };

        const startSequentialReveal = () => {
            intervalId = setInterval(() => {
                const nextIndex = getNextIndex(revealedIndices);

                if (nextIndex === null) {
                    clearInterval(intervalId);
                    setDisplayText(stringContent);
                    notifyAnimationComplete();
                    return;
                }

                const updated = new Set(revealedIndices);
                updated.add(nextIndex);
                revealedIndices = updated;
                setDisplayText(shuffleText(stringContent, revealedIndices));

                if (revealedIndices.size >= stringContent.length) {
                    clearInterval(intervalId);
                    setDisplayText(stringContent);
                    notifyAnimationComplete();
                }
            }, intervalDelay);
        };

        const startRandomizedReveal = () => {
            intervalId = setInterval(() => {
                currentIteration += 1;

                const updated = new Set(revealedIndices);
                const remainingIndices = revealableIndices.filter((index) => !updated.has(index));

                if (remainingIndices.length === 0) {
                    clearInterval(intervalId);
                    setDisplayText(stringContent);
                    notifyAnimationComplete();
                    return;
                }

                const iterationsLeft = Math.max(maxIterationCount - currentIteration + 1, 1);
                const batchSize = Math.max(1, Math.ceil(remainingIndices.length / iterationsLeft));

                for (let i = 0; i < batchSize && remainingIndices.length > 0; i += 1) {
                    const randomIndex = Math.floor(Math.random() * remainingIndices.length);
                    const [nextIndex] = remainingIndices.splice(randomIndex, 1);
                    if (nextIndex !== undefined) {
                        updated.add(nextIndex);
                    }
                }

                revealedIndices = updated;
                setDisplayText(shuffleText(stringContent, revealedIndices));

                if (revealedIndices.size >= stringContent.length) {
                    clearInterval(intervalId);
                    setDisplayText(stringContent);
                    notifyAnimationComplete();
                    return;
                }

                if (currentIteration >= maxIterationCount) {
                    clearInterval(intervalId);
                    setDisplayText(stringContent);
                    notifyAnimationComplete();
                }
            }, intervalDelay);
        };

        delayTimeoutId = setTimeout(() => {
            if (animConfig.sequential) {
                startSequentialReveal();
            } else {
                startRandomizedReveal();
            }
        }, animationDelay);

        return () => {
            if (intervalId) clearInterval(intervalId);
            if (delayTimeoutId) clearTimeout(delayTimeoutId);
        };
    }, [shouldAnimate, stringContent, animConfig, animationDelay, animationDuration, animationStagger, notifyAnimationComplete]);

    return <span>{displayText}</span>;
});

const GradientAnimation = React.memo(({
    color,
    animConfig,
    animationDuration,
    animationDelay,
    shouldAnimate,
    children,
    notifyAnimationComplete
}) => {
    const colorStyle = getColorStyle(color);
    const baseColor = colorStyle.color || 'var(--primary-color)';
    
    // Create a seamless repeating gradient pattern
    // Duplicate the sequence so the end matches the start
    const gradientStops = Array.isArray(animConfig.colors) && animConfig.colors.length > 0
        ? [...animConfig.colors, animConfig.colors[0]] // Add first color at end for seamless loop
        : [
            baseColor,
            'var(--primary-accent-color)',
            baseColor,
            'var(--secondary-accent-color)',
            baseColor,
            'var(--primary-accent-color)',  // Repeat to create seamless loop
            baseColor,
        ];

    const gradientDefinition = `linear-gradient(90deg, ${gradientStops.join(', ')})`;
    const wrapperClass = animConfig.showBorder ? 'typography-animation-gradient typography-animation-gradient--border' : 'typography-animation-gradient';

    return (
        <span
            className={wrapperClass}
            style={{
                '--typography-gradient-definition': gradientDefinition,
                '--typography-animation-duration': `${Math.max(animationDuration, 16)}ms`,
                '--typography-animation-delay': `${animationDelay}ms`,
                animationPlayState: shouldAnimate ? 'running' : 'paused',
            }}
            data-animation-role="gradient"
            onAnimationIteration={notifyAnimationComplete}
            onAnimationEnd={notifyAnimationComplete}
        >
            <span className="typography-animation-gradient-text" style={{ animationPlayState: shouldAnimate ? 'running' : 'paused' }}>
                {children}
            </span>
        </span>
    );
});

const ShinyAnimation = React.memo(({
    color,
    animationDuration,
    animationDelay,
    shouldAnimate,
    children,
    notifyAnimationComplete
}) => {
    const baseColor = color !== 'default' ? (getColorStyle(color).color || 'var(--text-color)') : '#b5b5b5a4';
    const [key, setKey] = useState(0);

    const handleAnimationEnd = useCallback(() => {
        notifyAnimationComplete();
        setKey(prev => prev + 1);
    }, [notifyAnimationComplete]);

    return (
        <span
            key={key}
            className="typography-animation-shiny"
            style={{
                '--typography-shiny-color': baseColor,
                '--typography-animation-duration': `${Math.max(animationDuration, 16)}ms`,
                '--typography-animation-delay': `${animationDelay}ms`,
                animationPlayState: shouldAnimate ? 'running' : 'paused',
                animationIterationCount: '1'
            }}
            data-animation-role="shiny"
            onAnimationIteration={notifyAnimationComplete}
            onAnimationEnd={handleAnimationEnd}
        >
            {children}
        </span>
    );
});

const TypewriterAnimation = React.memo(({
    shouldAnimate,
    stringContent,
    animConfig,
    animationDuration,
    notifyAnimationComplete,
    animationDelay
}) => {
    const [visibleCount, setVisibleCount] = useState(shouldAnimate ? 0 : stringContent.length);
    const [isAnimating, setIsAnimating] = useState(shouldAnimate);
    
    const stateRef = useRef({
        index: shouldAnimate ? 0 : stringContent.length,
        isDeleting: false
    });
    
    const shouldAnimateRef = useRef(shouldAnimate);
    const timeoutRef = useRef(null);
    const cursorRef = useRef(null);

    const { typingSpeed, deletingSpeed, pauseDuration, loop: shouldLoop, showCursor, cursorCharacter } = animConfig;

    const cursorSpring = useSpring({
        from: { opacity: 1 },
        to: { opacity: 0 },
        loop: true,
        config: { duration: Math.max(animationDuration / 2, 200) },
    });

    // Update ref when prop changes
    useEffect(() => {
        shouldAnimateRef.current = shouldAnimate;
        if (shouldAnimate) {
            setIsAnimating(true);
        }
    }, [shouldAnimate]);

    useEffect(() => {
        if (!isAnimating) {
            setVisibleCount(stringContent.length);
            return;
        }
        
        if (!stringContent) return;

        // If starting fresh animation
        if (shouldAnimateRef.current && stateRef.current.index === stringContent.length && !stateRef.current.isDeleting) {
            stateRef.current = {
                index: 0,
                isDeleting: false
            };
            setVisibleCount(0);
        }

        const type = () => {
            const { index, isDeleting } = stateRef.current;
            const currentShouldAnimate = shouldAnimateRef.current;

            if (isDeleting) {
                // If we stopped animating while deleting, switch to typing to reveal text
                if (!currentShouldAnimate) {
                    stateRef.current.isDeleting = false;
                    timeoutRef.current = setTimeout(type, typingSpeed);
                    return;
                }

                if (index === 0) {
                    // Always notify when cycle completes (text deleted)
                    notifyAnimationComplete();

                    if (!shouldLoop) {
                        return;
                    }
                    
                    stateRef.current.isDeleting = false;
                    timeoutRef.current = setTimeout(type, pauseDuration);
                } else {
                    const nextIndex = index - 1;
                    stateRef.current.index = nextIndex;
                    setVisibleCount(nextIndex);
                    timeoutRef.current = setTimeout(type, deletingSpeed);
                }
            } else {
                if (index < stringContent.length) {
                    const nextIndex = index + 1;
                    stateRef.current.index = nextIndex;
                    setVisibleCount(nextIndex);
                    timeoutRef.current = setTimeout(type, typingSpeed);
                } else {
                    // Finished typing
                    if (!currentShouldAnimate) {
                        setIsAnimating(false);
                        return;
                    }

                    if (!shouldLoop) {
                        notifyAnimationComplete();
                        return;
                    }
                    stateRef.current.isDeleting = true;
                    timeoutRef.current = setTimeout(type, pauseDuration);
                }
            }
        };

        timeoutRef.current = setTimeout(type, animationDelay);

        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [isAnimating, stringContent, typingSpeed, deletingSpeed, pauseDuration, shouldLoop, animationDelay, notifyAnimationComplete]);

    return (
        <span className="typography-animation-typewriter">
            <span>{stringContent.slice(0, visibleCount)}</span>
            {showCursor && (
                <animated.span
                    ref={cursorRef}
                    className="typography-typewriter-cursor"
                    style={cursorSpring}
                >
                    {cursorCharacter}
                </animated.span>
            )}
            <span style={{ opacity: 0 }}>{stringContent.slice(visibleCount)}</span>
        </span>
    );
});

const GlitchAnimation = React.memo(({
    color,
    animConfig,
    stringContent,
    animationDuration,
    animationDelay,
    shouldAnimate,
    children,
    notifyAnimationComplete
}) => {
    const textColor = color !== 'default' ? (getColorStyle(color).color || 'var(--text-color)') : 'var(--text-color)';
    const accentOne = Array.isArray(animConfig.colors) && animConfig.colors.length > 0
        ? animConfig.colors[0]
        : 'var(--error-color)';
    const accentTwo = Array.isArray(animConfig.colors) && animConfig.colors.length > 1
        ? animConfig.colors[1]
        : 'var(--tertiary-color)';

    return (
        <span
            className={`typography-animation-glitch ${shouldAnimate ? '' : 'inactive'}`}
            data-text={stringContent}
            style={{
                '--typography-glitch-color': textColor,
                '--typography-glitch-accent-1': accentOne,
                '--typography-glitch-accent-2': accentTwo,
                '--typography-glitch-duration-a': `${Math.max(animationDuration, 120)}ms`,
                '--typography-glitch-duration-b': `${Math.max(Math.round(animationDuration * 0.85), 90)}ms`,
                '--typography-animation-delay': `${animationDelay}ms`,
                animationPlayState: shouldAnimate ? 'running' : 'paused',
            }}
            data-animation-role="glitch"
            onAnimationIteration={notifyAnimationComplete}
            onAnimationEnd={notifyAnimationComplete}
        >
            {children}
        </span>
    );
});

const CircularAnimation = React.memo(({
    animConfig,
    animationDuration,
    animationDelay,
    shouldAnimate,
    animateOn,
    stringContent,
    notifyAnimationComplete
}) => {
    const [hovered, setHovered] = useState(false);
    
    const spinDuration = animConfig.spinDuration || animationDuration || 5000;
    const onHoverEffect = animConfig.onHover || 'speedUp'; // 'speedUp', 'pause', 'reverse', 'grow'

    const rotationSpring = useSpring({
        from: { rotate: 0 },
        to: { rotate: 360 },
        loop: () => {
            notifyAnimationComplete();
            return true;
        },
        delay: animationDelay,
        config: { duration: hovered && onHoverEffect === 'speedUp' ? spinDuration / 3 : spinDuration },
        pause: !shouldAnimate || (hovered && onHoverEffect === 'pause'),
        reverse: hovered && onHoverEffect === 'reverse',
    });

    const scaleSpring = useSpring({
        scale: hovered && onHoverEffect === 'grow' ? 1.2 : 1,
        config: { tension: 300, friction: 20 },
    });

    const size = animConfig.circularSize || 200;
    const fontSize = animConfig.circularFontSize || 24;
    const radius = size / 2;
    // Ensure path radius is positive to avoid SVG errors
    const pathRadius = Math.max(radius - (fontSize / 2), 1);
    
    // Generate unique ID for the SVG path
    const pathId = useMemo(() => `circular-text-${Math.random().toString(36).substr(2, 9)}`, []);
    
    // Add a space at the end to ensure even distribution around the circle
    // The space will occupy the gap between the last and first character
    const textToRender = stringContent + '\u00A0'; 
    const circumference = 2 * Math.PI * pathRadius;

    return (
        <animated.span
            className="typography-animation-circular"
            style={{
                ...rotationSpring,
                ...scaleSpring,
                width: `${size}px`,
                height: `${size}px`,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}
            onMouseEnter={() => (animateOn === 'hover' || animateOn === 'both') && setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            data-animation-role="circular"
        >
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: 'visible' }}>
                <defs>
                    <path
                        id={pathId}
                        d={`
                            M ${radius}, ${radius}
                            m 0, -${pathRadius}
                            a ${pathRadius},${pathRadius} 0 1,1 0,${2 * pathRadius}
                            a ${pathRadius},${pathRadius} 0 1,1 0,-${2 * pathRadius}
                        `}
                    />
                </defs>
                <text fontSize={fontSize} fontFamily="inherit" fontWeight="inherit" fill="currentColor" dominantBaseline="middle">
                    <textPath 
                        href={`#${pathId}`} 
                        textLength={circumference} 
                        lengthAdjust="spacing"
                    >
                        {textToRender}
                    </textPath>
                </text>
            </svg>
        </animated.span>
    );
});

const ProximityAnimation = React.memo(({
    stringContent,
    containerRef,
    animConfig,
    animationDuration,
    animationDelay,
    shouldAnimate
}) => {
    const letters = useMemo(() => {
        return Array.from(stringContent).map((char, index) => ({
            char,
            index,
            isSpace: /\s/.test(char),
        }));
    }, []);

    const letterRefs = useRef([]);
    const mousePositionRef = useRef({ x: -1000, y: -1000 }); // Start off-screen
    const isMouseInsideRef = useRef(false);
    const [canAnimate, setCanAnimate] = useState(false);
    
    const radius = animConfig.proximityRadius || 100;
    const fromWeight = animConfig.fromFontWeight || 400;
    const toWeight = animConfig.toFontWeight || 900;
    const duration = animationDuration / 1000; // Convert to seconds for CSS transition

    // Handle start delay
    useEffect(() => {
        if (shouldAnimate) {
            const timer = setTimeout(() => {
                setCanAnimate(true);
            }, animationDelay);
            return () => clearTimeout(timer);
        }
    }, [animationDelay, shouldAnimate]);

    // Track mouse position and container entry/exit
    useEffect(() => {
        if (!canAnimate) return;

        const handleMouseMove = (e) => {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                mousePositionRef.current = {
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top,
                };
                isMouseInsideRef.current = true;
            }
        };

        const handleMouseLeave = () => {
            isMouseInsideRef.current = false;
            mousePositionRef.current = { x: -1000, y: -1000 };
        };

        const container = containerRef.current;
        if (container) {
            container.addEventListener('mousemove', handleMouseMove);
            container.addEventListener('mouseleave', handleMouseLeave);
            return () => {
                container.removeEventListener('mousemove', handleMouseMove);
                container.removeEventListener('mouseleave', handleMouseLeave);
            };
        }
    }, [canAnimate]);

    // Smooth animation loop using RAF
    useEffect(() => {
        if (!canAnimate) return;
        
        let frameId;

        const updateLetters = () => {
            const containerRect = containerRef.current?.getBoundingClientRect();
            if (!containerRect) {
                frameId = requestAnimationFrame(updateLetters);
                return;
            }

            const { x: mouseX, y: mouseY } = mousePositionRef.current;

            letterRefs.current.forEach((letterEl) => {
                if (!letterEl) return;

                const rect = letterEl.getBoundingClientRect();
                const letterX = rect.left + rect.width / 2 - containerRect.left;
                const letterY = rect.top + rect.height / 2 - containerRect.top;

                const distance = Math.sqrt(
                    Math.pow(mouseX - letterX, 2) + Math.pow(mouseY - letterY, 2)
                );

                if (distance < radius && isMouseInsideRef.current) {
                    const proximity = 1 - distance / radius;
                    const weight = fromWeight + (toWeight - fromWeight) * proximity;
                    const scale = 1 + proximity * 0.3;
                    
                    letterEl.style.fontWeight = Math.round(weight);
                    letterEl.style.transform = `scale(${scale})`;
                } else {
                    letterEl.style.fontWeight = fromWeight;
                    letterEl.style.transform = 'scale(1)';
                }
            });

            frameId = requestAnimationFrame(updateLetters);
        };

        frameId = requestAnimationFrame(updateLetters);
        return () => cancelAnimationFrame(frameId);
    }, [radius, fromWeight, toWeight, canAnimate]);

    return (
        <span className="typography-animation-proximity" data-animation-role="proximity">
            {letters.map((letter, index) => (
                <span
                    key={`proximity-${index}`}
                    ref={(el) => (letterRefs.current[index] = el)}
                    className="typography-proximity-letter"
                    style={{
                        display: 'inline-block',
                        fontWeight: fromWeight,
                        transform: 'scale(1)',
                        transition: `transform ${duration}s ease, font-weight ${duration}s ease`,
                    }}
                >
                    {letter.char}
                </span>
            ))}
        </span>
    );
});

const ScrambleAnimation = React.memo(({
    stringContent,
    containerRef,
    animConfig,
    animationDuration,
    animationDelay,
    shouldAnimate,
    notifyAnimationComplete
}) => {
    const letters = useMemo(() => {
        return Array.from(stringContent).map((char, index) => ({
            char,
            index,
            original: char,
            isSpace: /\s/.test(char),
        }));
    }, [stringContent]);

    const letterRefs = useRef([]);
    const letterStates = useRef([]);
    
    // Initialize/Reset letter states
    useEffect(() => {
        letterStates.current = letters.map(() => ({
            targetTime: 0,
            lastCharUpdate: 0,
            running: false
        }));
    }, [letters]);
    
    const [isReady, setIsReady] = useState(false);
    const isLoopRunning = useRef(false);
    const frameRef = useRef(null);
    
    const radius = animConfig.scrambleRadius || 100;
    const baseDuration = animationDuration || 1000; 
    const updateInterval = (animConfig.scrambleSpeed && animConfig.scrambleSpeed > 5) 
        ? animConfig.scrambleSpeed 
        : 30; 
    const scrambleChars = animConfig.scrambleChars || '!<>-_\\/[]{}—=+*^?#________';

    // Handle start delay
    useEffect(() => {
        let timer;
        if (shouldAnimate) {
            timer = setTimeout(() => setIsReady(true), animationDelay);
        } else {
            setIsReady(false);
        }
        return () => clearTimeout(timer);
    }, [animationDelay, shouldAnimate]);

    const startLoop = useCallback(() => {
        if (isLoopRunning.current) return;
        isLoopRunning.current = true;
        
        const loop = () => {
            const now = performance.now();
            let isAnyRunning = false;
            
            letterRefs.current.forEach((letterEl, index) => {
                if (!letterEl || !letterStates.current[index]) return;
                
                const state = letterStates.current[index];
                
                if (state.running) {
                    isAnyRunning = true;
                    if (now < state.targetTime) {
                        if (now - state.lastCharUpdate > updateInterval) {
                            letterEl.textContent = scrambleChars[Math.floor(Math.random() * scrambleChars.length)];
                            state.lastCharUpdate = now;
                        }
                    } else {
                        letterEl.textContent = letters[index].original;
                        state.running = false;
                    }
                }
            });

            if (isAnyRunning) {
                frameRef.current = requestAnimationFrame(loop);
            } else {
                isLoopRunning.current = false;
                notifyAnimationComplete();
            }
        };
        
        frameRef.current = requestAnimationFrame(loop);
    }, [letters, scrambleChars, updateInterval, notifyAnimationComplete]);

    useEffect(() => {
        if (!isReady) return;

        const handleMouseMove = (e) => {
            if (!containerRef.current) return;
            
            const rect = containerRef.current.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            const now = performance.now();

            letterRefs.current.forEach((letterEl, index) => {
                if (!letterEl || letters[index].isSpace) return;

                const letterRect = letterEl.getBoundingClientRect();
                const letterX = letterRect.left + letterRect.width / 2 - rect.left;
                const letterY = letterRect.top + letterRect.height / 2 - rect.top;

                const dist = Math.sqrt(
                    Math.pow(mouseX - letterX, 2) + Math.pow(mouseY - letterY, 2)
                );

                if (dist < radius) {
                    const duration = baseDuration * (1 - dist / radius);
                    letterStates.current[index].targetTime = now + duration;
                    letterStates.current[index].running = true;
                }
            });
            
            startLoop();
        };

        const container = containerRef.current;
        if (container) {
            container.addEventListener('mousemove', handleMouseMove);
            return () => {
                container.removeEventListener('mousemove', handleMouseMove);
            };
        }
    }, [isReady, radius, baseDuration, letters, startLoop, containerRef]);

    useEffect(() => () => {
        if (frameRef.current) cancelAnimationFrame(frameRef.current);
    }, []);

    return (
        <span className="typography-animation-scramble" data-animation-role="scramble">
            {letters.map((letter, index) => (
                <span
                    key={`scramble-${index}`}
                    ref={(el) => (letterRefs.current[index] = el)}
                    className="typography-scramble-letter"
                    style={{
                        display: 'inline-block',
                    }}
                >
                    {letter.char}
                </span>
            ))}
        </span>
    );
});

const FocusAnimation = React.memo(({
    stringContent,
    animConfig,
    animationDuration,
    animationDelay,
    shouldAnimate,
    containerRef,
    notifyAnimationComplete
}) => {
    const words = useMemo(() => stringContent.split(' '), [stringContent]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const wordRefs = useRef([]);
    const [focusRect, setFocusRect] = useState({ x: 0, y: 0, width: 0, height: 0 });
    const prevIndexRef = useRef(currentIndex);
    
    const blurAmount = animConfig.blurAmount || 5;
    const mode = animConfig.focusMode || 'auto';
    
    const resolveThemeColor = (colorName) => {
        if (!colorName) return 'transparent';
        return `var(--${colorName}-color)`;
    };

    const borderColor = resolveThemeColor(animConfig.borderColor);

    // Defaults are handled in useAnimationConfig and props
    const durationMs = Number(animationDuration);
    const pauseMs = Number(animConfig.pauseDuration);
    const totalCycleMs = durationMs + pauseMs;

    useEffect(() => {
        if (currentIndex >= words.length) {
            setCurrentIndex(0);
        }
    }, [words.length]);

    // Notify on cycle complete
    useEffect(() => {
        if (mode === 'auto' && shouldAnimate && prevIndexRef.current === words.length - 1 && currentIndex === 0) {
            notifyAnimationComplete();
        }
        prevIndexRef.current = currentIndex;
    }, [currentIndex, mode, shouldAnimate, words.length, notifyAnimationComplete]);

    // Auto-cycle through words
    useEffect(() => {
        if (mode === 'auto' && shouldAnimate) {
            let interval;
            const timeout = setTimeout(() => {
                interval = setInterval(() => {
                    setCurrentIndex(prev => (prev + 1) % words.length);
                }, totalCycleMs);
            }, animationDelay);
            
            return () => {
                clearTimeout(timeout);
                if (interval) clearInterval(interval);
            };
        }
    }, [mode, shouldAnimate, words.length, totalCycleMs, animationDelay]);

    // Update focus frame position
    useEffect(() => {
        if (currentIndex === null || currentIndex === -1) return;
        if (!wordRefs.current[currentIndex] || !containerRef.current) return;

        const parentRect = containerRef.current.getBoundingClientRect();
        const activeRect = wordRefs.current[currentIndex].getBoundingClientRect();

        setFocusRect({
            x: activeRect.left - parentRect.left,
            y: activeRect.top - parentRect.top,
            width: activeRect.width,
            height: activeRect.height,
        });
    }, [currentIndex, words.length]);

    const handleMouseEnter = (index) => {
        if (mode === 'manual') {
            setCurrentIndex(index);
        }
    };

    const springProps = useSpring({
        x: focusRect.x,
        y: focusRect.y,
        width: focusRect.width,
        height: focusRect.height,
        opacity: currentIndex >= 0 ? 1 : 0,
        config: { tension: 300, friction: 30 },
    });

    return (
        <span className="typography-animation-focus" data-animation-role="focus">
            {words.map((word, index) => {
                const isActive = index === currentIndex;
                return (
                    <span
                        key={index}
                        ref={(el) => (wordRefs.current[index] = el)}
                        className={`typography-focus-word ${mode === 'manual' ? 'manual' : ''} ${isActive && mode !== 'manual' ? 'active' : ''}`}
                        style={{
                            filter: isActive ? 'blur(0px)' : `blur(${blurAmount}px)`,
                            transition: `filter ${durationMs}ms ease`,
                            cursor: mode === 'manual' ? 'pointer' : 'default',
                        }}
                        onMouseEnter={() => handleMouseEnter(index)}
                    >
                        {word}
                        {index < words.length - 1 && ' '}
                    </span>
                );
            })}
            <animated.span
                className="typography-focus-frame"
                style={{
                    position: 'absolute',
                    pointerEvents: 'none',
                    left: springProps.x,
                    top: springProps.y,
                    width: springProps.width,
                    height: springProps.height,
                    opacity: springProps.opacity,
                }}
            >
                <span className="corner top-left" style={{ '--border-color': borderColor, '--glow-color': borderColor }} />
                <span className="corner top-right" style={{ '--border-color': borderColor, '--glow-color': borderColor }} />
                <span className="corner bottom-left" style={{ '--border-color': borderColor, '--glow-color': borderColor }} />
                <span className="corner bottom-right" style={{ '--border-color': borderColor, '--glow-color': borderColor }} />
            </animated.span>
        </span>
    );
});

/**
 * Typography - Unified typography component for all text in the application
 * Simplified text component using size and weight props
 * Automatically converts href prop to link elements with proper styling
 * Enhanced with theme inheritance support and text animations
 */
export const Typography = ({
    children,
    className = '',
    size = 'md', // 'xxs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl'
    weight = 'normal', // 'thin', 'extralight', 'light', 'normal', 'regular', 'medium', 'semibold', 'bold', 'extrabold', 'black'
    color = 'default', // 'default', 'primary', 'secondary', 'success', 'warning', 'error', 'muted', 'header', 'tertiary', 'contrast'
    font = 'primary', // 'primary', 'secondary', 'monospace' - different font families per theme
    theme = null, // Optional theme override for this typography element
    width = null, // Width value (e.g., '100%', '200px', 'auto')
    height = null, // Height value (e.g., '2rem', '32px', 'auto')
    minWidth = null, // Minimum width (e.g., '100px', '5rem')
    minHeight = null, // Minimum height (e.g., '2rem', '32px')
    maxWidth = null, // Maximum width (e.g., '500px', '100%')
    maxHeight = null, // Maximum height (e.g., '10rem', '200px')
    justifySelf = null, // CSS justify-self property: 'auto', 'start', 'end', 'center', 'stretch'
    marginTop = null, // Margin top spacing: 'xs', 'sm', 'md', 'lg', 'xl'
    marginBottom = null, // Margin bottom spacing: 'xs', 'sm', 'md', 'lg', 'xl'
    margin = null, // All margin spacing: 'none', 'xs', 'sm', 'md', 'lg', 'xl'
    padding = null, // All padding spacing: 'none', 'xs', 'sm', 'md', 'lg', 'xl'
    as = null, // Semantic element to render: 'h1'-'h6', 'p', 'label', 'span', etc. (default 'span'; href always renders an 'a')
    truncate = false, // Keep to one line and end overflowing text with an ellipsis
    href, // URL for links - automatically renders as link with proper styling
    target, // Link target (_blank, _self, etc.)
    rel, // Link relationship (e.g., 'noopener noreferrer' for external links)
    
    // Animation props
    animation = 'none', // 'none', 'blur', 'decrypt', 'gradient', 'shiny', 'glitch', 'typewriter', 'fade', 'slide', 'circular', 'proximity', 'focus', 'scramble'
    animateOn = 'mount', // 'mount', 'hover'
    animationDelay = 0, // Initial delay before animation starts (ms)
    animationDuration = 600, // Duration of animation (ms)
    animationStagger = 50, // Delay between characters/words (ms)
    
    // Animation configuration object
    animationConfig = {},
    
    // Animation callbacks
    onAnimationStart,
    onAnimationComplete,
    
    ...props
}) => {
    const effectiveTheme = useTheme();
    const containerRef = useRef(null);

    // Use theme prop if provided, otherwise use effective theme from context
    const typographyTheme = theme || effectiveTheme.currentTheme;
    const stringContent = typeof children === 'string' ? children : '';
    const contentLength = stringContent.length > 0 ? stringContent.length : 1;
    
    // Parse animation config with defaults
    const animConfig = useAnimationConfig(animationConfig, animationDuration, animationStagger, contentLength);

    // Split text into elements for animations
    const textSegments = useTextSplitting(stringContent, animation, animConfig.splitBy);

    const animatedSegmentCount = useMemo(() => textSegments.reduce((count, segment) => (
        segment.springIndex === null ? count : count + 1
    ), 0), [textSegments]);

    // Handle animation triggers
    const { shouldAnimate, isHovering, setIsHovering } = useAnimationTrigger(containerRef, animation, animateOn, onAnimationStart);

    const prevShouldAnimateRef = useRef(shouldAnimate);

    useEffect(() => {
        prevShouldAnimateRef.current = shouldAnimate;
    }, [shouldAnimate]);

    const notifyAnimationComplete = useCallback(() => {
        if (!shouldAnimate) {
            return;
        }
        
        if (onAnimationComplete) {
            onAnimationComplete();
        }
    }, [shouldAnimate, onAnimationComplete]);

    const renderSegmentsWithSprings = useCallback((springs, extraWrapperClass = '') => {
        const wrapperClassName = ['typography-animated-wrapper', extraWrapperClass].filter(Boolean).join(' ');

        return (
            <span className={wrapperClassName}>
                {textSegments.map((segment) => {
                    if (segment.isLineBreak) {
                        return <br key={segment.key} />;
                    }

                    if (segment.springIndex === null || !springs || !springs[segment.springIndex]) {
                        return (
                            <span
                                key={segment.key}
                                className="typography-animated-space"
                            >
                                {segment.displayValue}
                            </span>
                        );
                    }

                    return (
                        <animated.span
                            key={segment.key}
                            className="typography-animated-element"
                            style={springs[segment.springIndex]}
                        >
                            {segment.displayValue}
                        </animated.span>
                    );
                })}
            </span>
        );
    }, [textSegments]);

    // Bundle common animation props to keep JSX clean
    const animationProps = {
        animConfig,
        animateOn,
        shouldAnimate,
        animationDelay,
        animationStagger,
        animationDuration,
        animatedSegmentCount,
        notifyAnimationComplete,
        renderSegmentsWithSprings,
        stringContent,
        containerRef,
        children
    };

    // Render appropriate animation based on animation prop
    const renderAnimatedContent = () => {
        if (animation === 'none' || !children) {
            return children;
        }

        const allAnimations = [...TEXT_BLOCK_ANIMATIONS, 'blur', 'fade', 'slide'];
        if (allAnimations.includes(animation) && stringContent.length === 0) {
            return children;
        }

        switch (animation) {
            case 'blur':
                return <BlurAnimation {...animationProps} />;
            case 'fade':
                return <FadeAnimation {...animationProps} />;
            case 'slide':
                return <SlideAnimation {...animationProps} />;
            case 'decrypt':
                return <DecryptAnimation {...animationProps} />;
            case 'gradient':
                return <GradientAnimation {...animationProps} color={color} />;
            case 'shiny':
                return <ShinyAnimation {...animationProps} color={color} />;
            case 'glitch':
                return <GlitchAnimation {...animationProps} color={color} />;
            case 'typewriter':
                return <TypewriterAnimation {...animationProps} />;
            case 'circular':
                return <CircularAnimation {...animationProps} />;
            case 'proximity':
                return <ProximityAnimation {...animationProps} />;
            case 'focus':
                return <FocusAnimation {...animationProps} />;
            case 'scramble':
                return <ScrambleAnimation {...animationProps} />;
            default:
                return children;
        }
    };

    // If href is provided, automatically render as a link; otherwise honor
    // the `as` prop so headings and paragraphs are semantic elements.
    const Component = href ? 'a' : (as || 'span');

    // Detect if this is an external link
    const isExternalLink = href && (
        href.startsWith('http://') ||
        href.startsWith('https://') ||
        href.startsWith('//') ||
        (href.includes('://') && !href.startsWith('mailto:') && !href.startsWith('tel:'))
    );

    // Auto-set target and rel for external links for security and UX
    const linkProps = href ? {
        href,
        target: target || (isExternalLink ? '_blank' : undefined),
        rel: rel || (isExternalLink ? 'noopener noreferrer' : undefined)
    } : {};
    
    const hoverHandlers = (animateOn === 'hover') && animation !== 'none' ? {
        onMouseEnter: () => setIsHovering(true),
        onMouseLeave: () => setIsHovering(false),
    } : {};

    const elementClass = href ? 'typography-link' : 'typography-text';
    const linkClass = href ? (isExternalLink ? 'typography-link-external' : 'typography-link-internal') : '';
    const justifyClass = justifySelf ? `justify-self-${justifySelf}` : '';
    const paddingClass = padding ? `padding-${padding}` : '';

    const classes = [
        'typography',
        elementClass,
        getSizeClass(size),
        `typography-weight-${weight}`,
        `typography-font-${font}`,
        linkClass,
        justifyClass,
        getMarginClasses(margin, marginTop, marginBottom),
        paddingClass,
        truncate ? 'typography-truncate' : '',
        `theme-${typographyTheme}`,
        className
    ].filter(Boolean).join(' ');

    // Merge the caller's style prop on top — spreading {...props} after
    // style={style} would otherwise REPLACE the computed style (dropping
    // color, sizing, etc.) whenever a caller passes any style at all.
    const { style: callerStyle, ...domProps } = props;
    const style = {
        ...getColorStyle(color),
        ...(width !== null && { width }),
        ...(height !== null && { height }),
        ...(minWidth !== null && { minWidth }),
        ...(minHeight !== null && { minHeight }),
        ...(maxWidth !== null && { maxWidth }),
        ...(maxHeight !== null && { maxHeight }),
        ...(justifySelf !== null && { justifySelf }),
        ...callerStyle,
    };

    return (
        <Component
            ref={containerRef}
            className={classes}
            data-typography-element={Component}
            data-typography-weight={weight}
            data-typography-font={font}
            data-typography-color={color}
            data-typography-animation={animation}
            data-theme={typographyTheme}
            data-theme-source={theme ? 'local' : 'inherited'}
            style={style}
            {...linkProps}
            {...hoverHandlers}
            {...domProps}
        >
            {renderAnimatedContent()}
        </Component>
    );
};

export default Typography;
