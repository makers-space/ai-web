import React, {
    forwardRef,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState
} from 'react';
import { AudioWave, useMediaAudio } from '@audiowave/react';
import { ThemeProvider, useTheme } from '@contexts/ThemeContext';
import { clamp, formatTime, getMediaButtonColor, useMediaKeyboardShortcuts } from './Video';
import Button from './Button';
import ButtonGroup from './ButtonGroup';
import Icon from './Icon';
import Input from './Input';
import Container from './Container';
import Typography from './Typography';
import './styles/Audio.css';

// Constants
const DISC_SIZES = { xs: 100, sm: 120, md: 160, lg: 200, xl: 240 };
const WAVEFORM_HEIGHTS = { xs: 40, sm: 50, md: 70, lg: 90, xl: 110 };
const CONTROL_SIZE_MAP = { xs: 'xs', sm: 'xs', md: 'sm', lg: 'md', xl: 'lg' };
const ICON_SIZE_MAP = { xs: 'xs', sm: 'xs', md: 'xs', lg: 'sm', xl: 'md' };
const WAVEFORM_COLOR_VARS = {
    primary: '--secondary-accent-color',
    secondary: '--tertiary-accent-color',
    tertiary: '--primary-accent-color',
    default: '--secondary-color'
};
const SKIP_SECONDS = 10;
const KEYBOARD_SEEK_SECONDS = 5;
const DEFAULT_VOLUME = 0.8;
const FALLBACK_VOLUME = 0.6;
const PROGRESS_STROKE_OFFSET = 4;
const ROTATION_SPEED = 120; // degrees per second

/**
 * Popover form for editing ID3-style audio tags + cover art. Self-contained
 * but stateless about persistence — the host wires it to a backend via a
 * single `onSave(patch)` callback. Computes a minimal diff against
 * `initial` so unchanged fields are not submitted. The cover image, when
 * picked, is read as a base64 data URL and included as `patch.cover`.
 */
