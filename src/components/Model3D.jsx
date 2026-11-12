import React, { Suspense, useRef, useState, useEffect, useMemo, useCallback, Component } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, Grid, ContactShadows, GizmoHelper } from '@react-three/drei';
import { useGizmoContext } from '@react-three/drei/core/GizmoHelper';
import * as THREE from 'three';
import { GLTFLoader, OBJLoader, STLLoader, FBXLoader, PLYLoader, ColladaLoader, ThreeMFLoader, VOXLoader, TDSLoader } from 'three-stdlib';
import Container from './Container';
import Typography from './Typography';
import Button from './Button';
import Icon from './Icon';
import CircularProgress from './CircularProgress';
import FloatingActionButton from './FloatingActionButton';
import { useTheme } from '../contexts/ThemeContext';
import './styles/Model3D.css';

/**
 * Model3D - Interactive 3D model viewer component
 *
 * Supports GLB, GLTF, OBJ, STL, FBX, PLY, DAE, 3MF, VOX, 3DS formats.
 * Works with both regular URLs and blob URLs.
 *
 * @param {string} src - URL of the 3D model file
 * @param {string} format - Explicit format override (e.g., 'glb'). Recommended for blob URLs.
 * @param {string} alt - Alt text for accessibility
 * @param {boolean} controls - Show orbit controls (default: true)
 * @param {boolean} autoRotate - Auto-rotation (default: false)
 * @param {number} autoRotateSpeed - Rotation speed (default: 1)
 * @param {string} width - Canvas width (default: '100%')
 * @param {string} height - Canvas height (default: '400px')
 * @param {string} aspectRatio - Aspect ratio for responsive sizing
 * @param {string} backgroundColor - Background color variant
 * @param {string} environment - Lighting preset (default: 'studio')
 * @param {boolean} showGrid - Display ground grid (default: false)
 * @param {boolean} showShadows - Display contact shadows (default: true)
 * @param {number} cameraFov - Camera field of view (default: 50)
 * @param {array} cameraPosition - Initial camera position [x, y, z] (default: [0, 0, 5])
 * @param {string} theme - Theme override class name
 * @param {object} style - Additional inline styles
 * @param {string} className - Additional CSS classes
 * @param {function} onLoad - Callback when model is loaded
 * @param {function} onError - Callback when model fails to load
 */

const SUPPORTED_FORMATS = ['glb', 'gltf', 'obj', 'stl', 'fbx', 'ply', 'dae', '3mf', 'vox', '3ds'];

const detectFormat = (url, format) => {
    if (!url) return null;
    if (format) return format.toLowerCase().replace('.', '');
    if (url.startsWith('blob:')) return 'glb';
    return url.split('.').pop()?.toLowerCase().split('?')[0] || null;
};

const createLoader = (ext) => {
    switch (ext) {
        case 'glb':
        case 'gltf': return new GLTFLoader();
        case 'obj':  return new OBJLoader();
        case 'stl':  return new STLLoader();
        case 'fbx':  return new FBXLoader();
        case 'ply':  return new PLYLoader();
        case 'dae':  return new ColladaLoader();
        case '3mf':  return new ThreeMFLoader();
        case 'vox':  return new VOXLoader();
        case '3ds':  return new TDSLoader();
        default:     return null;
    }
};

const extractScene = (ext, data) => {
    let obj;
    switch (ext) {
        case 'glb':
        case 'gltf':
        case 'dae':
            obj = data.scene;
            break;
        case 'stl':
        case 'ply':
            {
                const surface = getComputedStyle(document.body)
                    .getPropertyValue('--surface-color')
                    .trim();
                obj = new THREE.Mesh(
                    data,
                    new THREE.MeshStandardMaterial({ color: surface || '#ffffff' })
                );
            }
            break;
        default:
            obj = data;
            break;
    }

    // Many formats (STL, OBJ, 3MF, PLY, 3DS) use Z-up convention while Three.js
    // uses Y-up.  Rotate these so models stand upright instead of lying flat.
    // GLTF/GLB and FBX handle this internally, so skip them.
    const zUpFormats = ['stl', 'obj', '3mf', 'ply', '3ds'];
    if (obj && zUpFormats.includes(ext)) {
        const wrapper = new THREE.Group();
        wrapper.rotation.x = -Math.PI / 2;
        wrapper.add(obj);
        wrapper.updateMatrixWorld(true);
        return wrapper;
    }

    return obj;
};

