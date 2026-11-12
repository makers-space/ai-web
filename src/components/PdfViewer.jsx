import React, {
    useState,
    useCallback,
    forwardRef,
    useImperativeHandle,
    useEffect,
    useRef,
    useMemo,
} from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';
import { FloatingActionButton } from './FloatingActionButton';
import Button from './Button';
import { ButtonGroup } from './ButtonGroup';
import { Select } from './Select';
import { Badge } from './Badge';
import Icon from './Icon';
import Typography from './Typography';
import CircularProgress from './CircularProgress';

const PDF_FONT_FAMILIES = [
    { value: 'Helvetica',        label: 'Helvetica',          group: 'Sans-serif' },
    { value: 'Arial',            label: 'Arial',              group: 'Sans-serif' },
    { value: 'Calibri',          label: 'Calibri',            group: 'Sans-serif' },
    { value: 'Inter',            label: 'Inter',              group: 'Sans-serif' },
    { value: 'Lato',             label: 'Lato',               group: 'Sans-serif' },
    { value: 'Montserrat',       label: 'Montserrat',         group: 'Sans-serif' },
    { value: 'Poppins',          label: 'Poppins',            group: 'Sans-serif' },
    { value: 'Roboto',           label: 'Roboto',             group: 'Sans-serif' },
    { value: 'Verdana',          label: 'Verdana',            group: 'Sans-serif' },
    { value: 'Times New Roman',  label: 'Times New Roman',    group: 'Serif'      },
    { value: 'Georgia',          label: 'Georgia',            group: 'Serif'      },
    { value: 'Garamond',         label: 'Garamond',           group: 'Serif'      },
    { value: 'Cambria',          label: 'Cambria',            group: 'Serif'      },
    { value: 'Courier New',      label: 'Courier New',        group: 'Monospace'  },
    { value: 'Consolas',         label: 'Consolas',           group: 'Monospace'  },
    { value: 'Fira Code',        label: 'Fira Code',          group: 'Monospace'  },
];

// Maps a CSS font-family value to the closest pdf-lib StandardFont on save
const toPdfLibFont = (fontName) => {
    const mono = ['Courier New', 'Consolas', 'Fira Code', 'Source Code Pro', 'JetBrains Mono'];
    const serif = ['Times New Roman', 'Georgia', 'Garamond', 'Cambria', 'Merriweather', 'Lora', 'Playfair Display', 'EB Garamond'];
    if (mono.includes(fontName))  return StandardFonts.Courier;
    if (serif.includes(fontName)) return StandardFonts.TimesRoman;
    return StandardFonts.Helvetica;
};
import './styles/PdfViewer.css';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
).toString();

