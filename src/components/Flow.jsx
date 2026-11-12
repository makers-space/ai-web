/**
 * Flow - Interactive flow diagram component with React Flow
 * 
 * Properly leverages @xyflow/react features:
 * ✓ useNodesState/useEdgesState - Hook-based state management (passed directly to ReactFlow)
 * ✓ useReactFlow - Access flow instance in custom nodes
 * ✓ Handle component - Bidirectional handles (both source & target) on all four sides
 * ✓ Position enum - Proper handle positioning (Top, Left, Right, Bottom)
 * ✓ Custom node types - EditableNode for inline editing with typography controls
 * ✓ Built-in group nodes - Subflow support with parent-child relationships using type: 'group'
 * ✓ Uncontrolled component - Internal state is source of truth
 * ✓ Parent notifications - onChange fires on every state change (notification only, not bidirectional)
 * ✓ addEdge utility - Properly handles new connections
 * ✓ useMemo - Performance optimization for computed values (one-time sanitization)
 * ✓ Panel component available (imported but can be used by consumers)
 * 
 * Features:
 * - Right-click context menu (Genie) for node editing: label, color, shape, type, typography (size/weight/align)
 * - Right-click context menu (Genie) for edge editing: type, color, width, animation, arrows, labels
 * - Ctrl/Cmd+click or Alt+click node creation with editable type
 * - Double-click inline editing on editable nodes
 * - Full bidirectional connectivity (any handle can connect to any other handle)
 * - Subflow support: nodes with type 'group' can contain child nodes using parentId, extent, and expandParent
 * - Theme integration
 * - All React Flow props passthrough
 * 
 * Subflow Usage:
 * - Set node type to 'group' to create a container node (uses React Flow's built-in group styling)
 * - Add parentId to child nodes to nest them inside a group
 * - Use extent: 'parent' to constrain child movement within parent bounds
 * - Set expandParent: true to auto-expand parent when child is dragged to edge
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  Handle,
  Position,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useTheme } from '../contexts/ThemeContext';
import Genie from './Genie';
import { Input } from './Input';
import { Button } from './Button';
import { ButtonGroup } from './ButtonGroup';
import { Container } from './Container';
import { Typography } from './Typography';
import { Select } from './Select';
import { Icon } from './Icon';
import { Card } from './Card';

const DEFAULT_NODE_SHAPE = 'rectangle';
const DEFAULT_NODE_COLOR_TOKEN = 'primary';
const DEFAULT_EDGE_COLOR_TOKEN = 'primary';

const NODE_SHAPE_OPTIONS = [
  { value: 'rectangle', label: 'Rectangle' },
  { value: 'circle', label: 'Circle' },
  { value: 'diamond', label: 'Diamond' },
  { value: 'cylinder', label: 'Cylinder' }
];

const COLOR_VARIANTS = [
  'primary',
  'secondary',
  'tertiary',
  'success',
  'warning',
  'error',
  'neutral',
  'surface',
  'background'
];

const COLOR_OPTIONS = COLOR_VARIANTS.map((variant) => ({
  value: variant,
  label: variant.charAt(0).toUpperCase() + variant.slice(1)
}));

const COLOR_TOKEN_TO_VAR = {
  primary: 'var(--primary-color)',
  secondary: 'var(--secondary-color)',
  tertiary: 'var(--tertiary-color)',
  success: 'var(--success-color)',
  warning: 'var(--warning-color)',
  error: 'var(--error-color)',
  neutral: 'var(--neutral-color, var(--text-muted, #64748b))',
  surface: 'var(--surface-color)',
  background: 'var(--background-color)'
};

const resolveColorToken = (value, fallback = DEFAULT_NODE_COLOR_TOKEN) => {
  if (!value) return fallback;
  const lowered = String(value).trim().toLowerCase();
  return COLOR_VARIANTS.includes(lowered) ? lowered : fallback;
};

const getColorVariable = (token, fallbackToken = DEFAULT_NODE_COLOR_TOKEN) => {
  const target = token && COLOR_TOKEN_TO_VAR[token] ? token : fallbackToken;
  return COLOR_TOKEN_TO_VAR[target] || COLOR_TOKEN_TO_VAR[fallbackToken];
};

const getNodeColorClass = (token) => `flow-node-color-${token}`;
const getEdgeColorClass = (token) => `flow-edge-color-${token}`;

const stripNodeColorStyle = (style = {}) => {
  if (!style) return undefined;
  const cleaned = { ...style };
  delete cleaned.background;
  delete cleaned.color;
  delete cleaned.border;
  delete cleaned['--flow-node-fill'];
  delete cleaned['--flow-node-border'];
  delete cleaned['--flow-node-text'];
  return Object.keys(cleaned).length ? cleaned : undefined;
};

const inferNodeColorToken = (nodeLike) => {
  if (!nodeLike) return DEFAULT_NODE_COLOR_TOKEN;
  return resolveColorToken(nodeLike.data?.color, DEFAULT_NODE_COLOR_TOKEN);
};

const inferEdgeColorToken = (edgeLike) => {
  if (!edgeLike) return DEFAULT_EDGE_COLOR_TOKEN;
  return resolveColorToken(edgeLike.data?.color, DEFAULT_EDGE_COLOR_TOKEN);
};

const withEdgeColorClass = (className, token) => {
  const classes = new Set((className || '').split(' ').filter(Boolean));
  COLOR_VARIANTS.forEach((variant) => classes.delete(getEdgeColorClass(variant)));
  classes.add('flow-edge');
  classes.add(getEdgeColorClass(token));
  return Array.from(classes).join(' ');
};

const buildEdgeStyle = (style = {}, colorToken = DEFAULT_EDGE_COLOR_TOKEN, strokeWidth = style?.strokeWidth ?? 2) => ({
  ...style,
  stroke: getColorVariable(colorToken, DEFAULT_EDGE_COLOR_TOKEN),
  strokeWidth
});

const buildMarkerEnd = (markerEnd, colorToken) => {
  if (!markerEnd) return undefined;
  const base = typeof markerEnd === 'string' ? { type: markerEnd } : { ...markerEnd };
  if (!base.type) return undefined;
  return {
    ...base,
    color: getColorVariable(colorToken, DEFAULT_EDGE_COLOR_TOKEN)
  };
};

const sanitizeNode = (node) => {
  if (!node) return node;
  const colorToken = inferNodeColorToken(node);
  const shape = node.data?.shape || DEFAULT_NODE_SHAPE;
  const cleanedStyle = stripNodeColorStyle(node.style);
  const { style: _prevStyle, ...rest } = node;
  
  // Add class for group nodes to handle coloring
  const isGroup = node.type === 'group';
  const colorClass = isGroup ? getNodeColorClass(colorToken) : '';
  const existingClasses = (node.className || '').split(' ').filter(c => !c.startsWith('flow-node-color-'));
  const className = isGroup ? [...existingClasses, colorClass].join(' ') : node.className;

  return {
    ...rest,
    className,
    data: { ...node.data, color: colorToken, shape },
    ...(cleanedStyle ? { style: cleanedStyle } : {}),
    // Preserve subflow properties
    ...(node.parentId ? { parentId: node.parentId } : {}),
    ...(node.extent ? { extent: node.extent } : {}),
    ...(node.expandParent !== undefined ? { expandParent: node.expandParent } : {})
  };
};

const sanitizeEdge = (edge) => {
  if (!edge) return edge;
  const colorToken = inferEdgeColorToken(edge);
  const strokeWidth = edge.style?.strokeWidth ?? 2;
  return {
    ...edge,
    data: { ...edge.data, color: colorToken },
    className: withEdgeColorClass(edge.className, colorToken),
    style: buildEdgeStyle(edge.style, colorToken, strokeWidth),
    markerEnd: buildMarkerEnd(edge.markerEnd, colorToken)
  };
};

// Custom Node for inline editing with bidirectional handles on all four sides
// Each position has BOTH source and target handles to allow any-to-any connections
const EditableNode = ({ data, id }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [label, setLabel] = useState(data.label);
  const reactFlow = useReactFlow();
  const nodeInstance = reactFlow.getNode ? reactFlow.getNode(id) : null;
  const colorToken = useMemo(() => inferNodeColorToken({ data, style: nodeInstance?.style }), [data, nodeInstance?.style]);
  const shape = data.shape || DEFAULT_NODE_SHAPE;
  
  // Typography props with defaults
  const fontSize = data.fontSize || 'md';
  const fontWeight = data.fontWeight || 'semibold';
  const textAlign = data.textAlign || 'center';

  useEffect(() => {
    setLabel(data.label);
  }, [data.label]);

  const handleDoubleClick = () => setIsEditing(true);

  const handleSave = () => {
    reactFlow.setNodes((nds) =>
      nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, label } } : n))
    );
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      setLabel(data.label);
      setIsEditing(false);
    }
  };

  return (
    <div className="flow-node" onDoubleClick={handleDoubleClick}>
      {/* Bidirectional connection handles on all four sides - each position has both source and target */}
      {/* Source handles can start connections, target handles can receive them */}
      <Handle type="source" position={Position.Top} id="top-source" isConnectableStart={true} isConnectableEnd={false} />
      <Handle type="target" position={Position.Top} id="top-target" isConnectableStart={false} isConnectableEnd={true} />

      <Handle type="source" position={Position.Right} id="right-source" isConnectableStart={true} isConnectableEnd={false} />
      <Handle type="target" position={Position.Right} id="right-target" isConnectableStart={false} isConnectableEnd={true} />

      <Handle type="source" position={Position.Bottom} id="bottom-source" isConnectableStart={true} isConnectableEnd={false} />
      <Handle type="target" position={Position.Bottom} id="bottom-target" isConnectableStart={false} isConnectableEnd={true} />

      <Handle type="source" position={Position.Left} id="left-source" isConnectableStart={true} isConnectableEnd={false} />
      <Handle type="target" position={Position.Left} id="left-target" isConnectableStart={false} isConnectableEnd={true} />

      <div 
        className={`flow-node-surface ${getNodeColorClass(colorToken)}`} 
        data-shape={shape} 
        data-color={colorToken}
        data-font-size={fontSize}
        data-font-weight={fontWeight}
        data-text-align={textAlign}
      >
        <div className="flow-node-geometry" aria-hidden="true" />
        {isEditing ? (
          <input
            className="flow-node-input"
            autoFocus
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
          />
        ) : (
          <span className="flow-node-label">{data.label}</span>
        )}
      </div>
    </div>
  );
};

