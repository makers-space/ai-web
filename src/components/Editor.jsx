import React, {
    forwardRef,
    useCallback,
    useEffect,
    useImperativeHandle,
    useMemo,
    useRef,
    useState,
} from 'react';

import {
    BlockTypeSelect,
    BoldItalicUnderlineToggles,
    codeBlockPlugin,
    codeMirrorPlugin,
    CodeToggle,
    CreateLink,
    diffSourcePlugin,
    DiffSourceToggleWrapper,
    headingsPlugin,
    HighlightToggle,
    imagePlugin,
    InsertCodeBlock,
    InsertImage,
    InsertTable,
    InsertThematicBreak,
    linkDialogPlugin,
    linkPlugin,
    listsPlugin,
    ListsToggle,
    MDXEditor,
    markdownSourceEditorValue$,
    quotePlugin,
    realmPlugin,
    Separator,
    StrikeThroughSupSubToggles,
    tablePlugin,
    thematicBreakPlugin,
    toolbarPlugin,
    UndoRedo,
} from '@mdxeditor/editor';

import katex from 'katex';
import 'katex/dist/katex.min.css';
import MonacoEditor, { loader } from '@monaco-editor/react';
import { MonacoBinding } from 'y-monaco';
loader.init(); // pre-warm Monaco bundle

// ---------------------------------------------------------------------------
// Monaco theme helpers — builds a Monaco IStandaloneThemeData from the
// --code-* CSS custom properties each app theme defines on document.body
// (ThemeContext sets the .theme-<name> body class which activates those vars).
// ---------------------------------------------------------------------------
const MONACO_DARK_BASES = new Set(['dark', 'admin', 'pink']);