const PdfViewer = forwardRef(({
    blob,
    fileName = 'document.pdf',
    readOnly = false,
    onSave,
    onError,
    color = 'primary',
    width = '100%',
    height = '100%',
}, ref) => {
    const [numPages, setNumPages]           = useState(null);
    const [currentPage, setCurrentPage]     = useState(1);
    const [scale, setScale]                 = useState(1.0);
    const [baseScale, setBaseScale]         = useState(1.0);
    const [interactionMode, setInteractionMode] = useState('none'); // 'none', 'text', 'redact', 'draw', 'shape', 'highlight', 'image'
    const [dragStart, setDragStart]         = useState(null);
    const [dragCurrent, setDragCurrent]     = useState(null);
    const [redactions, setRedactions]       = useState([]);
    const [annotations, setAnnotations]     = useState([]);
    const [editingAnnotationId, setEditingAnnotationId] = useState(null);
    const [annResizeState, setAnnResizeState] = useState(null);
    const [annotationColor, setAnnotationColor] = useState('#ffeb3b');
    const [annotationSize, setAnnotationSize]   = useState(24);
    const [annotationFont, setAnnotationFont]   = useState('Helvetica');
    const [isSaving, setIsSaving]           = useState(false);
    const [selectedAnnotationId, setSelectedAnnotationId] = useState(null);
    const [annDragState, setAnnDragState]   = useState(null); // { annId, startMouseX, startMouseY, startFracX, startFracY }
    const [annRotateState, setAnnRotateState] = useState(null); // { annId, centerX, centerY }
    const [pageWidth, setPageWidth]         = useState(null);
    const [pageHeight, setPageHeight]       = useState(null);
    const [fitted, setFitted]               = useState(false);
    const [shapeType, setShapeType]               = useState('rectangle');
    const [strokeWidth, setStrokeWidth]           = useState(3);
    const [fillColor, setFillColor]               = useState('none');
    const [highlightColor, setHighlightColor]     = useState('#ffeb3b');
    const [highlightOpacity, setHighlightOpacity] = useState(0.35);
    const pagesAreaRef  = useRef(null);
    const annDragHasMoved = useRef(false);
    const editTextareaRef = useRef(null);
    const drawingPointsRef = useRef([]);
    const drawPathRef      = useRef(null);
    const imageInputRef    = useRef(null);
    const annotationsRef   = useRef(annotations);
    annotationsRef.current = annotations;

    // Page transition fade with direction
    const [pageFading, setPageFading] = useState(false); // false | 'left' | 'right'
    const transitionPage = useCallback((getNext) => {
        // Determine direction by peeking at what the new page will be
        const cur = typeof getNext === 'function' ? getNext(currentPage) : getNext;
        const dir = cur > currentPage ? 'left' : 'right';
        setPageFading(dir);
        setTimeout(() => {
            setCurrentPage(getNext);
            setTimeout(() => setPageFading(false), 30);
        }, 150);
    }, [currentPage]);

    // Stable blob URL
    const [fileUrl, setFileUrl] = useState(null);
    useEffect(() => {
        if (!blob) { setFileUrl(null); return; }
        const url = URL.createObjectURL(blob);
        setFileUrl(url);
        return () => { setTimeout(() => URL.revokeObjectURL(url), 2000); };
    }, [blob]);

    // Scroll-wheel zoom (Ctrl+wheel)
    useEffect(() => {
        const el = pagesAreaRef.current;
        if (!el) return;
        const onWheel = (e) => {
            if (!e.ctrlKey) return;
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.1 : 0.1;
            setScale(s => Math.max(baseScale * 0.3, Math.min(baseScale * 5.0, parseFloat((s + delta).toFixed(2)))));
        };
        el.addEventListener('wheel', onWheel, { passive: false });
        return () => el.removeEventListener('wheel', onWheel);
    }, [baseScale]);

    // Auto fit-to-height on first page load (with minimum width for selectors)
    // The scale that fits the height directly to the container is considered "100%" visually
    const fitScreen = useCallback((isInitialLoad = false) => {
        const el = pagesAreaRef.current;
        if (!el || !pageWidth || !pageHeight) return;
        
        // Calculate the scale needed to make the page height perfectly match the container height
        const availableHeight = el.clientHeight - 40; // 32px padding + 8px safe buffer to prevent scrollbars
        const heightScale = availableHeight / pageHeight;

        // Ensure there's room for the 180px page selectors + 64px gap on each side
        const requiredSelectorSpace = (180 + 64) * 2;
        const availableWidth = Math.max(1, el.clientWidth - requiredSelectorSpace);
        const widthScale = availableWidth / pageWidth;

        // For "Fit to screen", we want it to scale fully to the available width,
        // allowing vertical scrolling if the height overflows. Round down strictly to avoid fractional overflow.
        const widthBasedBaseScale = Math.max(0.3, Math.min(5.0, Math.floor(widthScale * 100) / 100));
        
        // Base scale (100% Zoom) should represent fitting the height completely
        const heightBasedBaseScale = Math.max(0.3, Math.min(5.0, Math.floor(heightScale * 100) / 100));
        
        setBaseScale(heightBasedBaseScale); // "Zoom to 100" fits screen height
        setScale(isInitialLoad === true ? heightBasedBaseScale : widthBasedBaseScale); // Initial load uses 100%, otherwise "Fit to screen" uses width
    }, [pageWidth, pageHeight]);

    // Set zoom back to "Zoom to 100" (which fits height)
    const setZoom100 = useCallback(() => {
        if (baseScale) setScale(baseScale);
    }, [baseScale]);

    const handleDocumentLoad = useCallback(({ numPages: n }) => {
        setNumPages(n);
        setCurrentPage(1);
        setFitted(false);
    }, []);

    const handlePageLoad = useCallback((page) => {
        setPageWidth(page.originalWidth);
        setPageHeight(page.originalHeight);
    }, []);

    // Auto fit once after first render
    useEffect(() => {
        if (pageWidth && pageHeight && !fitted) {
            fitScreen(true); // Pass true to use 100% zoom on initial load
            setFitted(true);
        }
    }, [pageWidth, pageHeight, fitted, fitScreen]);

    const getEventRelPos = (e) => {
        let currentTarget = e.currentTarget;
        if (!currentTarget.classList.contains('pdf-page-wrapper')) {
            currentTarget = currentTarget.closest('.pdf-page-wrapper');
        }
        if (!currentTarget) return null;
        
        const rect = currentTarget.getBoundingClientRect();
        const relX = e.clientX - rect.left;
        const relY = e.clientY - rect.top;
        return {
            relX,
            relY,
            fracX: relX / rect.width,
            fracY: relY / rect.height,
            rectWidth: rect.width,
            rectHeight: rect.height,
            clientX: e.clientX,
            clientY: e.clientY
        };
    };

    const handleMouseDown = useCallback((e, pageNumber) => {
        if (interactionMode === 'none') return;
        const pos = getEventRelPos(e);
        if (!pos) return;

        if (interactionMode === 'draw') {
            drawingPointsRef.current = [{ fracX: pos.fracX, fracY: pos.fracY }];
            if (drawPathRef.current) drawPathRef.current.setAttribute('d', '');
            setDragStart({ page: pageNumber, ...pos });
            return;
        }
        
        setDragStart({
            page: pageNumber,
            ...pos
        });
        setDragCurrent(pos);
    }, [interactionMode]);

    const handleMouseMove = useCallback((e) => {
        if (!dragStart) return;
        const pos = getEventRelPos(e);
        if (!pos) return;

        if (interactionMode === 'draw') {
            drawingPointsRef.current.push({ fracX: pos.fracX, fracY: pos.fracY });
            if (drawPathRef.current && pageWidth && pageHeight) {
                const d = drawingPointsRef.current.map((p, i) =>
                    `${i === 0 ? 'M' : 'L'} ${p.fracX * pageWidth * scale} ${p.fracY * pageHeight * scale}`
                ).join(' ');
                drawPathRef.current.setAttribute('d', d);
            }
            return;
        }

        setDragCurrent(pos);
    }, [dragStart, interactionMode, pageWidth, pageHeight, scale]);

    const handleMouseUp = useCallback((e) => {
        // Finalize freehand drawing (doesn't use dragCurrent)
        if (interactionMode === 'draw' && dragStart) {
            const pts = drawingPointsRef.current;
            if (pts.length > 2) {
                let minFX = Infinity, minFY = Infinity, maxFX = -Infinity, maxFY = -Infinity;
                for (const p of pts) {
                    if (p.fracX < minFX) minFX = p.fracX;
                    if (p.fracY < minFY) minFY = p.fracY;
                    if (p.fracX > maxFX) maxFX = p.fracX;
                    if (p.fracY > maxFY) maxFY = p.fracY;
                }
                const bw = maxFX - minFX || 0.01;
                const bh = maxFY - minFY || 0.01;
                const normPts = pts.map(p => ({
                    x: (p.fracX - minFX) / bw,
                    y: (p.fracY - minFY) / bh,
                }));
                const newId = Date.now();
                setAnnotations(prev => [...prev, {
                    id: newId, type: 'drawing', page: dragStart.page,
                    fracX: minFX, fracY: minFY, fracWidth: bw, fracHeight: bh,
                    points: normPts,
                    color: annotationColor, strokeWidth, opacity: 1.0, rotation: 0,
                }]);
                setSelectedAnnotationId(newId);
            }
            drawingPointsRef.current = [];
            if (drawPathRef.current) drawPathRef.current.setAttribute('d', '');
            setDragStart(null);
            return;
        }

        if (!dragStart || !dragCurrent) return;
        
        const minX = Math.min(dragStart.relX, dragCurrent.relX);
        const minY = Math.min(dragStart.relY, dragCurrent.relY);
        const maxX = Math.max(dragStart.relX, dragCurrent.relX);
        const maxY = Math.max(dragStart.relY, dragCurrent.relY);
        const width = maxX - minX;
        const height = maxY - minY;
        
        const minFracX = minX / dragStart.rectWidth;
        const minFracY = minY / dragStart.rectHeight;
        const fracWidth = width / dragStart.rectWidth;
        const fracHeight = height / dragStart.rectHeight;

        if (interactionMode === 'text') {
            if (width > 5 && height > 5) {
                const newId = Date.now();
                setAnnotations(prev => [...prev, {
                    id: newId,
                    type: 'text',
                    page: dragStart.page,
                    fracX: minFracX,
                    fracY: minFracY,
                    fracWidth,
                    fracHeight,
                    text: '',
                    color: annotationColor,
                    size: annotationSize,
                    font: annotationFont,
                    opacity: 1.0,
                    rotation: 0,
                }]);
                setSelectedAnnotationId(newId);
                setEditingAnnotationId(newId);
            }
        } else if (interactionMode === 'redact') {
            if (width > 5 && height > 5) {
                setRedactions(prev => [...prev, {
                    id: Date.now(),
                    page: dragStart.page,
                    fracX: minFracX,
                    fracY: minFracY,
                    fracWidth,
                    fracHeight,
                    relX: minX,
                    relY: minY,
                    width,
                    height,
                }]);
            }
        } else if (interactionMode === 'shape') {
            if (width > 5 && height > 5) {
                const newId = Date.now();
                setAnnotations(prev => [...prev, {
                    id: newId, type: 'shape', page: dragStart.page,
                    shape: shapeType,
                    fracX: minFracX, fracY: minFracY, fracWidth, fracHeight,
                    color: annotationColor, fillColor, strokeWidth,
                    opacity: 1.0, rotation: 0,
                }]);
                setSelectedAnnotationId(newId);
            }
        } else if (interactionMode === 'highlight') {
            if (width > 5 && height > 5) {
                const newId = Date.now();
                setAnnotations(prev => [...prev, {
                    id: newId, type: 'highlight', page: dragStart.page,
                    fracX: minFracX, fracY: minFracY, fracWidth, fracHeight,
                    color: highlightColor, opacity: highlightOpacity, rotation: 0,
                }]);
                setSelectedAnnotationId(newId);
            }
        }
        
        setDragStart(null);
        setDragCurrent(null);
    }, [dragStart, dragCurrent, interactionMode, annotationColor, annotationSize, annotationFont, shapeType, fillColor, strokeWidth, highlightColor, highlightOpacity]);

    const copyAnnotationToAllPages = useCallback((ann) => {
        if (!numPages) return;
        if (ann.groupId) {
            // Already copied — remove from all pages except current
            setAnnotations(prev => prev.filter(a => a.groupId !== ann.groupId || a.id === ann.id));
            // Clear the groupId on the remaining annotation
            setAnnotations(prev => prev.map(a => a.id === ann.id ? { ...a, groupId: undefined } : a));
        } else {
            // Copy to all pages with a shared groupId
            const now = Date.now();
            const groupId = `group-${now}`;
            setAnnotations(prev => [
                ...prev.map(a => a.id === ann.id ? { ...a, groupId } : a),
                ...Array.from({ length: numPages }, (_, i) => i + 1)
                    .filter(p => p !== ann.page)
                    .map((p, i) => ({ ...ann, id: now + i, page: p, groupId })),
            ]);
        }
    }, [numPages]);

    const removeAnnotation = useCallback(id => {
        setAnnotations(prev => {
            const ann = prev.find(a => a.id === id);
            if (ann && ann.groupId) return prev.filter(a => a.groupId !== ann.groupId);
            return prev.filter(a => a.id !== id);
        });
    }, []);

    const removeRedaction = useCallback(id => {
        setRedactions(prev => prev.filter(r => r.id !== id));
    }, []);

    const updateAnnotation = useCallback((id, updates) => {
        setAnnotations(prev => {
            const target = prev.find(a => a.id === id);
            // If the annotation belongs to a group, propagate updates to all copies
            // (but preserve each copy's own page and id)
            if (target?.groupId) {
                return prev.map(a =>
                    a.groupId === target.groupId ? { ...a, ...updates } : a
                );
            }
            return prev.map(a => a.id === id ? { ...a, ...updates } : a);
        });
    }, []);

    const finishEditing = useCallback((annId) => {
        setEditingAnnotationId(null);
        setAnnotations(prev => {
            const ann = prev.find(a => a.id === annId);
            if (ann && (!ann.type || ann.type === 'text') && !ann.text?.trim()) {
                // If grouped (copy-to-all active), remove all copies too
                if (ann.groupId) return prev.filter(a => a.groupId !== ann.groupId);
                return prev.filter(a => a.id !== annId);
            }
            return prev;
        });
    }, []);

    const handleImageUpload = useCallback((e) => {
        const file = e.target.files?.[0];
        if (!file || !file.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = reader.result;
            // Load into an Image to read natural dimensions
            const img = new Image();
            img.onload = () => {
                const pw = pageWidth || 612;
                const ph = pageHeight || 792;
                // Compute fractional size preserving the original aspect ratio
                let fracW = img.naturalWidth / pw;
                let fracH = img.naturalHeight / ph;
                // If the image is larger than the page, scale it down to fit within 90%
                const maxFrac = 0.9;
                if (fracW > maxFrac || fracH > maxFrac) {
                    const downScale = Math.min(maxFrac / fracW, maxFrac / fracH);
                    fracW *= downScale;
                    fracH *= downScale;
                }
                const newId = Date.now();
                setAnnotations(prev => [...prev, {
                    id: newId, type: 'image', page: currentPage,
                    fracX: (1 - fracW) / 2, fracY: (1 - fracH) / 2,
                    fracWidth: fracW, fracHeight: fracH,
                    dataUrl,
                    opacity: 1.0, rotation: 0,
                }]);
                setSelectedAnnotationId(newId);
                setInteractionMode('none');
            };
            img.src = dataUrl;
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    }, [currentPage, pageWidth, pageHeight]);

    // Global mouse handlers for annotation dragging, rotation, and resizing
    useEffect(() => {
        if (!annDragState && !annRotateState && !annResizeState) return;
        const onMouseMove = (e) => {
            if (annDragState && pageWidth && pageHeight) {
                const dx = e.clientX - annDragState.startMouseX;
                const dy = e.clientY - annDragState.startMouseY;
                if (Math.abs(dx) > 3 || Math.abs(dy) > 3) annDragHasMoved.current = true;
                if (annDragHasMoved.current) {
                    const newFracX = annDragState.startFracX + dx / (pageWidth * scale);
                    const newFracY = annDragState.startFracY + dy / (pageHeight * scale);
                    updateAnnotation(annDragState.annId, {
                        fracX: newFracX,
                        fracY: newFracY,
                    });
                }
            }
            if (annResizeState && pageWidth && pageHeight) {
                const dx = (e.clientX - annResizeState.startMouseX) / (pageWidth * scale);
                const dy = (e.clientY - annResizeState.startMouseY) / (pageHeight * scale);
                const h = annResizeState.handle;
                const MIN_FRAC = 0.02;
                let fx = annResizeState.startFracX, fy = annResizeState.startFracY;
                let fw = annResizeState.startFracW, fh = annResizeState.startFracH;
                const isCorner = h === 'nw' || h === 'ne' || h === 'se' || h === 'sw';
                if (isCorner) {
                    // Diagonal-only: use the larger absolute delta, preserve aspect ratio
                    const aspect = annResizeState.startFracW / annResizeState.startFracH;
                    const absDx = Math.abs(dx);
                    const absDy = Math.abs(dy);
                    // Pick the dominant axis and derive the other
                    let dw, dh;
                    if (absDx * pageHeight >= absDy * pageWidth) {
                        dw = (h.includes('e') ? dx : -dx);
                        dh = dw / aspect;
                    } else {
                        dh = (h.includes('s') ? dy : -dy);
                        dw = dh * aspect;
                    }
                    fw = Math.max(MIN_FRAC, annResizeState.startFracW + dw);
                    fh = Math.max(MIN_FRAC, annResizeState.startFracH + dh);
                    if (h.includes('w')) fx = annResizeState.startFracX + annResizeState.startFracW - fw;
                    if (h.includes('n')) fy = annResizeState.startFracY + annResizeState.startFracH - fh;
                } else {
                    if (h.includes('e')) fw = Math.max(MIN_FRAC, fw + dx);
                    if (h.includes('w')) { fx += dx; fw = Math.max(MIN_FRAC, fw - dx); }
                    if (h.includes('s')) fh = Math.max(MIN_FRAC, fh + dy);
                    if (h.includes('n')) { fy += dy; fh = Math.max(MIN_FRAC, fh - dy); }
                }
                updateAnnotation(annResizeState.annId, { fracX: fx, fracY: fy, fracWidth: fw, fracHeight: fh });
            }
            if (annRotateState) {
                const dx = e.clientX - annRotateState.centerX;
                const dy = e.clientY - annRotateState.centerY;
                const angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
                updateAnnotation(annRotateState.annId, { rotation: Math.round(angle) });
            }
        };
        const onMouseUp = () => {
            if (annDragState && !annDragHasMoved.current) {
                // Only enter edit mode for text annotations
                const ann = annotationsRef.current.find(a => a.id === annDragState.annId);
                if (ann && (!ann.type || ann.type === 'text')) {
                    setEditingAnnotationId(annDragState.annId);
                }
            }
            setAnnDragState(null);
            setAnnRotateState(null);
            setAnnResizeState(null);
        };
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        return () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
    }, [annDragState, annRotateState, annResizeState, pageWidth, pageHeight, scale, updateAnnotation]);

    const hexToRgb01 = hex => {
        const res = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return res
            ? { r: parseInt(res[1], 16) / 255, g: parseInt(res[2], 16) / 255, b: parseInt(res[3], 16) / 255 }
            : { r: 0, g: 0, b: 0 };
    };

    const doSave = useCallback(async () => {
        if (!blob || !onSave) return;
        setIsSaving(true);
        try {
            const arrayBuffer = await blob.arrayBuffer();
            const pdfDoc      = await PDFDocument.load(arrayBuffer);
            const pages       = pdfDoc.getPages();
            // Cache embedded fonts so we only embed each StandardFont once
            const fontCache   = {};
            const getFont = async (stdFontKey) => {
                if (!fontCache[stdFontKey]) fontCache[stdFontKey] = await pdfDoc.embedFont(stdFontKey);
                return fontCache[stdFontKey];
            };

            // First apply redactions (black squares)
            for (const red of redactions) {
                const page = pages[red.page - 1];
                if (!page) continue;
                const { width: pw, height: ph } = page.getSize();
                page.drawRectangle({
                    x: red.fracX * pw,
                    y: ph - (red.fracY * ph) - (red.fracHeight * ph),
                    width: red.fracWidth * pw,
                    height: red.fracHeight * ph,
                    color: rgb(0, 0, 0),
                });
            }

            // Then apply text annotations (line-by-line within bounding box)
            for (const ann of annotations.filter(a => !a.type || a.type === 'text')) {
                const page = pages[ann.page - 1];
                if (!page) continue;
                if (!ann.text.trim()) continue;
                const { width: pw, height: ph } = page.getSize();
                const { r, g, b: blue } = hexToRgb01(ann.color);
                const stdFont = toPdfLibFont(ann.font || 'Helvetica');
                const embFont = await getFont(stdFont);
                const lines = ann.text.split('\n');
                const lineH = ann.size * 1.2;
                lines.forEach((line, i) => {
                    if (!line) return;
                    page.drawText(line, {
                        x:    ann.fracX * pw,
                        y:    ph - ann.fracY * ph - ann.size - (i * lineH),
                        size: ann.size,
                        font: embFont,
                        color: rgb(r, g, blue),
                        opacity: ann.opacity ?? 1,
                        rotate: degrees(ann.rotation || 0),
                    });
                });
            }

            // Drawings — render as line segments
            for (const ann of annotations.filter(a => a.type === 'drawing')) {
                const page = pages[ann.page - 1];
                if (!page || !ann.points?.length) continue;
                const { width: pw, height: ph } = page.getSize();
                const { r, g, b: blue } = hexToRgb01(ann.color);
                for (let i = 1; i < ann.points.length; i++) {
                    const p1 = ann.points[i - 1];
                    const p2 = ann.points[i];
                    page.drawLine({
                        start: { x: (ann.fracX + p1.x * ann.fracWidth) * pw, y: ph - (ann.fracY + p1.y * ann.fracHeight) * ph },
                        end:   { x: (ann.fracX + p2.x * ann.fracWidth) * pw, y: ph - (ann.fracY + p2.y * ann.fracHeight) * ph },
                        thickness: ann.strokeWidth || 3,
                        color: rgb(r, g, blue),
                        opacity: ann.opacity ?? 1,
                    });
                }
            }

            // Shapes
            for (const ann of annotations.filter(a => a.type === 'shape')) {
                const page = pages[ann.page - 1];
                if (!page) continue;
                const { width: pw, height: ph } = page.getSize();
                const { r, g, b: blue } = hexToRgb01(ann.color);
                const x = ann.fracX * pw;
                const y = ph - ann.fracY * ph - ann.fracHeight * ph;
                const w = ann.fracWidth * pw;
                const h = ann.fracHeight * ph;
                const parseFill = (fc) => {
                    if (!fc || fc === 'none') return undefined;
                    const f = hexToRgb01(fc);
                    return rgb(f.r, f.g, f.b);
                };
                if (ann.shape === 'rectangle') {
                    page.drawRectangle({
                        x, y, width: w, height: h,
                        borderColor: rgb(r, g, blue), borderWidth: ann.strokeWidth || 3,
                        color: parseFill(ann.fillColor),
                        opacity: ann.opacity ?? 1, rotate: degrees(ann.rotation || 0),
                    });
                } else if (ann.shape === 'circle') {
                    page.drawEllipse({
                        x: x + w / 2, y: y + h / 2, xScale: w / 2, yScale: h / 2,
                        borderColor: rgb(r, g, blue), borderWidth: ann.strokeWidth || 3,
                        color: parseFill(ann.fillColor),
                        opacity: ann.opacity ?? 1, rotate: degrees(ann.rotation || 0),
                    });
                } else if (ann.shape === 'line' || ann.shape === 'arrow') {
                    page.drawLine({
                        start: { x, y }, end: { x: x + w, y: y + h },
                        thickness: ann.strokeWidth || 3,
                        color: rgb(r, g, blue), opacity: ann.opacity ?? 1,
                    });
                }
            }

            // Highlights
            for (const ann of annotations.filter(a => a.type === 'highlight')) {
                const page = pages[ann.page - 1];
                if (!page) continue;
                const { width: pw, height: ph } = page.getSize();
                const { r, g, b: blue } = hexToRgb01(ann.color);
                page.drawRectangle({
                    x: ann.fracX * pw,
                    y: ph - ann.fracY * ph - ann.fracHeight * ph,
                    width: ann.fracWidth * pw, height: ann.fracHeight * ph,
                    color: rgb(r, g, blue), opacity: ann.opacity ?? 0.35,
                });
            }

            // Images
            for (const ann of annotations.filter(a => a.type === 'image')) {
                try {
                    const page = pages[ann.page - 1];
                    if (!page || !ann.dataUrl) continue;
                    const { width: pw, height: ph } = page.getSize();
                    const base64 = ann.dataUrl.split(',')[1];
                    const imgBytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
                    const img = ann.dataUrl.includes('image/png')
                        ? await pdfDoc.embedPng(imgBytes)
                        : await pdfDoc.embedJpg(imgBytes);
                    page.drawImage(img, {
                        x: ann.fracX * pw,
                        y: ph - ann.fracY * ph - ann.fracHeight * ph,
                        width: ann.fracWidth * pw, height: ann.fracHeight * ph,
                        opacity: ann.opacity ?? 1, rotate: degrees(ann.rotation || 0),
                    });
                } catch (imgErr) {
                    console.warn('Failed to embed image annotation:', imgErr);
                }
            }

            const bytes     = await pdfDoc.save();
            const savedBlob = new Blob([bytes], { type: 'application/pdf' });
            await onSave(savedBlob);
        } catch (err) {
            onError?.(`Failed to save PDF: ${err.message}`);
        } finally {
            setIsSaving(false);
        }
    }, [blob, annotations, redactions, onSave, onError]);

    useImperativeHandle(ref, () => ({ save: doSave }));

    // Keyboard shortcuts for page nav
    useEffect(() => {
        const onKey = (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                e.preventDefault();
                transitionPage(p => Math.max(1, p - 1));
            } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                e.preventDefault();
                transitionPage(p => Math.min(numPages || 1, p + 1));
            }
        };
        const el = pagesAreaRef.current;
        el?.addEventListener('keydown', onKey);
        return () => el?.removeEventListener('keydown', onKey);
    }, [numPages]);

    // FAB genie panel content
    const genieContent = useMemo(() => () => (
        <div className="pdf-genie-panel">
            <Typography size="sm" weight="semibold" style={{ marginBottom: 8 }}>PDF Tools</Typography>

            {/* Zoom section */}
            <div className="pdf-genie-section-label">
                <Typography size="xs" color="muted">Zoom</Typography>
            </div>
            <div className="pdf-genie-zoom-controls">
                <Button size="xs" color="secondary" onClick={() => setScale(s => Math.max(baseScale * 0.3, parseFloat((s - 0.15).toFixed(2))))}>
                    <Icon name="FiMinus" size="xs" />
                </Button>
                <Typography size="xs" className="pdf-genie-zoom-label">{Math.round((scale / baseScale) * 100)}%</Typography>
                <Button size="xs" color="secondary" onClick={() => setScale(s => Math.min(baseScale * 5.0, parseFloat((s + 0.15).toFixed(2))))}>
                    <Icon name="FiPlus" size="xs" />
                </Button>
            </div>
            <Button size="sm" color="secondary" width="100%" className="pdf-genie-row" onClick={fitScreen}>
                <Icon name="FiMaximize2" size="sm" />
                Fit to screen
            </Button>
            <Button size="sm" color="secondary" width="100%" className="pdf-genie-row" onClick={setZoom100}>
                <Icon name="FiSearch" size="sm" />
                Zoom to 100%
            </Button>

            {!readOnly && (
                <>
                    <div className="pdf-genie-divider" />

                    {/* Annotation toggles */}
                    <Button
                        size="sm"
                        color={interactionMode === 'text' ? 'primary' : 'secondary'}
                        width="100%"
                        className="pdf-genie-row"
                        selected={interactionMode === 'text'}
                        onClick={() => { setInteractionMode(m => m === 'text' ? 'none' : 'text'); setEditingAnnotationId(null); }}
                    >
                        <Icon name="FiType" size="sm" />
                        Add text (Select area)
                        {interactionMode === 'text' && <Badge size="xs" color={color}>ON</Badge>}
                    </Button>

                    <Button
                        size="sm"
                        color={interactionMode === 'draw' ? 'primary' : 'secondary'}
                        width="100%"
                        className="pdf-genie-row"
                        selected={interactionMode === 'draw'}
                        onClick={() => { setInteractionMode(m => m === 'draw' ? 'none' : 'draw'); setEditingAnnotationId(null); }}
                    >
                        <Icon name="FiPenTool" size="sm" />
                        Freehand draw
                        {interactionMode === 'draw' && <Badge size="xs" color={color}>ON</Badge>}
                    </Button>

                    <Button
                        size="sm"
                        color={interactionMode === 'shape' ? 'primary' : 'secondary'}
                        width="100%"
                        className="pdf-genie-row"
                        selected={interactionMode === 'shape'}
                        onClick={() => { setInteractionMode(m => m === 'shape' ? 'none' : 'shape'); setEditingAnnotationId(null); }}
                    >
                        <Icon name="FiHexagon" size="sm" />
                        Add shape
                        {interactionMode === 'shape' && <Badge size="xs" color={color}>ON</Badge>}
                    </Button>

                    <Button
                        size="sm"
                        color={interactionMode === 'highlight' ? 'primary' : 'secondary'}
                        width="100%"
                        className="pdf-genie-row"
                        selected={interactionMode === 'highlight'}
                        onClick={() => { setInteractionMode(m => m === 'highlight' ? 'none' : 'highlight'); setEditingAnnotationId(null); }}
                    >
                        <Icon name="FiStar" size="sm" />
                        Highlight area
                        {interactionMode === 'highlight' && <Badge size="xs" color={color}>ON</Badge>}
                    </Button>

                    <Button
                        size="sm"
                        color={interactionMode === 'redact' ? 'primary' : 'secondary'}
                        width="100%"
                        className="pdf-genie-row"
                        selected={interactionMode === 'redact'}
                        onClick={() => { setInteractionMode(m => m === 'redact' ? 'none' : 'redact'); setEditingAnnotationId(null); }}
                    >
                        <Icon name="FiSquare" size="sm" />
                        Redact area
                        {interactionMode === 'redact' && <Badge size="xs" color={color}>ON</Badge>}
                    </Button>

                    <Button
                        size="sm"
                        color="secondary"
                        width="100%"
                        className="pdf-genie-row"
                        onClick={() => imageInputRef.current?.click()}
                    >
                        <Icon name="FiImage" size="sm" />
                        Insert image
                    </Button>

                    {/* Annotation options */}
                    {interactionMode === 'text' && (
                        <div className="pdf-genie-annotation-opts">
                            <div className="pdf-genie-opt-row">
                                <Typography size="xs" color="muted">Color</Typography>
                                <input
                                    type="color"
                                    className="pdf-color-picker"
                                    value={annotationColor}
                                    onChange={e => setAnnotationColor(e.target.value)}
                                />
                            </div>
                            <div className="pdf-genie-opt-row">
                                <Typography size="xs" color="muted">Size</Typography>
                                <Select
                                    size="xs"
                                    color="secondary"
                                    variant="outline"
                                    options={[12, 16, 20, 24, 32, 48, 64, 72, 96, 128, 144].map(s => ({ value: s, label: `${s}pt` }))}
                                    value={annotationSize}
                                    onChange={val => setAnnotationSize(Number(val))}
                                    width="80px"
                                />
                            </div>
                        </div>
                    )}

                    {interactionMode === 'draw' && (
                        <div className="pdf-genie-annotation-opts">
                            <div className="pdf-genie-opt-row">
                                <Typography size="xs" color="muted">Color</Typography>
                                <input type="color" className="pdf-color-picker" value={annotationColor} onChange={e => setAnnotationColor(e.target.value)} />
                            </div>
                            <div className="pdf-genie-opt-row">
                                <Typography size="xs" color="muted">Width</Typography>
                                <Select size="xs" color="secondary" variant="outline" options={[1,2,3,5,8,12].map(w => ({value:w, label:`${w}px`}))} value={strokeWidth} onChange={val => setStrokeWidth(Number(val))} width="80px" />
                            </div>
                        </div>
                    )}

                    {interactionMode === 'shape' && (
                        <div className="pdf-genie-annotation-opts">
                            <div className="pdf-genie-opt-row">
                                <Typography size="xs" color="muted">Shape</Typography>
                                <Select size="xs" color="secondary" variant="outline" options={[{value:'rectangle',label:'Rectangle'},{value:'circle',label:'Ellipse'},{value:'line',label:'Line'},{value:'arrow',label:'Arrow'}]} value={shapeType} onChange={setShapeType} width="110px" />
                            </div>
                            <div className="pdf-genie-opt-row">
                                <Typography size="xs" color="muted">Stroke</Typography>
                                <input type="color" className="pdf-color-picker" value={annotationColor} onChange={e => setAnnotationColor(e.target.value)} />
                            </div>
                            <div className="pdf-genie-opt-row">
                                <Typography size="xs" color="muted">Fill</Typography>
                                <ButtonGroup size="xs" selectable={false}>
                                    <Button size="xs" color="secondary"
                                        selected={fillColor === 'none'}
                                        title={fillColor === 'none' ? 'No fill (click to restore)' : 'Click to clear fill'}
                                        onClick={() => setFillColor(prev => prev === 'none' ? '#ffffff' : 'none')}
                                    >
                                        {fillColor === 'none'
                                            ? <Icon name="FiSlash" size="xs" />
                                            : <span className="pdf-fill-swatch" style={{ background: fillColor }} />}
                                    </Button>
                                    <Button size="xs" color="secondary" title="Pick fill colour" className="pdf-fill-picker-btn">
                                        <Icon name="FiChevronDown" size="xs" />
                                        <input type="color" className="pdf-fill-hidden-input"
                                            value={fillColor === 'none' ? '#ffffff' : fillColor}
                                            onChange={e => setFillColor(e.target.value)}
                                        />
                                    </Button>
                                </ButtonGroup>
                            </div>
                            <div className="pdf-genie-opt-row">
                                <Typography size="xs" color="muted">Width</Typography>
                                <Select size="xs" color="secondary" variant="outline" options={[1,2,3,5,8,12].map(w => ({value:w, label:`${w}px`}))} value={strokeWidth} onChange={val => setStrokeWidth(Number(val))} width="80px" />
                            </div>
                        </div>
                    )}

                    {interactionMode === 'highlight' && (
                        <div className="pdf-genie-annotation-opts">
                            <div className="pdf-genie-opt-row">
                                <Typography size="xs" color="muted">Color</Typography>
                                <input type="color" className="pdf-color-picker" value={highlightColor} onChange={e => setHighlightColor(e.target.value)} />
                            </div>
                            <div className="pdf-genie-opt-row">
                                <Typography size="xs" color="muted">Opacity</Typography>
                                <input type="range" className="pdf-ann-toolbar-opacity" min={0.1} max={0.8} step={0.05} value={highlightOpacity} onChange={e => setHighlightOpacity(parseFloat(e.target.value))} style={{ width: 80 }} />
                            </div>
                        </div>
                    )}

                    {/* Clear annotations */}
                    {(annotations.length > 0 || redactions.length > 0) && (
                        <Button
                            size="sm"
                            color="error"
                            width="100%"
                            className="pdf-genie-row"
                            onClick={() => { setAnnotations([]); setRedactions([]); }}
                        >
                            <Icon name="FiTrash2" size="sm" />
                            Clear changes
                        </Button>
                    )}

                    {/* Save */}
                    {onSave && (annotations.length > 0 || redactions.length > 0) && (
                        <>
                            <div className="pdf-genie-divider" />
                            <Button
                                size="sm"
                                color="success"
                                width="100%"
                                className="pdf-genie-row"
                                onClick={doSave}
                                disabled={isSaving}
                            >
                                <Icon name={isSaving ? 'FiLoader' : 'FiSave'} size="sm" />
                                {isSaving ? 'Saving...' : 'Save changes'}
                            </Button>
                        </>
                    )}
                </>
            )}
        </div>
    ), [interactionMode, annotationColor, annotationSize, annotations, redactions, readOnly, onSave, isSaving, scale, baseScale, fitScreen, setZoom100, doSave, color, shapeType, strokeWidth, fillColor, highlightColor, highlightOpacity]);

    return (
        <div className="pdf-viewer-wrapper" style={{ width, height }}>
            {/* PDF pages area */}
            <div
                ref={pagesAreaRef}
                className={`pdf-viewer-pages ${interactionMode !== 'none' ? 'pdf-annotating' : ''}`}
                tabIndex={0}
            >
                <Document
                    file={fileUrl || null}
                    onLoadSuccess={handleDocumentLoad}
                    loading={
                        <div className="pdf-loading">
                            <CircularProgress size="lg" />
                        </div>
                    }
                    error={
                        <div className="pdf-loading">
                            <Icon name="FiAlertCircle" size="32" color="error" />
                            <Typography color="error" style={{ marginTop: 8 }}>Failed to load PDF</Typography>
                        </div>
                    }
                >
                    {numPages && (
                        <div className="pdf-page-layout-container">
                            {/* Previous Page Thumbnail Nav */}
                            {numPages > 1 && currentPage > 1 ? (
                                <div
                                    className="pdf-thumbnail-nav prev"
                                    onClick={(e) => { e.preventDefault(); transitionPage(p => Math.max(1, p - 1)); }}
                                    title={`Previous page (${currentPage - 1})`}
                                    aria-label="Previous page"
                                    role="button"
                                    tabIndex={0}
                                >
                                    <div className="pdf-thumbnail-page-wrapper">
                                        <Page
                                            pageNumber={currentPage - 1}
                                            width={180}
                                            renderTextLayer={false}
                                            renderAnnotationLayer={false}
                                        />
                                        <div className="pdf-thumbnail-overlay">
                                            <Icon name="FiChevronLeft" size="xl" />
                                        </div>
                                    </div>
                                    <Badge size="xs" color={color}>{currentPage - 1}</Badge>
                                </div>
                            ) : (
                                <div className="pdf-thumbnail-nav prev placeholder" />
                            )}

                            <div
                                className={`pdf-page-wrapper container ${interactionMode !== 'none' ? 'pdf-page-annotating' : ''}${pageFading ? ` pdf-page-fading-${pageFading}` : ''}`}
                                onMouseDown={e => handleMouseDown(e, currentPage)}
                                onMouseMove={handleMouseMove}
                                onMouseUp={handleMouseUp}
                                onClick={() => { setSelectedAnnotationId(null); setEditingAnnotationId(null); }}
                            >
                                <Page
                                    pageNumber={currentPage}
                                    scale={scale}
                                    onLoadSuccess={handlePageLoad}
                                    renderTextLayer
                                    renderAnnotationLayer
                                />

                                {/* Render Drag Rectangle */}
                                {dragStart && dragCurrent && dragStart.page === currentPage && interactionMode !== 'draw' && (
                                    <div
                                        style={{
                                            position: 'absolute',
                                            border: interactionMode === 'redact' ? '2px dashed #000'
                                                : interactionMode === 'shape' ? `2px dashed ${annotationColor}`
                                                : interactionMode === 'highlight' ? `2px dashed ${highlightColor}`
                                                : '2px dashed #0A84FF',
                                            backgroundColor: interactionMode === 'redact' ? 'rgba(0,0,0,0.5)'
                                                : interactionMode === 'highlight' ? (highlightColor + '60')
                                                : interactionMode === 'shape' ? 'rgba(10, 132, 255, 0.1)'
                                                : 'rgba(10, 132, 255, 0.2)',
                                            left: Math.min(dragStart.relX, dragCurrent.relX),
                                            top: Math.min(dragStart.relY, dragCurrent.relY),
                                            width: Math.abs(dragCurrent.relX - dragStart.relX),
                                            height: Math.abs(dragCurrent.relY - dragStart.relY),
                                            pointerEvents: 'none',
                                            zIndex: 20
                                        }}
                                    />
                                )}

                                {/* SVG overlay for in-progress freehand drawing */}
                                {interactionMode === 'draw' && pageWidth && pageHeight && (
                                    <svg
                                        style={{
                                            position: 'absolute', top: 0, left: 0,
                                            width: pageWidth * scale, height: pageHeight * scale,
                                            pointerEvents: 'none', zIndex: 20,
                                        }}
                                    >
                                        <path
                                            ref={drawPathRef}
                                            stroke={annotationColor}
                                            strokeWidth={strokeWidth}
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            fill="none"
                                        />
                                    </svg>
                                )}

                                {/* Render Redactions */}
                                {redactions
                                    .filter(r => r.page === currentPage)
                                    .map(red => (
                                        <div
                                            key={red.id}
                                            style={{
                                                position: 'absolute',
                                                left: red.fracX * pageWidth * scale,
                                                top: red.fracY * pageHeight * scale,
                                                width: red.fracWidth * pageWidth * scale,
                                                height: red.fracHeight * pageHeight * scale,
                                                backgroundColor: '#000',
                                                cursor: interactionMode === 'redact' ? 'pointer' : 'default',
                                                zIndex: 10
                                            }}
                                            onClick={e => {
                                                if (interactionMode === 'redact') {
                                                    e.stopPropagation();
                                                    removeRedaction(red.id);
                                                }
                                            }}
                                            title={interactionMode === 'redact' ? 'Click to remove redaction' : ''}
                                        />
                                    ))
                                }

                                {/* Render Annotations (all types) */}
                                {annotations
                                    .filter(a => a.page === currentPage)
                                    .map(ann => {
                                        const isSelected = selectedAnnotationId === ann.id;
                                        const isEditing = editingAnnotationId === ann.id;
                                        const annType = ann.type || 'text';
                                        return (
                                            <div
                                                key={ann.id}
                                                className={`pdf-annotation-item${isSelected ? ' selected' : ''}${isEditing ? ' editing' : ''}`}
                                                style={{
                                                    left: ann.fracX * pageWidth * scale,
                                                    top:  ann.fracY * pageHeight * scale,
                                                    width: ann.fracWidth * pageWidth * scale,
                                                    height: ann.fracHeight * pageHeight * scale,
                                                    transform: `rotate(${ann.rotation || 0}deg)`,
                                                    zIndex: isEditing ? 35 : isSelected ? 30 : 15,
                                                }}
                                                onMouseDown={e => {
                                                    if (isEditing) return;
                                                    e.stopPropagation();
                                                    setSelectedAnnotationId(ann.id);
                                                    annDragHasMoved.current = false;
                                                    setAnnDragState({
                                                        annId: ann.id,
                                                        startMouseX: e.clientX,
                                                        startMouseY: e.clientY,
                                                        startFracX: ann.fracX,
                                                        startFracY: ann.fracY,
                                                    });
                                                }}
                                                onClick={e => e.stopPropagation()}
                                            >
                                                {/* ── Toolbar (type-specific + common controls) ── */}
                                                <div className="pdf-ann-toolbar" onMouseDown={e => e.stopPropagation()}>
                                                    {/* Text-specific controls */}
                                                    {annType === 'text' && (
                                                        <>
                                                            <Select size="xs" color="secondary" variant="outline"
                                                                options={PDF_FONT_FAMILIES.map(f => ({ value: f.value, label: f.label }))}
                                                                value={ann.font || 'Helvetica'}
                                                                onChange={val => updateAnnotation(ann.id, { font: val })}
                                                                placeholder="Font" width="180px"
                                                            />
                                                            <input type="color" className="pdf-ann-toolbar-color"
                                                                value={ann.color} title="Text colour"
                                                                onChange={e => updateAnnotation(ann.id, { color: e.target.value })}
                                                            />
                                                            <Select size="xs" color="secondary" variant="outline"
                                                                options={[12,16,20,24,32,48,64,72,96,128,144].map(s => ({value:s, label:`${s}pt`}))}
                                                                value={ann.size}
                                                                onChange={val => updateAnnotation(ann.id, { size: Number(val) })}
                                                                placeholder="Size" width="80px"
                                                            />
                                                        </>
                                                    )}
                                                    {/* Drawing-specific controls */}
                                                    {annType === 'drawing' && (
                                                        <>
                                                            <input type="color" className="pdf-ann-toolbar-color"
                                                                value={ann.color} title="Stroke colour"
                                                                onChange={e => updateAnnotation(ann.id, { color: e.target.value })}
                                                            />
                                                            <Select size="xs" color="secondary" variant="outline"
                                                                options={[1,2,3,5,8,12].map(w => ({value:w, label:`${w}px`}))}
                                                                value={ann.strokeWidth || 3}
                                                                onChange={val => updateAnnotation(ann.id, { strokeWidth: Number(val) })}
                                                                placeholder="Width" width="100px"
                                                            />
                                                        </>
                                                    )}
                                                    {/* Shape-specific controls */}
                                                    {annType === 'shape' && (
                                                        <>
                                                            <Select size="xs" color="secondary" variant="outline"
                                                                options={[{value:'rectangle',label:'Rect'},{value:'circle',label:'Ellipse'},{value:'line',label:'Line'},{value:'arrow',label:'Arrow'}]}
                                                                value={ann.shape}
                                                                onChange={val => updateAnnotation(ann.id, { shape: val })}
                                                                width="110px"
                                                            />
                                                            <input type="color" className="pdf-ann-toolbar-color"
                                                                value={ann.color} title="Stroke colour"
                                                                onChange={e => updateAnnotation(ann.id, { color: e.target.value })}
                                                            />
                                                            <ButtonGroup size="xs" selectable={false}>
                                                                <Button size="xs" color="secondary"
                                                                    selected={!ann.fillColor || ann.fillColor === 'none'}
                                                                    title={(!ann.fillColor || ann.fillColor === 'none') ? 'No fill (click to restore)' : 'Click to clear fill'}
                                                                    onClick={() => updateAnnotation(ann.id, { fillColor: (!ann.fillColor || ann.fillColor === 'none') ? '#ffffff' : 'none' })}
                                                                >
                                                                    {(!ann.fillColor || ann.fillColor === 'none')
                                                                        ? <Icon name="FiSlash" size="xs" />
                                                                        : <span className="pdf-fill-swatch" style={{ background: ann.fillColor }} />}
                                                                </Button>
                                                                <Button size="xs" color="secondary" title="Pick fill colour" className="pdf-fill-picker-btn">
                                                                    <Icon name="FiChevronDown" size="xs" />
                                                                    <input type="color" className="pdf-fill-hidden-input"
                                                                        value={ann.fillColor === 'none' ? '#ffffff' : (ann.fillColor || '#ffffff')}
                                                                        onChange={e => updateAnnotation(ann.id, { fillColor: e.target.value })}
                                                                    />
                                                                </Button>
                                                            </ButtonGroup>
                                                            <Select size="xs" color="secondary" variant="outline"
                                                                options={[1,2,3,5,8,12].map(w => ({value:w, label:`${w}px`}))}
                                                                value={ann.strokeWidth || 3}
                                                                onChange={val => updateAnnotation(ann.id, { strokeWidth: Number(val) })}
                                                                placeholder="Width" width="100px"
                                                            />
                                                        </>
                                                    )}
                                                    {/* Highlight-specific controls */}
                                                    {annType === 'highlight' && (
                                                        <input type="color" className="pdf-ann-toolbar-color"
                                                            value={ann.color} title="Highlight colour"
                                                            onChange={e => updateAnnotation(ann.id, { color: e.target.value })}
                                                        />
                                                    )}
                                                    {/* Common controls for all types */}
                                                    <input
                                                        type="range"
                                                        className="pdf-ann-toolbar-opacity"
                                                        min={0.1} max={1} step={0.05}
                                                        value={ann.opacity ?? 1}
                                                        title={`Opacity: ${Math.round((ann.opacity ?? 1) * 100)}%`}
                                                        onChange={e => updateAnnotation(ann.id, { opacity: parseFloat(e.target.value) })}
                                                    />
                                                    <Button size="xs" color="secondary"
                                                        selected={!!ann.groupId}
                                                        title={ann.groupId ? 'Remove from other pages' : `Copy to all ${numPages} pages`}
                                                        onClick={e => { e.stopPropagation(); copyAnnotationToAllPages(ann); }}
                                                    >
                                                        <Icon name="FiCopy" size="xs" />
                                                    </Button>
                                                    <Button size="xs" color="error"
                                                        title="Delete annotation"
                                                        onClick={e => { e.stopPropagation(); removeAnnotation(ann.id); }}
                                                    >
                                                        <Icon name="FiTrash2" size="xs" />
                                                    </Button>
                                                </div>

                                                {/* ── Content by type ── */}
                                                {/* Text */}
                                                {annType === 'text' && (isEditing ? (
                                                    <textarea
                                                        ref={editTextareaRef}
                                                        className="pdf-ann-text-editor"
                                                        style={{
                                                            color: ann.color,
                                                            fontSize: ann.size * scale,
                                                            fontFamily: ann.font || 'Helvetica',
                                                            opacity: ann.opacity ?? 1,
                                                        }}
                                                        value={ann.text}
                                                        onChange={e => updateAnnotation(ann.id, { text: e.target.value })}
                                                        onBlur={() => finishEditing(ann.id)}
                                                        onKeyDown={e => { if (e.key === 'Escape') { e.preventDefault(); finishEditing(ann.id); } }}
                                                        onMouseDown={e => e.stopPropagation()}
                                                        autoFocus
                                                    />
                                                ) : (
                                                    <div
                                                        className="pdf-ann-text-display"
                                                        style={{
                                                            color: ann.color,
                                                            fontSize: ann.size * scale,
                                                            fontFamily: ann.font || 'Helvetica',
                                                            opacity: ann.text ? (ann.opacity ?? 1) : 0.4,
                                                        }}
                                                    >
                                                        {ann.text || 'Click to type\u2026'}
                                                    </div>
                                                ))}

                                                {/* Drawing (freehand) */}
                                                {annType === 'drawing' && (() => {
                                                    const w = ann.fracWidth * pageWidth * scale;
                                                    const h = ann.fracHeight * pageHeight * scale;
                                                    return (
                                                        <svg width={w} height={h} style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible', pointerEvents: 'none' }}>
                                                            <polyline
                                                                points={(ann.points || []).map(p => `${p.x * w},${p.y * h}`).join(' ')}
                                                                stroke={ann.color}
                                                                strokeWidth={ann.strokeWidth || 3}
                                                                fill="none"
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                opacity={ann.opacity ?? 1}
                                                            />
                                                        </svg>
                                                    );
                                                })()}

                                                {/* Shape */}
                                                {annType === 'shape' && (() => {
                                                    const w = ann.fracWidth * pageWidth * scale;
                                                    const h = ann.fracHeight * pageHeight * scale;
                                                    const sw = ann.strokeWidth || 3;
                                                    return (
                                                        <svg width={w} height={h} style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible', pointerEvents: 'none' }}>
                                                            {ann.shape === 'rectangle' && (
                                                                <rect x={sw / 2} y={sw / 2} width={Math.max(0, w - sw)} height={Math.max(0, h - sw)}
                                                                    stroke={ann.color} fill={ann.fillColor || 'none'} strokeWidth={sw} opacity={ann.opacity ?? 1} />
                                                            )}
                                                            {ann.shape === 'circle' && (
                                                                <ellipse cx={w / 2} cy={h / 2} rx={Math.max(0, w / 2 - sw / 2)} ry={Math.max(0, h / 2 - sw / 2)}
                                                                    stroke={ann.color} fill={ann.fillColor || 'none'} strokeWidth={sw} opacity={ann.opacity ?? 1} />
                                                            )}
                                                            {ann.shape === 'line' && (
                                                                <line x1={0} y1={h} x2={w} y2={0}
                                                                    stroke={ann.color} strokeWidth={sw} opacity={ann.opacity ?? 1} strokeLinecap="round" />
                                                            )}
                                                            {ann.shape === 'arrow' && (
                                                                <>
                                                                    <defs>
                                                                        <marker id={`arr-${ann.id}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                                                                            <path d="M 0 0 L 10 5 L 0 10 z" fill={ann.color} />
                                                                        </marker>
                                                                    </defs>
                                                                    <line x1={0} y1={h} x2={w} y2={0}
                                                                        stroke={ann.color} strokeWidth={sw} opacity={ann.opacity ?? 1}
                                                                        markerEnd={`url(#arr-${ann.id})`} strokeLinecap="round" />
                                                                </>
                                                            )}
                                                        </svg>
                                                    );
                                                })()}

                                                {/* Highlight */}
                                                {annType === 'highlight' && (
                                                    <div style={{
                                                        width: '100%', height: '100%',
                                                        backgroundColor: ann.color,
                                                        opacity: ann.opacity ?? 0.35,
                                                        borderRadius: 2,
                                                        pointerEvents: 'none',
                                                    }} />
                                                )}

                                                {/* Image */}
                                                {annType === 'image' && (
                                                    <img
                                                        src={ann.dataUrl}
                                                        alt="annotation"
                                                        draggable={false}
                                                        style={{
                                                            position: 'absolute',
                                                            top: 0, left: 0,
                                                            width: '100%', height: '100%',
                                                            objectFit: 'fill',
                                                            opacity: ann.opacity ?? 1,
                                                            pointerEvents: 'none',
                                                            userSelect: 'none',
                                                        }}
                                                    />
                                                )}

                                                {/* Resize handles — visible when selected & not editing */}
                                                {isSelected && !isEditing && (
                                                    <>
                                                        {['nw','n','ne','e','se','s','sw','w'].map(h => (
                                                            <div
                                                                key={h}
                                                                className={`pdf-ann-resize-handle ${h}`}
                                                                onMouseDown={e => {
                                                                    e.stopPropagation();
                                                                    setAnnResizeState({
                                                                        annId: ann.id,
                                                                        handle: h,
                                                                        startMouseX: e.clientX,
                                                                        startMouseY: e.clientY,
                                                                        startFracX: ann.fracX,
                                                                        startFracY: ann.fracY,
                                                                        startFracW: ann.fracWidth,
                                                                        startFracH: ann.fracHeight,
                                                                    });
                                                                }}
                                                            />
                                                        ))}
                                                    </>
                                                )}

                                                {/* Rotate handle — visible when selected & not editing */}
                                                {isSelected && !isEditing && (
                                                    <div
                                                        className="pdf-ann-rotate-handle"
                                                        title="Drag to rotate"
                                                        onMouseDown={e => {
                                                            e.stopPropagation();
                                                            const el = e.currentTarget.closest('.pdf-annotation-item');
                                                            const rect = el.getBoundingClientRect();
                                                            setAnnRotateState({
                                                                annId: ann.id,
                                                                centerX: rect.left + rect.width / 2,
                                                                centerY: rect.top + rect.height / 2,
                                                            });
                                                        }}
                                                    />
                                                )}
                                            </div>
                                        );
                                    })
                                }
                            </div>

                            {/* FAB genie placed horizontally matching the document level, right next to it */}
                            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: pageHeight * scale }}>
                                <FloatingActionButton
                                    icon={interactionMode !== 'none' ? 'FiEdit3' : 'FiSettings'}
                                    variant={interactionMode !== 'none' ? 'primary' : 'secondary'}
                                    position="static"
                                    size="md"
                                    genie={{
                                        trigger: 'click',
                                        content: genieContent,
                                    }}
                                    badge={(annotations.length + redactions.length) > 0 ? String(annotations.length + redactions.length) : null}
                                    badgeColor={color}
                                    title="PDF tools"
                                />
                            </div>

                            {/* Next Page Thumbnail Nav */}
                            {numPages > 1 && currentPage < numPages ? (
                                <div
                                    className="pdf-thumbnail-nav next"
                                    onClick={(e) => { e.preventDefault(); transitionPage(p => Math.min(numPages, p + 1)); }}
                                    title={`Next page (${currentPage + 1})`}
                                    aria-label="Next page"
                                    role="button"
                                    tabIndex={0}
                                >
                                    <div className="pdf-thumbnail-page-wrapper">
                                        <Page
                                            pageNumber={currentPage + 1}
                                            width={180}
                                            renderTextLayer={false}
                                            renderAnnotationLayer={false}
                                        />
                                        <div className="pdf-thumbnail-overlay">
                                            <Icon name="FiChevronRight" size="xl" />
                                        </div>
                                    </div>
                                    <Badge size="xs" color={color}>{currentPage + 1}</Badge>
                                </div>
                            ) : (
                                <div className="pdf-thumbnail-nav next placeholder" />
                            )}
                        </div>
                    )}
                </Document>
            </div>

            {/* Minimal info pill at bottom center */}
            {numPages > 0 && (
                <div className="pdf-page-nav pdf-page-nav-minimal">
                    <Typography size="xs" className="pdf-page-nav-zoom">{Math.round((scale / baseScale) * 100)}% | Page {currentPage} of {numPages}</Typography>
                </div>
            )}

            {/* Hidden file input for image annotations */}
            <input
                ref={imageInputRef}
                type="file"
                accept="image/png,image/jpeg,image/gif,image/webp"
                style={{ display: 'none' }}
                onChange={handleImageUpload}
            />

        </div>
    );
});

PdfViewer.displayName = 'PdfViewer';
export default PdfViewer;