// Simple GroupNode to render label since native group doesn't render it by default
const GroupNode = ({ data }) => (
  <>{data.label}</>
);

const nodeTypes = {
  editable: EditableNode,
  group: GroupNode
};

export const Flow = ({
  nodes: initialNodes = [],
  edges: initialEdges = [],
  fitView = true,
  fitViewOptions = { padding: 0.2 },
  theme = null,
  className = '',
  size = 'md',
  width = '100%',
  height = null,
  minHeight = '300px',
  style,
  draggable = true,
  connectable = true,
  selectable = true,
  deletable = true,
  zoomable = true,
  pannable = false,
  enableNodeCreation = false,
  nodeCreationKey = 'ctrl',
  defaultNodeData = { label: 'New Node', color: DEFAULT_NODE_COLOR_TOKEN, shape: DEFAULT_NODE_SHAPE },
  defaultNodeStyle = {},
  controls = true,
  minimap = false,
  background = true,
  backgroundVariant = 'dots',
  backgroundGap = 12,
  backgroundSize = 2,
  backgroundProps = {},
  controlsProps = {},
  minimapProps = {},
  onNodeClick,
  onNodeDoubleClick,
  onNodeContextMenu,
  onEdgeClick,
  onConnect: onConnectProp,
  onChange,
  onInit,
  onPaneClick,
  proOptions = { hideAttribution: true },
  connectEdgeOptions = {
    type: 'smoothstep',
    animated: true,
    data: { color: DEFAULT_EDGE_COLOR_TOKEN },
    style: buildEdgeStyle(undefined, DEFAULT_EDGE_COLOR_TOKEN, 2),
    markerEnd: buildMarkerEnd('arrowclosed', DEFAULT_EDGE_COLOR_TOKEN)
  },
  ...reactFlowProps
}) => {
  const { currentTheme } = useTheme();
  const containerRef = useRef(null);
  const anchorRef = useRef(null);
  // Store ReactFlow instance for coordinate transformation in onPaneClick (before hook context available)
  const reactFlowInstanceRef = useRef(null);
  
  // Initialize with sanitized data once on mount
  const sanitizedInitialNodes = useMemo(() => initialNodes.map(sanitizeNode), []);
  const sanitizedInitialEdges = useMemo(() => initialEdges.map(sanitizeEdge), []);
  
  const [nodes, setNodes, onNodesChange] = useNodesState(sanitizedInitialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(sanitizedInitialEdges);
  const [nodeEditor, setNodeEditor] = useState(null);
  const [edgeEditor, setEdgeEditor] = useState(null);
  const edgeAnchorRef = useRef(null);

  const containerStyle = useMemo(() => {
    const sizeMap = { xs: '300px', sm: '400px', md: '500px', lg: '600px', xl: '800px' };
    return {
      width,
      height: height || sizeMap[size] || '500px',
      minHeight,
      ...style
    };
  }, [width, height, size, minHeight, style]);

  // Notify parent of changes
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    onChangeRef.current?.({ nodes, edges });
  }, [nodes, edges]);


  const onConnect = useCallback(
    (params) => {
      // Merge connectEdgeOptions with params, preferring params values
      const mergedEdge = {
        ...connectEdgeOptions,
        ...params,
        data: {
          ...connectEdgeOptions?.data,
          ...params?.data
        },
        style: {
          ...connectEdgeOptions?.style,
          ...params?.style
        },
        className: [connectEdgeOptions?.className, params?.className].filter(Boolean).join(' '),
        markerEnd: params?.markerEnd || connectEdgeOptions?.markerEnd
      };
      
      // Let sanitizeEdge handle all color resolution and theming
      const themedEdge = sanitizeEdge(mergedEdge);

      setEdges((eds) => addEdge(themedEdge, eds));
      onConnectProp?.(params);
    },
    [setEdges, connectEdgeOptions, onConnectProp]
  );

  const getNodeVisualState = useCallback((node) => ({
    color: inferNodeColorToken(node),
    shape: node.data?.shape || DEFAULT_NODE_SHAPE
  }), []);

  const onContextMenu = useCallback((e, node) => {
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    const { color, shape } = getNodeVisualState(node);
    setNodeEditor({
      nodeId: node.id,
      x: rect ? e.clientX - rect.left : e.clientX,
      y: rect ? e.clientY - rect.top : e.clientY,
      label: String(node.data?.label ?? ''),
      color,
      shape,
      fontSize: node.data?.fontSize ?? 'md',
      fontWeight: node.data?.fontWeight ?? 'semibold',
      textAlign: node.data?.textAlign ?? 'center',
      nodeType: node.type ?? 'editable',
      parentId: node.parentId ?? '',
      extent: node.extent ?? ''
    });
    setEdgeEditor(null);
    onNodeContextMenu?.(e, node);
  }, [getNodeVisualState, onNodeContextMenu]);
  
  const onEdgeContextMenuHandler = useCallback((e, edge) => {
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    const color = inferEdgeColorToken(edge);
    setEdgeEditor({
      edgeId: edge.id,
      x: rect ? e.clientX - rect.left : e.clientX,
      y: rect ? e.clientY - rect.top : e.clientY,
      label: String(edge.label ?? ''),
      type: edge.type || 'smoothstep',
      animated: edge.animated ?? true,
      color,
      strokeWidth: edge.style?.strokeWidth || 2,
      markerEnd: edge.markerEnd?.type || 'arrowclosed'
    });
    setNodeEditor(null);
  }, []);
  
  const saveNode = useCallback(() => {
    if (!nodeEditor) return;
    const colorToken = resolveColorToken(nodeEditor.color, DEFAULT_NODE_COLOR_TOKEN);
    const shape = nodeEditor.shape || DEFAULT_NODE_SHAPE;
    const fontSize = nodeEditor.fontSize || 'md';
    const fontWeight = nodeEditor.fontWeight || 'semibold';
    const textAlign = nodeEditor.textAlign || 'center';
    const nodeType = nodeEditor.nodeType || 'editable';
    const parentId = nodeEditor.parentId || undefined;
    const extent = nodeEditor.extent || undefined;

    setNodes((nds) =>
      nds.map((n) => {
        if (n.id !== nodeEditor.nodeId) return n;
        const sanitizedStyle = stripNodeColorStyle(n.style);
        const { style: _omit, ...rest } = n;
        
        // Set default style for group nodes
        const groupStyle = nodeType === 'group' ? {
          ...sanitizedStyle,
          width: sanitizedStyle?.width || 300,
          height: sanitizedStyle?.height || 200
        } : sanitizedStyle;
        
        const isGroup = nodeType === 'group';
        const colorClass = isGroup ? getNodeColorClass(colorToken) : '';
        const existingClasses = (n.className || '').split(' ').filter(c => !c.startsWith('flow-node-color-'));
        const className = isGroup ? [...existingClasses, colorClass].join(' ') : n.className;

        return {
          ...rest,
          type: nodeType,
          className,
          data: { 
            ...n.data, 
            label: nodeEditor.label, 
            shape, 
            color: colorToken,
            fontSize,
            fontWeight,
            textAlign
          },
          ...(groupStyle ? { style: groupStyle } : {}),
          ...(parentId ? { parentId } : {}),
          ...(extent ? { extent } : {}),
          ...(parentId ? { expandParent: true } : {})
        };
      })
    );
    setNodeEditor(null);
  }, [nodeEditor, setNodes]);
  
  const saveEdge = useCallback(() => {
    if (!edgeEditor) return;
    const colorToken = resolveColorToken(edgeEditor.color, DEFAULT_EDGE_COLOR_TOKEN);
    setEdges((eds) =>
      eds.map((e) =>
        e.id === edgeEditor.edgeId
          ? {
              ...e,
              label: edgeEditor.label || undefined,
              type: edgeEditor.type,
              animated: edgeEditor.animated,
              data: { ...e.data, color: colorToken },
              className: withEdgeColorClass(e.className, colorToken),
              style: buildEdgeStyle(e.style, colorToken, edgeEditor.strokeWidth ?? e.style?.strokeWidth ?? 2),
              markerEnd: buildMarkerEnd(edgeEditor.markerEnd, colorToken)
            }
          : e
      )
    );
    setEdgeEditor(null);
  }, [edgeEditor, setEdges]);
  
  const onPaneClickHandler = useCallback((e) => {
    setNodeEditor(null);
    setEdgeEditor(null);
    if (enableNodeCreation) {
      const keyMatch = !nodeCreationKey || nodeCreationKey === 'none' ||
        (nodeCreationKey === 'ctrl' && (e.ctrlKey || e.metaKey)) ||
        (nodeCreationKey === 'alt' && e.altKey);
      
      if (keyMatch) {
        const instance = reactFlowInstanceRef.current;
        let position = null;

        if (instance && typeof instance.screenToFlowPosition === 'function') {
          position = instance.screenToFlowPosition({ x: e.clientX, y: e.clientY });
        } else if (instance && typeof instance.project === 'function') {
          position = instance.project({ x: e.clientX, y: e.clientY });
        }

        if (!position) {
          const bounds = e.currentTarget.getBoundingClientRect();
          position = {
            x: e.clientX - bounds.left,
            y: e.clientY - bounds.top
          };
        }
        
        const shape = defaultNodeData?.shape || DEFAULT_NODE_SHAPE;
        const colorToken = resolveColorToken(defaultNodeData?.color || defaultNodeData?.colorToken, DEFAULT_NODE_COLOR_TOKEN);
        const cleanedStyle = stripNodeColorStyle(defaultNodeStyle);

        setNodes((nds) => {
          const newNode = {
            id: `node-${Date.now()}`,
            type: 'editable',
            position,
            data: { ...defaultNodeData, shape, color: colorToken }
          };
          if (cleanedStyle && Object.keys(cleanedStyle).length) {
            newNode.style = cleanedStyle;
          }
          return [...nds, newNode];
        });
      }
    }
    onPaneClick?.(e);
  }, [enableNodeCreation, nodeCreationKey, defaultNodeData, defaultNodeStyle, setNodes, onPaneClick]);

  const handleInit = useCallback((instance) => {
    reactFlowInstanceRef.current = instance;
    onInit?.(instance);
  }, [onInit]);

  // Screen size detection - Flow only works on larger screens (tablets and above)
  const [isLargeScreen, setIsLargeScreen] = useState(true);
  
  useEffect(() => {
    const checkScreenSize = () => {
      setIsLargeScreen(window.innerWidth >= 768);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);
  
  return (
    <div 
      ref={containerRef}
      className={`flow-container themed-flow flow-${size} ${theme ? `theme-${theme}` : ''} ${className}`.trim()}
      style={containerStyle}
      data-theme={theme || currentTheme}
    >
      {!isLargeScreen ? (
        <Container 
          layout="flex" 
          align="center" 
          justify="center" 
          padding="xl"
          width="100%"
          height="100%"
          minHeight={containerStyle.minHeight}
        >
          <Card 
            padding="xl" 
            layout="flex-column" 
            align="center" 
            justify="center" 
            gap="lg"
            maxWidth="500px"
            backgroundColor="surface"
          >
            <Icon name="FiMonitor" size="xl" color="warning" />
            <Typography variant="h3" size="lg" weight="bold" align="center" color="warning">
              Tablet or Desktop View Required
            </Typography>
            <Typography size="md" align="center" color="muted">
              Flow diagrams are optimized for larger screens and require a tablet or desktop device to view and interact with.
            </Typography>
            <Typography size="sm" align="center" color="muted">
              Please switch to a device with a screen width of at least 768px to view this content.
            </Typography>
            <Container layout="flex" gap="sm" align="center" marginTop="md">
              <Icon name="FiInfo" size="sm" color="primary" />
              <Typography size="xs" color="muted">
                Current screen width: {window.innerWidth}px
              </Typography>
            </Container>
          </Card>
        </Container>
      ) : (
        <>
      <div
        ref={anchorRef}
        style={{
          position: 'absolute',
          left: `${nodeEditor?.x ?? 0}px`,
          top: `${nodeEditor?.y ?? 0}px`,
          width: 0,
          height: 0,
          pointerEvents: 'none'
        }}
      />
      
      <div
        ref={edgeAnchorRef}
        style={{
          position: 'absolute',
          left: `${edgeEditor?.x ?? 0}px`,
          top: `${edgeEditor?.y ?? 0}px`,
          width: 0,
          height: 0,
          pointerEvents: 'none'
        }}
      />

      {/* Node Editor Genie */}
      <Genie visible={Boolean(nodeEditor)} triggerRef={anchorRef} onClose={() => setNodeEditor(null)} variant="menu" animation="scale" layout="flex-column" padding="md" width="280px">
        {nodeEditor?.nodeType === 'group' ? (
          <Container layout="flex-column" gap="sm" padding="none" width="100%">
            <Typography size="sm" weight="semibold">Edit Group</Typography>
            <Typography size="xs">Update group label and background.</Typography>
            <Input 
              label="Label" 
              value={nodeEditor?.label ?? ''} 
              onChange={(e) => setNodeEditor((s) => s ? { ...s, label: e.target.value } : s)} 
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), saveNode())} 
              size="sm" 
              width="100%" 
            />
            <Select
              label="Background Color"
              value={nodeEditor?.color ?? DEFAULT_NODE_COLOR_TOKEN}
              onChange={(value) => setNodeEditor((s) => (s ? { ...s, color: value } : s))}
              size="sm"
              width="100%"
              options={COLOR_OPTIONS}
            />
            <ButtonGroup spaced selectable={false} justify="end">
              <Button size="sm" color="secondary" onClick={() => setNodeEditor(null)}>Cancel</Button>
              <Button size="sm" color="primary" onClick={saveNode}>Save</Button>
            </ButtonGroup>
          </Container>
        ) : (
          <Container layout="flex-column" gap="sm" padding="none" width="100%">
            <Typography size="sm" weight="semibold">Edit Node</Typography>
            <Typography size="xs">Update label, color, and shape. Press Enter to save.</Typography>
            <Input 
              label="Label" 
              value={nodeEditor?.label ?? ''} 
              onChange={(e) => setNodeEditor((s) => s ? { ...s, label: e.target.value } : s)} 
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), saveNode())} 
              size="sm" 
              width="100%" 
            />
            <Select
              label="Color"
              value={nodeEditor?.color ?? DEFAULT_NODE_COLOR_TOKEN}
              onChange={(value) => setNodeEditor((s) => (s ? { ...s, color: value } : s))}
              size="sm"
              width="100%"
              options={COLOR_OPTIONS}
            />
            <Select
              label="Shape"
              value={nodeEditor?.shape ?? DEFAULT_NODE_SHAPE}
              onChange={(value) => setNodeEditor((s) => (s ? { ...s, shape: value } : s))}
              size="sm"
              width="100%"
              options={NODE_SHAPE_OPTIONS}
            />
            <Select
              label="Font Size"
              value={nodeEditor?.fontSize ?? 'md'}
              onChange={(value) => setNodeEditor((s) => (s ? { ...s, fontSize: value } : s))}
              size="sm"
              width="100%"
              options={[
                { value: 'xs', label: 'Extra Small' },
                { value: 'sm', label: 'Small' },
                { value: 'md', label: 'Medium' },
                { value: 'lg', label: 'Large' },
                { value: 'xl', label: 'Extra Large' },
                { value: '2xl', label: '2X Large' }
              ]}
            />
            <Select
              label="Node Type"
              value={nodeEditor?.nodeType ?? 'editable'}
              onChange={(value) => setNodeEditor((s) => (s ? { ...s, nodeType: value } : s))}
              size="sm"
              width="100%"
              options={[
                { value: 'editable', label: 'Editable Node' },
                { value: 'group', label: 'Group (Subflow)' }
              ]}
            />
            <Select
              label="Parent Node (Optional)"
              value={nodeEditor?.parentId ?? ''}
              onChange={(value) => setNodeEditor((s) => (s ? { ...s, parentId: value, extent: value ? 'parent' : undefined } : s))}
              size="sm"
              width="100%"
              options={[
                { value: '', label: 'None (Top Level)' },
                ...(nodes
                  .filter(n => n.id !== nodeEditor?.nodeId && (n.type === 'group' || n.data?.shape === 'group'))
                  .map(n => ({ value: n.id, label: n.data?.label || n.id }))
                )
              ]}
            />
            {nodeEditor?.parentId && (
              <Select
                label="Movement Constraint"
                value={nodeEditor?.extent ?? 'parent'}
                onChange={(value) => setNodeEditor((s) => (s ? { ...s, extent: value } : s))}
                size="sm"
                width="100%"
                options={[
                  { value: 'parent', label: 'Constrained to Parent' },
                  { value: '', label: 'Free Movement' }
                ]}
              />
            )}
            <Select
              label="Font Weight"
              value={nodeEditor?.fontWeight ?? 'semibold'}
              onChange={(value) => setNodeEditor((s) => (s ? { ...s, fontWeight: value } : s))}
              size="sm"
              width="100%"
              options={[
                { value: 'light', label: 'Light' },
                { value: 'normal', label: 'Normal' },
                { value: 'medium', label: 'Medium' },
                { value: 'semibold', label: 'Semibold' },
                { value: 'bold', label: 'Bold' },
                { value: 'extrabold', label: 'Extra Bold' }
              ]}
            />
            <Select
              label="Text Align"
              value={nodeEditor?.textAlign ?? 'center'}
              onChange={(value) => setNodeEditor((s) => (s ? { ...s, textAlign: value } : s))}
              size="sm"
              width="100%"
              options={[
                { value: 'left', label: 'Left' },
                { value: 'center', label: 'Center' },
                { value: 'right', label: 'Right' }
              ]}
            />
            <div className="flow-node-preview">
              <div
                className={`flow-node-surface ${getNodeColorClass(nodeEditor?.color ?? DEFAULT_NODE_COLOR_TOKEN)}`}
                data-shape={nodeEditor?.shape ?? DEFAULT_NODE_SHAPE}
                data-color={nodeEditor?.color ?? DEFAULT_NODE_COLOR_TOKEN}
                data-font-size={nodeEditor?.fontSize ?? 'md'}
                data-font-weight={nodeEditor?.fontWeight ?? 'semibold'}
                data-text-align={nodeEditor?.textAlign ?? 'center'}
              >
                <div className="flow-node-geometry" aria-hidden="true" />
                <span className="flow-node-label">{nodeEditor?.label || 'Preview'}</span>
              </div>
            </div>
            <ButtonGroup spaced selectable={false} justify="end">
              <Button size="sm" color="secondary" onClick={() => setNodeEditor(null)}>Cancel</Button>
              <Button size="sm" color="primary" onClick={saveNode}>Save</Button>
            </ButtonGroup>
          </Container>
        )}
      </Genie>

      {/* Edge Editor Genie */}
      <Genie visible={Boolean(edgeEditor)} triggerRef={edgeAnchorRef} onClose={() => setEdgeEditor(null)} variant="menu" animation="scale" layout="flex-column" padding="md" width="300px">
        <Container layout="flex-column" gap="sm" padding="none" width="100%">
          <Typography size="sm" weight="semibold">Edit Connector</Typography>
          <Typography size="xs">Customize connector appearance and style.</Typography>
          
          <Input 
            label="Label (optional)" 
            value={edgeEditor?.label ?? ''} 
            onChange={(e) => setEdgeEditor((s) => s ? { ...s, label: e.target.value } : s)} 
            size="sm" 
            width="100%" 
            placeholder="Add text label"
          />
          
          <Select 
            label="Connector Type" 
            value={edgeEditor?.type ?? 'smoothstep'}
            onChange={(value) => setEdgeEditor((s) => s ? { ...s, type: value } : s)}
            size="sm"
            width="100%"
            options={[
              { value: 'smoothstep', label: 'Smooth Step' },
              { value: 'straight', label: 'Straight' },
              { value: 'default', label: 'Bezier Curve' },
              { value: 'step', label: 'Step' },
              { value: 'simplebezier', label: 'Simple Bezier' }
            ]}
          />
          
          <Select 
            label="Arrow Style" 
            value={edgeEditor?.markerEnd ?? 'arrowclosed'}
            onChange={(value) => setEdgeEditor((s) => s ? { ...s, markerEnd: value } : s)}
            size="sm"
            width="100%"
            options={[
              { value: 'arrowclosed', label: 'Filled Arrow' },
              { value: 'arrow', label: 'Open Arrow' },
              { value: '', label: 'No Arrow' }
            ]}
          />
          
          <Container layout="flex" gap="sm" padding="none" width="100%">
            <Select
              label="Color"
              value={edgeEditor?.color ?? DEFAULT_EDGE_COLOR_TOKEN}
              onChange={(value) => setEdgeEditor((s) => (s ? { ...s, color: value } : s))}
              size="sm"
              width="50%"
              options={COLOR_OPTIONS}
            />
            <Input 
              type="number" 
              label="Width" 
              value={edgeEditor?.strokeWidth ?? 2} 
              onChange={(e) => setEdgeEditor((s) => s ? { ...s, strokeWidth: parseInt(e.target.value) || 2 } : s)} 
              size="sm" 
              width="50%"
              min="1"
              max="10"
            />
          </Container>
          
          <Container layout="flex" align="center" gap="sm" padding="none" width="100%">
            <input
              type="checkbox"
              id="edge-animated"
              checked={edgeEditor?.animated ?? true}
              onChange={(e) => setEdgeEditor((s) => s ? { ...s, animated: e.target.checked } : s)}
              style={{ width: '16px', height: '16px' }}
            />
            <label htmlFor="edge-animated" style={{ cursor: 'pointer', fontSize: '0.875rem' }}>
              Animated (moving dashes)
            </label>
          </Container>
          
          <div 
            className="flow-edge-preview" 
            style={{ 
              marginTop: '8px',
              padding: '12px',
              borderRadius: '4px',
              background: 'var(--surface-color)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              height: '40px'
            }}
          >
            <svg width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0 }}>
              <line
                x1="10%"
                y1="50%"
                x2="90%"
                y2="50%"
                stroke={getColorVariable(edgeEditor?.color ?? DEFAULT_EDGE_COLOR_TOKEN, DEFAULT_EDGE_COLOR_TOKEN)}
                strokeWidth={edgeEditor?.strokeWidth || 2}
                strokeDasharray={edgeEditor?.animated ? '5,5' : '0'}
                markerEnd={edgeEditor?.markerEnd ? 'url(#preview-arrow)' : ''}
              />
              <defs>
                <marker
                  id="preview-arrow"
                  viewBox="0 0 10 10"
                  refX="9"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto"
                >
                  <path
                    d="M 0 0 L 10 5 L 0 10 z"
                    fill={getColorVariable(edgeEditor?.color ?? DEFAULT_EDGE_COLOR_TOKEN, DEFAULT_EDGE_COLOR_TOKEN)}
                  />
                </marker>
              </defs>
            </svg>
          </div>
          
          <ButtonGroup spaced selectable={false} justify="end">
            <Button size="sm" color="secondary" onClick={() => setEdgeEditor(null)}>Cancel</Button>
            <Button size="sm" color="primary" onClick={saveEdge}>Save</Button>
          </ButtonGroup>
        </Container>
      </Genie>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={connectable ? onConnect : undefined}
        onNodeClick={(e, node) => { setNodeEditor(null); setEdgeEditor(null); onNodeClick?.(e, node); }}
        onNodeDoubleClick={onNodeDoubleClick}
        onNodeContextMenu={onContextMenu}
        onEdgeClick={(e, edge) => { setNodeEditor(null); setEdgeEditor(null); onEdgeClick?.(e, edge); }}
        onEdgeContextMenu={onEdgeContextMenuHandler}
        onPaneClick={onPaneClickHandler}
        nodesDraggable={draggable}
        nodesConnectable={connectable}
        elementsSelectable={selectable}
        deleteKeyCode={deletable ? ['Backspace', 'Delete'] : null}
        zoomOnScroll={zoomable}
        panOnScroll={pannable}
        fitView={fitView}
        fitViewOptions={fitViewOptions}
  proOptions={proOptions}
  onInit={handleInit}
        {...reactFlowProps}
      >
        {background && <Background variant={backgroundVariant} gap={backgroundGap} size={backgroundSize} {...backgroundProps} />}
        {controls && <Controls {...controlsProps} />}
        {minimap && (
          <MiniMap
            zoomable
            pannable
            nodeStrokeWidth={3}
            nodeColor={(n) => getColorVariable(inferNodeColorToken(n))}
            {...minimapProps}
          />
        )}
      </ReactFlow>
      </>
      )}
    </div>
  );
};

export default Flow;