const AudioMetadataForm = ({ initial, onSave, onClose }) => {
    const [fields, setFields] = useState({
        title: initial?.title ?? '',
        artist: initial?.artist ?? '',
        album: initial?.album ?? '',
        albumArtist: initial?.albumArtist ?? '',
        genre: initial?.genre ?? '',
        year: initial?.year != null ? String(initial.year) : '',
        track: initial?.track != null ? String(initial.track) : '',
    });
    const [coverDataUrl, setCoverDataUrl] = useState(null); // base64 data URL
    const [coverPreview, setCoverPreview] = useState(null); // object URL for preview
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);
    const coverInputRef = useRef(null);

    const setField = (key) => (e) => setFields(f => ({ ...f, [key]: e.target.value }));

    const handleCoverPick = (e) => {
        const file = e.target.files?.[0];
        e.target.value = ''; // allow re-picking the same file later
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            setError('Cover must be an image file');
            return;
        }
        setError(null);
        const reader = new FileReader();
        reader.onload = () => {
            setCoverDataUrl(reader.result);
            // Revoke any previous object URL before creating a new one.
            if (coverPreview) URL.revokeObjectURL(coverPreview);
            setCoverPreview(URL.createObjectURL(file));
        };
        reader.onerror = () => setError('Failed to read cover file');
        reader.readAsDataURL(file);
    };

    const handleSave = async () => {
        setError(null);
        const patch = {};
        const stringFields = ['title', 'artist', 'album', 'albumArtist', 'genre'];
        for (const k of stringFields) {
            const next = fields[k];
            const prev = initial?.[k] ?? '';
            if (next !== prev) patch[k] = next;
        }
        for (const k of ['year', 'track']) {
            const raw = fields[k].trim();
            const prev = initial?.[k] ?? null;
            if (raw === '') {
                if (prev !== null && prev !== undefined) patch[k] = null;
            } else {
                const n = parseInt(raw, 10);
                if (Number.isNaN(n) || n < 0) {
                    setError(`${k} must be a non-negative integer`);
                    return;
                }
                if (n !== prev) patch[k] = n;
            }
        }
        if (coverDataUrl) patch.cover = coverDataUrl;
        if (Object.keys(patch).length === 0) {
            onClose?.();
            return;
        }
        if (!onSave) {
            setError('Saving is not available');
            return;
        }
        setBusy(true);
        try {
            await onSave(patch);
            onClose?.();
        } catch (err) {
            setError(err?.response?.data?.message || err?.message || 'Failed to update metadata');
        } finally {
            setBusy(false);
        }
    };

    return (
        <Container layout="flex-column" padding="sm" gap="sm" width="340px">
            <Typography size="sm" weight="bold">Edit metadata</Typography>

            <Input label="Title" value={fields.title} onChange={setField('title')} width="100%" />
            <Input
                label="Artist"
                value={fields.artist}
                onChange={setField('artist')}
                width="100%"
                helpText="Performer of this track"
            />
            <Input label="Album" value={fields.album} onChange={setField('album')} width="100%" />
            <Input
                label="Album artist"
                value={fields.albumArtist}
                onChange={setField('albumArtist')}
                width="100%"
                helpText='Artist credited for the whole album (e.g. "Various Artists" for compilations)'
            />
            <Input label="Genre" value={fields.genre} onChange={setField('genre')} width="100%" />
            <Container layout="flex" gap="sm" padding="none">
                <Input label="Year" value={fields.year} onChange={setField('year')} placeholder="e.g. 1999" width="50%" />
                <Input label="Track" value={fields.track} onChange={setField('track')} placeholder="e.g. 3" width="50%" />
            </Container>

            <Container layout="flex-column" gap="xs" padding="none">
                <Typography size="xs" color="secondary">Cover image</Typography>
                <Input
                    ref={coverInputRef}
                    type="file"
                    hidden
                    accept="image/*"
                    onChange={handleCoverPick}
                />
                <Container layout="flex" gap="sm" align="center" padding="none">
                    {coverPreview && (
                        <img
                            src={coverPreview}
                            alt="New cover preview"
                            style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 4 }}
                        />
                    )}
                    <Button
                        color="secondary"
                        size="sm"
                        onClick={() => coverInputRef.current?.click()}
                        disabled={busy}
                    >
                        <Icon name="FiImage" size="xs" /> {coverDataUrl ? 'Change pick...' : 'Choose new cover...'}
                    </Button>
                </Container>
            </Container>

            {error && (
                <Typography size="xs" color="error">{error}</Typography>
            )}

            <ButtonGroup spaced selectable={false} justify="end">
                <Button color="secondary" size="sm" onClick={onClose} disabled={busy}>Cancel</Button>
                <Button color="primary" size="sm" onClick={handleSave} disabled={busy || !onSave}>
                    {busy ? 'Saving…' : 'Save'}
                </Button>
            </ButtonGroup>
        </Container>
    );
};

/**
 * Audio - Spinning disc audio player with minimalist design
 * 
 * Features:
 * - Spinning disc visualization that stops when paused
 * - Cover art displayed as the disc
 * - Centered play/pause button on the disc
 * - Skip controls on sides of the disc
 * - Waveform below the disc
 * - Volume and loop controls in a compact row
 * - Keyboard shortcuts
 * - Transparent background, minimal width
 *
 * Metadata editing:
 * - When `editable` is true, an Edit button is shown that opens a popover
 *   with a form for ID3-style tag fields plus a control to pick a new
 *   cover image. The cover is sent as a base64 data URL inside the same
 *   patch. The host is responsible for persistence by supplying the
 *   `onMetadataSave` callback; the component does not call any network
 *   APIs itself.
 *
 * ID3 field semantics (for the embedded form):
 * - title       — track title (TIT2)
 * - artist      — performer of THIS track (TPE1). May vary per track on
 *                 compilations or albums with guest performers.
 * - album       — album title (TALB)
 * - albumArtist — artist credited for the WHOLE album (TPE2). For most
 *                 albums this equals `artist`. For compilations it is
 *                 typically "Various Artists"; for an album with guest
 *                 features it is the primary band/credited artist.
 * - genre       — genre tag (TCON)
 * - year        — release year (TYER / TDRC)
 * - track       — track number within the album (TRCK)
 */
