import React, {
    forwardRef,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState
} from 'react';
import { useTheme } from '@contexts/ThemeContext';
import Button from './Button';
import Icon from './Icon';
import Typography from './Typography';

// Shared utility functions for media components
export const clamp = (value, min = 0, max = 1) => {
    if (!Number.isFinite(value)) return min;
    if (value < min) return min;
    if (value > max) return max;
    return value;
};

export const formatTime = (seconds) => {
    if (!Number.isFinite(seconds)) return '00:00';
    const totalSeconds = Math.max(seconds, 0);
    const minutes = Math.floor(totalSeconds / 60);
    const remainder = Math.floor(totalSeconds % 60);
    return `${minutes}:${remainder.toString().padStart(2, '0')}`;
};

const BUTTON_COLOR_MAP = {
    default: 'primary',
    primary: 'secondary',
    secondary: 'tertiary',
    tertiary: 'primary'
};

export const getMediaButtonColor = (variant) => BUTTON_COLOR_MAP[variant] || 'primary';

// Shared keyboard shortcuts hook for media components
export const useMediaKeyboardShortcuts = (playerRef, options = {}) => {
    const {
        onTogglePlay,
        onToggleMute,
        onSeekForward,
        onSeekBackward,
        onToggleFullscreen,
        enabled = true
    } = options;

    useEffect(() => {
        if (!enabled) return;

        const handleKeyPress = (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            const element = playerRef.current;
            if (!element) return;

            switch (e.key.toLowerCase()) {
                case ' ':
                case 'k':
                    e.preventDefault();
                    onTogglePlay?.();
                    break;
                case 'arrowleft':
                case 'j':
                    e.preventDefault();
                    onSeekBackward?.(element);
                    break;
                case 'arrowright':
                case 'l':
                    e.preventDefault();
                    onSeekForward?.(element);
                    break;
                case 'm':
                    e.preventDefault();
                    onToggleMute?.();
                    break;
                case 'f':
                    e.preventDefault();
                    onToggleFullscreen?.();
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [playerRef, onTogglePlay, onToggleMute, onSeekForward, onSeekBackward, onToggleFullscreen, enabled]);
};

export const Video = forwardRef(({
    src,
    poster = null,
    autoPlay = false,
    loop = false,
    muted = false,
    volume: initialVolume = 0.8,
    playbackRate: initialPlaybackRate = 1,
    controls = true,
    aspectRatio = '16/9',
    width = '100%',
    height = null,
    theme = null,
    color = 'default', // 'default', 'primary', 'secondary', 'tertiary'
    className = '',
    style = {},
    crossOrigin = 'auto', // 'auto', 'use-credentials', 'anonymous', or undefined
    onPlay,
    onPause,
    onEnded,
    onProgress,
    onReady,
    onError,
    onTimeUpdate,
    onDurationChange,
    ...playerProps
}, forwardedRef) => {
    const effectiveTheme = useTheme();
    const videoTheme = theme || effectiveTheme.currentTheme;

    const buttonColor = useMemo(() => getMediaButtonColor(color), [color]);

    const containerRef = useRef(null);
    const playerElementRef = useRef(null);
    const controlsTimeoutRef = useRef(null);
    const [showControls, setShowControls] = useState(false);

    // Determine crossOrigin value based on URL
    const effectiveCrossOrigin = useMemo(() => {
        if (crossOrigin === 'auto') {
            if (!src) return undefined;
            
            try {
                const url = new URL(src, window.location.origin);
                
                // Only send credentials to explicitly trusted origins
                // In development: localhost
                // In production: configure VITE_API_BASE_URL to match deployment
                const trustedOrigins = [
                    window.location.origin, // Same origin (always safe)
                ];
                
                // In development, trust localhost on any port
                if (window.location.hostname === 'localhost' && url.hostname === 'localhost') {
                    return 'use-credentials';
                }
                
                // Check if URL origin is in trusted list
                const isTrusted = trustedOrigins.includes(url.origin);
                return isTrusted ? 'use-credentials' : 'anonymous';
            } catch {
                return undefined;
            }
        }
        
        return crossOrigin === 'use-credentials' ? 'use-credentials' : 
               crossOrigin === 'anonymous' ? 'anonymous' : 
               undefined;
    }, [src, crossOrigin]);

    const assignRefs = useCallback((element) => {
        playerElementRef.current = element;
        if (typeof forwardedRef === 'function') {
            forwardedRef(element);
        } else if (forwardedRef) {
            forwardedRef.current = element;
        }
    }, [forwardedRef]);

    const [isPlaying, setIsPlaying] = useState(Boolean(autoPlay));
    const [isMuted, setIsMuted] = useState(Boolean(muted));
    const [volume, setVolume] = useState(() => clamp(initialVolume, 0, 1));
    const previousVolumeRef = useRef(clamp(initialVolume || 0.6, 0, 1));
    const [playbackRate, setPlaybackRate] = useState(initialPlaybackRate || 1);
    const [duration, setDuration] = useState(0);
    const [playedSeconds, setPlayedSeconds] = useState(0);
    const [isScrubbing, setIsScrubbing] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    useEffect(() => {
        setIsPlaying(Boolean(autoPlay));
    }, [autoPlay]);

    useEffect(() => {
        setIsMuted(Boolean(muted));
    }, [muted]);

    useEffect(() => {
        if (initialVolume !== undefined) {
            setVolume(clamp(initialVolume, 0, 1));
        }
    }, [initialVolume]);

    useEffect(() => {
        setPlaybackRate(initialPlaybackRate || 1);
    }, [initialPlaybackRate]);

    // Sync native video element with state
    useEffect(() => {
        const element = playerElementRef.current;
        if (!element) return;

        element.volume = volume;
        element.muted = isMuted;
        element.playbackRate = playbackRate;
    }, [volume, isMuted, playbackRate]);

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(document.fullscreenElement === containerRef.current);
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    // Keep playback toggles aligned with the underlying HTMLVideoElement
    const togglePlay = useCallback(() => {
        const element = playerElementRef.current;
        if (!element) {
            setIsPlaying((prev) => !prev);
            return;
        }

        if (element.paused || element.ended) {
            const playPromise = element.play();
            setIsPlaying(true);
            if (playPromise && typeof playPromise.catch === 'function') {
                playPromise.catch(() => setIsPlaying(false));
            }
        } else {
            element.pause();
            setIsPlaying(false);
        }
    }, []);

    const toggleMute = useCallback(() => {
        setIsMuted((prev) => {
            const next = !prev;
            if (next) {
                previousVolumeRef.current = volume || previousVolumeRef.current || 0.6;
                setVolume(0);
            } else {
                setVolume(previousVolumeRef.current || 0.6);
            }
            return next;
        });
    }, [volume]);

    const handleVolumeChange = useCallback((event) => {
        const newVolume = clamp(Number(event.target.value) / 100, 0, 1);
        setVolume(newVolume);
        if (newVolume > 0) {
            previousVolumeRef.current = newVolume;
            setIsMuted(false);
        } else {
            setIsMuted(true);
        }
    }, []);

    const handleSeekStart = useCallback(() => {
        setIsScrubbing(true);
    }, []);

    const handleSeekChange = useCallback((event) => {
        const element = playerElementRef.current;
        const mediaDuration = Number.isFinite(element?.duration) ? element.duration : duration || 0;
        const percent = clamp(Number(event.target.value), 0, 100);
        const newTime = (percent / 100) * mediaDuration;
        setPlayedSeconds(newTime);
    }, [duration]);

    const handleSeekEnd = useCallback((event) => {
        const element = playerElementRef.current;
        const mediaDuration = Number.isFinite(element?.duration) ? element.duration : duration || 0;
        const percent = clamp(Number(event.target.value), 0, 100);
        const newTime = (percent / 100) * mediaDuration;
        if (element && Number.isFinite(newTime)) {
            element.currentTime = newTime;
        }
        setIsScrubbing(false);
    }, [duration]);

    const handleTimeUpdateInternal = useCallback((state) => {
        // Native video element onTimeUpdate event
        if (!isScrubbing && state?.playedSeconds !== undefined) {
            setPlayedSeconds(state.playedSeconds);
        }

        if (onTimeUpdate) {
            onTimeUpdate(state);
        }
    }, [isScrubbing, onTimeUpdate]);

    const handleReadyInternal = useCallback((player) => {
        // Native video element ready - get duration
        if (player) {
            const playerDuration = player.duration;
            if (Number.isFinite(playerDuration)) {
                setDuration(playerDuration);
            }
        }
        
        if (onReady) {
            onReady(player);
        }
        
        if (onDurationChange && player) {
            const playerDuration = player.duration;
            if (Number.isFinite(playerDuration)) {
                onDurationChange(playerDuration);
            }
        }
    }, [onReady, onDurationChange]);

    const handlePlayInternal = useCallback((event) => {
        setIsPlaying(true);
        if (onPlay) {
            onPlay(event);
        }
    }, [onPlay]);

    const handlePauseInternal = useCallback((event) => {
        setIsPlaying(false);
        if (onPause) {
            onPause(event);
        }
    }, [onPause]);

    const handleEndedInternal = useCallback((event) => {
        if (!loop) {
            setIsPlaying(false);
        }
        if (onEnded) {
            onEnded(event);
        }
    }, [loop, onEnded]);

    const handleErrorInternal = useCallback((error, data) => {
        console.error('Video error:', error, data);
        if (onError) {
            onError(error, data);
        }
    }, [onError]);

    // Mirror the native fullscreen API for the container wrapper
    const handleToggleFullscreen = useCallback(() => {
        const element = containerRef.current;
        if (!element) {
            return;
        }
        if (document.fullscreenElement === element) {
            document.exitFullscreen?.();
        } else {
            element.requestFullscreen?.();
        }
    }, []);

    const updateControlsMetrics = useCallback(() => {
        if (!controls) {
            return;
        }
        const containerEl = containerRef.current;
        if (!containerEl) {
            return;
        }
    }, [controls]);

    useEffect(() => {
        if (!controls) {
            return;
        }

        const handleResize = () => updateControlsMetrics();
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, [controls, updateControlsMetrics]);

    useEffect(() => {
        updateControlsMetrics();
    }, [width, height, aspectRatio, controls, updateControlsMetrics]);

    // Auto-hide controls after inactivity
    const handleMouseMove = useCallback(() => {
        setShowControls(true);
        
        if (controlsTimeoutRef.current) {
            clearTimeout(controlsTimeoutRef.current);
        }
        
        controlsTimeoutRef.current = setTimeout(() => {
            setShowControls(false);
        }, 2000); // Hide after 2 seconds of inactivity
    }, []);

    const handleMouseEnter = useCallback(() => {
        // Don't show controls on enter, only on move
    }, []);

    const handleMouseLeave = useCallback(() => {
        if (controlsTimeoutRef.current) {
            clearTimeout(controlsTimeoutRef.current);
        }
        setShowControls(false);
    }, []);

    useEffect(() => {
        return () => {
            if (controlsTimeoutRef.current) {
                clearTimeout(controlsTimeoutRef.current);
            }
        };
    }, []);

    // Keyboard shortcuts for video control
    useMediaKeyboardShortcuts(playerElementRef, {
        onTogglePlay: togglePlay,
        onToggleMute: toggleMute,
        onSeekForward: (element) => {
            if (element) element.currentTime = Math.min(duration, element.currentTime + 10);
        },
        onSeekBackward: (element) => {
            if (element) element.currentTime = Math.max(0, element.currentTime - 10);
        },
        onToggleFullscreen: handleToggleFullscreen,
        enabled: true
    });

    const progressPercent = duration ? clamp((playedSeconds / duration) * 100, 0, 100) : 0;

    const containerClassName = useMemo(() => [
        'video-player-container',
        'themed-video',
        `theme-${videoTheme}`,
        `video-color-${color}`,
        isScrubbing ? 'is-scrubbing' : '',
        showControls ? 'controls-visible' : '',
        className
    ].filter(Boolean).join(' '), [className, videoTheme, color, isScrubbing, showControls]);

    if (!src) {
        return null;
    }

    const videoElement = (
        <div
            ref={containerRef}
            className={containerClassName}
            data-theme={videoTheme}
            data-theme-source={theme ? 'local' : 'inherited'}
            style={style}
            onMouseMove={handleMouseMove}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            <div
                className="video-player-inner"
                style={{
                    width,
                    height: height || 'auto',
                    aspectRatio,
                    backgroundColor: '#000',
                    position: 'relative'
                }}
            >
                {/* Native HTML5 video element with HTTP range request support */}
                <video
                    ref={assignRefs}
                    src={src}
                    crossOrigin={effectiveCrossOrigin}
                    preload="auto"
                    playsInline
                    loop={loop}
                    muted={isMuted}
                    poster={poster || undefined}
                    style={{ 
                        width: '100%', 
                        height: '100%',
                        objectFit: 'contain'
                    }}
                    onPlay={handlePlayInternal}
                    onPause={handlePauseInternal}
                    onEnded={handleEndedInternal}
                    onLoadedMetadata={(e) => {
                        const videoDuration = e.target.duration;
                        if (Number.isFinite(videoDuration)) {
                            setDuration(videoDuration);
                        }
                        if (onReady) {
                            onReady(e.target);
                        }
                        if (onDurationChange && Number.isFinite(videoDuration)) {
                            onDurationChange(videoDuration);
                        }
                    }}
                    onTimeUpdate={(e) => {
                        if (!isScrubbing) {
                            setPlayedSeconds(e.target.currentTime);
                        }
                        if (onTimeUpdate) {
                            onTimeUpdate({
                                playedSeconds: e.target.currentTime,
                                played: e.target.duration > 0 ? e.target.currentTime / e.target.duration : 0
                            });
                        }
                    }}
                    onError={handleErrorInternal}
                    onVolumeChange={(e) => {
                        setVolume(e.target.volume);
                        setIsMuted(e.target.muted);
                    }}
                />
            </div>

            {controls && (
                <div className="video-overlay-controls">
                    <div className="video-controls-bar">
                        <Button
                            variant="ghost"
                            color={buttonColor}
                            size="sm"
                            className="video-control-button video-control-button-secondary"
                            onClick={() => {
                                if (playerElementRef.current) {
                                    playerElementRef.current.currentTime = Math.max(0, playedSeconds - 10);
                                }
                            }}
                            aria-label="Rewind 10 seconds"
                        >
                            <Icon name="FiRotateCcw" size="xs" />
                        </Button>

                        <Button
                            variant="ghost"
                            color={buttonColor}
                            size="md"
                            className="video-control-button"
                            onClick={togglePlay}
                            aria-label={isPlaying ? 'Pause video' : 'Play video'}
                        >
                            <Icon name={isPlaying ? 'FiPause' : 'FiPlay'} size="sm" />
                        </Button>

                        <Button
                            variant="ghost"
                            color={buttonColor}
                            size="sm"
                            className="video-control-button video-control-button-secondary"
                            onClick={() => {
                                if (playerElementRef.current) {
                                    playerElementRef.current.currentTime = Math.min(duration, playedSeconds + 10);
                                }
                            }}
                            aria-label="Forward 10 seconds"
                        >
                            <Icon name="FiRotateCw" size="xs" />
                        </Button>

                        <Typography as="span" size="xs" weight="semibold" className="video-timecode">
                            {formatTime(playedSeconds)}
                        </Typography>

                        <input
                            type="range"
                            min="0"
                            max="100"
                            step="0.1"
                            value={progressPercent}
                            onChange={handleSeekChange}
                            onMouseDown={handleSeekStart}
                            onMouseUp={handleSeekEnd}
                            onTouchStart={handleSeekStart}
                            onTouchEnd={handleSeekEnd}
                            aria-label="Seek"
                            className="video-progress-input"
                        />

                        <Typography as="span" size="xs" weight="semibold" className="video-timecode video-timecode-separator">
                            /
                        </Typography>

                        <Typography as="span" size="xs" weight="semibold" className="video-timecode">
                            {formatTime(duration)}
                        </Typography>

                        <Button
                            variant="ghost"
                            color={buttonColor}
                            size="sm"
                            className="video-control-button"
                            onClick={toggleMute}
                            aria-label={isMuted ? 'Unmute video' : 'Mute video'}
                        >
                            <Icon name={isMuted || volume === 0 ? 'FiVolumeX' : (volume < 0.5 ? 'FiVolume1' : 'FiVolume2')} size="xs" />
                        </Button>

                        <div className="video-volume-control">
                            <input
                                type="range"
                                min="0"
                                max="100"
                                step="1"
                                value={Math.round((isMuted ? 0 : volume) * 100)}
                                onChange={handleVolumeChange}
                                aria-label="Volume"
                                className="video-volume-input"
                            />
                        </div>

                        <Button
                            variant="ghost"
                            color={buttonColor}
                            size="sm"
                            className="video-control-button video-control-button-secondary"
                            onClick={() => {
                                const rates = [0.5, 0.75, 1, 1.25, 1.5, 2];
                                const currentIndex = rates.indexOf(playbackRate);
                                const nextIndex = (currentIndex + 1) % rates.length;
                                setPlaybackRate(rates[nextIndex]);
                            }}
                            aria-label={`Playback speed: ${playbackRate}x`}
                            title={`${playbackRate}x`}
                        >
                            <Typography as="span" size="xs" weight="semibold">
                                {playbackRate}x
                            </Typography>
                        </Button>

                        <Button
                            variant="ghost"
                            color={buttonColor}
                            size="sm"
                            className="video-control-button"
                            onClick={handleToggleFullscreen}
                            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                        >
                            <Icon name={isFullscreen ? 'FiMinimize' : 'FiMaximize'} size="xs" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );

    // If theme prop is provided, wrap with ThemeProvider for inheritance
    if (theme) {
        return (
            <ThemeProvider theme={theme}>
                {videoElement}
            </ThemeProvider>
        );
    }

    return videoElement;
});

Video.displayName = 'Video';

export default Video;