/** Apply wireframe mode to all meshes in a scene graph */
const setWireframe = (obj, enabled) => {
    if (!obj) return;
    obj.traverse((child) => {
        if (child.isMesh && child.material) {
            const materials = Array.isArray(child.material) ? child.material : [child.material];
            materials.forEach((mat) => { mat.wireframe = enabled; });
        }
    });
};

// ---------------------------------------------------------------------------
// CameraFitter — fits camera to see the model after it loads.
// Runs exactly once when `target` changes from null to an Object3D.
// Returns the bounding info so the parent can use it for grid/shadow placement.
// ---------------------------------------------------------------------------
const CameraFitter = ({ target, controlsRef, onFitted }) => {
    const { camera } = useThree();
    const fitted = useRef(false);

    useEffect(() => {
        if (!target || fitted.current) return;

        const box = new THREE.Box3().setFromObject(target);
        if (box.isEmpty()) return;

        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const distance = maxDim * 2.5;

        camera.position.set(
            center.x,
            center.y + distance * 0.3,
            center.z + distance
        );
        camera.near = maxDim * 0.001;
        camera.far = maxDim * 100;
        camera.lookAt(center);
        camera.updateProjectionMatrix();

        if (controlsRef.current) {
            controlsRef.current.target.copy(center);
            controlsRef.current.minDistance = maxDim * 0.1;
            controlsRef.current.maxDistance = maxDim * 10;
            controlsRef.current.update();
            // Save fitted position so reset() returns here instead of the default
            controlsRef.current.saveState();
        }

        onFitted?.({ center, size, maxDim, distance });
        fitted.current = true;
    }, [target, camera, controlsRef, onFitted]);

    useEffect(() => {
        if (!target) fitted.current = false;
    }, [target]);

    return null;
};

