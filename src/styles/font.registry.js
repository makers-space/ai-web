/**
 * Curated font registry — maps theme token font keys to CSS families and
 * Google Fonts loading params. Mobile maps the same keys to Expo fonts.
 */

const FONT_REGISTRY = {
    'urbanist':              { family: "'Urbanist', -apple-system, 'Segoe UI', sans-serif",        google: 'Urbanist:wght@300;400;500;600;700;800;900' },
    'montserrat-alternates': { family: "'Montserrat Alternates', -apple-system, sans-serif",       google: 'Montserrat+Alternates:wght@300;400;500;600;700' },
    'josefin-sans':          { family: "'Josefin Sans', -apple-system, 'Segoe UI', sans-serif",    google: 'Josefin+Sans:wght@300;400;500;600;700' },
    'jura':                  { family: "'Jura', 'Roboto', 'Segoe UI', sans-serif",                 google: 'Jura:wght@300;400;500;600;700' },
    'advent-pro':            { family: "'Advent Pro', 'Helvetica Neue', Arial, sans-serif",        google: 'Advent+Pro:wght@300;400;500;600;700' },
    'gloria-hallelujah':     { family: "'Gloria Hallelujah', 'Comic Sans MS', cursive",            google: 'Gloria+Hallelujah' },
    'borel':                 { family: "'Borel', 'Brush Script MT', cursive",                      google: 'Borel' },
    'bungee-spice':          { family: "'Bungee Spice', 'Impact', sans-serif",                     google: 'Bungee+Spice' },
    'syne-mono':             { family: "'Syne Mono', 'Courier New', monospace",                    google: 'Syne+Mono' },
    'kode-mono':             { family: "'Kode Mono', 'Roboto Mono', monospace",                    google: 'Kode+Mono:wght@400;500;600;700' },
    'jetbrains-mono':        { family: "'JetBrains Mono', 'Courier New', monospace",               google: 'JetBrains+Mono:wght@300;400;500;600;700' },
    'roboto-mono':           { family: "'Roboto Mono', 'Courier New', monospace",                  google: 'Roboto+Mono:wght@300;400;500;600;700' },
    'share-tech-mono':       { family: "'Share Tech Mono', 'Courier New', monospace",              google: 'Share+Tech+Mono' },
    'nova-mono':             { family: "'Nova Mono', 'Courier New', monospace",                    google: 'Nova+Mono' },
    'inter':                 { family: "'Inter', -apple-system, 'Segoe UI', sans-serif",           google: 'Inter:wght@300;400;500;600;700;800' },
    'poppins':               { family: "'Poppins', -apple-system, 'Segoe UI', sans-serif",         google: 'Poppins:wght@300;400;500;600;700;800' },
    'space-grotesk':         { family: "'Space Grotesk', -apple-system, sans-serif",               google: 'Space+Grotesk:wght@300;400;500;600;700' },

    // Sans-serif workhorses
    'roboto':                { family: "'Roboto', -apple-system, 'Segoe UI', sans-serif",          google: 'Roboto:wght@300;400;500;700;900' },
    'open-sans':             { family: "'Open Sans', -apple-system, 'Segoe UI', sans-serif",       google: 'Open+Sans:wght@300;400;500;600;700;800' },
    'lato':                  { family: "'Lato', -apple-system, 'Segoe UI', sans-serif",            google: 'Lato:wght@300;400;700;900' },
    'montserrat':            { family: "'Montserrat', -apple-system, 'Segoe UI', sans-serif",      google: 'Montserrat:wght@300;400;500;600;700;800' },
    'nunito':                { family: "'Nunito', -apple-system, 'Segoe UI', sans-serif",          google: 'Nunito:wght@300;400;500;600;700;800' },
    'raleway':               { family: "'Raleway', -apple-system, 'Segoe UI', sans-serif",         google: 'Raleway:wght@300;400;500;600;700;800' },
    'work-sans':             { family: "'Work Sans', -apple-system, 'Segoe UI', sans-serif",       google: 'Work+Sans:wght@300;400;500;600;700' },
    'dm-sans':               { family: "'DM Sans', -apple-system, 'Segoe UI', sans-serif",         google: 'DM+Sans:wght@300;400;500;600;700' },
    'manrope':               { family: "'Manrope', -apple-system, 'Segoe UI', sans-serif",         google: 'Manrope:wght@300;400;500;600;700;800' },
    'outfit':                { family: "'Outfit', -apple-system, 'Segoe UI', sans-serif",          google: 'Outfit:wght@300;400;500;600;700' },
    'sora':                  { family: "'Sora', -apple-system, 'Segoe UI', sans-serif",            google: 'Sora:wght@300;400;500;600;700' },
    'rubik':                 { family: "'Rubik', -apple-system, 'Segoe UI', sans-serif",           google: 'Rubik:wght@300;400;500;600;700' },
    'karla':                 { family: "'Karla', -apple-system, 'Segoe UI', sans-serif",           google: 'Karla:wght@300;400;500;600;700' },
    'figtree':               { family: "'Figtree', -apple-system, 'Segoe UI', sans-serif",         google: 'Figtree:wght@300;400;500;600;700' },
    'lexend':                { family: "'Lexend', -apple-system, 'Segoe UI', sans-serif",          google: 'Lexend:wght@300;400;500;600;700' },
    'plus-jakarta-sans':     { family: "'Plus Jakarta Sans', -apple-system, sans-serif",           google: 'Plus+Jakarta+Sans:wght@300;400;500;600;700' },
    'quicksand':             { family: "'Quicksand', -apple-system, 'Segoe UI', sans-serif",       google: 'Quicksand:wght@300;400;500;600;700' },
    'comfortaa':             { family: "'Comfortaa', -apple-system, cursive",                      google: 'Comfortaa:wght@300;400;500;600;700' },
    'barlow':                { family: "'Barlow', -apple-system, 'Segoe UI', sans-serif",          google: 'Barlow:wght@300;400;500;600;700' },
    'mulish':                { family: "'Mulish', -apple-system, 'Segoe UI', sans-serif",          google: 'Mulish:wght@300;400;500;600;700' },

    // Serifs
    'playfair-display':      { family: "'Playfair Display', Georgia, serif",                       google: 'Playfair+Display:wght@400;500;600;700;800' },
    'merriweather':          { family: "'Merriweather', Georgia, serif",                           google: 'Merriweather:wght@300;400;700;900' },
    'lora':                  { family: "'Lora', Georgia, serif",                                   google: 'Lora:wght@400;500;600;700' },
    'libre-baskerville':     { family: "'Libre Baskerville', Georgia, serif",                      google: 'Libre+Baskerville:wght@400;700' },
    'crimson-text':          { family: "'Crimson Text', Georgia, serif",                           google: 'Crimson+Text:wght@400;600;700' },
    'eb-garamond':           { family: "'EB Garamond', Georgia, serif",                            google: 'EB+Garamond:wght@400;500;600;700' },
    'cormorant-garamond':    { family: "'Cormorant Garamond', Georgia, serif",                     google: 'Cormorant+Garamond:wght@300;400;500;600;700' },
    'bitter':                { family: "'Bitter', Georgia, serif",                                 google: 'Bitter:wght@300;400;500;600;700' },
    'zilla-slab':            { family: "'Zilla Slab', Georgia, serif",                             google: 'Zilla+Slab:wght@300;400;500;600;700' },
    'source-serif':          { family: "'Source Serif 4', Georgia, serif",                        google: 'Source+Serif+4:wght@300;400;500;600;700' },

    // Display & personality
    'bebas-neue':            { family: "'Bebas Neue', 'Impact', sans-serif",                       google: 'Bebas+Neue' },
    'righteous':             { family: "'Righteous', 'Impact', sans-serif",                        google: 'Righteous' },
    'pacifico':              { family: "'Pacifico', 'Brush Script MT', cursive",                   google: 'Pacifico' },
    'caveat':                { family: "'Caveat', 'Brush Script MT', cursive",                     google: 'Caveat:wght@400;500;600;700' },
    'permanent-marker':      { family: "'Permanent Marker', 'Comic Sans MS', cursive",             google: 'Permanent+Marker' },
    'fredoka':               { family: "'Fredoka', -apple-system, sans-serif",                     google: 'Fredoka:wght@300;400;500;600;700' },
    'lobster':               { family: "'Lobster', 'Brush Script MT', cursive",                    google: 'Lobster' },
    'abril-fatface':         { family: "'Abril Fatface', Georgia, serif",                          google: 'Abril+Fatface' },
    'orbitron':              { family: "'Orbitron', -apple-system, sans-serif",                    google: 'Orbitron:wght@400;500;600;700;800' },
    'audiowide':             { family: "'Audiowide', -apple-system, sans-serif",                   google: 'Audiowide' },

    // Monospace
    'fira-code':             { family: "'Fira Code', 'Courier New', monospace",                    google: 'Fira+Code:wght@300;400;500;600;700' },
    'source-code-pro':       { family: "'Source Code Pro', 'Courier New', monospace",              google: 'Source+Code+Pro:wght@300;400;500;600;700' },
    'ibm-plex-mono':         { family: "'IBM Plex Mono', 'Courier New', monospace",                google: 'IBM+Plex+Mono:wght@300;400;500;600;700' },
    'space-mono':            { family: "'Space Mono', 'Courier New', monospace",                   google: 'Space+Mono:wght@400;700' },
    'ubuntu-mono':           { family: "'Ubuntu Mono', 'Courier New', monospace",                  google: 'Ubuntu+Mono:wght@400;700' },
    'inconsolata':           { family: "'Inconsolata', 'Courier New', monospace",                  google: 'Inconsolata:wght@300;400;500;600;700' },
    'courier-prime':         { family: "'Courier Prime', 'Courier New', monospace",                google: 'Courier+Prime:wght@400;700' },
    'victor-mono':           { family: "'Victor Mono', 'Courier New', monospace",                  google: 'Victor+Mono:wght@300;400;500;600;700' },
};

export const getFontFamily = (key, fallback = "'Urbanist', sans-serif") =>
    FONT_REGISTRY[key]?.family || fallback;

export const listFontKeys = (kind = 'all') => {
    const keys = Object.keys(FONT_REGISTRY);
    if (kind === 'mono') return keys.filter(k => FONT_REGISTRY[k].family.includes('monospace'));
    if (kind === 'sans') return keys.filter(k => !FONT_REGISTRY[k].family.includes('monospace'));
    return keys;
};

const loaded = new Set();

/** Inject a Google Fonts stylesheet for the given keys (once per key) */
export const ensureFontsLoaded = (keys = []) => {
    const params = keys
        .filter(k => FONT_REGISTRY[k] && !loaded.has(k))
        .map(k => { loaded.add(k); return `family=${FONT_REGISTRY[k].google}`; });
    if (params.length === 0) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?${params.join('&')}&display=swap`;
    document.head.appendChild(link);
};

export default FONT_REGISTRY;
