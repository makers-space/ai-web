/**
 * Compiles a theme token document (see file-server/models/theme.model.js)
 * into the CSS custom-property contract the component library consumes,
 * scoped under `.theme-<className>`. Derived values (accents, shadows,
 * code editor palette) follow the same conventions as the built-in themes.
 */

import { getFontFamily, ensureFontsLoaded } from './font.registry.js';

const mix = (a, pct, b = 'transparent') => `color-mix(in srgb, ${a} ${pct}%, ${b})`;

export const compileThemeTokens = (tokens, className) => {
    const c = tokens.colors || {};
    const f = tokens.fonts || {};
    const r = tokens.radii || {};
    const dark = !!tokens.darkMode;

    const tertiary = c.tertiary || c.primaryAccent || c.primary;
    const neutral = c.neutral || mix(c.text, 60, c.background);
    const border = c.border || mix(c.text, 20, c.background);
    const surfaceAccent = c.surfaceAccent || mix(c.surface, 80, dark ? '#ffffff' : '#000000');
    const shadow = c.shadow || 'rgba(0, 0, 0, 0.15)';

    const fontPrimary = getFontFamily(f.primary);
    const fontSecondary = getFontFamily(f.secondary, fontPrimary);
    const fontMono = getFontFamily(f.monospace, "'JetBrains Mono', monospace");

    const weightVariants = (name, family) =>
        ['light', 'normal', 'medium', 'semibold', 'bold', 'extrabold', 'black']
            .map(w => `--font-family-${name}-${w}: ${family};`).join('\n    ');

    const vars = `
    color-scheme: ${dark ? 'dark' : 'light'};
    --primary-color: ${c.primary};
    --primary-accent-color: ${c.primaryAccent || c.primary};
    --secondary-color: ${c.secondary};
    --secondary-accent-color: ${c.secondaryAccent || c.secondary};
    --tertiary-color: ${tertiary};
    --tertiary-accent-color: ${c.tertiaryAccent || tertiary};
    --neutral-color: ${neutral};
    --neutral-accent-color: ${c.neutralAccent || neutral};
    --success-color: ${c.success || '#10b981'};
    --success-accent-color: ${mix(c.success || '#10b981', 80, '#000000')};
    --warning-color: ${c.warning || '#f59e0b'};
    --warning-accent-color: ${mix(c.warning || '#f59e0b', 80, '#000000')};
    --error-color: ${c.error || '#dc2626'};
    --error-accent-color: ${mix(c.error || '#dc2626', 80, '#000000')};
    --background-color: ${c.background};
    --surface-color: ${c.surface};
    --surface-accent-color: ${surfaceAccent};
    --border-color: ${border};
    --border-light: ${mix(border, 50, c.background)};
    --text-color: ${c.text};
    --text-contrast-color: ${c.textContrast};
    --backdrop-color: ${mix(c.background, 30, 'rgba(0, 0, 0, 0.55)')};

    --shadow-color: ${shadow};
    --shadow-color-hover: ${shadow};
    --shadow-sm: 0 1px 2px ${shadow};
    --shadow-md: 0 4px 6px ${shadow};
    --shadow-lg: 0 8px 20px ${shadow};
    --shadow-xl: 0 12px 24px ${shadow};

    --font-family: ${fontPrimary};
    --font-family-primary: ${fontPrimary};
    ${weightVariants('primary', fontPrimary)}
    --font-family-secondary: ${fontSecondary};
    ${weightVariants('secondary', fontSecondary)}
    --font-family-monospace: ${fontMono};
    --font-weight-light: 300;
    --font-weight-regular: 400;
    --font-weight-medium: 500;
    --font-weight-semi-bold: 600;
    --font-weight-bold: 700;
    --font-weight-extra-bold: 800;
    --font-weight-black: 900;

    --border-radius: ${r.base ?? '0.375rem'};
    --card-radius: ${r.card ?? '0.5rem'};
    --input-radius: ${r.input ?? r.base ?? '0.375rem'};
    --button-radius: ${r.button ?? r.base ?? '0.375rem'};
    --checkbox-radius: ${r.checkbox ?? '0.25rem'};
    --fab-radius: ${r.fab ?? '50%'};
    --progress-radius: ${r.progress ?? '9999px'};
    --notification-radius: ${r.notification ?? r.card ?? '0.5rem'};

    --code-background: ${dark ? mix(c.background, 85, '#000000') : mix(c.surface, 60, '#ffffff')};
    --code-foreground: ${c.text};
    --code-gutter: ${surfaceAccent};
    --code-line-number: ${neutral};
    --code-line-highlight: ${mix(c.primary, 10)};
    --code-selection: ${mix(c.primary, 25)};
    --code-cursor: ${c.primary};
    --code-keyword: ${c.primary};
    --code-string: ${c.success || '#10b981'};
    --code-number: ${c.warning || '#f59e0b'};
    --code-comment: ${neutral};
    --code-function: ${c.secondary};
    --code-variable: ${c.text};
    --code-operator: ${tertiary};
    --code-type: ${c.tertiaryAccent || tertiary};`;

    return `.theme-${className} {${vars}\n}\n.theme-${className} body, body.theme-${className} {\n    background-color: ${c.background};\n    color: ${c.text};\n    font-family: ${fontPrimary};\n}`;
};

const STYLE_ID = 'fsone-custom-theme';

/** Inject (or replace) the compiled CSS for a custom theme and load its fonts */
export const injectCustomTheme = (themeDoc) => {
    const className = customThemeClass(themeDoc);
    const css = compileThemeTokens(themeDoc.tokens, className);
    let styleEl = document.getElementById(STYLE_ID);
    if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = STYLE_ID;
        document.head.appendChild(styleEl);
    }
    styleEl.textContent = css;
    ensureFontsLoaded(Object.values(themeDoc.tokens?.fonts || {}));
    return className;
};

export const removeCustomTheme = () => {
    document.getElementById(STYLE_ID)?.remove();
};

/** The theme class slug used for an applied custom theme */
export const customThemeClass = (themeDoc) => `custom-${themeDoc.slug}`;
