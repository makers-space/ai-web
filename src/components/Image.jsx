import React, { useState, useRef, useEffect, useImperativeHandle, useMemo, useCallback } from 'react';
import { useTheme } from '@contexts/ThemeContext';
import Button from './Button';
import ButtonGroup from './ButtonGroup';
import Container from './Container';
import FloatingActionButton from './FloatingActionButton';
import Input from './Input';
import Typography from './Typography';
import Icon from './Icon';
import Select from './Select';
import Switch from './Switch';

/**
 * Image - Enhanced image component with CSS-based editing capabilities
 * 
 * Features:
 * - Non-destructive CSS-based editing (no canvas)
 * - Direct pixel manipulation through CSS transforms and filters
 * - Rotation, scaling, cropping, brightness, contrast, saturation, blur
 * - FAB with Genie for edit controls
 * - Minimal spacing - uses natural image dimensions
 * - Export edited image with applied transformations
 * - Theme inheritance support
 * 
 * Editing Philosophy:
 * - All edits are CSS-based for real-time preview
 * - Image retains its natural aspect ratio
 * - Minimal container overhead
 * - Export uses canvas only for final render
 */

// Default edit state - centralized
const DEFAULT_EDITS = {
	rotation: 0,
	scaleX: 1,
	scaleY: 1,
	flipX: false,
	flipY: false,
	brightness: 100,
	contrast: 100,
	saturation: 100,
	hue: 0,
	blur: 0,
	grayscale: 0,
	sepia: 0,
	invert: 0,
	pixelate: 0,
	// Crop properties (percentage-based)
	cropX: 0,
	cropY: 0,
	cropWidth: 100,
	cropHeight: 100
};

// Size map - moved outside component
const SIZE_MAP = {
	xs: { maxWidth: '200px', maxHeight: '200px' },
	sm: { maxWidth: '400px', maxHeight: '400px' },
	md: { maxWidth: '600px', maxHeight: '600px' },
	lg: { maxWidth: '800px', maxHeight: '800px' },
	xl: { maxWidth: '1200px', maxHeight: '1200px' },
	full: { width: '100%', height: 'auto' }
};

// Helper for margin values - moved outside component
const MARGIN_MAP = { 
	none: '0', 
	xs: 'var(--spacing-xs)', 
	sm: 'var(--spacing-sm)', 
	md: 'var(--spacing-md)', 
	lg: 'var(--spacing-lg)', 
	xl: 'var(--spacing-xl)' 
};

const getMargin = (val) => MARGIN_MAP[val] || val;