// ---------------------------------------------------------------------------
// Scene — loads, centers, and renders the 3D model
// ---------------------------------------------------------------------------
const Scene = ({ url, format, controlsRef, wireframe, showGrid, showShadows, onLoad, onError }) => {
    const gridColors = useThemeColors({ cell: '--secondary-color', section: '--surface-color' });
    const groupRef = useRef();
    const [object, setObject] = useState(null);
    const [bounds, setBounds] = useState(null);
    const extension = useMemo(() => detectFormat(url, format), [url, format]);

    // Dispose of THREE.js resources
    const disposeObject = useCallback((obj) => {
        if (!obj) return;
        obj.traverse((child) => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                const materials = Array.isArray(child.material) ? child.material : [child.material];
                materials.forEach((mat) => {
                    ['map', 'lightMap', 'bumpMap', 'normalMap', 'specularMap', 'envMap'].forEach(prop => {
                        if (mat[prop]) mat[prop].dispose();
                    });
                    mat.dispose();
                });
            }
        });
    }, []);

    useEffect(() => {
        if (!url || !extension) return;
        let cancelled = false;
        
        // Dispose previous object before loading new one
        setObject((prevObject) => {
            if (prevObject) {
                disposeObject(prevObject);
            }
            return null;
        });
        setBounds(null);

        const loader = createLoader(extension);
        if (!loader) {
            onError?.(new Error(`Unsupported format: .${extension}. Supported: ${SUPPORTED_FORMATS.join(', ')}`));
            return;
        }

        loader.loadAsync(url)
            .then((data) => {
                if (cancelled) return;
                let obj;
                try {
                    obj = extractScene(extension, data);
                } catch (e) {
                    onError?.(new Error(`Failed to process .${extension} model: ${e.message}`));
                    return;
                }
                if (!obj) {
                    onError?.(new Error(`No renderable content in .${extension} file`));
                    return;
                }

                // Center the model at origin
                const box = new THREE.Box3().setFromObject(obj);
                const center = box.getCenter(new THREE.Vector3());
                obj.position.sub(center);

                setObject(obj);
                onLoad?.();
            })
            .catch((err) => {
                if (cancelled) return;
                // Blob URL was revoked while the load was in flight (e.g. user
                // navigated away). Not a real load failure — stay silent.
                const msg = err?.message || '';
                if (msg === 'Failed to fetch' || err?.name === 'NotFoundError' ||
                    msg.includes('ERR_FILE_NOT_FOUND')) {
                    return;
                }
                console.error('Error loading 3D model:', err);
                onError?.(new Error(
                    `Failed to load .${extension} model. The file may be corrupted or unsupported.`
                ));
            });

        return () => { 
            cancelled = true;
        };
    }, [url, extension, disposeObject]); // eslint-disable-line react-hooks/exhaustive-deps

    // Apply wireframe toggle
    useEffect(() => {
        if (object) setWireframe(object, wireframe);
    }, [object, wireframe]);

    const handleFitted = useCallback((info) => setBounds(info), []);

    // Compute grid/shadow scale from model bounds
    const groundY = bounds ? -bounds.size.y / 2 : 0;
    const gridScale = bounds ? bounds.maxDim * 5 : 10;

    return (
        <>
            <CameraFitter target={object} controlsRef={controlsRef} onFitted={handleFitted} />

            <group ref={groupRef}>
                {object && <primitive object={object} />}
            </group>

            {showGrid && bounds && (
                <Grid
                    position={[0, groundY, 0]}
                    args={[gridScale, gridScale]}
                    cellSize={bounds.maxDim * 0.1}
                    cellThickness={0.5}
                    cellColor={gridColors.cell}
                    sectionSize={bounds.maxDim * 0.5}
                    sectionThickness={1}
                    sectionColor={gridColors.section}
                    fadeDistance={gridScale}
                    fadeStrength={1}
                    infiniteGrid
                />
            )}

            {showShadows && bounds && (
                <ContactShadows
                    position={[0, groundY, 0]}
                    opacity={0.4}
                    scale={bounds.maxDim * 3}
                    blur={2}
                    far={bounds.maxDim * 2}
                />
            )}
        </>
    );
};

// ---------------------------------------------------------------------------
// Error boundary
// ---------------------------------------------------------------------------
class CanvasErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }
    static getDerivedStateFromError() { return { hasError: true }; }
    componentDidCatch(error, info) {
        console.error('Model3D render error:', error, info);
        this.props.onError?.(error);
    }
    reset = () => this.setState({ hasError: false });
    render() { return this.state.hasError ? null : this.props.children; }
}

// ---------------------------------------------------------------------------
// UI fallbacks
// ---------------------------------------------------------------------------
const ErrorFallback = ({ error, onRetry }) => (
    <Container layout="flex-column" align="center" justify="center" gap="md" padding="xl" className="model3d-error-container">
        <Icon name="FiAlertTriangle" size="xl" color="error" />
        <Typography size="md" weight="semibold" color="error">Failed to load 3D model</Typography>
        <Typography size="sm" color="secondary" style={{ textAlign: 'center', maxWidth: '400px' }}>
            {error || 'The model file could not be loaded. Please check the file format and try again.'}
        </Typography>
        {onRetry && (
            <Button size="sm" variant="outlined" onClick={onRetry}>
                <Icon name="FiRefreshCw" size="sm" /> Retry
            </Button>
        )}
    </Container>
);

const LoadingFallback = () => (
    <Container layout="flex-column" align="center" justify="center" gap="md" padding="xl" className="model3d-loading-container">
        <CircularProgress size="lg" color="primary" />
        <Typography size="sm" color="secondary">Loading 3D model...</Typography>
    </Container>
);