const _cssVar = (name) => {
    try { return getComputedStyle(document.body).getPropertyValue(name).trim(); }
    catch { return ''; }
};
const _tokenColor  = (name) => { const v = _cssVar(name); return v ? v.replace(/^#/, '') : null; };
const _editorColor = (name) => { const v = _cssVar(name); return v || null; };

const TRANSPARENT = '#00000000';

function buildMonacoTheme(themeName) {
    const base = MONACO_DARK_BASES.has(themeName) ? 'vs-dark' : 'vs';
    const rules = [
        { token: '',                        foreground: _tokenColor('--code-foreground') },
        { token: 'keyword',                 foreground: _tokenColor('--code-keyword'),   fontStyle: 'bold' },
        { token: 'keyword.control',         foreground: _tokenColor('--code-keyword'),   fontStyle: 'bold' },
        { token: 'storage',                 foreground: _tokenColor('--code-keyword'),   fontStyle: 'bold' },
        { token: 'storage.type',            foreground: _tokenColor('--code-keyword'),   fontStyle: 'bold' },
        { token: 'string',                  foreground: _tokenColor('--code-string') },
        { token: 'string.escape',           foreground: _tokenColor('--code-string'),    fontStyle: 'italic' },
        { token: 'string.template',         foreground: _tokenColor('--code-string') },
        { token: 'number',                  foreground: _tokenColor('--code-number') },
        { token: 'number.float',            foreground: _tokenColor('--code-number') },
        { token: 'constant',                foreground: _tokenColor('--code-number') },
        { token: 'constant.numeric',        foreground: _tokenColor('--code-number') },
        { token: 'constant.language',       foreground: _tokenColor('--code-number') },
        { token: 'comment',                 foreground: _tokenColor('--code-comment'),   fontStyle: 'italic' },
        { token: 'comment.block',           foreground: _tokenColor('--code-comment'),   fontStyle: 'italic' },
        { token: 'comment.doc',             foreground: _tokenColor('--code-comment'),   fontStyle: 'italic' },
        { token: 'type',                    foreground: _tokenColor('--code-type') },
        { token: 'type.identifier',         foreground: _tokenColor('--code-type') },
        { token: 'entity.name.type',        foreground: _tokenColor('--code-type') },
        { token: 'entity.name.class',       foreground: _tokenColor('--code-type') },
        { token: 'support.type',            foreground: _tokenColor('--code-type') },
        { token: 'support.class',           foreground: _tokenColor('--code-type') },
        { token: 'entity.name.function',    foreground: _tokenColor('--code-function') },
        { token: 'support.function',        foreground: _tokenColor('--code-function') },
        { token: 'meta.function',           foreground: _tokenColor('--code-function') },
        { token: 'variable',                foreground: _tokenColor('--code-variable') },
        { token: 'variable.other',          foreground: _tokenColor('--code-variable') },
        { token: 'variable.language',       foreground: _tokenColor('--code-keyword') },
        { token: 'variable.parameter',      foreground: _tokenColor('--code-variable') },
        { token: 'operator',                foreground: _tokenColor('--code-operator') },
        { token: 'keyword.operator',        foreground: _tokenColor('--code-operator') },
        { token: 'delimiter',               foreground: _tokenColor('--code-operator') },
        { token: 'delimiter.bracket',       foreground: _tokenColor('--code-operator') },
        { token: 'delimiter.parenthesis',   foreground: _tokenColor('--code-operator') },
        { token: 'punctuation',             foreground: _tokenColor('--code-operator') },
        { token: 'tag',                     foreground: _tokenColor('--code-keyword') },
        { token: 'metatag',                 foreground: _tokenColor('--code-comment') },
        { token: 'attribute.name',          foreground: _tokenColor('--code-function') },
        { token: 'attribute.value',         foreground: _tokenColor('--code-string') },
        { token: 'attribute.name.css',      foreground: _tokenColor('--code-function') },
        { token: 'attribute.value.css',     foreground: _tokenColor('--code-string') },
        { token: 'keyword.css',             foreground: _tokenColor('--code-keyword') },
        { token: 'number.css',              foreground: _tokenColor('--code-number') },
        { token: 'unit.css',                foreground: _tokenColor('--code-type') },
        { token: 'key.json',                foreground: _tokenColor('--code-function') },
        { token: 'string.value.json',       foreground: _tokenColor('--code-string') },
        { token: 'number.json',             foreground: _tokenColor('--code-number') },
        { token: 'keyword.json',            foreground: _tokenColor('--code-keyword') },
        { token: 'regexp',                  foreground: _tokenColor('--code-string') },
        { token: 'regexp.escape',           foreground: _tokenColor('--code-operator'), fontStyle: 'bold' },
        { token: 'annotation',              foreground: _tokenColor('--code-comment'),   fontStyle: 'italic' },
        { token: 'decorator',               foreground: _tokenColor('--code-comment'),   fontStyle: 'italic' },
    ].filter(r => r.foreground != null);

    const rawColors = {
        'editor.background':                    TRANSPARENT,
        'editor.foreground':                    _editorColor('--code-foreground'),
        'editorGutter.background':              TRANSPARENT,
        'editorStickyScroll.background':        _editorColor('--code-background'),
        'editorLineNumber.foreground':          _editorColor('--code-line-number'),
        'editorLineNumber.activeForeground':    _editorColor('--code-cursor'),
        'editor.lineHighlightBackground':       _editorColor('--code-line-highlight'),
        'editor.lineHighlightBorder':           _editorColor('--code-line-highlight'),
        'editor.selectionBackground':           _editorColor('--code-selection'),
        'editor.inactiveSelectionBackground':   _editorColor('--code-selection'),
        'editor.selectionHighlightBackground':  _editorColor('--code-selection'),
        'editorCursor.foreground':              _editorColor('--code-cursor'),
        'editorCursor.background':              _editorColor('--code-background'),
        'editorIndentGuide.background1':        _editorColor('--code-line-number'),
        'editorIndentGuide.activeBackground1':  _editorColor('--code-cursor'),
        'editorBracketMatch.background':        _editorColor('--code-selection'),
        'editorBracketMatch.border':            _editorColor('--code-cursor'),
        'scrollbarSlider.background':           _editorColor('--code-line-number'),
        'scrollbarSlider.hoverBackground':      _editorColor('--code-cursor'),
        'scrollbarSlider.activeBackground':     _editorColor('--code-cursor'),
        'minimap.background':                   TRANSPARENT,
        'editorOverviewRuler.background':       _editorColor('--code-gutter'),
        'minimapSlider.background':             _editorColor('--code-line-number'),
        'editorWidget.background':              _editorColor('--code-gutter'),
        'editorWidget.foreground':              _editorColor('--code-foreground'),
        'editorWidget.border':                  _editorColor('--code-selection'),
        'editorSuggestWidget.background':       _editorColor('--code-gutter'),
        'editorSuggestWidget.foreground':       _editorColor('--code-foreground'),
        'editorSuggestWidget.selectedBackground': _editorColor('--code-selection'),
        'editorSuggestWidget.highlightForeground': _editorColor('--code-cursor'),
        'editorSuggestWidget.border':           _editorColor('--code-selection'),
        'editorFind.background':                _editorColor('--code-gutter'),
        'editorFindMatch.background':           _editorColor('--code-selection'),
        'editorFindMatchHighlight.background':  _editorColor('--code-line-highlight'),
        'editorGroup.border':                   _editorColor('--code-selection'),
        'focusBorder':                          _editorColor('--code-cursor'),
        'input.background':                     _editorColor('--code-background'),
        'input.foreground':                     _editorColor('--code-foreground'),
        'input.border':                         _editorColor('--code-line-number'),
    };
    const colors = Object.fromEntries(Object.entries(rawColors).filter(([, v]) => v));

    return { base, inherit: true, rules, colors };
}

function applyMonacoTheme(monaco, themeName) {
    const id = `app-theme-${themeName}`;
    monaco.editor.defineTheme(id, buildMonacoTheme(themeName));
    monaco.editor.setTheme(id);
}

import { Extension } from '@tiptap/core';
import { useEditor, EditorContent, NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { FontFamily as _FontFamily } from '@tiptap/extension-font-family';

// Canonical font substitutions: Linux/LibreOffice/macOS font names → fonts
// available on Windows (and widely available on all platforms).
const DOCX_FONT_SUBS = {
    // Liberation family (metric-compatible RedHat replacements)
    'Liberation Sans':              'Arial',
    'Liberation Sans Narrow':       'Arial Narrow',
    'Liberation Serif':             'Times New Roman',
    'Liberation Mono':              'Courier New',
    // DejaVu family
    'DejaVu Sans':                  'Verdana',
    'DejaVu Sans Condensed':        'Verdana',
    'DejaVu Sans Mono':             'Courier New',
    'DejaVu Serif':                 'Georgia',
    'DejaVu Serif Condensed':       'Georgia',
    // Nimbus / URW PostScript family
    'Nimbus Sans L':                'Arial',
    'Nimbus Sans':                  'Arial',
    'Nimbus Roman No9 L':           'Times New Roman',
    'Nimbus Roman':                 'Times New Roman',
    'Nimbus Mono L':                'Courier New',
    'Nimbus Mono':                  'Courier New',
    'URW Bookman L':                'Book Antiqua',
    'URW Bookman':                  'Book Antiqua',
    'URW Gothic L':                 'Century Gothic',
    'URW Gothic':                   'Century Gothic',
    'URW Palladio L':               'Palatino Linotype',
    'URW Palladio':                 'Palatino Linotype',
    'URW Chancery L':               'Palatino Linotype',
    // GNU FreeFont
    'FreeSans':                     'Arial',
    'FreeSerif':                    'Times New Roman',
    'FreeMono':                     'Courier New',
    // Bitstream fonts
    'Bitstream Charter':            'Georgia',
    'Bitstream Vera Sans':          'Verdana',
    'Bitstream Vera Sans Mono':     'Courier New',
    'Bitstream Vera Serif':         'Georgia',
    'Charter':                      'Georgia',
    // Linux Libertine / Biolinum (common in academic DOCX)
    'Linux Libertine':              'Times New Roman',
    'Linux Libertine O':            'Times New Roman',
    'Linux Libertine G':            'Times New Roman',
    'Linux Biolinum':               'Arial',
    'Linux Biolinum O':             'Arial',
    'Linux Biolinum G':             'Arial',
    // macOS system fonts that may appear in DOCX from Mac users
    'Helvetica':                    'Arial',
    'Helvetica Neue':               'Arial',
    'Gill Sans':                    'Trebuchet MS',
    'Gill Sans MT':                 'Trebuchet MS',
    'Optima':                       'Segoe UI',
    'Futura':                       'Century Gothic',
    'Hoefler Text':                 'Times New Roman',
    'Lucida Grande':                'Tahoma',
    'Geneva':                       'Verdana',
    'Palatino':                     'Palatino Linotype',
    'New York':                     'Georgia',
    'SF Pro':                       'Segoe UI',
    'SF Pro Text':                  'Segoe UI',
    'SF Pro Display':               'Segoe UI',
    'SF Mono':                      'Courier New',
    'Menlo':                        'Consolas',
    'Monaco':                       'Courier New',
    // Legacy / alternate PostScript names
    'Times':                        'Times New Roman',
    'Courier':                      'Courier New',
    'Arial MT':                     'Arial',
    'Helvetica-Bold':               'Arial',
};

// Weight/style keywords that Word and LibreOffice embed directly in the
// font-family name (e.g. "Montserrat Medium", "Calibri Light").
// Strip them so browsers can match the base typeface.
// "Narrow", "Condensed", "Expanded" are intentionally excluded — those are
// distinct faces with their own metrics (e.g. "Arial Narrow" must stay intact).
const FONT_WEIGHT_SUFFIX_RE = /\s+(Thin|Extra\s?Light|Ultra\s?Light|Light|Regular|Normal|Medium|Semi\s?Bold|Demi\s?Bold|Bold|Extra\s?Bold|Ultra\s?Bold|Black|Heavy)\s*$/i;

const normFont = (raw) => {
    if (!raw) return null;
    const name = raw.split(',')[0].trim().replace(/^["']|["']$/g, '').trim();
    if (!name) return null;
    // Direct substitution first
    if (DOCX_FONT_SUBS[name]) return DOCX_FONT_SUBS[name];
    // Strip weight suffix embedded in the name (e.g. "Montserrat Medium" → "Montserrat")
    const stripped = name.replace(FONT_WEIGHT_SUFFIX_RE, '').trim();
    if (stripped !== name) {
        if (DOCX_FONT_SUBS[stripped]) return DOCX_FONT_SUBS[stripped];
        return stripped;
    }
    return name;
};

// FontFamily extended to normalise substitute font names at parse time.
const FontFamily = _FontFamily.extend({
    addGlobalAttributes() {
        return [{
            types: this.options.types,
            attributes: {
                fontFamily: {
                    default: null,
                    parseHTML: (el) => normFont(el.style.fontFamily) || null,
                    renderHTML: (attrs) => attrs.fontFamily
                        ? { style: `font-family: ${attrs.fontFamily}` } : {},
                },
            },
        }];
    },
});
import { Highlight } from '@tiptap/extension-highlight';
import { Image as TiptapImage } from '@tiptap/extension-image';
import { Link } from '@tiptap/extension-link';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { TextAlign } from '@tiptap/extension-text-align';
import { Underline } from '@tiptap/extension-underline';

const ResizableImageView = ({ node, updateAttributes, selected }) => {
    const { src, alt, title, width, height, float: imgFloat } = node.attrs;
    const imgRef    = useRef(null);
    const dragging  = useRef(null);
    const startDims = useRef({ w: 0, h: 0, x: 0, y: 0 });

    const onMouseDown = (corner) => (e) => {
        e.preventDefault();
        e.stopPropagation();
        const img = imgRef.current;
        if (!img) return;
        dragging.current = corner;
        startDims.current = { w: img.offsetWidth, h: img.offsetHeight, x: e.clientX, y: e.clientY };

        const onMove = (ev) => {
            const dx = ev.clientX - startDims.current.x;
            const shrink = dragging.current === 'sw' || dragging.current === 'nw';
            const newW = Math.max(40, startDims.current.w + (shrink ? -dx : dx));
            updateAttributes({ width: newW, height: Math.round(newW / (startDims.current.w / startDims.current.h)) });
        };

        const onUp = () => {
            dragging.current = null;
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup',   onUp);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup',   onUp);
    };

    const style = {};
    if (width)    style.width  = typeof width === 'number' ? `${width}px` : width;
    if (height)   style.height = typeof height === 'number' ? `${height}px` : height;
    if (imgFloat) style.float  = imgFloat;

    return (
        <NodeViewWrapper as="span" className={`docx-image-wrapper${selected ? ' docx-image-selected' : ''}`} style={{ display: 'inline-block', ...style }}>
            <img
                ref={imgRef}
                src={src}
                alt={alt || ''}
                title={title || ''}
                style={{ width: '100%', height: '100%', display: 'block' }}
                draggable={false}
            />
            {selected && (
                <>
                    <span className="docx-image-handle docx-image-handle-nw" onMouseDown={onMouseDown('nw')} />
                    <span className="docx-image-handle docx-image-handle-ne" onMouseDown={onMouseDown('ne')} />
                    <span className="docx-image-handle docx-image-handle-sw" onMouseDown={onMouseDown('sw')} />
                    <span className="docx-image-handle docx-image-handle-se" onMouseDown={onMouseDown('se')} />
                </>
            )}
        </NodeViewWrapper>
    );
};

const parsePx = (el, attr, style) => {
    const a = el.getAttribute(attr);
    if (a) return parseInt(a, 10) || null;
    const s = el.style[style];
    return (s && s.endsWith('px')) ? parseInt(s, 10) || null : null;
};

const ResizableImage = TiptapImage.extend({
    addAttributes() {
        return {
            ...this.parent?.(),
            width:  { default: null, parseHTML: el => parsePx(el, 'width', 'width'),   renderHTML: a => a.width  ? { width: a.width }   : {} },
            height: { default: null, parseHTML: el => parsePx(el, 'height', 'height'), renderHTML: a => a.height ? { height: a.height } : {} },
            float:  { default: null, parseHTML: el => el.style.float || null,           renderHTML: a => a.float  ? { style: `float: ${a.float}` } : {} },
        };
    },
    addNodeView() { return ReactNodeViewRenderer(ResizableImageView); },
});

const styleAttr = {
    default: null,
    parseHTML: element => element.getAttribute('style') || null,
    renderHTML: attributes => attributes.style ? { style: attributes.style } : {},
};

const StyledTable = Table.extend({
    addAttributes() {
        return {
            ...this.parent?.(),
            style: styleAttr,
        };
    },
});

const StyledTableRow = TableRow.extend({
    addAttributes() {
        return {
            ...this.parent?.(),
            style: styleAttr,
        };
    },
});

const StyledTableCell = TableCell.extend({
    addAttributes() {
        return {
            ...this.parent?.(),
            style: styleAttr,
        };
    },
});

const StyledTableHeader = TableHeader.extend({
    addAttributes() {
        return {
            ...this.parent?.(),
            style: styleAttr,
        };
    },
});

const FontSize = Extension.create({
    name: 'fontSize',
    addGlobalAttributes() {
        return [{
            types: ['textStyle'],
            attributes: {
                fontSize: {
                    default: null,
                    parseHTML: el => el.style.fontSize || null,
                    renderHTML: attrs => {
                        if (!attrs.fontSize) return {};
                        return { style: `font-size: ${attrs.fontSize}` };
                    },
                },
            },
        }];
    },
    addCommands() {
        return {
            setFontSize: size => ({ chain }) =>
                chain().setMark('textStyle', { fontSize: size }).run(),
            unsetFontSize: () => ({ chain }) =>
                chain().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run(),
        };
    },
});

const cssAttr = (prop, cssProp, key) => ({
    default: null,
    parseHTML: el => {
        const raw = el.style[prop];
        // Normalise font substitutes at parse time so stored content always
        // contains a canonical name that the browser can render (e.g. 'Arial'
        // rather than 'Liberation Sans' from LibreOffice-created DOCX files).
        if (prop === 'fontFamily') return normFont(raw) || null;
        return raw || null;
    },
    renderHTML: a => { const v = a[key || prop]; return v ? { style: `${cssProp}: ${v}` } : {}; },
});

const setParaAttr = (attrKey) => (value) => ({ tr, state }) => {
    const { from, to } = state.selection;
    state.doc.nodesBetween(from, to, (node, pos) => {
        if (node.type.name === 'paragraph' || node.type.name === 'heading')
            tr.setNodeMarkup(pos, undefined, { ...node.attrs, [attrKey]: value });
    });
    return true;
};

const ParagraphFormatting = Extension.create({
    name: 'paragraphFormatting',
    addGlobalAttributes() {
        return [{ types: ['paragraph', 'heading'], attributes: {
            marginTop:      cssAttr('marginTop',    'margin-top'),
            marginBottom:   cssAttr('marginBottom', 'margin-bottom'),
            lineHeight:     cssAttr('lineHeight',   'line-height'),
            textIndent:     cssAttr('textIndent',   'text-indent'),
            marginLeft:     cssAttr('marginLeft',   'margin-left'),
            marginRight:    cssAttr('marginRight',  'margin-right'),
            paraFontSize:   cssAttr('fontSize',     'font-size',   'paraFontSize'),
            paraFontFamily: cssAttr('fontFamily',   'font-family', 'paraFontFamily'),
        }}];
    },
    addCommands() {
        return {
            setLineHeight:    setParaAttr('lineHeight'),
            setSpacingBefore: setParaAttr('marginTop'),
            setSpacingAfter:  setParaAttr('marginBottom'),
        };
    },
});

import { ThemeProvider, useTheme } from '../contexts/ThemeContext';
import Button          from './Button';
import Icon            from './Icon';
import Select          from './Select';
import Typography      from './Typography';
import Container       from './Container';
import CircularProgress from './CircularProgress';

const EXT_TO_LANGUAGE = {
    js: 'javascript', jsx: 'javascript', mjs: 'javascript', cjs: 'javascript',
    ts: 'typescript', tsx: 'typescript', mts: 'typescript', cts: 'typescript',
    py: 'python', pyw: 'python',
    rb: 'ruby', rs: 'rust', go: 'go', java: 'java',
    kt: 'kotlin', cs: 'csharp', swift: 'swift', php: 'php',
    cpp: 'cpp', cc: 'cpp', cxx: 'cpp', c: 'c', h: 'c', hpp: 'cpp',
    sh: 'shell', bash: 'shell', zsh: 'shell',
    ps1: 'powershell', psm1: 'powershell',
    bat: 'bat', cmd: 'bat', sql: 'sql',
    html: 'html', htm: 'html', css: 'css', scss: 'scss', less: 'less',
    xml: 'xml', xsl: 'xml', json: 'json', jsonc: 'json',
    yaml: 'yaml', yml: 'yaml', toml: 'ini', ini: 'ini', cfg: 'ini', conf: 'ini',
    md: 'markdown', mdx: 'markdown',
    graphql: 'graphql', gql: 'graphql',
    dockerfile: 'dockerfile', tf: 'hcl', hcl: 'hcl',
    vue: 'html', svelte: 'html', hbs: 'handlebars',
    log: 'plaintext', txt: 'plaintext',
};

function detectLanguage(filePath) {
    if (!filePath) return 'plaintext';
    const name = filePath.split(/[\/\\]/).pop().toLowerCase();
    if (name === 'dockerfile') return 'dockerfile';
    if (name === 'makefile') return 'makefile';
    if (['.gitignore', '.dockerignore', '.env'].includes(name)) return 'ini';
    const ext = name.includes('.') ? name.split('.').pop() : '';
    return EXT_TO_LANGUAGE[ext] || 'plaintext';
}
const CodeEditorInner = forwardRef(({
    content    = '',
    readOnly   = false,
    filePath   = '',
    onChange   = null,
    width      = '100%',
    height     = null,
    minHeight  = '500px',
    // Native YJS collaboration: when ytext is provided, MonacoBinding
    // wires the editor model directly to the shared Y.Text.  In that path
    // `content`/`onChange` are ignored — the binding is the source of truth.
    ytext      = null,
    provider   = null,
}, ref) => {
    const { currentTheme } = useTheme();
    const monacoRef    = useRef(null);
    const editorRef    = useRef(null);
    const bindingRef   = useRef(null);
    const collaborative = !!ytext;

    const language = useMemo(() => detectLanguage(filePath), [filePath]);

    useEffect(() => {
        if (!monacoRef.current) return;
        // Defer by one frame so ThemeContext has flushed the new body class
        // and the --code-* CSS custom properties are live before we read them.
        const raf = requestAnimationFrame(() => {
            applyMonacoTheme(monacoRef.current, currentTheme);
            // Update font to match the new theme's monospace font
            const monoFont = getComputedStyle(document.body).getPropertyValue('--font-family-monospace').trim();
            if (monoFont && editorRef.current) {
                editorRef.current.updateOptions({ fontFamily: monoFont });
            }
        });
        return () => cancelAnimationFrame(raf);
    }, [currentTheme]);

    // Non-collab path: manually sync prop -> editor value.  In the collab
    // path MonacoBinding owns the model and we must NOT setValue() (it
    // would clobber the shared state).
    useEffect(() => {
        if (collaborative) return;
        if (!editorRef.current) return;
        if (content === editorRef.current.getValue()) return;
        const viewState = editorRef.current.saveViewState();
        editorRef.current.setValue(content || '');
        if (viewState) editorRef.current.restoreViewState(viewState);
    }, [content, collaborative]);

    const handleEditorDidMount = useCallback((editor, monaco) => {
        monacoRef.current = monaco;
        editorRef.current = editor;
        applyMonacoTheme(monaco, currentTheme);
        // Apply theme monospace font on mount
        const monoFont = getComputedStyle(document.body).getPropertyValue('--font-family-monospace').trim();
        if (monoFont) editor.updateOptions({ fontFamily: monoFont });

        // Native YJS collaboration via y-monaco.  Binds Monaco's text model
        // directly to the shared Y.Text — multi-user cursors, no manual diffs,
        // no setValue/onChange round-trip, no debounced char-by-char syncing.
        if (collaborative) {
            try {
                const model = editor.getModel();
                if (model) {
                    bindingRef.current = new MonacoBinding(
                        ytext,
                        model,
                        new Set([editor]),
                        provider?.awareness ?? null,
                    );
                }
            } catch (err) {
                // Falling back is not possible from inside the binding —
                // surface so the dev sees the issue and the manual diff
                // bridge can still run via the onChange path next time.
                // eslint-disable-next-line no-console
                console.error('MonacoBinding failed to attach', err);
            }
        }
    }, [currentTheme, collaborative, ytext, provider]);

    // Destroy the YJS binding when the editor unmounts or the ytext changes.
    useEffect(() => () => {
        try { bindingRef.current?.destroy?.(); } catch { /* ignore */ }
        bindingRef.current = null;
    }, [ytext]);

    const changeTimerRef = useRef(null);
    // Non-collab onChange: debounced to avoid hammering the manual diff
    // bridge.  In the collab path MonacoBinding bypasses this entirely.
    const handleChange = useCallback((value) => {
        if (collaborative || !onChange) return;
        clearTimeout(changeTimerRef.current);
        changeTimerRef.current = setTimeout(() => onChange(value), 500);
    }, [onChange, collaborative]);
    useEffect(() => () => clearTimeout(changeTimerRef.current), []);

    useImperativeHandle(ref, () => ({
        getValue: () => editorRef.current?.getValue() || '',
        setValue: (v) => editorRef.current?.setValue(v),
        save:     async () => editorRef.current?.getValue() || '',
        focus:    () => editorRef.current?.focus(),
    }));

    // ── Print support ──────────────────────────────────────────────────────
    // Monaco is canvas/absolute-position based and can't print via CSS.
    // Swap it for a plain <pre> before the print dialog opens, restore after.
    const wrapperRef = useRef(null);
    useEffect(() => {
        const beforePrint = () => {
            if (!wrapperRef.current || !editorRef.current) return;
            const code = editorRef.current.getValue() || '';
            const pre = document.createElement('pre');
            pre.className = 'code-print-fallback';
            pre.textContent = code;
            wrapperRef.current.appendChild(pre);
        };
        const afterPrint = () => {
            if (!wrapperRef.current) return;
            wrapperRef.current.querySelector('.code-print-fallback')?.remove();
        };
        window.addEventListener('beforeprint', beforePrint);
        window.addEventListener('afterprint', afterPrint);
        return () => {
            window.removeEventListener('beforeprint', beforePrint);
            window.removeEventListener('afterprint', afterPrint);
        };
    }, []);

    return (
        <div ref={wrapperRef} className="code-editor-wrapper" style={{ width, height: height || undefined, minHeight }}>
            <div className="code-editor-toolbar">
                <div style={{ flex: 1 }} />
                <Typography size="xs" color="secondary" style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {language}
                </Typography>
            </div>
            <div className="code-editor-content" style={{ minHeight, flex: 1, height: height || minHeight }}>
                <MonacoEditor
                    height="100%"
                    language={language}
                    defaultValue={collaborative ? '' : content}
                    onChange={handleChange}
                    onMount={handleEditorDidMount}
                    options={{
                        readOnly,
                        minimap: { enabled: true },
                        fontSize: 14,
                        fontFamily: getComputedStyle(document.body).getPropertyValue('--font-family-monospace').trim() || 'monospace',
                        lineNumbers: 'on',
                        scrollBeyondLastLine: false,
                        padding: { bottom: 8 },
                        wordWrap: 'on',
                        wrappingIndent: 'indent',
                        automaticLayout: true,
                        tabSize: 2,
                        renderLineHighlight: 'all',
                        bracketPairColorization: { enabled: true },
                    }}
                    loading={
                        <Container layout="flex" align="center" justify="center" minHeight={minHeight}>
                            <Container layout="flex-column" align="center" gap="md">
                                <CircularProgress size="lg" />
                                <Typography>Loading editor…</Typography>
                            </Container>
                        </Container>
                    }
                />
            </div>
        </div>
    );
});
CodeEditorInner.displayName = 'CodeEditorInner';

const ToolbarDivider = () => <span className="docx-toolbar-divider" />;

const RULER_PX_PER_IN = 96;
const RULER_SNAP_PX   = RULER_PX_PER_IN * 0.5;
const RULER_SNAP_THRESHOLD = 7;
const snapMargin = (px) => { const n = Math.round(px / RULER_SNAP_PX) * RULER_SNAP_PX; return Math.abs(px - n) <= RULER_SNAP_THRESHOLD ? n : px; };

const buildRulerTicks = (size, axis) => {
    const ticks = [];
    const prop = axis === 'h' ? 'left' : 'top';
    const [maj, min] = axis === 'h' ? ['docx-ruler-tick docx-ruler-tick-major', 'docx-ruler-tick docx-ruler-tick-minor'] : ['docx-ruler-vtick docx-ruler-vtick-major', 'docx-ruler-vtick docx-ruler-vtick-minor'];
    const mic = axis === 'h' ? 'docx-ruler-tick docx-ruler-tick-micro' : 'docx-ruler-vtick docx-ruler-vtick-micro';
    const lbl = axis === 'h' ? 'docx-ruler-label' : 'docx-ruler-vlabel';
    const total = Math.ceil(size / RULER_PX_PER_IN) + 1;
    for (let i = 0; i <= total; i++) {
        const p = i * RULER_PX_PER_IN;
        if (p > size) break;
        ticks.push(<div key={`maj-${i}`} className={maj} style={{ [prop]: p }}>{i > 0 && <span className={lbl}>{i}</span>}</div>);
        const hp = (i + 0.5) * RULER_PX_PER_IN;
        if (hp < size) ticks.push(<div key={`min-${i}`} className={min} style={{ [prop]: hp }} />);
        for (const q of [0.25, 0.75]) {
            const qp = (i + q) * RULER_PX_PER_IN;
            if (qp < size) ticks.push(<div key={`mic-${i}-${q}`} className={mic} style={{ [prop]: qp }} />);
        }
    }
    return ticks;
};

const DocumentRuler = ({ containerWidth: W, leftMargin: L, rightMargin: R, onMarginChange }) => {
    const dragging  = useRef(null);
    const dragStart = useRef({ x: 0, margin: 0 });
    const onMouseDown = (side) => (e) => {
        e.preventDefault();
        dragging.current = side;
        dragStart.current = { x: e.clientX, margin: side === 'left' ? L : R };
        const max = W / 2 - 20;
        const onMove = (ev) => {
            const raw = dragStart.current.margin + (dragging.current === 'left' ? 1 : -1) * (ev.clientX - dragStart.current.x);
            const val = snapMargin(Math.max(0, Math.min(max, raw)));
            onMarginChange(dragging.current === 'left' ? { left: val, right: R } : { left: L, right: val });
        };
        const onUp = () => { dragging.current = null; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
        window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp);
    };
    return (
        <div className="docx-ruler" style={{ width: W || '100%' }}>
            <div className="docx-ruler-margin-shade" style={{ left: 0, width: L }} />
            <div className="docx-ruler-margin-shade" style={{ right: 0, width: R }} />
            {buildRulerTicks(W, 'h')}
            <div className="docx-ruler-handle" style={{ left: L }} onMouseDown={onMouseDown('left')} title={`Left: ${(L/RULER_PX_PER_IN).toFixed(2)}"`} />
            <div className="docx-ruler-handle" style={{ left: W - R }} onMouseDown={onMouseDown('right')} title={`Right: ${(R/RULER_PX_PER_IN).toFixed(2)}"`} />
        </div>
    );
};

const DocumentRulerVertical = ({ containerHeight: H, topMargin: T, bottomMargin: B, onMarginChange }) => {
    const dragging  = useRef(null);
    const dragStart = useRef({ y: 0, margin: 0 });
    const onMouseDown = (side) => (e) => {
        e.preventDefault();
        dragging.current = side;
        dragStart.current = { y: e.clientY, margin: side === 'top' ? T : B };
        const max = H / 2 - 20;
        const onMove = (ev) => {
            const raw = dragStart.current.margin + (dragging.current === 'top' ? 1 : -1) * (ev.clientY - dragStart.current.y);
            const val = snapMargin(Math.max(0, Math.min(max, raw)));
            onMarginChange(dragging.current === 'top' ? { top: val, bottom: B } : { top: T, bottom: val });
        };
        const onUp = () => { dragging.current = null; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
        window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp);
    };
    return (
        <div className="docx-ruler-vertical" style={{ height: H || '100%' }}>
            <div className="docx-ruler-vmargin-shade" style={{ top: 0, height: T }} />
            <div className="docx-ruler-vmargin-shade" style={{ bottom: 0, height: B }} />
            {buildRulerTicks(H, 'v')}
            <div className="docx-ruler-vhandle" style={{ top: T }} onMouseDown={onMouseDown('top')} title={`Top: ${(T/RULER_PX_PER_IN).toFixed(2)}"`} />
            <div className="docx-ruler-vhandle" style={{ top: H - B }} onMouseDown={onMouseDown('bottom')} title={`Bottom: ${(B/RULER_PX_PER_IN).toFixed(2)}"`} />
        </div>
    );
};

const FONT_SIZES = [
    '8', '9', '10', '11', '12', '13', '14', '15', '16',
    '18', '20', '22', '24', '28', '32', '36', '40', '48',
    '56', '64', '72', '96',
].map(s => ({ value: s, label: s }));

const FONT_FAMILIES = [
    { value: 'Arial', label: 'Arial' },
    { value: 'Calibri', label: 'Calibri' },
    { value: 'Helvetica', label: 'Helvetica' },
    { value: 'Inter', label: 'Inter' },
    { value: 'Lato', label: 'Lato' },
    { value: 'Montserrat', label: 'Montserrat' },
    { value: 'Open Sans', label: 'Open Sans' },
    { value: 'Poppins', label: 'Poppins' },
    { value: 'Raleway', label: 'Raleway' },
    { value: 'Roboto', label: 'Roboto' },
    { value: 'Segoe UI', label: 'Segoe UI' },
    { value: 'Tahoma', label: 'Tahoma' },
    { value: 'Trebuchet MS', label: 'Trebuchet MS' },
    { value: 'Verdana', label: 'Verdana' },
    { value: 'Cambria', label: 'Cambria' },
    { value: 'EB Garamond', label: 'Garamond' },
    { value: 'Georgia', label: 'Georgia' },
    { value: 'Lora', label: 'Lora' },
    { value: 'Merriweather', label: 'Merriweather' },
    { value: 'Playfair Display', label: 'Playfair Display' },
    { value: 'Times New Roman', label: 'Times New Roman' },
    { value: 'Consolas', label: 'Consolas' },
    { value: 'Courier New', label: 'Courier New' },
    { value: 'Fira Code', label: 'Fira Code' },
    { value: 'JetBrains Mono', label: 'JetBrains Mono' },
    { value: 'Source Code Pro', label: 'Source Code Pro' },
];

const PRESET_COLORS = [
    '#000000', '#434343', '#666666', '#999999', '#cccccc', '#ffffff',
    '#e74c3c', '#e67e22', '#f1c40f', '#2ecc71', '#1abc9c', '#3498db',
    '#9b59b6', '#e91e63', '#795548', '#607d8b',
];

const LINE_HEIGHTS = [
    { label: '1.0',  value: '1' },
    { label: '1.15', value: '1.15' },
    { label: '1.5',  value: '1.5' },
    { label: '2.0',  value: '2' },
    { label: '2.5',  value: '2.5' },
    { label: '3.0',  value: '3' },
];

const PARA_SPACINGS = [
    { label: 'None', value: '0px' },
    { label: '4 px', value: '4px' },
    { label: '8 px', value: '8px' },
    { label: '12 px', value: '12px' },
    { label: '16 px', value: '16px' },
    { label: '24 px', value: '24px' },
];

const DocumentToolbar = ({ editor }) => {
    const [linkUrl, setLinkUrl] = useState('');
    const [showLinkInput, setShowLinkInput] = useState(false);
    // Force re-render on every editor transaction (content + selection changes)
    // so font/color pickers always reflect the cursor's current attributes.
    const [, forceUpdate] = useState(0);
    const linkInputRef = useRef(null);
    // Save editor selection before toolbar interactions steal focus.
    // Restored before applying font/color so they always target the right text.
    const savedSelectionRef = useRef(null);

    useEffect(() => {
        if (!editor) return;
        const handler = () => forceUpdate(n => n + 1);
        editor.on('transaction', handler);
        editor.on('selectionUpdate', handler);
        return () => {
            editor.off('transaction', handler);
            editor.off('selectionUpdate', handler);
        };
    }, [editor]);

    if (!editor) return null;

    // TipTap wraps multi-word font names in CSS quotes ("Times New Roman").
    // Strip them so the value matches the plain strings in FONT_FAMILIES.
    // Also fall back to the paragraph-level paraFontFamily attribute (set by
    // ParagraphFormatting) when no inline TextStyle mark carries a font —
    // this covers imported DOCX content where font is on the <p> node not a <span>.
    const rawFont = editor.getAttributes('textStyle').fontFamily
        || editor.getAttributes('paragraph').paraFontFamily
        || editor.getAttributes('heading').paraFontFamily
        || '';
    // Strip any CSS quotes TipTap may wrap around multi-word names.
    // (Parse-time normalization in the FontFamily extension and cssAttr means
    // substitute names like 'Liberation Sans' are already converted to 'Arial'
    // before reaching here — this just strips residual quotes.)
    const currentFont = rawFont.replace(/^["']|["']$/g, '');

    // For font size: prefer the explicit textStyle mark attribute (strip px
    // so the value matches the plain-number option values in FONT_SIZES);
    // fall back to the computed style of the DOM node at the cursor so headings
    // and other size-bearing elements are reflected automatically.
    const rawSize = (editor.getAttributes('textStyle').fontSize || '').replace('px', '');
    let currentSize = rawSize;
    if (!rawSize) {
        try {
            const { from } = editor.state.selection;
            const safePos = Math.min(from, editor.state.doc.content.size - 1);
            const domInfo = editor.view.domAtPos(safePos);
            const domNode = domInfo.node;
            const el = domNode instanceof Element ? domNode : domNode?.parentElement;
            if (el) {
                const computed = parseFloat(window.getComputedStyle(el).fontSize);
                if (!isNaN(computed)) currentSize = `${Math.round(computed)}`;
            }
        } catch (_) { /* ignore — editor may not be mounted yet */ }
    }

    const spacingAttrs = editor.getAttributes('paragraph');
    const currentLH = spacingAttrs.lineHeight ? parseFloat(spacingAttrs.lineHeight).toString() : '';

    const applyLink = () => {
        if (linkUrl) {
            editor.chain().focus().setLink({ href: linkUrl }).run();
        } else {
            editor.chain().focus().unsetLink().run();
        }
        setShowLinkInput(false);
        setLinkUrl('');
    };

    const handleImageInsert = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => {
                editor.chain().focus().setImage({ src: reader.result }).run();
            };
            reader.readAsDataURL(file);
        };
        input.click();
    };

    // Restore a saved ProseMirror selection and re-focus the editor,
    // then run a command — prevents losing cursor when toolbar steals focus.
    const withRestoredSelection = (fn) => {
        if (savedSelectionRef.current) {
            try {
                const tr = editor.state.tr.setSelection(savedSelectionRef.current);
                editor.view.dispatch(tr);
            } catch (_) { /* selection may be stale after edits — ignore */ }
        }
        editor.view.focus();
        fn();
    };

    return (
        <div
            className="docx-editor-toolbar"
            onMouseDown={() => {
                // Snapshot the selection the instant the user starts interacting
                // with the toolbar so we can restore it after the dropdown closes.
                savedSelectionRef.current = editor.view.state.selection;
            }}
        >
            <Button size="xs" color="secondary" className="docx-toolbar-btn"
                disabled={!editor?.can().undo()}
                onClick={() => editor.chain().focus().undo().run()}>
                <Icon name="FiRotateCcw" /> Undo
            </Button>
            <Button size="xs" color="secondary" className="docx-toolbar-btn"
                disabled={!editor?.can().redo()}
                onClick={() => editor.chain().focus().redo().run()}>
                <Icon name="FiRotateCw" /> Redo
            </Button>

            <span className="docx-toolbar-spacer" />

            <Select
                className="docx-font-select"
                size="xs"
                color="secondary"
                variant="outline"
                options={FONT_FAMILIES}
                value={currentFont}
                onChange={(val) => withRestoredSelection(() =>
                        val ? editor.chain().setFontFamily(val).run() : editor.chain().unsetFontFamily().run()
                    )}
                placeholder="Calibri"
                width="200px"
            />

            <Select
                className="docx-font-size-select"
                size="xs"
                color="secondary"
                variant="outline"
                options={FONT_SIZES}
                value={currentSize}
                onChange={(val) => withRestoredSelection(() =>
                        val ? editor.commands.setFontSize(val + 'px') : editor.commands.unsetFontSize()
                    )}
                placeholder="16"
                width="72px"
            />

            <ToolbarDivider />

            <Button size="xs" color="secondary" className="docx-toolbar-btn"
                selected={editor.isActive('bold')}
                onClick={() => editor.chain().focus().toggleBold().run()}>
                <Icon name="FiBold" />
            </Button>
            <Button size="xs" color="secondary" className="docx-toolbar-btn"
                selected={editor.isActive('italic')}
                onClick={() => editor.chain().focus().toggleItalic().run()}>
                <Icon name="FiItalic" />
            </Button>
            <Button size="xs" color="secondary" className="docx-toolbar-btn"
                selected={editor.isActive('underline')}
                onClick={() => editor.chain().focus().toggleUnderline().run()}>
                <Icon name="FiUnderline" />
            </Button>
            <Button size="xs" color="secondary" className="docx-toolbar-btn"
                selected={editor.isActive('strike')}
                onClick={() => editor.chain().focus().toggleStrike().run()}>
                <span style={{ textDecoration: 'line-through', fontSize: '13px', fontWeight: 600 }}>S</span>
            </Button>

            <ToolbarDivider />

            <Button size="xs" color="secondary" className="docx-toolbar-btn"
                selected={editor.isActive('heading', { level: 1 })}
                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
                <span style={{ fontSize: '13px', fontWeight: 700 }}>H1</span>
            </Button>
            <Button size="xs" color="secondary" className="docx-toolbar-btn"
                selected={editor.isActive('heading', { level: 2 })}
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
                <span style={{ fontSize: '12px', fontWeight: 700 }}>H2</span>
            </Button>
            <Button size="xs" color="secondary" className="docx-toolbar-btn"
                selected={editor.isActive('heading', { level: 3 })}
                onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
                <span style={{ fontSize: '11px', fontWeight: 700 }}>H3</span>
            </Button>
            <Button size="xs" color="secondary" className="docx-toolbar-btn"
                selected={editor.isActive('paragraph') && !editor.isActive('heading')}
                onClick={() => editor.chain().focus().setParagraph().run()}>
                <span style={{ fontSize: '13px' }}>¶</span>
            </Button>

            <ToolbarDivider />

            <Button size="xs" color="secondary" className="docx-toolbar-btn"
                selected={editor.isActive({ textAlign: 'left' })}
                onClick={() => editor.chain().focus().setTextAlign('left').run()}>
                <Icon name="FiAlignLeft" />
            </Button>
            <Button size="xs" color="secondary" className="docx-toolbar-btn"
                selected={editor.isActive({ textAlign: 'center' })}
                onClick={() => editor.chain().focus().setTextAlign('center').run()}>
                <Icon name="FiAlignCenter" />
            </Button>
            <Button size="xs" color="secondary" className="docx-toolbar-btn"
                selected={editor.isActive({ textAlign: 'right' })}
                onClick={() => editor.chain().focus().setTextAlign('right').run()}>
                <Icon name="FiAlignRight" />
            </Button>
            <Button size="xs" color="secondary" className="docx-toolbar-btn"
                selected={editor.isActive({ textAlign: 'justify' })}
                onClick={() => editor.chain().focus().setTextAlign('justify').run()}>
                <Icon name="FiAlignJustify" />
            </Button>


            <Button size="xs" color="secondary" className="docx-toolbar-btn"
                genie={{
                    trigger: 'click',
                    variant: 'popover',
                    padding: 'sm',
                    width: '220px',
                    content: (
                        <div className="docx-spacing-panel">
                            <div className="docx-spacing-section">
                                <span className="docx-spacing-label">Line spacing</span>
                                <div className="docx-spacing-options">
                                    {LINE_HEIGHTS.map(lh => (
                                        <button key={lh.value} type="button"
                                            className={`docx-spacing-option${currentLH === lh.value ? ' active' : ''}`}
                                            onClick={() => editor.chain().focus().setLineHeight(lh.value).run()}>
                                            {lh.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="docx-spacing-divider" />
                            <div className="docx-spacing-section">
                                <span className="docx-spacing-label">Space before paragraph</span>
                                <div className="docx-spacing-options">
                                    {PARA_SPACINGS.map(sp => (
                                        <button key={'b-' + sp.value} type="button"
                                            className={`docx-spacing-option${spacingAttrs.marginTop === sp.value ? ' active' : ''}`}
                                            onClick={() => editor.chain().focus().setSpacingBefore(sp.value).run()}>
                                            {sp.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="docx-spacing-divider" />
                            <div className="docx-spacing-section">
                                <span className="docx-spacing-label">Space after paragraph</span>
                                <div className="docx-spacing-options">
                                    {PARA_SPACINGS.map(sp => (
                                        <button key={'a-' + sp.value} type="button"
                                            className={`docx-spacing-option${spacingAttrs.marginBottom === sp.value ? ' active' : ''}`}
                                            onClick={() => editor.chain().focus().setSpacingAfter(sp.value).run()}>
                                            {sp.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ),
                }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <line x1="3" y1="3" x2="13" y2="3" />
                    <line x1="3" y1="8" x2="13" y2="8" />
                    <line x1="3" y1="13" x2="13" y2="13" />
                    <path d="M1 5.5 L1 10.5 M1 5.5 L2.2 6.7 M1 5.5 L-0.2 6.7 M1 10.5 L2.2 9.3 M1 10.5 L-0.2 9.3" strokeWidth="1.2" />
                </svg>
            </Button>

            <ToolbarDivider />

            <Button size="xs" color="secondary" className="docx-toolbar-btn"
                selected={editor.isActive('bulletList')}
                onClick={() => editor.chain().focus().toggleBulletList().run()}>
                <Icon name="FiList" />
            </Button>
            <Button size="xs" color="secondary" className="docx-toolbar-btn"
                selected={editor.isActive('orderedList')}
                onClick={() => editor.chain().focus().toggleOrderedList().run()}>
                <span style={{ fontSize: '12px', fontWeight: 600 }}>1.</span>
            </Button>

            <ToolbarDivider />

            <Button size="xs" color="secondary" className="docx-toolbar-btn"
                selected={editor.isActive('blockquote')}
                onClick={() => editor.chain().focus().toggleBlockquote().run()}>
                <Icon name="FiMessageSquare" />
            </Button>
            <Button size="xs" color="secondary" className="docx-toolbar-btn"
                onClick={() => editor.chain().focus().setHorizontalRule().run()}>
                <Icon name="FiMinus" />
            </Button>
            <Button size="xs" color="secondary" className="docx-toolbar-btn"
                selected={editor.isActive('codeBlock')}
                onClick={() => editor.chain().focus().toggleCodeBlock().run()}>
                <Icon name="FiCode" />
            </Button>

            <ToolbarDivider />

            <div style={{ position: 'relative', display: 'inline-flex' }}>
                <Button size="xs" color="secondary" className="docx-toolbar-btn"
                    selected={editor.isActive('link')}
                    onClick={() => {
                        if (editor.isActive('link')) {
                            editor.chain().focus().unsetLink().run();
                        } else {
                            const prev = editor.getAttributes('link').href || '';
                            setLinkUrl(prev);
                            setShowLinkInput(!showLinkInput);
                        }
                    }}>
                    <Icon name="FiLink" />
                </Button>
                {showLinkInput && (
                    <div className="docx-toolbar-popup">
                        <input
                            ref={linkInputRef}
                            type="url"
                            placeholder="https://..."
                            value={linkUrl}
                            onChange={(e) => setLinkUrl(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') applyLink(); if (e.key === 'Escape') setShowLinkInput(false); }}
                            autoFocus
                        />
                        <Button size="xs" color="primary" onClick={applyLink}>
                            <Icon name="FiCheck" />
                        </Button>
                        <Button size="xs" color="secondary" onClick={() => setShowLinkInput(false)}>
                            <Icon name="FiX" />
                        </Button>
                    </div>
                )}
            </div>

            <Button size="xs" color="secondary" className="docx-toolbar-btn"
                onClick={handleImageInsert}>
                <Icon name="FiImage" />
            </Button>

            <Button size="xs" color="secondary" className="docx-toolbar-btn"
                selected={editor.isActive('table')}
                genie={{
                    trigger: 'click',
                    variant: 'popover',
                    padding: 'sm',
                    content: (() => {
                        const inTable = editor.isActive('table');
                        const cellAttrs = inTable ? editor.getAttributes('tableCell') : {};
                        const cellBg = (() => {
                            const m = (cellAttrs.style || '').match(/background-color:\s*([^;]+)/i);
                            return m ? m[1].trim() : '';
                        })();
                        const setCellBg = (color) => {
                            // Merge background-color into the cell/header style attribute
                            // without clobbering other inline styles the user may have set.
                            const apply = (typeName) => {
                                const current = editor.getAttributes(typeName).style || '';
                                const stripped = current
                                    .split(';')
                                    .map(s => s.trim())
                                    .filter(s => s && !/^background-color\s*:/i.test(s))
                                    .join('; ');
                                const next = color
                                    ? `${stripped ? stripped + '; ' : ''}background-color: ${color}`
                                    : stripped;
                                editor.chain().focus().updateAttributes(typeName, { style: next || null }).run();
                            };
                            apply('tableCell');
                            apply('tableHeader');
                        };
                        const CELL_COLORS = ['#fef08a', '#bbf7d0', '#bfdbfe', '#fbcfe8', '#fed7aa', '#e9d5ff', '#fecaca', '#374151'];
                        return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '180px' }}>
                                <Button size="xs" color="secondary"
                                    onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>
                                    <Icon name="FiGrid" size="xs" /> Insert table
                                </Button>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                                    <Button size="xs" color="secondary" disabled={!inTable}
                                        onClick={() => editor.chain().focus().addColumnBefore().run()}>
                                        <Icon name="FiChevronsLeft" size="xs" /> Col before
                                    </Button>
                                    <Button size="xs" color="secondary" disabled={!inTable}
                                        onClick={() => editor.chain().focus().addColumnAfter().run()}>
                                        Col after <Icon name="FiChevronsRight" size="xs" />
                                    </Button>
                                    <Button size="xs" color="secondary" disabled={!inTable}
                                        onClick={() => editor.chain().focus().addRowBefore().run()}>
                                        <Icon name="FiChevronsUp" size="xs" /> Row before
                                    </Button>
                                    <Button size="xs" color="secondary" disabled={!inTable}
                                        onClick={() => editor.chain().focus().addRowAfter().run()}>
                                        <Icon name="FiChevronsDown" size="xs" /> Row after
                                    </Button>
                                    <Button size="xs" color="error" disabled={!inTable}
                                        onClick={() => editor.chain().focus().deleteColumn().run()}>
                                        <Icon name="FiMinusSquare" size="xs" /> Del col
                                    </Button>
                                    <Button size="xs" color="error" disabled={!inTable}
                                        onClick={() => editor.chain().focus().deleteRow().run()}>
                                        <Icon name="FiMinusSquare" size="xs" /> Del row
                                    </Button>
                                </div>
                                <Button size="xs" color="secondary" disabled={!inTable}
                                    onClick={() => editor.chain().focus().toggleHeaderRow().run()}>
                                    <Icon name="FiColumns" size="xs" /> Toggle header row
                                </Button>
                                <Button size="xs" color="secondary" disabled={!inTable}
                                    onClick={() => editor.chain().focus().toggleHeaderColumn().run()}>
                                    <Icon name="FiColumns" size="xs" /> Toggle header col
                                </Button>
                                <Button size="xs" color="secondary" disabled={!inTable}
                                    onClick={() => editor.chain().focus().mergeOrSplit().run()}>
                                    <Icon name="FiMaximize2" size="xs" /> Merge / split
                                </Button>
                                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '6px' }}>
                                    <div style={{ fontSize: '11px', opacity: 0.7, marginBottom: '4px' }}>Cell background</div>
                                    <div className="docx-color-grid">
                                        {CELL_COLORS.map((c) => (
                                            <button key={c} type="button" className="docx-color-swatch"
                                                style={{ background: c, outline: cellBg.toLowerCase() === c.toLowerCase() ? '2px solid var(--primary-color)' : 'none' }}
                                                title={c} disabled={!inTable}
                                                onClick={() => setCellBg(c)} />
                                        ))}
                                        <label className="docx-color-swatch docx-color-custom" title="Custom cell color">
                                            <Icon name="FiDroplet" size="xs" />
                                            <input type="color"
                                                value={/^#[0-9a-f]{6}$/i.test(cellBg) ? cellBg : '#374151'}
                                                disabled={!inTable}
                                                onChange={(e) => setCellBg(e.target.value)}
                                            />
                                        </label>
                                        <button type="button" className="docx-color-swatch docx-color-reset"
                                            title="Clear cell color" disabled={!inTable}
                                            onClick={() => setCellBg('')}>
                                            <Icon name="FiX" size="xs" />
                                        </button>
                                    </div>
                                </div>
                                <Button size="xs" color="error" disabled={!inTable}
                                    onClick={() => editor.chain().focus().deleteTable().run()}>
                                    <Icon name="FiTrash2" size="xs" /> Delete table
                                </Button>
                            </div>
                        );
                    })(),
                }}>
                <Icon name="FiGrid" />
            </Button>

            <ToolbarDivider />

            <Button size="xs" color="secondary" className="docx-toolbar-btn"
                genie={{
                    trigger: 'click',
                    variant: 'popover',
                    padding: 'sm',
                    content: (
                        <div className="docx-color-grid">
                            {PRESET_COLORS.map((c) => (
                                <button key={c} type="button" className="docx-color-swatch"
                                    style={{ background: c }}
                                    title={c}
                                    onClick={() => { editor.chain().focus().setColor(c).run(); }} />
                            ))}
                            <label className="docx-color-swatch docx-color-custom" title="Custom color">
                                <Icon name="FiDroplet" size="xs" />
                                <input type="color"
                                    value={editor.getAttributes('textStyle').color || '#000000'}
                                    onChange={(e) => { editor.chain().focus().setColor(e.target.value).run(); }}
                                />
                            </label>
                            <button type="button" className="docx-color-swatch docx-color-reset"
                                title="Remove color"
                                onClick={() => { editor.chain().focus().unsetColor().run(); }}>
                                <Icon name="FiX" size="xs" />
                            </button>
                        </div>
                    ),
                }}>
                <span style={{
                    fontSize: '14px', fontWeight: 700, borderBottom: '3px solid',
                    borderColor: editor.getAttributes('textStyle').color || 'var(--text-color)',
                    lineHeight: 1, paddingBottom: '1px',
                }}>A</span>
            </Button>

            <Button size="xs" color="secondary" className="docx-toolbar-btn"
                selected={editor.isActive('highlight')}
                genie={{
                    trigger: 'click',
                    variant: 'popover',
                    padding: 'sm',
                    content: (
                        <div className="docx-color-grid">
                            {['#fef08a', '#bbf7d0', '#bfdbfe', '#fbcfe8', '#fed7aa', '#e9d5ff', '#fecaca', '#d1d5db'].map((c) => (
                                <button key={c} type="button" className="docx-color-swatch"
                                    style={{ background: c }}
                                    title={c}
                                    onClick={() => { editor.chain().focus().toggleHighlight({ color: c }).run(); }} />
                            ))}
                            <label className="docx-color-swatch docx-color-custom" title="Custom highlight">
                                <Icon name="FiDroplet" size="xs" />
                                <input type="color"
                                    value={editor.getAttributes('highlight').color || '#fef08a'}
                                    onChange={(e) => { editor.chain().focus().toggleHighlight({ color: e.target.value }).run(); }}
                                />
                            </label>
                            <button type="button" className="docx-color-swatch docx-color-reset"
                                title="Remove highlight"
                                onClick={() => { editor.chain().focus().unsetHighlight().run(); }}>
                                <Icon name="FiX" size="xs" />
                            </button>
                        </div>
                    ),
                }}>
                <span style={{
                    fontSize: '13px', fontWeight: 700,
                    background: editor.getAttributes('highlight').color || '#fef08a',
                    padding: '0 3px', borderRadius: '2px',
                }}>H</span>
            </Button>
        </div>
    );
};

// Strip leading empty <p> elements that Word uses as spacing artefacts.
const stripLeadingEmptyParas = (html) => {
    if (!html) return html;
    return html.replace(/^(\s*<p[^>]*>\s*(<br\s*\/?>)?\s*<\/p>)+/, '').trim();
};

const DocumentEditorInner = forwardRef(({
    content    = '',
    readOnly   = false,
    onChange   = null,
    placeholder = 'Start writing…',
    width      = '100%',
    height     = null,
    minHeight  = '500px',
    onFocus    = null,
    onBlur     = null,
    filePath   = '',
}, ref) => {
    const { currentTheme } = useTheme();
    const changeTimerRef = useRef(null);

    const contentAreaRef                      = useRef(null);
    const [containerWidth,  setContainerWidth]  = useState(0);
    const [containerHeight, setContainerHeight] = useState(0);
    const [leftMargin,   setLeftMargin]   = useState(96);
    const [rightMargin,  setRightMargin]  = useState(96);
    const [topMargin,    setTopMargin]    = useState(24);
    const [bottomMargin, setBottomMargin] = useState(24);

    useEffect(() => {
        const el = contentAreaRef.current;
        if (!el) return;
        const ro = new ResizeObserver(([entry]) => {
            setContainerWidth(entry.contentRect.width);
            setContainerHeight(entry.contentRect.height);
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    const handleMarginChange = useCallback(({ left, right }) => {
        setLeftMargin(left);
        setRightMargin(right);
    }, []);

    const handleVMarginChange = useCallback(({ top, bottom }) => {
        setTopMargin(top);
        setBottomMargin(bottom);
    }, []);

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: { levels: [1, 2, 3] },
                link: false,
                underline: false,
            }),
            TextStyle,
            Color,
            FontFamily,
            FontSize,
            ParagraphFormatting,
            Highlight.configure({ multicolor: true }),
            ResizableImage.configure({ allowBase64: true, inline: true }),
            Link.configure({
                openOnClick: false,
                autolink: true,
                HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer' },
            }),
            StyledTable.configure({ resizable: true }),
            StyledTableRow,
            StyledTableCell,
            StyledTableHeader,
            TextAlign.configure({ types: ['heading', 'paragraph'] }),
            Underline,
        ],
        content: stripLeadingEmptyParas(content) || '',
        editable: !readOnly,
        onUpdate: ({ editor: ed, transaction }) => {
            if (!onChange) return;
            // Critical: TipTap's setEditable() and other state-only operations
            // dispatch transactions that fire `update` but do NOT change the doc.
            // Without this guard, every setEditable call (mount + readOnly changes)
            // would push the editor's normalized HTML into ytext, corrupting it.
            if (!transaction?.docChanged) return;
            clearTimeout(changeTimerRef.current);
            changeTimerRef.current = setTimeout(() => onChange(ed.getHTML()), 300);
        },
        onFocus: ({ editor: ed, event }) => onFocus?.(ed, event),
        onBlur:  ({ editor: ed, event }) => onBlur?.(ed, event),
    });

    useEffect(() => {
        if (editor) editor.setEditable(!readOnly);
    }, [editor, readOnly]);

    // Sync external content changes; skip first run (useEditor already loaded it).
    // Deferred via queueMicrotask to avoid flushSync during React commit.
    const lastSetContentRef = useRef(null);
    useEffect(() => {
        if (!editor) return;
        const normalized = stripLeadingEmptyParas(content) || '';
        if (lastSetContentRef.current === null) {
            lastSetContentRef.current = normalized;
            return;
        }
        if (normalized === lastSetContentRef.current) return;
        lastSetContentRef.current = normalized;
        queueMicrotask(() => {
            if (!editor.isDestroyed) {
                const { from, to } = editor.state.selection;
                // TipTap v3: setContent(content, options) — second arg MUST be an object.
                // Passing `false` is ignored and emitUpdate defaults to true, which would
                // fire onUpdate → debounced onChange → push editor's normalized HTML back into
                // ytext, causing content duplication on every server-driven content swap.
                editor.commands.setContent(normalized, { emitUpdate: false });
                const maxPos = editor.state.doc.content.size;
                try {
                    editor.commands.setTextSelection({
                        from: Math.min(from, maxPos),
                        to:   Math.min(to,   maxPos),
                    });
                } catch { /* ignore if pos is no longer valid */ }
            }
        });
    }, [content, editor]);

    useEffect(() => () => clearTimeout(changeTimerRef.current), []);

    useImperativeHandle(ref, () => ({
        getHTML:  () => editor?.getHTML() || '',
        setHTML:  (html) => editor?.commands.setContent(html || '', { emitUpdate: false }),
        getJSON:  () => editor?.getJSON(),
        save:     async () => editor?.getHTML() || '',
        focus:    () => editor?.commands.focus(),
        getEditor: () => editor,
    }));

    return (
        <div
            className={`docx-editor-wrapper docx-editor-${currentTheme}`}
            style={{
                width,
                height:    height || undefined,
                minHeight,
                '--doc-left-margin':   `${leftMargin}px`,
                '--doc-right-margin':  `${rightMargin}px`,
                '--doc-top-margin':    `${topMargin}px`,
                '--doc-bottom-margin': `${bottomMargin}px`,
            }}
        >
            {!readOnly && <DocumentToolbar editor={editor} />}
            {!readOnly && (
                <div className="docx-rulers-row">
                    <div className="docx-ruler-corner" />
                    <DocumentRuler
                        containerWidth={containerWidth}
                        leftMargin={leftMargin}
                        rightMargin={rightMargin}
                        onMarginChange={handleMarginChange}
                    />
                </div>
            )}
            <div className="docx-content-row">
                {!readOnly && (
                    <DocumentRulerVertical
                        containerHeight={containerHeight}
                        topMargin={topMargin}
                        bottomMargin={bottomMargin}
                        onMarginChange={handleVMarginChange}
                    />
                )}
                <div ref={contentAreaRef} className="docx-editor-content" style={{ minHeight, flex: 1 }}>
                    <EditorContent
                        editor={editor}
                        className="docx-editor-prosemirror"
                    />
                </div>
            </div>
        </div>
    );
});
DocumentEditorInner.displayName = 'DocumentEditorInner';

export const Editor = forwardRef(({
    mode = 'markdown',

    // shared
    className    = '',
    readOnly     = false,
    width        = null,
    height       = null,
    minHeight    = null,
    maxWidth     = null,
    maxHeight    = null,
    minWidth     = null,
    marginTop    = null,
    marginBottom = null,
    justifySelf  = null,
    theme        = null,
    onError      = null,

    // markdown props
    onChange           = null,
    placeholder        = 'Start writing...',
    autoFocus          = false,
    content            = '',
    showParseErrors    = true,
    diffContent        = '',
    contentClassName   = '',
    showToolbar        = true,
    customToolbar      = null,
    toolbarPosition    = 'top',
    imageUploadHandler = null,
    onFocus            = null,
    onBlur             = null,
    onKeyDown          = null,

    // code props
    filePath     = '',

    // Native YJS collaboration (currently wired for code mode via y-monaco).
    // When provided, the editor binds Monaco's model directly to the shared
    // Y.Text — no setValue, no debounced onChange diff bridge.
    ytext        = null,
    provider     = null,

    ...props
}, ref) => {
    if (mode === 'code') {
        return (
            <CodeEditorInner
                ref={ref}
                content={content}
                readOnly={readOnly}
                filePath={filePath}
                onChange={onChange}
                width={width || '100%'}
                height={height}
                minHeight={minHeight || '500px'}
                ytext={ytext}
                provider={provider}
            />
        );
    }

    if (mode === 'document') {
        return (
            <DocumentEditorInner
                ref={ref}
                content={content}
                readOnly={readOnly}
                onChange={onChange}
                placeholder={placeholder}
                width={width || '100%'}
                height={height}
                minHeight={minHeight || '500px'}
                onFocus={onFocus}
                onBlur={onBlur}
            />
        );
    }

    return (
        <MarkdownEditorInner
            ref={ref}
            className={className}
            onChange={onChange}
            placeholder={placeholder}
            readOnly={readOnly}
            autoFocus={autoFocus}
            content={content}
            showParseErrors={showParseErrors}
            diffContent={diffContent}
            theme={theme}
            contentClassName={contentClassName}
            width={width}
            height={height}
            minHeight={minHeight}
            maxWidth={maxWidth}
            maxHeight={maxHeight}
            minWidth={minWidth}
            marginTop={marginTop}
            marginBottom={marginBottom}
            justifySelf={justifySelf}
            showToolbar={showToolbar}
            customToolbar={customToolbar}
            toolbarPosition={toolbarPosition}
            imageUploadHandler={imageUploadHandler}
            onFocus={onFocus}
            onBlur={onBlur}
            onKeyDown={onKeyDown}
            onError={onError}
            {...props}
        />
    );
});
Editor.displayName = 'Editor';

export default Editor;

// ── Emoji shortcode → unicode map ──────────────────────────────────────────
const EMOJI_MAP = {
  // Faces & emotions
  smile: '😄', grin: '😁', joy: '😂', rofl: '🤣', blush: '😊',
  heart_eyes: '😍', kissing_heart: '😘', wink: '😉', stuck_out_tongue: '😛',
  thinking: '🤔', smirk: '😏', neutral_face: '😐', unamused: '😒',
  roll_eyes: '🙄', flushed: '😳', weary: '😩', sob: '😭', cry: '😢',
  angry: '😠', rage: '😡', scream: '😱', skull: '💀', ghost: '👻',
  sunglasses: '😎', nerd_face: '🤓', sleeping: '😴', mask: '😷',
  sweat: '😓', sweat_smile: '😅', innocent: '😇', clown_face: '🤡',
  robot: '🤖', cowboy_hat_face: '🤠', partying_face: '🥳', monocle_face: '🧐',
  // Hands & gestures
  wave: '👋', '+1': '👍', thumbsup: '👍', '-1': '👎', thumbsdown: '👎',
  clap: '👏', raised_hands: '🙌', pray: '🙏', muscle: '💪', v: '✌️',
  ok_hand: '👌', point_right: '👉', point_left: '👈', point_up: '☝️',
  point_down: '👇', crossed_fingers: '🤞', handshake: '🤝', writing_hand: '✍️',
  // Hearts & love
  heart: '❤️', orange_heart: '🧡', yellow_heart: '💛', green_heart: '💚',
  blue_heart: '💙', purple_heart: '💜', black_heart: '🖤', broken_heart: '💔',
  sparkling_heart: '💖', two_hearts: '💕', revolving_hearts: '💞',
  // Stars, fire & celebration
  fire: '🔥', star: '⭐', star2: '🌟', sparkles: '✨', zap: '⚡',
  tada: '🎉', confetti_ball: '🎊', balloon: '🎈', gift: '🎁', trophy: '🏆',
  // Symbols & status
  checkmark: '✅', x: '❌', warning: '⚠️', question: '❓', exclamation: '❗',
  check: '✔️', copyright: '©️', registered: '®️', tm: '™️', recycle: '♻️',
  '100': '💯', sos: '🆘', new: '🆕', ok: '🆗', up: '🆙', cool: '🆒',
  // Nature & weather
  sunny: '☀️', cloud: '☁️', rainbow: '🌈', snowflake: '❄️', umbrella: '☂️',
  ocean: '🌊', droplet: '💧', seedling: '🌱', rose: '🌹', cherry_blossom: '🌸',
  sunflower: '🌻', four_leaf_clover: '🍀', maple_leaf: '🍁', mushroom: '🍄',
  // Animals
  dog: '🐶', cat: '🐱', bear: '🐻', panda_face: '🐼', fox_face: '🦊',
  lion: '🦁', unicorn: '🦄', penguin: '🐧', bird: '🐦', frog: '🐸',
  snake: '🐍', bug: '🐛', bee: '🐝', butterfly: '🦋', fish: '🐟',
  whale: '🐳', octopus: '🐙', turtle: '🐢', rabbit: '🐰', pig: '🐷',
  // Food & drink
  pizza: '🍕', hamburger: '🍔', fries: '🍟', hotdog: '🌭', taco: '🌮',
  sushi: '🍣', ramen: '🍜', ice_cream: '🍦', cake: '🎂', cookie: '🍪',
  doughnut: '🍩', candy: '🍬', chocolate_bar: '🍫', apple: '🍎',
  banana: '🍌', grapes: '🍇', strawberry: '🍓', coffee: '☕', tea: '🍵',
  beer: '🍺', wine_glass: '🍷', champagne: '🍾',
  // Tech & objects
  computer: '💻', iphone: '📱', camera: '📷', email: '📧', mailbox: '📫',
  bell: '🔔', lock: '🔒', key: '🔑', bulb: '💡', book: '📖', books: '📚',
  moneybag: '💰', money_with_wings: '💸', pencil: '✏️', memo: '📝',
  calendar: '📅', pushpin: '📌', link: '🔗', paperclip: '📎', scissors: '✂️',
  trash: '🗑️', wrench: '🔧', hammer: '🔨', gear: '⚙️', microscope: '🔬',
  telescope: '🔭', rocket: '🚀', airplane: '✈️', car: '🚗', house: '🏠',
  earth_americas: '🌎', earth_africa: '🌍', earth_asia: '🌏',
  globe_with_meridians: '🌐', map: '🗺️',
  // Music & entertainment
  musical_note: '🎵', notes: '🎶', microphone: '🎤', headphones: '🎧',
  guitar: '🎸', tv: '📺', video_game: '🎮', art: '🎨', movie_camera: '🎥',
};

/**
 * Preprocess extended markdown syntax that MDXEditor doesn't natively support.
 * Handles: emoji shortcodes, heading IDs, footnotes, superscript (^text^),
 * subscript (~text~), definition lists (term\n: def), and math ($$...$$).
 * Block math ($$...$$) is converted to ```math code fences so MDXEditor can
 * render them via MathCodeEditor. postprocessMarkdown converts them back on save.
 */
function preprocessMarkdown(md) {
  if (!md) return md;

  // Extract $$...$$ block math first (before any other transform) so that
  // LaTeX syntax like x^3 + y^3 is never touched by the superscript regex.
  const mathBlocks = [];
  md = md.replace(/^\$\$([\s\S]*?)\$\$[ \t]*$/gm, (_, latex) => {
    const idx = mathBlocks.length;
    mathBlocks.push(latex.trim());
    return `\x00MATH${idx}\x00`;
  });

  // 1. Emoji shortcodes :name: → unicode character
  md = md.replace(/:([a-z0-9_+\-]+):/g, (match, name) => EMOJI_MAP[name] ?? match);

  // 2. Strip pandoc/kramdown heading IDs {#custom-id}
  md = md.replace(/^(#{1,6}[^\n]*?)\s*\{#[a-zA-Z0-9_-]+\}/gm, '$1');

  // 3. Footnote definitions [^id]: text → block quote (process before inline refs)
  md = md.replace(/^\[\^([^\]]+)\]:\s*(.+)$/gm, '> **[^$1]**: $2');

  // 4. Inline footnote references [^id] → superscript
  md = md.replace(/\[\^([^\]\n]+)\]/g, '<sup>[$1]</sup>');

  // 5. Superscript ^text^ (skip ^^ double-caret)
  md = md.replace(/(?<!\^)\^([^\^\n]+)\^(?!\^)/g, '<sup>$1</sup>');

  // 6. Subscript ~text~ (skip ~~ used for strikethrough)
  md = md.replace(/(?<!~)~(?!~)([^~\n]+?)~(?!~)/g, '<sub>$1</sub>');

  // 7. Definition lists: plain term line followed by ": definition" line(s)
  md = md.replace(
    /^(?![#>*\-+]|\d+\.|\s)([^\n:][^\n]*)\n((?:[ \t]*: [^\n]+\n?)+)/gm,
    (_, term, defs) => `**${term.trim()}**\n${defs.replace(/^[ \t]*: /gm, '')}`,
  );

  // 8. Restore math blocks as ```math code fences (rendered by MathCodeEditor)
  md = md.replace(/\x00MATH(\d+)\x00/g, (_, idx) =>
    '```math\n' + mathBlocks[parseInt(idx, 10)] + '\n```'
  );

  return md;
}

/**
 * Reverse ```math code fences back to $$...$$ so the file stores standard
 * LaTeX block math. Called on every onChange before reaching the caller.
 */
function postprocessMarkdown(md) {
  if (!md) return md;
  md = md.replace(/^```math\n([\s\S]*?)\n```\s*$/gm,
    (_, latex) => `$$\n${latex}\n$$`);
  return md;
}

/**
 * Custom code-block editor for language="math".
 * Renders KaTeX in display mode; click to edit the raw LaTeX.
 */
// Realm plugin that makes the source/diff view show $$...$$ instead of
// the internal ```math code fence representation.
const mathSourceViewPlugin = realmPlugin({
    init(realm) {
        realm.changeWith(markdownSourceEditorValue$, markdownSourceEditorValue$,
            (_, md) => postprocessMarkdown(md));
    },
});

const MathCodeEditor = ({ code, onChange, readOnly }) => {
    const katexRef = useRef(null);
    const [isEditing, setIsEditing] = useState(false);
    const [draft, setDraft] = useState(code);

    useEffect(() => { setDraft(code); }, [code]);

    useEffect(() => {
        if (!isEditing && katexRef.current) {
            try {
                katex.render(draft || ' ', katexRef.current, {
                    displayMode: true,
                    throwOnError: false,
                });
            } catch { /* ignore */ }
        }
    }, [draft, isEditing]);

    if (isEditing && !readOnly) {
        return (
            <div style={{ padding: '8px 16px' }}>
                <textarea
                    value={draft}
                    autoFocus
                    rows={Math.max(2, (draft.match(/\n/g) || []).length + 1)}
                    style={{
                        fontFamily: 'monospace', fontSize: '13px',
                        width: '100%', resize: 'vertical', padding: '6px',
                        boxSizing: 'border-box', background: 'transparent',
                        color: 'inherit', border: '1px solid var(--border-color, #444)',
                        borderRadius: '4px',
                    }}
                    onChange={e => { setDraft(e.target.value); onChange(e.target.value); }}
                    onBlur={() => setIsEditing(false)}
                />
            </div>
        );
    }

    return (
        <div
            ref={katexRef}
            style={{ padding: '12px 16px', cursor: readOnly ? 'default' : 'pointer', textAlign: 'center' }}
            onClick={readOnly ? undefined : () => setIsEditing(true)}
            title={readOnly ? undefined : 'Click to edit LaTeX'}
        />
    );
};

const MarkdownEditorInner = forwardRef(({
    className = '',
    onChange = null,
    placeholder = 'Start writing...',
    readOnly = false,
    autoFocus = false,
    content = '',
    onError = null,       // accepted to prevent spreading onto DOM via ...props
    showParseErrors = true, // accepted to prevent spreading onto DOM via ...props
    diffContent = '',
    theme = null,
    contentClassName = '',
    width = null,
    height = null,
    minWidth = null,
    minHeight = null,
    maxWidth = null,
    maxHeight = null,
    marginTop = null,
    marginBottom = null,
    justifySelf = null,
    showToolbar = true,
    customToolbar = null,
    toolbarPosition = 'top',
    imageUploadHandler = null,
    onFocus = null,
    onBlur = null,
    onKeyDown = null,
    ...props
}, ref) => {
    const effectiveTheme = useTheme();
    const editorRef = useRef(null);
    const effectiveContent = preprocessMarkdown(content || '');

    useEffect(() => {
        if (editorRef.current && content !== undefined) {
            const processed = preprocessMarkdown(content);
            const currentContent = editorRef.current.getMarkdown();
            if (processed.trim() !== currentContent.trim()) {
                editorRef.current.setMarkdown(processed);
            }
        }
    }, [content]);

    const editorTheme = theme || effectiveTheme.currentTheme;
    const { style: styleProp, ...restProps } = props;

    const editorStyles = useMemo(() => {
        const styles = { ...(styleProp || {}) };
        const marginMap = {
            xs: 'var(--spacing-xs)', sm: 'var(--spacing-sm)',
            md: 'var(--spacing-md)', lg: 'var(--spacing-lg)', xl: 'var(--spacing-xl)',
        };
        if (marginTop    !== null) styles.marginTop    = marginTop    === 'none' ? '0' : (marginMap[marginTop]    || marginTop);
        if (marginBottom !== null) styles.marginBottom = marginBottom === 'none' ? '0' : (marginMap[marginBottom] || marginBottom);
        if (justifySelf)           styles.justifySelf  = justifySelf;
        if (width    !== null)     styles.width        = width;
        if (height   !== null)     styles.height       = height;
        if (minHeight !== null)    styles.minHeight    = minHeight;
        if (maxWidth !== null)     styles.maxWidth     = maxWidth;
        if (maxHeight !== null)    styles.maxHeight    = maxHeight;
        return styles;
    }, [marginTop, marginBottom, justifySelf, width, height, minHeight, maxWidth, maxHeight, styleProp]);

    const defaultImageUploadHandler = useCallback(async (file) => {
        return new Promise((resolve, reject) => {
            if (!file)                          { reject(new Error('No file provided'));          return; }
            if (!file.type.startsWith('image/')) { reject(new Error('File must be an image'));    return; }
            if (file.size > 5 * 1024 * 1024)   { reject(new Error('Image size must be < 5MB')); return; }
            const reader = new FileReader();
            reader.onload  = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsDataURL(file);
        });
    }, []);

    const plugins = useMemo(() => [
        headingsPlugin(),
        listsPlugin(),
        quotePlugin(),
        thematicBreakPlugin(),
        linkPlugin(),
        linkDialogPlugin({ linkAutocompleteSuggestions: [] }),
        imagePlugin({
            imageUploadHandler: imageUploadHandler || defaultImageUploadHandler,
            imageAutocompleteSuggestions: [],
        }),
        tablePlugin(),
        codeBlockPlugin({
            defaultCodeBlockLanguage: 'js',
            codeBlockEditorDescriptors: [{
                match: (language) => language === 'math',
                priority: 100,
                Editor: MathCodeEditor,
            }],
        }),
        codeMirrorPlugin({
            codeBlockLanguages: {
                '': 'Plain Text',
                js: 'JavaScript', jsx: 'JavaScript (React)', ts: 'TypeScript',
                tsx: 'TypeScript (React)', html: 'HTML', css: 'CSS',
                json: 'JSON', md: 'Markdown', txt: 'Plain Text',
                bash: 'Bash', sh: 'Shell', python: 'Python', py: 'Python',
                sql: 'SQL', yml: 'YAML', yaml: 'YAML', ruby: 'Ruby',
                go: 'Go', rust: 'Rust', c: 'C', cpp: 'C++', java: 'Java',
            },
            autoLoadLanguageSupport: true,
        }),
        ...(showToolbar && toolbarPosition !== 'none' ? [toolbarPlugin({
            toolbarContents: customToolbar || (() => (
                <DiffSourceToggleWrapper>
                    <UndoRedo />
                    <Separator />
                    <BoldItalicUnderlineToggles />
                    <StrikeThroughSupSubToggles />
                    <CodeToggle />
                    <HighlightToggle />
                    <Separator />
                    <BlockTypeSelect />
                    <Separator />
                    <CreateLink />
                    <InsertImage />
                    <InsertTable />
                    <InsertCodeBlock />
                    <InsertThematicBreak />
                    <Separator />
                    <ListsToggle />
                </DiffSourceToggleWrapper>
            )),
        })] : []),
        diffSourcePlugin({ viewMode: 'rich-text', diffMarkdown: diffContent || '' }),
        mathSourceViewPlugin,
    ], [showToolbar, toolbarPosition, customToolbar, imageUploadHandler, defaultImageUploadHandler, diffContent]);

    const contentEditableClassName = ['themed-editor-content', contentClassName].filter(Boolean).join(' ');

    const combinedClasses = ['themed-editor', `themed-editor-${editorTheme}`, 'mdxeditor', className]
        .filter(Boolean).join(' ');

    const handleChange = useCallback((value) => {
        onChange?.(postprocessMarkdown(value));
    }, [onChange]);

    React.useImperativeHandle(ref, () => ({
        getMarkdown:    () => editorRef.current?.getMarkdown(),
        setMarkdown:    (v) => editorRef.current?.setMarkdown(v),
        insertMarkdown: (v) => editorRef.current?.insertMarkdown(v),
        focus:          () => editorRef.current?.focus(),
        blur:           () => editorRef.current?.blur(),
    }));

    const editorRenderKey = useMemo(
        () => [showToolbar ? 'on' : 'off', toolbarPosition, readOnly ? 'ro' : 'rw'].join(':'),
        [showToolbar, toolbarPosition, readOnly],
    );

    const editorComponent = (
        <div
            className={combinedClasses}
            data-theme={editorTheme}
            data-theme-source={theme ? 'local' : 'inherited'}
            style={editorStyles}
            {...restProps}
        >
            <MDXEditor
                key={editorRenderKey}
                ref={editorRef}
                markdown={effectiveContent}
                onChange={handleChange}
                onFocus={onFocus}
                onBlur={onBlur}
                onKeyDown={onKeyDown}
                readOnly={readOnly}
                autoFocus={autoFocus}
                placeholder={placeholder}
                contentEditableClassName={contentEditableClassName}
                plugins={plugins}
                suppressHtmlProcessing={false}
            />
        </div>
    );

    return theme ? <ThemeProvider theme={theme}>{editorComponent}</ThemeProvider> : editorComponent;
});
MarkdownEditorInner.displayName = 'MarkdownEditorInner';