export const Audio = forwardRef(({
    src,
    title = 'Untitled Track',
    artist = null,
    album = null,
    cover = null,
    metadata = null,        // Full mediaMetadata object — used to seed the edit form
    editable = false,       // Show the Edit button + cover-replace control
    onMetadataSave = null,  // async (patch) => updated mediaMetadata | void
    autoPlay = false,
    muted = false,
    loop = false,
    initialVolume = 0.8,
    color = 'default',
    theme = null,
    size = 'md', // 'sm', 'md', 'lg'
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
    onDurationChange
}, forwardedRef) => {
        const effectiveTheme = useTheme();
    const audioTheme = theme || effectiveTheme.currentTheme;

    const buttonColor = useMemo(() => getMediaButtonColor(color), [color]);

    const containerRef = useRef(null);
    const playerElementRef = useRef(null);
    
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
    
    const allowCrossOrigin = Boolean(effectiveCrossOrigin);
    const [waveformSourceElement, setWaveformSourceElement] = useState(null);
    const [waveformError, setWaveformError] = useState(null);
    const [waveformBarColor, setWaveformBarColor] = useState('transparent');

    const assignRefs = useCallback((element) => {
        playerElementRef.current = element;
        if (allowCrossOrigin && element && element.tagName === 'AUDIO') {
            setWaveformSourceElement(element);
        } else {
            setWaveformSourceElement(null);
        }
        if (typeof forwardedRef === 'function') {
            forwardedRef(element);
        } else if (forwardedRef) {
            forwardedRef.current = element;
        }
    }, [forwardedRef, allowCrossOrigin]);

    const [isPlaying, setIsPlaying] = useState(autoPlay);
    const [isMuted, setIsMuted] = useState(muted);
    const [volume, setVolume] = useState(clamp(initialVolume, 0, 1));
    const previousVolumeRef = useRef(initialVolume || DEFAULT_VOLUME);
    const [duration, setDuration] = useState(0);
    const [playedSeconds, setPlayedSeconds] = useState(0);
    const [isLooping, setIsLooping] = useState(loop);
    const [isDragging, setIsDragging] = useState(false);
    const dragPreviousAngleRef = useRef(0);
    const discElementRef = useRef(null);
    const rotationRef = useRef(0);
    const animationFrameRef = useRef(null);
    const lastTimeRef = useRef(Date.now());

    // Size values and derived metrics
    const discSize = DISC_SIZES[size] || DISC_SIZES.md;
    const waveformHeight = WAVEFORM_HEIGHTS[size] || WAVEFORM_HEIGHTS.md;
    const controlSize = CONTROL_SIZE_MAP[size] || 'sm';
    const iconControlSize = ICON_SIZE_MAP[size] || 'xs';
    const waveformColorVar = WAVEFORM_COLOR_VARS[color] || WAVEFORM_COLOR_VARS.default;
    const discRadius = (discSize / 2) - PROGRESS_STROKE_OFFSET;
    const progressCircumference = 2 * Math.PI * discRadius;
    const progressRatio = duration > 0 ? playedSeconds / duration : 0;
    const progressOffset = progressCircumference * (1 - progressRatio);

    // Compute waveform bar color from CSS variable
    useEffect(() => {
        if (typeof window === 'undefined' || !containerRef.current) return;

        const styles = window.getComputedStyle(containerRef.current);
        const barColor = styles.getPropertyValue(waveformColorVar).trim();

        if (barColor) setWaveformBarColor(barColor);
    }, [audioTheme, waveformColorVar]);

    const handleWaveformVisualizationError = useCallback((error) => {
        if (!error) return;
        const message = typeof error === 'string' ? error : error.message || 'Waveform unavailable';
        console.warn('Waveform visualization error', error);
        setWaveformError(message);
    }, []);

    const waveOptions = useMemo(() => ({
        source: allowCrossOrigin ? waveformSourceElement : null,
        onError: handleWaveformVisualizationError
    }), [allowCrossOrigin, waveformSourceElement, handleWaveformVisualizationError]);

    const { source: waveformSource, error: waveformHookError } = useMediaAudio(waveOptions);

    // Handle waveform state changes
    useEffect(() => {
        if (waveformHookError) {
            setWaveformError(waveformHookError.message || 'Waveform unavailable');
        } else if (allowCrossOrigin && waveformSourceElement) {
            setWaveformError(null);
        }
        if (!allowCrossOrigin) setWaveformSourceElement(null);
    }, [waveformHookError, allowCrossOrigin, waveformSourceElement]);

    const shouldRenderWaveform = waveformSourceElement || waveformError;
    const isWaveformReady = waveformSource && !waveformError;

    // Sync audio element properties
    useEffect(() => {
        const element = playerElementRef.current;
        if (!element) return;

        element.volume = isMuted ? 0 : volume;
        element.muted = isMuted;
        element.loop = isLooping;
    }, [isMuted, isLooping, volume]);

    // Sync play/pause state
    useEffect(() => {
        const element = playerElementRef.current;
        if (!element) return;

        if (isPlaying && element.paused) {
            element.play().catch(() => setIsPlaying(false));
        } else if (!isPlaying && !element.paused) {
            element.pause();
        }
    }, [isPlaying]);

    // Continuous rotation animation when playing — driven via DOM ref to avoid
    // a React re-render every frame (which made the spin look choppy).
    useEffect(() => {
        if (!isPlaying || isDragging) {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = null;
            }
            return;
        }

        const animate = () => {
            const now = Date.now();
            const deltaTime = now - lastTimeRef.current;
            lastTimeRef.current = now;

            const rotationIncrement = (ROTATION_SPEED * deltaTime) / 1000;
            rotationRef.current = (rotationRef.current + rotationIncrement) % 360;
            if (discElementRef.current) {
                discElementRef.current.style.setProperty('--disc-rotation', `${rotationRef.current}deg`);
            }
            animationFrameRef.current = requestAnimationFrame(animate);
        };

        lastTimeRef.current = Date.now();
        animationFrameRef.current = requestAnimationFrame(animate);

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [isPlaying, isDragging]);

    const togglePlay = useCallback(() => {
        const element = playerElementRef.current;
        if (!element) return;

        if (element.paused || element.ended) {
            element.play().catch(() => {});
        } else {
            element.pause();
        }
    }, []);

    const toggleMute = useCallback(() => {
        setIsMuted(prev => {
            if (!prev) previousVolumeRef.current = volume || FALLBACK_VOLUME;
            else setVolume(previousVolumeRef.current || FALLBACK_VOLUME);
            return !prev;
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

    const skipForward = useCallback((seconds = SKIP_SECONDS) => {
        const element = playerElementRef.current;
        if (!element) return;
        
        const newTime = Math.min(element.duration || 0, element.currentTime + seconds);
        element.currentTime = newTime;
        setPlayedSeconds(newTime);
    }, []);

    const skipBackward = useCallback((seconds = SKIP_SECONDS) => {
        const element = playerElementRef.current;
        if (!element) return;
        
        const newTime = Math.max(0, element.currentTime - seconds);
        element.currentTime = newTime;
        setPlayedSeconds(newTime);
    }, []);

    const toggleLoop = useCallback(() => {
        setIsLooping(prev => !prev);
    }, []);

    // Drag-to-seek handlers
    const getAngleFromEvent = useCallback((event, element, centerX, centerY) => {
        if (!element) return 0;
        const rect = element.getBoundingClientRect();
        const x = event.clientX - rect.left - centerX;
        const y = event.clientY - rect.top - centerY;
        // Calculate angle in degrees, 0° at top, clockwise
        let angle = Math.atan2(x, -y) * (180 / Math.PI);
        if (angle < 0) angle += 360;
        return angle;
    }, []);

    const handleDiscMouseDown = useCallback((event) => {
        if (event.button !== 0) return; // Only left click
        event.preventDefault();
        
        const centerX = discSize / 2;
        const centerY = discSize / 2;
        const angle = getAngleFromEvent(event, event.currentTarget, centerX, centerY);
        
        setIsDragging(true);
        dragPreviousAngleRef.current = angle;
    }, [discSize, getAngleFromEvent]);

    const handleDiscMouseMove = useCallback((event) => {
        if (!isDragging || !discElementRef.current) return;
        event.preventDefault();
        
        const element = playerElementRef.current;
        if (!element || !duration) return;
        
        const centerX = discSize / 2;
        const centerY = discSize / 2;
        const currentAngle = getAngleFromEvent(event, discElementRef.current, centerX, centerY);
        
        // Calculate angle difference from previous position (clockwise positive, counterclockwise negative)
        let angleDelta = currentAngle - dragPreviousAngleRef.current;
        
        // Handle wrap-around: if we cross 0°/360° boundary, adjust delta
        if (angleDelta > 180) angleDelta -= 360;
        if (angleDelta < -180) angleDelta += 360;
        
        // Convert angle delta to time delta (360° = entire duration)
        const timeDelta = (angleDelta / 360) * duration;
        const newTime = clamp(playedSeconds + timeDelta, 0, duration);
        
        // Update the audio position and state
        element.currentTime = newTime;
        setPlayedSeconds(newTime);

        // Rotate the disc visually to follow the drag (no React re-render).
        rotationRef.current = (rotationRef.current + angleDelta + 360) % 360;
        if (discElementRef.current) {
            discElementRef.current.style.setProperty('--disc-rotation', `${rotationRef.current}deg`);
        }
        
        // Update reference angle for next move
        dragPreviousAngleRef.current = currentAngle;
    }, [isDragging, duration, discSize, playedSeconds, getAngleFromEvent]);

    const handleDiscMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    useEffect(() => {
        if (!isDragging) return;
        
        const handleGlobalMouseMove = (event) => handleDiscMouseMove(event);
        const handleGlobalMouseUp = () => handleDiscMouseUp();
        
        document.addEventListener('mousemove', handleGlobalMouseMove);
        document.addEventListener('mouseup', handleGlobalMouseUp);
        
        return () => {
            document.removeEventListener('mousemove', handleGlobalMouseMove);
            document.removeEventListener('mouseup', handleGlobalMouseUp);
        };
    }, [isDragging, handleDiscMouseMove, handleDiscMouseUp]);

    const handleTimeUpdateInternal = useCallback((event) => {
        const element = event?.currentTarget;
        if (!element) return;

        setPlayedSeconds(element.currentTime || 0);
        onTimeUpdate?.(event);
    }, [onTimeUpdate]);

    const handleLoadedMetadataInternal = useCallback((event) => {
        const dur = event?.currentTarget?.duration;
        if (Number.isFinite(dur)) {
            setDuration(dur);
            onDurationChange?.(event);
        }
    }, [onDurationChange]);

    const handlePlayInternal = useCallback((event) => {
        setIsPlaying(true);
        onPlay?.(event);
    }, [onPlay]);

    const handlePauseInternal = useCallback((event) => {
        setIsPlaying(false);
        onPause?.(event);
    }, [onPause]);

    const handleEndedInternal = useCallback((event) => {
        setIsPlaying(false);
        onEnded?.(event);
    }, [onEnded]);

    const handleAudioErrorInternal = useCallback((event) => {
        const mediaElement = event?.currentTarget;
        const mediaError = mediaElement?.error;

        const noSource = mediaElement?.networkState === HTMLMediaElement.NETWORK_NO_SOURCE;
        const unsupported = mediaError?.code === (mediaError?.MEDIA_ERR_SRC_NOT_SUPPORTED ?? 4);

        if (allowCrossOrigin && (noSource || unsupported)) {
            // Note: allowCrossOrigin is derived from crossOrigin prop, not a state
            setWaveformError('Waveform unavailable (cross-origin request blocked).');
        }

        onError?.(event);
    }, [allowCrossOrigin, onError]);

    // Keyboard shortcuts
    useMediaKeyboardShortcuts(playerElementRef, {
        onTogglePlay: togglePlay,
        onToggleMute: toggleMute,
        onSeekForward: (element) => {
            if (element) element.currentTime = Math.min(element.duration || 0, element.currentTime + KEYBOARD_SEEK_SECONDS);
        },
        onSeekBackward: (element) => {
            if (element) element.currentTime = Math.max(0, element.currentTime - KEYBOARD_SEEK_SECONDS);
        },
        enabled: true
    });

    const containerClassName = useMemo(() => [
        'audio-container',
        'themed-audio',
        `theme-${audioTheme}`,
        `audio-color-${color}`,
        `audio-size-${size}`,
        className
    ].filter(Boolean).join(' '), [className, audioTheme, color, size]);

    const waveformContainerClass = useMemo(() => {
        const classes = ['audio-waveform-container'];
        if (!isWaveformReady) classes.push('loading');
        if (waveformError) classes.push('errored');
        return classes.join(' ');
    }, [isWaveformReady, waveformError]);

    const audioElement = (
        <div
            ref={containerRef}
            className={containerClassName}
            data-theme={audioTheme}
            data-theme-source={theme ? 'local' : 'inherited'}
            style={{
                ...style,
                '--disc-size': `${discSize}px`,
                '--progress-radius': `${discRadius}px`,
                '--progress-circumference': `${progressCircumference}px`,
                '--progress-offset': `${progressOffset}px`
            }}
        >
            {/* Hidden audio element */}
            <audio
                key={`${src || 'audio'}:${effectiveCrossOrigin || 'no-cors'}`}
                ref={assignRefs}
                src={src || undefined}
                preload="auto"
                crossOrigin={effectiveCrossOrigin}
                muted={isMuted}
                loop={isLooping}
                controls={false}
                onPlay={handlePlayInternal}
                onPause={handlePauseInternal}
                onEnded={handleEndedInternal}
                onCanPlay={onReady}
                onError={handleAudioErrorInternal}
                onTimeUpdate={handleTimeUpdateInternal}
                onLoadedMetadata={handleLoadedMetadataInternal}
                onProgress={onProgress || undefined}
            />

            {/* Track Info - Title, Artist • Album */}
            <div className="audio-header">
                <Typography 
                    as="div" 
                    size="md" 
                    weight="semibold" 
                    className="audio-title"
                >
                    {title}
                </Typography>
                {(artist || album) && (
                    <Typography 
                        as="div" 
                        size="sm" 
                        className="audio-metadata"
                    >
                        {artist}
                        {artist && album && <span className="audio-separator"> • </span>}
                        {album}
                    </Typography>
                )}
            </div>

            {/* Disc with Controls */}
            <div className="audio-player">
                {/* Skip Backward Button */}
                <Button
                    variant="ghost"
                    color={buttonColor}
                    size={controlSize}
                    className="audio-skip-button"
                    onClick={() => skipBackward()}
                    aria-label="Skip backward 10 seconds"
                >
                    <Icon name="FiRotateCcw" size={iconControlSize} />
                </Button>

                {/* Spinning Disc */}
                <div className="audio-wrapper">
                    <div 
                        ref={discElementRef}
                        className={`audio${isDragging ? ' dragging' : ''}`}
                        onMouseDown={handleDiscMouseDown}
                    >
                        {cover ? (
                            <img 
                                src={cover} 
                                alt={title}
                                className="audio-cover"
                                crossOrigin={effectiveCrossOrigin}
                            />
                        ) : (
                            <div className="audio-placeholder">
                                <Icon name="FiMusic" size="xl" />
                            </div>
                        )}

                        {/* Progress Circle Overlay */}
                        <svg 
                            className="audio-progress-circle"
                            viewBox={`0 0 ${discSize} ${discSize}`}
                        >
                            <circle
                                className="audio-progress-stroke"
                                cx={discSize / 2}
                                cy={discSize / 2}
                                r={discRadius}
                            />
                        </svg>
                    </div>
                    
                    {/* Center Play/Pause Button - positioned absolutely over disc */}
                    <div className="audio-center">
                        <Button
                            variant="solid"
                            color={buttonColor}
                            size={controlSize}
                            className="audio-play-button"
                            onClick={togglePlay}
                            aria-label={isPlaying ? 'Pause' : 'Play'}
                        >
                            <Icon name={isPlaying ? 'FiPause' : 'FiPlay'} size={iconControlSize} />
                        </Button>
                    </div>
                </div>

                {/* Skip Forward Button */}
                <Button
                    variant="ghost"
                    color={buttonColor}
                    size={controlSize}
                    className="audio-skip-button"
                    onClick={() => skipForward()}
                    aria-label="Skip forward 10 seconds"
                >
                    <Icon name="FiRotateCw" size={iconControlSize} />
                </Button>
            </div>

            {/* Progress Timer */}
            <div className="audio-timer">
                <Typography size={controlSize} className="audio-time-current">
                    {formatTime(playedSeconds)}
                </Typography>
                <Typography size={controlSize} className="audio-time-separator">
                    /
                </Typography>
                <Typography size={controlSize} className="audio-time-duration">
                    {formatTime(duration)}
                </Typography>
            </div>

            {/* Waveform */}
            {shouldRenderWaveform && (
                <div className={waveformContainerClass}>
                    {isWaveformReady ? (
                        <AudioWave
                            source={waveformSource}
                            width="100%"
                            height={waveformHeight}
                            backgroundColor="transparent"
                            barColor={waveformBarColor}
                            secondaryBarColor="transparent"
                            gap={2}
                            barWidth={2}
                            rounded={2}
                            canvasClassName="audio-waveform-canvas"
                            onError={handleWaveformVisualizationError}
                        />
                    ) : (
                        <div className={`audio-waveform-status${waveformError ? ' audio-waveform-status-error' : ''}`}>
                            {waveformError || 'Preparing waveform...'}
                        </div>
                    )}
                </div>
            )}

            {/* Volume and Loop Controls */}
            <div className="audio-controls">
                <div className="audio-volume-group">
                    <Button
                        variant="ghost"
                        color={buttonColor}
                        size="sm"
                        className="audio-control-button"
                        onClick={toggleMute}
                        aria-label={isMuted ? 'Unmute' : 'Mute'}
                    >
                        <Icon 
                            name={isMuted || volume === 0 ? 'FiVolumeX' : (volume < 0.5 ? 'FiVolume1' : 'FiVolume2')} 
                            size="xs" 
                        />
                    </Button>
                    <input
                        type="range"
                        min="0"
                        max="100"
                        step="1"
                        value={Math.round((isMuted ? 0 : volume) * 100)}
                        onChange={handleVolumeChange}
                        aria-label="Volume"
                        className="audio-volume-slider"
                    />
                </div>

                <Button
                    variant="ghost"
                    color={buttonColor}
                    size="sm"
                    selected={isLooping}
                    className="audio-control-button"
                    onClick={toggleLoop}
                    aria-label={isLooping ? 'Disable loop' : 'Enable loop'}
                >
                    <Icon name="FiRepeat" size="xs" />
                </Button>

                {editable && (
                    <Button
                        variant="ghost"
                        color={buttonColor}
                        size="sm"
                        className="audio-control-button"
                        aria-label="Edit metadata"
                        genie={{
                            trigger: 'click',
                            content: ({ onClose }) => (
                                <AudioMetadataForm
                                    initial={metadata}
                                    onSave={onMetadataSave}
                                    onClose={onClose}
                                />
                            ),
                        }}
                    >
                        <Icon name="FiEdit2" size="xs" />
                    </Button>
                )}
            </div>
        </div>
    );

    if (theme) {
        return (
            <ThemeProvider theme={theme}>
                {audioElement}
            </ThemeProvider>
        );
    }

    return audioElement;
});

Audio.displayName = 'Audio';

export default Audio;