// ---------------------------------------------------------------------------
// useThemeColors — reads a set of CSS theme variables and re-reads one frame
// after a theme change (so the `.theme-*` class on <body> has been applied
// before getComputedStyle runs). Returns null until the first read succeeds.
// ---------------------------------------------------------------------------
const useThemeColors = (mapping) => {
    const { currentTheme, getThemeVariables } = useTheme();
    const [values, setValues] = useState(null);
    useEffect(() => {
        const id = requestAnimationFrame(() => {
            const vars = getThemeVariables();
            const next = {};
            for (const [key, varName] of Object.entries(mapping)) {
                next[key] = vars[varName];
            }
            setValues(next);
        });
        return () => cancelAnimationFrame(id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentTheme]);
    return values;
};

// ---------------------------------------------------------------------------
// ThemedViewcube — drei's GizmoViewcube replacement that pulls all colors
// from the active theme. Built locally because drei's version multiplies the
// baked face texture by the hover color, producing a tinted blend instead of
// the exact theme hover color.
// ---------------------------------------------------------------------------
const FACE_LABELS = ['Right', 'Left', 'Top', 'Bottom', 'Front', 'Back'];
const vec = (x, y, z) => new THREE.Vector3(x, y, z).multiplyScalar(0.38);
const EDGE_PIVOTS = [
    [1, 1, 0], [1, 0, 1], [1, 0, -1], [1, -1, 0],
    [0, 1, 1], [0, 1, -1], [0, -1, 1], [0, -1, -1],
    [-1, 1, 0], [-1, 0, 1], [-1, 0, -1], [-1, -1, 0],
].map((p) => ({ position: vec(...p), dimensions: p.map((a) => (a === 0 ? 0.5 : 0.25)) }));
const CORNER_PIVOTS = [
    [1, 1, 1], [1, 1, -1], [1, -1, 1], [1, -1, -1],
    [-1, 1, 1], [-1, 1, -1], [-1, -1, 1], [-1, -1, -1],
].map((p) => ({ position: vec(...p), dimensions: [0.25, 0.25, 0.25] }));
const PIVOTS = [...EDGE_PIVOTS, ...CORNER_PIVOTS];

const bakeFace = (label, fill, text, stroke) => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = fill;
    ctx.fillRect(0, 0, 128, 128);
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, 128, 128);
    ctx.font = '20px Inter var, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = text;
    ctx.fillText(label.toUpperCase(), 64, 76);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
};

const ThemedViewcube = () => {
    const { tweenCamera } = useGizmoContext();
    const [hoverFace, setHoverFace] = useState(null);
    const [hoverPivot, setHoverPivot] = useState(null);
    const colors = useThemeColors({
        fill: '--primary-color',
        hover: '--tertiary-color',
        text: '--text-contrast-color',
        stroke: '--secondary-color',
    });

    const textures = useMemo(() => {
        if (!colors) return null;
        return {
            rest: FACE_LABELS.map((l) => bakeFace(l, colors.fill, colors.text, colors.stroke)),
            hover: FACE_LABELS.map((l) => bakeFace(l, colors.hover, colors.text, colors.stroke)),
        };
    }, [colors]);

    if (!textures || !colors) return null;

    return (
        <group scale={[60, 60, 60]}>
            <mesh
                onPointerOut={(e) => { e.stopPropagation(); setHoverFace(null); }}
                onPointerMove={(e) => { e.stopPropagation(); setHoverFace(Math.floor(e.faceIndex / 2)); }}
                onClick={(e) => { e.stopPropagation(); tweenCamera(e.face.normal); }}
            >
                <boxGeometry />
                {FACE_LABELS.map((_, i) => (
                    <meshBasicMaterial
                        key={i}
                        attach={`material-${i}`}
                        map={hoverFace === i ? textures.hover[i] : textures.rest[i]}
                        toneMapped={false}
                    />
                ))}
            </mesh>
            {PIVOTS.map((p, i) => (
                <mesh
                    key={i}
                    scale={1.01}
                    position={p.position}
                    onPointerOver={(e) => { e.stopPropagation(); setHoverPivot(i); }}
                    onPointerOut={(e) => { e.stopPropagation(); setHoverPivot(null); }}
                    onClick={(e) => { e.stopPropagation(); tweenCamera(p.position); }}
                >
                    <boxGeometry args={p.dimensions} />
                    <meshBasicMaterial color={colors.hover} visible={hoverPivot === i} toneMapped={false} />
                </mesh>
            ))}
        </group>
    );
};