const Image = React.forwardRef(({
	src,
	alt = '',
	className = '',
	editable = false,
	theme = null,
	size = 'md',
	width = null,
	height = null,
	minWidth = null,
	minHeight = null,
	maxWidth = null,
	maxHeight = null,
	marginTop = null,
	marginBottom = null,
	justifySelf = null,
	controlsPlacement = 'bottom',
	loadingFallback = null,
	initialEdits = null,
	onEditChange = null,
	onSave = null,
	allowDownload = true,
	fileName = 'edited-image',
	outputFormat = 'image/png',
	outputQuality = 0.92,
	fit = 'contain',
	style: inlineStyle = null,
	imageProps = {},
	...rest
}, ref) => {
	const { currentTheme } = useTheme();
	const appliedTheme = theme || currentTheme;
	const imgRef = useRef(null);
	const containerRef = useRef(null);
	const [isLoaded, setIsLoaded] = useState(false);
	const [imageError, setImageError] = useState(false);
	const [naturalDimensions, setNaturalDimensions] = useState({ width: 0, height: 0 });
	const [pixelatedSrc, setPixelatedSrc] = useState(null);
	
	// Drag state
	const [isDragging, setIsDragging] = useState(false);
	const [dragType, setDragType] = useState(null);
	const dragStartRef = useRef({ x: 0, y: 0, centerX: 0, centerY: 0, initialRotation: 0, initialScaleX: 1, initialScaleY: 1 });
	
	// Edit state
	const [edits, setEdits] = useState(initialEdits || DEFAULT_EDITS);
	
	// Ref to track latest edits during drag (avoids stale closure)
	const editsRef = useRef(edits);

	// Track edit history for undo/redo
	const [editHistory, setEditHistory] = useState([edits]);
	const [historyIndex, setHistoryIndex] = useState(0);
	
	// Crop mode state
	const [cropMode, setCropMode] = useState(false);
	const cropDragStartRef = useRef({ x: 0, y: 0, initialCrop: null });

	// Image loading handlers
	const handleImageLoad = (e) => {
		setIsLoaded(true);
		setImageError(false);
		setNaturalDimensions({
			width: e.target.naturalWidth,
			height: e.target.naturalHeight
		});
	};

	const handleImageError = () => {
		setIsLoaded(false);
		setImageError(true);
	};

	// Keep editsRef in sync with edits state
	useEffect(() => {
		editsRef.current = edits;
	}, [edits]);

	// Update edits with history tracking
	const updateEdits = (newEdits, addToHistory = true) => {
		setEdits(newEdits);
		editsRef.current = newEdits;
		
		if (addToHistory) {
			const newHistory = editHistory.slice(0, historyIndex + 1);
			newHistory.push(newEdits);
			setEditHistory(newHistory);
			setHistoryIndex(newHistory.length - 1);
		}
		
		if (onEditChange) {
			onEditChange(newEdits);
		}
	};

	// Undo/Redo functions
	const undo = () => {
		if (historyIndex > 0) {
			const newIndex = historyIndex - 1;
			setHistoryIndex(newIndex);
			updateEdits(editHistory[newIndex], false);
		}
	};

	const redo = () => {
		if (historyIndex < editHistory.length - 1) {
			const newIndex = historyIndex + 1;
			setHistoryIndex(newIndex);
			updateEdits(editHistory[newIndex], false);
		}
	};

	// Reset all edits
	const resetEdits = () => {
		updateEdits(initialEdits || DEFAULT_EDITS);
	};

	// Handle drag start for rotation and resize
	const handleDragStart = (e, type) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragging(true);
		setDragType(type);
		
		const rect = containerRef.current.getBoundingClientRect();
		const centerX = rect.left + rect.width / 2;
		const centerY = rect.top + rect.height / 2;
		
		dragStartRef.current = {
			x: e.clientX,
			y: e.clientY,
			centerX,
			centerY,
			initialRotation: edits.rotation,
			initialScaleX: edits.scaleX,
			initialScaleY: edits.scaleY
		};
	};

	// Handle drag move
	const handleDragMove = useCallback((e) => {
		if (!dragType) return;
		
		const { x, y, centerX, centerY, initialRotation, initialScaleX, initialScaleY } = dragStartRef.current;
		const dx = e.clientX - x;
		const dy = e.clientY - y;
		const currentEdits = editsRef.current;
		
		if (dragType === 'rotate') {
			const currentAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);
			const startAngle = Math.atan2(y - centerY, x - centerX) * (180 / Math.PI);
			updateEdits({ ...currentEdits, rotation: initialRotation + currentAngle - startAngle }, false);
		} else if (dragType.startsWith('resize-')) {
			const isCorner = dragType.length > 8;
			
			if (isCorner) {
				// Corner: proportional scaling with direction multipliers
				const directionMap = {
					'resize-se': (dx + dy) / 400,      // Bottom-right
					'resize-nw': (-dx - dy) / 400,     // Top-left
					'resize-ne': (dx - dy) / 400,      // Top-right
					'resize-sw': (-dx + dy) / 400      // Bottom-left
				};
				const scaleFactor = 1 + directionMap[dragType];
				const newScale = Math.max(0.1, Math.min(3, initialScaleX * scaleFactor));
				updateEdits({ ...currentEdits, scaleX: newScale, scaleY: newScale }, false);
			} else {
				// Edge: independent axis scaling
				const edgeScaleMap = {
					'resize-w': { scaleX: Math.max(0.1, Math.min(3, initialScaleX * (1 - dx / 200))) },
					'resize-e': { scaleX: Math.max(0.1, Math.min(3, initialScaleX * (1 + dx / 200))) },
					'resize-n': { scaleY: Math.max(0.1, Math.min(3, initialScaleY * (1 - dy / 200))) },
					'resize-s': { scaleY: Math.max(0.1, Math.min(3, initialScaleY * (1 + dy / 200))) }
				};
				updateEdits({ ...currentEdits, ...edgeScaleMap[dragType] }, false);
			}
		}
	}, [dragType]);

	// Handle drag end
	const handleDragEnd = useCallback(() => {
		setIsDragging(false);
		setDragType(null);
		// Add final state to history using the ref to get latest value
		const finalEdits = editsRef.current;
		setEdits(finalEdits);
		
		// Add to history
		setEditHistory(prev => {
			const newHistory = prev.slice(0, historyIndex + 1);
			newHistory.push(finalEdits);
			return newHistory;
		});
		setHistoryIndex(prev => prev + 1);
		
		if (onEditChange) {
			onEditChange(finalEdits);
		}
	}, [historyIndex, onEditChange]);

	// Crop drag handlers
	const handleCropDragStart = (e, type) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragging(true);
		setDragType(type);
		
		const rect = containerRef.current.getBoundingClientRect();
		cropDragStartRef.current = {
			x: e.clientX,
			y: e.clientY,
			containerWidth: rect.width,
			containerHeight: rect.height,
			initialCrop: {
				x: edits.cropX,
				y: edits.cropY,
				width: edits.cropWidth,
				height: edits.cropHeight
			}
		};
	};

	const handleCropDragMove = useCallback((e) => {
		if (!dragType || !dragType.startsWith('crop-')) return;
		
		const { x, y, containerWidth, containerHeight, initialCrop } = cropDragStartRef.current;
		const dx = ((e.clientX - x) / containerWidth) * 100;
		const dy = ((e.clientY - y) / containerHeight) * 100;
		const currentEdits = editsRef.current;
		
		let newCrop = { ...initialCrop };
		
		if (dragType === 'crop-move') {
			// Move entire crop area
			newCrop.x = Math.max(0, Math.min(100 - initialCrop.width, initialCrop.x + dx));
			newCrop.y = Math.max(0, Math.min(100 - initialCrop.height, initialCrop.y + dy));
		} else if (dragType === 'crop-nw') {
			// Top-left corner
			const newX = Math.max(0, Math.min(initialCrop.x + initialCrop.width - 5, initialCrop.x + dx));
			const newY = Math.max(0, Math.min(initialCrop.y + initialCrop.height - 5, initialCrop.y + dy));
			newCrop.width = initialCrop.width - (newX - initialCrop.x);
			newCrop.height = initialCrop.height - (newY - initialCrop.y);
			newCrop.x = newX;
			newCrop.y = newY;
		} else if (dragType === 'crop-ne') {
			// Top-right corner
			const newY = Math.max(0, Math.min(initialCrop.y + initialCrop.height - 5, initialCrop.y + dy));
			newCrop.width = Math.max(5, Math.min(100 - initialCrop.x, initialCrop.width + dx));
			newCrop.height = initialCrop.height - (newY - initialCrop.y);
			newCrop.y = newY;
		} else if (dragType === 'crop-sw') {
			// Bottom-left corner
			const newX = Math.max(0, Math.min(initialCrop.x + initialCrop.width - 5, initialCrop.x + dx));
			newCrop.width = initialCrop.width - (newX - initialCrop.x);
			newCrop.height = Math.max(5, Math.min(100 - initialCrop.y, initialCrop.height + dy));
			newCrop.x = newX;
		} else if (dragType === 'crop-se') {
			// Bottom-right corner
			newCrop.width = Math.max(5, Math.min(100 - initialCrop.x, initialCrop.width + dx));
			newCrop.height = Math.max(5, Math.min(100 - initialCrop.y, initialCrop.height + dy));
		} else if (dragType === 'crop-n') {
			// Top edge
			const newY = Math.max(0, Math.min(initialCrop.y + initialCrop.height - 5, initialCrop.y + dy));
			newCrop.height = initialCrop.height - (newY - initialCrop.y);
			newCrop.y = newY;
		} else if (dragType === 'crop-s') {
			// Bottom edge
			newCrop.height = Math.max(5, Math.min(100 - initialCrop.y, initialCrop.height + dy));
		} else if (dragType === 'crop-w') {
			// Left edge
			const newX = Math.max(0, Math.min(initialCrop.x + initialCrop.width - 5, initialCrop.x + dx));
			newCrop.width = initialCrop.width - (newX - initialCrop.x);
			newCrop.x = newX;
		} else if (dragType === 'crop-e') {
			// Right edge
			newCrop.width = Math.max(5, Math.min(100 - initialCrop.x, initialCrop.width + dx));
		}
		
		// Update edits directly (non-destructive)
		updateEdits({ 
			...currentEdits, 
			cropX: newCrop.x, 
			cropY: newCrop.y, 
			cropWidth: newCrop.width, 
			cropHeight: newCrop.height 
		}, false);
	}, [dragType]);

	const handleCropDragEnd = useCallback(() => {
		if (dragType && dragType.startsWith('crop-')) {
			setIsDragging(false);
			setDragType(null);
			// Add final crop state to history using the ref to get latest value
			const finalEdits = editsRef.current;
			setEdits(finalEdits);
			
			// Add to history
			setEditHistory(prev => {
				const newHistory = prev.slice(0, historyIndex + 1);
				newHistory.push(finalEdits);
				return newHistory;
			});
			setHistoryIndex(prev => prev + 1);
			
			if (onEditChange) {
				onEditChange(finalEdits);
			}
		}
	}, [dragType, historyIndex, onEditChange]);

	// Apply crop - exit crop mode with current values
	const applyCrop = () => {
		setCropMode(false);
	};

	const cancelCrop = () => {
		// Reset crop values to full image
		updateEdits({
			...edits,
			cropX: 0,
			cropY: 0,
			cropWidth: 100,
			cropHeight: 100
		});
		setCropMode(false);
	};

	// Add mouse event listeners for dragging
	useEffect(() => {
		if (!isDragging) return;
		
		const moveHandler = dragType?.startsWith('crop-') ? handleCropDragMove : handleDragMove;
		const endHandler = dragType?.startsWith('crop-') ? handleCropDragEnd : handleDragEnd;
		
		window.addEventListener('mousemove', moveHandler);
		window.addEventListener('mouseup', endHandler);
		
		return () => {
			window.removeEventListener('mousemove', moveHandler);
			window.removeEventListener('mouseup', endHandler);
		};
	}, [isDragging, dragType]);

	// Generate pixelated image when pixelate value changes
	useEffect(() => {
		if (!imgRef.current || !isLoaded || edits.pixelate === 0) {
			setPixelatedSrc(null);
			return;
		}

		const canvas = document.createElement('canvas');
		const ctx = canvas.getContext('2d');
		const img = imgRef.current;

		// Set canvas to natural image size
		canvas.width = naturalDimensions.width;
		canvas.height = naturalDimensions.height;

		// Calculate pixelation size (lower = more pixelated)
		const pixelSize = Math.max(1, Math.floor(edits.pixelate));
		const scaledWidth = Math.max(1, Math.floor(canvas.width / pixelSize));
		const scaledHeight = Math.max(1, Math.floor(canvas.height / pixelSize));

		// Disable image smoothing for sharp pixels
		ctx.imageSmoothingEnabled = false;

		// Draw image small
		ctx.drawImage(img, 0, 0, scaledWidth, scaledHeight);

		// Scale back up to create pixelation effect
		ctx.drawImage(canvas, 0, 0, scaledWidth, scaledHeight, 0, 0, canvas.width, canvas.height);

		// Convert to data URL
		setPixelatedSrc(canvas.toDataURL());
	}, [edits.pixelate, isLoaded, naturalDimensions]);

	// Memoize effective scale values
	const effectiveScale = useMemo(() => ({
		scaleX: edits.scaleX * (edits.flipX ? -1 : 1),
		scaleY: edits.scaleY * (edits.flipY ? -1 : 1)
	}), [edits.scaleX, edits.scaleY, edits.flipX, edits.flipY]);

	// Build CSS transform string - memoized
	const transformString = useMemo(() => {
		const transforms = [
			edits.rotation !== 0 && `rotate(${edits.rotation}deg)`,
			(effectiveScale.scaleX !== 1 || effectiveScale.scaleY !== 1) && `scale(${effectiveScale.scaleX}, ${effectiveScale.scaleY})`
		].filter(Boolean);
		
		return transforms.length ? transforms.join(' ') : 'none';
	}, [edits.rotation, effectiveScale]);

	// Build CSS filter string - memoized
	const filterString = useMemo(() => {
		const filters = [
			edits.brightness !== 100 && `brightness(${edits.brightness}%)`,
			edits.contrast !== 100 && `contrast(${edits.contrast}%)`,
			edits.saturation !== 100 && `saturate(${edits.saturation}%)`,
			edits.hue !== 0 && `hue-rotate(${edits.hue}deg)`,
			edits.blur > 0 && `blur(${edits.blur}px)`,
			edits.grayscale > 0 && `grayscale(${edits.grayscale}%)`,
			edits.sepia > 0 && `sepia(${edits.sepia}%)`,
			edits.invert > 0 && `invert(${edits.invert}%)`
		].filter(Boolean);
		
		return filters.length ? filters.join(' ') : 'none';
	}, [edits.brightness, edits.contrast, edits.saturation, edits.hue, edits.blur, edits.grayscale, edits.sepia, edits.invert]);

	// Export edited image
	const exportImage = async () => {
		if (!imgRef.current || !isLoaded) {
			return null;
		}

		const canvas = document.createElement('canvas');
		const ctx = canvas.getContext('2d');
		const img = imgRef.current;

		// Calculate crop dimensions
		const cropWidthPx = (naturalDimensions.width * edits.cropWidth) / 100;
		const cropHeightPx = (naturalDimensions.height * edits.cropHeight) / 100;
		const cropXPx = (naturalDimensions.width * edits.cropX) / 100;
		const cropYPx = (naturalDimensions.height * edits.cropY) / 100;

		// Apply scale to final dimensions
		const finalWidth = cropWidthPx * Math.abs(edits.scaleX);
		const finalHeight = cropHeightPx * Math.abs(edits.scaleY);

		// Set canvas size to scaled and cropped dimensions
		canvas.width = finalWidth;
		canvas.height = finalHeight;

		// Apply filters
		ctx.filter = filterString;

		// Save context state
		ctx.save();

		// Translate to center for rotation
		ctx.translate(canvas.width / 2, canvas.height / 2);

		// Apply rotation
		ctx.rotate((edits.rotation * Math.PI) / 180);
		ctx.scale(edits.flipX ? -1 : 1, edits.flipY ? -1 : 1);

		// Draw image
		ctx.drawImage(
			img,
			cropXPx, cropYPx, cropWidthPx, cropHeightPx,
			-canvas.width / 2, -canvas.height / 2, canvas.width, canvas.height
		);

		ctx.restore();

		// Apply pixelation if needed
		if (edits.pixelate > 0) {
			const pixelSize = Math.max(1, Math.floor(edits.pixelate));
			const scaledWidth = Math.max(1, Math.floor(canvas.width / pixelSize));
			const scaledHeight = Math.max(1, Math.floor(canvas.height / pixelSize));

			// Create temporary canvas for pixelation
			const tempCanvas = document.createElement('canvas');
			tempCanvas.width = scaledWidth;
			tempCanvas.height = scaledHeight;
			const tempCtx = tempCanvas.getContext('2d');
			
			// Disable smoothing for sharp pixels
			tempCtx.imageSmoothingEnabled = false;
			ctx.imageSmoothingEnabled = false;

			// Draw scaled down
			tempCtx.drawImage(canvas, 0, 0, scaledWidth, scaledHeight);

			// Clear and redraw scaled up
			ctx.clearRect(0, 0, canvas.width, canvas.height);
			ctx.drawImage(tempCanvas, 0, 0, canvas.width, canvas.height);
		}

		// Return as blob
		return new Promise((resolve) => {
			canvas.toBlob(resolve, outputFormat, outputQuality);
		});
	};

	// Download edited image
	const downloadImage = async () => {
		const blob = await exportImage();
		if (!blob) return;

		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `${fileName}.${outputFormat.split('/')[1]}`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	};

	// Save handler
	const handleSave = async () => {
		if (!onSave || !imgRef.current || !isLoaded) {
			return;
		}
		
		const blob = await exportImage();
		if (!blob) {
			return;
		}
		
		await onSave({ edits, blob, fileName });
	};

	// Expose save method to parent via ref
	useImperativeHandle(ref, () => ({
		save: handleSave,
		exportImage
	}));

	// Container styles
	const containerStyles = {
		display: 'inline-block',
		position: 'relative',
		overflow: 'visible',
		...(size && SIZE_MAP[size]),
		...(width && { width }),
		...(height && { height }),
		...(minWidth && { minWidth }),
		...(minHeight && { minHeight }),
		...(maxWidth && { maxWidth }),
		...(maxHeight && { maxHeight }),
		...(marginTop && { marginTop: getMargin(marginTop) }),
		...(marginBottom && { marginBottom: getMargin(marginBottom) }),
		...(justifySelf && { justifySelf }),
		...inlineStyle
	};

	const imageStyle = {
		filter: filterString,
		transform: transformString,
		opacity: isLoaded && !imageError ? 1 : 0,
		objectFit: fit,
		width: '100%',
		height: '100%',
		display: 'block',
		transition: 'opacity 0.3s ease',
		transformOrigin: 'center center'
	};

	// Edit controls content for Genie
	const renderEditControls = () => {
		return (
			<Container padding="md">
				{/* Transform Controls - Flip only, rotation and scale handled by drag handles */}
				<Typography variant="h6" size="lg" weight="semibold" marginBottom="md">
					Transform
				</Typography>
				
				<Container layout="flex" marginBottom="md">
					<ButtonGroup spaced selectable={false} justify="start">
						<Button
							icon={edits.flipX ? 'FiCheckSquare' : 'FiSquare'}
							onClick={() => updateEdits({ ...edits, flipX: !edits.flipX })}
							size="sm"
							variant="outlined"
						>
							Flip X
						</Button>
						<Button
							icon={edits.flipY ? 'FiCheckSquare' : 'FiSquare'}
							onClick={() => updateEdits({ ...edits, flipY: !edits.flipY })}
							size="sm"
							variant="outlined"
						>
							Flip Y
						</Button>
					</ButtonGroup>
				</Container>

				{/* Filter Controls */}
				<Typography variant="h6" size="lg" weight="semibold" marginBottom="md">
					Filters
				</Typography>
				
				<Input
					label="Brightness"
					type="range"
					min="0"
					max="200"
					value={edits.brightness}
					onChange={(e) => updateEdits({ ...edits, brightness: parseFloat(e.target.value) })}
					helpText={`${edits.brightness}%`}
					size="sm"
					marginBottom="sm"
				/>
				
				<Input
					label="Contrast"
					type="range"
					min="0"
					max="200"
					value={edits.contrast}
					onChange={(e) => updateEdits({ ...edits, contrast: parseFloat(e.target.value) })}
					helpText={`${edits.contrast}%`}
					size="sm"
					marginBottom="sm"
				/>
				
				<Input
					label="Saturation"
					type="range"
					min="0"
					max="200"
					value={edits.saturation}
					onChange={(e) => updateEdits({ ...edits, saturation: parseFloat(e.target.value) })}
					helpText={`${edits.saturation}%`}
					size="sm"
					marginBottom="sm"
				/>
				
				<Input
					label="Hue"
					type="range"
					min="0"
					max="360"
					value={edits.hue}
					onChange={(e) => updateEdits({ ...edits, hue: parseFloat(e.target.value) })}
					helpText={`${edits.hue}°`}
					size="sm"
					marginBottom="sm"
				/>
				
				<Input
					label="Blur"
					type="range"
					min="0"
					max="20"
					value={edits.blur}
					onChange={(e) => updateEdits({ ...edits, blur: parseFloat(e.target.value) })}
					helpText={`${edits.blur}px`}
					size="sm"
					marginBottom="sm"
				/>
				
				<Input
					label="Grayscale"
					type="range"
					min="0"
					max="100"
					value={edits.grayscale}
					onChange={(e) => updateEdits({ ...edits, grayscale: parseFloat(e.target.value) })}
					helpText={`${edits.grayscale}%`}
					size="sm"
					marginBottom="sm"
				/>
				
				<Input
					label="Sepia"
					type="range"
					min="0"
					max="100"
					value={edits.sepia}
					onChange={(e) => updateEdits({ ...edits, sepia: parseFloat(e.target.value) })}
					helpText={`${edits.sepia}%`}
					size="sm"
					marginBottom="sm"
				/>
				
				<Input
					label="Invert"
					type="range"
					min="0"
					max="100"
					value={edits.invert}
					onChange={(e) => updateEdits({ ...edits, invert: parseFloat(e.target.value) })}
					helpText={`${edits.invert}%`}
					size="sm"
					marginBottom="sm"
				/>
				
				<Input
					label="Pixelate"
					type="range"
					min="0"
					max="50"
					value={edits.pixelate}
					onChange={(e) => updateEdits({ ...edits, pixelate: parseFloat(e.target.value) })}
					helpText={edits.pixelate === 0 ? 'Off' : `${edits.pixelate}px`}
					size="sm"
					marginBottom="md"
				/>

				{/* Crop Toggle */}
				<Typography variant="h6" size="lg" weight="semibold" marginBottom="md">
					Crop
				</Typography>
				
				<Container layout="flex" align="center" justify="space-between" marginBottom="md">
					<Typography size="sm">Enable Crop Mode</Typography>
					<Switch
						checked={cropMode}
						onChange={(e) => setCropMode(e.target.checked)}
						size="sm"
					/>
				</Container>

				{/* Action Buttons */}
				<Container layout="flex" marginTop="lg" style={{ flexWrap: 'wrap' }}>
					<ButtonGroup spaced selectable={false} justify="start">
						<Button
							icon="FiRotateCcw"
							onClick={undo}
							disabled={historyIndex === 0}
							size="sm"
							variant="outlined"
						>
							Undo
						</Button>
						<Button
							icon="FiRotateCw"
							onClick={redo}
							disabled={historyIndex === editHistory.length - 1}
							size="sm"
							variant="outlined"
						>
							Redo
						</Button>
						<Button
							icon="FiRefreshCw"
							onClick={resetEdits}
							size="sm"
							variant="outlined"
						>
							Reset
						</Button>
					</ButtonGroup>
				</Container>

				<Container layout="flex" gap="sm" marginTop="md">
					{onSave && (
						<Button
							icon="FiSave"
							onClick={handleSave}
							size="sm"
							color="primary"
							style={{ flex: 1 }}
						>
							Save to File System
						</Button>
					)}
					{allowDownload && (
						<Button
							icon="FiDownload"
							onClick={downloadImage}
							size="sm"
							variant="outlined"
							style={{ flex: 1 }}
						>
							Download
						</Button>
					)}
				</Container>
			</Container>
		);
	};

	// Loading fallback
	if (!isLoaded && !imageError && loadingFallback) {
		return loadingFallback;
	}

	return (
		<div
			ref={containerRef}
			className={`themed-image ${className}`}
			style={containerStyles}
			data-theme={appliedTheme}
			{...rest}
		>
			{/* Original Image (hidden when pixelated) */}
			<img
				ref={imgRef}
				src={src}
				alt={alt}
				crossOrigin="anonymous"
				style={{
					...imageStyle,
					display: pixelatedSrc ? 'none' : imageStyle.display
				}}
				onLoad={handleImageLoad}
				onError={handleImageError}
				{...imageProps}
			/>
			
			{/* Pixelated Image */}
			{pixelatedSrc && (
				<img
					src={pixelatedSrc}
					alt={alt}
					style={imageStyle}
				/>
			)}
			
			{/* Border with Drag Handles - Only in edit mode when NOT cropping */}
			{editable && isLoaded && !imageError && !cropMode && (
				<div 
					className={`image-edit-border ${isDragging ? 'dragging' : ''}`}
					style={{ 
						transform: transformString,
						'--handle-scale-x': 1 / effectiveScale.scaleX,
						'--handle-scale-y': 1 / effectiveScale.scaleY
					}}
				>
					{/* Rotation Handle - Extended from top edge */}
					<div 
						className="drag-handle rotation-handle"
						onMouseDown={(e) => handleDragStart(e, 'rotate')}
					/>
					
					{/* Rotation connector line */}
					<div className="rotation-connector" />
					
					{/* Corner Handles - For Proportional Resizing */}
					<div 
						className="drag-handle corner-handle top-left"
						onMouseDown={(e) => handleDragStart(e, 'resize-nw')}
					/>
					<div 
						className="drag-handle corner-handle top-right"
						onMouseDown={(e) => handleDragStart(e, 'resize-ne')}
					/>
					<div 
						className="drag-handle corner-handle bottom-left"
						onMouseDown={(e) => handleDragStart(e, 'resize-sw')}
					/>
					<div 
						className="drag-handle corner-handle bottom-right"
						onMouseDown={(e) => handleDragStart(e, 'resize-se')}
					/>
					
					{/* Edge Handles - For Independent Width/Height Resizing */}
					<div 
						className="drag-handle edge-handle top"
						onMouseDown={(e) => handleDragStart(e, 'resize-n')}
					/>
					<div 
						className="drag-handle edge-handle bottom"
						onMouseDown={(e) => handleDragStart(e, 'resize-s')}
					/>
					<div 
						className="drag-handle edge-handle left"
						onMouseDown={(e) => handleDragStart(e, 'resize-w')}
					/>
					<div 
						className="drag-handle edge-handle right"
						onMouseDown={(e) => handleDragStart(e, 'resize-e')}
					/>
				</div>
			)}
			
			{/* Crop Grid Overlay - Only in crop mode */}
			{editable && isLoaded && !imageError && cropMode && (
				<div className="crop-overlay" style={{
					transform: transformString,
					'--handle-scale-x': 1 / effectiveScale.scaleX,
					'--handle-scale-y': 1 / effectiveScale.scaleY
				}}>
					{/* Darkened overlay outside crop area */}
					<div className="crop-overlay-mask">
						<svg width="100%" height="100%">
							<defs>
								<mask id="crop-mask">
									<rect width="100%" height="100%" fill="white"/>
									<rect 
										x={`${edits.cropX}%`} 
										y={`${edits.cropY}%`} 
										width={`${edits.cropWidth}%`} 
										height={`${edits.cropHeight}%`} 
										fill="black"
									/>
								</mask>
							</defs>
							<rect width="100%" height="100%" fill="rgba(0, 0, 0, 0.5)" mask="url(#crop-mask)"/>
						</svg>
					</div>
					
					{/* Crop grid box */}
					<div 
						className="crop-grid"
						style={{
							left: `${edits.cropX}%`,
							top: `${edits.cropY}%`,
							width: `${edits.cropWidth}%`,
							height: `${edits.cropHeight}%`
						}}
						onMouseDown={(e) => {
							if (e.target === e.currentTarget) {
								handleCropDragStart(e, 'crop-move');
							}
						}}
					>
						{/* Grid lines */}
						<div className="crop-grid-line horizontal" style={{ top: '33.33%' }} />
						<div className="crop-grid-line horizontal" style={{ top: '66.66%' }} />
						<div className="crop-grid-line vertical" style={{ left: '33.33%' }} />
						<div className="crop-grid-line vertical" style={{ left: '66.66%' }} />
						
						{/* Corner handles */}
						<div 
							className="crop-handle crop-handle-nw"
							onMouseDown={(e) => handleCropDragStart(e, 'crop-nw')}
							style={{ transform: 'scale(var(--handle-scale-x, 1), var(--handle-scale-y, 1))' }}
						/>
						<div 
							className="crop-handle crop-handle-ne"
							onMouseDown={(e) => handleCropDragStart(e, 'crop-ne')}
							style={{ transform: 'scale(var(--handle-scale-x, 1), var(--handle-scale-y, 1))' }}
						/>
						<div 
							className="crop-handle crop-handle-sw"
							onMouseDown={(e) => handleCropDragStart(e, 'crop-sw')}
							style={{ transform: 'scale(var(--handle-scale-x, 1), var(--handle-scale-y, 1))' }}
						/>
						<div 
							className="crop-handle crop-handle-se"
							onMouseDown={(e) => handleCropDragStart(e, 'crop-se')}
							style={{ transform: 'scale(var(--handle-scale-x, 1), var(--handle-scale-y, 1))' }}
						/>
						
						{/* Edge handles */}
						<div 
							className="crop-handle crop-handle-n"
							onMouseDown={(e) => handleCropDragStart(e, 'crop-n')}
							style={{ transform: 'translateX(-50%) scale(var(--handle-scale-x, 1), var(--handle-scale-y, 1))' }}
						/>
						<div 
							className="crop-handle crop-handle-s"
							onMouseDown={(e) => handleCropDragStart(e, 'crop-s')}
							style={{ transform: 'translateX(-50%) scale(var(--handle-scale-x, 1), var(--handle-scale-y, 1))' }}
						/>
						<div 
							className="crop-handle crop-handle-w"
							onMouseDown={(e) => handleCropDragStart(e, 'crop-w')}
							style={{ transform: 'translateY(-50%) scale(var(--handle-scale-x, 1), var(--handle-scale-y, 1))' }}
						/>
						<div 
							className="crop-handle crop-handle-e"
							onMouseDown={(e) => handleCropDragStart(e, 'crop-e')}
							style={{ transform: 'translateY(-50%) scale(var(--handle-scale-x, 1), var(--handle-scale-y, 1))' }}
						/>
					</div>
				</div>
			)}
			
			{/* Crop action buttons - outside transformed overlay */}
			{editable && isLoaded && !imageError && cropMode && (
				<div className="crop-actions">
					<Button
						icon="FiCheck"
						onClick={applyCrop}
						size="sm"
						color="success"
					>
						Apply Crop
					</Button>
					<Button
						icon="FiX"
						onClick={cancelCrop}
						size="sm"
						variant="outlined"
					>
						Cancel
					</Button>
				</div>
			)}
			
			{/* Error State */}
			{imageError && (
				<Container 
					layout="flex" 
					align="center" 
					justify="center"
					padding="md"
					style={{
						border: '1px solid var(--error-color)',
						color: 'var(--error-color)',
						borderRadius: 'var(--border-radius-md)'
					}}
				>
					<Icon name="FiAlertCircle" size="md" style={{ marginRight: 'var(--spacing-sm)' }} />
					<Typography size="sm">Failed to load image</Typography>
				</Container>
			)}

			{/* Edit Mode FAB with Genie */}
			{editable && isLoaded && !imageError && (
				<FloatingActionButton
					icon="FiEdit2"
					size="md"
					position={controlsPlacement}
					theme={appliedTheme}
					genie={{
						trigger: 'click',
						variant: 'card',
						position: 'auto',
						content: ({ onClose }) => renderEditControls()
					}}
				/>
			)}
		</div>
	);
});

Image.displayName = 'Image';

export default Image;