// ---------------------------------------------------------------------------
// Main Model3D component
// ---------------------------------------------------------------------------
const Model3D = React.forwardRef(({
    src,
    format,
    alt = '3D Model',
    controls = true,
    autoRotate = false,
    autoRotateSpeed = 1,
    width = '100%',
    height = '400px',
    aspectRatio = null,
    backgroundColor = null,
    environment = 'studio',
    showGrid = false,
    showShadows = true,
    cameraFov = 50,
    cameraPosition = [0, 0, 5],
    theme = null,
    style = {},
    className = '',
    onLoad,
    onError,
    ...props
}, ref) => {
    const controlsRef = useRef();
    const errorBoundaryRef = useRef();
    const containerRef = useRef();
    const [error, setError] = useState(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [currentAutoRotate, setCurrentAutoRotate] = useState(autoRotate);
    const [wireframe, setWireframe] = useState(false);
    const [gridVisible, setGridVisible] = useState(showGrid);
    const [shadowsVisible, setShadowsVisible] = useState(showShadows);
    const [retryKey, setRetryKey] = useState(0);
    const glCleanupRef = useRef(null);

    // Sync prop changes
    useEffect(() => { setCurrentAutoRotate(autoRotate); }, [autoRotate]);
    useEffect(() => { setGridVisible(showGrid); }, [showGrid]);
    useEffect(() => { setShadowsVisible(showShadows); }, [showShadows]);
    
    // Cleanup WebGL resources on unmount
    useEffect(() => {
        return () => {
            if (glCleanupRef.current) {
                glCleanupRef.current();
                glCleanupRef.current = null;
            }
        };
    }, []);

    const handleLoad = useCallback(() => { setIsLoaded(true); setError(null); onLoad?.(); }, [onLoad]);
    const handleError = useCallback((err) => { setError(err?.message || 'Failed to load model'); setIsLoaded(false); onError?.(err); }, [onError]);

    const handleResetCamera = () => controlsRef.current?.reset();
    const handleToggleAutoRotate = () => setCurrentAutoRotate((p) => !p);

    // Snap the camera to one of the six cardinal axes (or an isometric view),
    // keeping the current OrbitControls target as the look-at point so models
    // stay centred regardless of where they were framed.
    const snapToView = useCallback((axis) => {
        const controls = controlsRef.current;
        if (!controls) return;
        const camera = controls.object;
        const target = controls.target.clone();
        const distance = camera.position.distanceTo(target) || 5;
        const offsets = {
            front:  [0, 0,  1],
            back:   [0, 0, -1],
            right:  [1, 0,  0],
            left:  [-1, 0,  0],
            top:    [0, 1,  0],
            bottom: [0,-1,  0],
            iso:    [1, 1,  1],
        };
        const dir = offsets[axis] || offsets.front;
        const length = Math.hypot(dir[0], dir[1], dir[2]);
        camera.position.set(
            target.x + (dir[0] / length) * distance,
            target.y + (dir[1] / length) * distance,
            target.z + (dir[2] / length) * distance,
        );
        camera.up.set(0, 1, 0);
        camera.lookAt(target);
        camera.updateProjectionMatrix();
        controls.update();
    }, []);
    const handleToggleWireframe = () => setWireframe((p) => !p);
    const handleToggleGrid = () => setGridVisible((p) => !p);
    const handleToggleShadows = () => setShadowsVisible((p) => !p);

    const handleZoom = (direction) => {
        if (!controlsRef.current) return;
        const controls = controlsRef.current;
        const dir = new THREE.Vector3();
        controls.object.getWorldDirection(dir);
        controls.object.position.addScaledVector(dir, controls.getDistance() * 0.2 * direction);
        controls.update();
    };

    const handleFullscreen = () => {
        const el = containerRef.current;
        if (!el) return;
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            el.requestFullscreen?.();
        }
    };

    const handleRetry = () => {
        setError(null);
        setIsLoaded(false);
        setRetryKey((p) => p + 1);
        errorBoundaryRef.current?.reset();
    };

    const handleCanvasCreated = useCallback(({ gl }) => {
        const c = gl.domElement;
        const onContextLost = (e) => {
            e.preventDefault();
            console.warn('WebGL context lost. Attempting to restore...');
            setError('Graphics context lost. Click retry to reload.');
        };
        const onContextRestored = () => {
            console.log('WebGL context restored');
            setError(null);
            setRetryKey((p) => p + 1);
        };
        
        c.addEventListener('webglcontextlost', onContextLost);
        c.addEventListener('webglcontextrestored', onContextRestored);
        
        // Store cleanup function for unmount
        glCleanupRef.current = () => {
            c.removeEventListener('webglcontextlost', onContextLost);
            c.removeEventListener('webglcontextrestored', onContextRestored);
            gl.dispose();
        };
    }, []);

    const bgStyle = backgroundColor && backgroundColor !== 'transparent' 
        ? { background: `var(--${backgroundColor}-color)` } 
        : undefined;

    if (!src) return <ErrorFallback error="No model source provided" />;

    return (
        <div
            ref={(node) => {
                containerRef.current = node;
                if (typeof ref === 'function') ref(node);
                else if (ref) ref.current = node;
            }}
            className={['model3d-viewer', theme && `theme-${theme}`, className].filter(Boolean).join(' ')}
            style={{
                width,
                height: aspectRatio ? 'auto' : height,
                aspectRatio,
                ...style,
            }}
            role="img"
            aria-label={alt}
            {...props}
        >
            {error ? (
                <ErrorFallback error={error} onRetry={handleRetry} />
            ) : (
                <CanvasErrorBoundary ref={errorBoundaryRef} onError={handleError}>
                    <Canvas
                        key={retryKey}
                        style={bgStyle}
                        flat
                        gl={{ antialias: true, alpha: true }}
                        dpr={[1, 2]}
                        camera={{ position: cameraPosition, fov: cameraFov, near: 0.01, far: 10000 }}
                        onCreated={handleCanvasCreated}
                    >
                        {/* Lighting */}
                        <ambientLight intensity={0.4} />
                        <directionalLight position={[5, 8, 5]} intensity={0.8} />
                        <directionalLight position={[-3, 4, -2]} intensity={0.3} />
                        <Environment preset={environment || 'studio'} />

                        {/* Controls */}
                        {controls && (
                            <OrbitControls
                                ref={controlsRef}
                                makeDefault
                                autoRotate={currentAutoRotate}
                                autoRotateSpeed={autoRotateSpeed}
                                enableDamping
                                dampingFactor={0.05}
                                enablePan
                                enableZoom
                                maxDistance={10000}
                                minDistance={0.01}
                            />
                        )}

                        {/* Axis gizmo — click a face/edge/corner to snap the camera */}
                        {controls && (
                            <GizmoHelper alignment="top-right" margin={[60, 60]}>
                                <ThemedViewcube />
                            </GizmoHelper>
                        )}

                        {/* Model + Grid + Shadows */}
                        <Suspense fallback={null}>
                            <Scene
                                url={src}
                                format={format}
                                controlsRef={controlsRef}
                                wireframe={wireframe}
                                showGrid={gridVisible}
                                showShadows={shadowsVisible}
                                onLoad={handleLoad}
                                onError={handleError}
                            />
                        </Suspense>
                    </Canvas>

                    {/* Loading overlay */}
                    {!isLoaded && !error && (
                        <div className="model3d-loading-overlay">
                            <LoadingFallback />
                        </div>
                    )}

                    {/* Control FAB with Genie popover */}
                    {isLoaded && controls && (
                        <FloatingActionButton
                            icon="FiSettings"
                            size="sm"
                            variant="ghost"
                            position="bottom-right"
                            parentType="container"
                            className="model3d-fab"
                            genie={{
                                content: (
                                    <div className="model3d-controls-grid">
                                        <Button size="sm" variant="ghost" onClick={() => handleZoom(1)} title="Zoom in" className="model3d-control-button">
                                            <Icon name="FiZoomIn" size="sm" />
                                        </Button>
                                        <Button size="sm" variant="ghost" onClick={() => handleZoom(-1)} title="Zoom out" className="model3d-control-button">
                                            <Icon name="FiZoomOut" size="sm" />
                                        </Button>
                                        <Button size="sm" variant="ghost" onClick={handleResetCamera} title="Reset camera" className="model3d-control-button">
                                            <Icon name="FiMaximize2" size="sm" />
                                        </Button>
                                        <Button
                                            size="sm" variant="ghost" onClick={handleToggleAutoRotate}
                                            title={currentAutoRotate ? 'Stop rotation' : 'Auto rotate'}
                                            className={`model3d-control-button ${currentAutoRotate ? 'active' : ''}`}
                                        >
                                            <Icon name="FiRotateCw" size="sm" />
                                        </Button>
                                        <Button
                                            size="sm" variant="ghost" onClick={handleToggleWireframe}
                                            title={wireframe ? 'Solid view' : 'Wireframe'}
                                            className={`model3d-control-button ${wireframe ? 'active' : ''}`}
                                        >
                                            <Icon name="FiTriangle" size="sm" />
                                        </Button>
                                        <Button
                                            size="sm" variant="ghost" onClick={handleToggleGrid}
                                            title={gridVisible ? 'Hide grid' : 'Show grid'}
                                            className={`model3d-control-button ${gridVisible ? 'active' : ''}`}
                                        >
                                            <Icon name="FiGrid" size="sm" />
                                        </Button>
                                        <Button
                                            size="sm" variant="ghost" onClick={handleToggleShadows}
                                            title={shadowsVisible ? 'Hide shadows' : 'Show shadows'}
                                            className={`model3d-control-button ${shadowsVisible ? 'active' : ''}`}
                                        >
                                            <Icon name="FiSun" size="sm" />
                                        </Button>
                                        <Button size="sm" variant="ghost" onClick={handleFullscreen} title="Fullscreen" className="model3d-control-button">
                                            <Icon name="FiMaximize" size="sm" />
                                        </Button>

                                        {/* Axis-view snap buttons */}
                                        <Button size="sm" variant="ghost" onClick={() => snapToView('front')}  title="Front view"   className="model3d-control-button">F</Button>
                                        <Button size="sm" variant="ghost" onClick={() => snapToView('back')}   title="Back view"    className="model3d-control-button">B</Button>
                                        <Button size="sm" variant="ghost" onClick={() => snapToView('left')}   title="Left view"    className="model3d-control-button">L</Button>
                                        <Button size="sm" variant="ghost" onClick={() => snapToView('right')}  title="Right view"   className="model3d-control-button">R</Button>
                                        <Button size="sm" variant="ghost" onClick={() => snapToView('top')}    title="Top view"     className="model3d-control-button">T</Button>
                                        <Button size="sm" variant="ghost" onClick={() => snapToView('bottom')} title="Bottom view"  className="model3d-control-button">Bt</Button>
                                        <Button size="sm" variant="ghost" onClick={() => snapToView('iso')}    title="Isometric view" className="model3d-control-button">Iso</Button>
                                    </div>
                                ),
                                trigger: 'click',
                                position: 'auto',
                                variant: 'popover',
                                padding: 'sm',
                            }}
                        />
                    )}
                </CanvasErrorBoundary>
            )}
        </div>
    );
});

Model3D.displayName = 'Model3D';

export default Model3D;
