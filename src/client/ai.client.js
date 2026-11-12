import { sharedAPI as api, API_BASE_URL } from './app.client.js';

export const deviceService = {
    listDevices: () => api.get('/devices'),
    updateDevice: (id, changes) => api.put(`/devices/${id}`, changes),
    detectDevice: (id) => api.post(`/devices/${id}/detect`, {}),

    getSettings: () => api.get('/settings'),
    updateSettings: (changes) => api.put('/settings', changes),
    testConnection: (ollamaBaseUrl) => api.post('/settings/test-connection', { ollamaBaseUrl }),

    getSetupStatus: () => api.get('/setup/status')
};

export const describeError = (error, fallback = 'Something went wrong. Please try again.') => {
    const data = error?.response?.data;
    if (data?.action) return `${data.message} ${data.action}`;
    return data?.message || fallback;
};

export const modelService = {
    listInstalled: () => api.get('/models'),
    listRunning: () => api.get('/models/running'),
    deleteModel: (name) => api.post('/models/delete', { name }),
    unloadModel: (name) => api.post('/models/unload', { name }),
    createModel: (request) => api.post('/models/create', request),

    getDeviceCatalogue: (deviceId) => api.get(`/devices/${deviceId}/catalogue`),

    startDownload: (name) => api.post('/models/pull', { name }),
    listDownloads: () => api.get('/models/downloads'),
    pauseDownload: (id) => api.post('/models/downloads/cancel', { id, action: 'pause' }),
    cancelDownload: (id) => api.post('/models/downloads/cancel', { id, action: 'cancel' }),

    watchDownloads({ onSnapshot, onProgress, onError }) {
        const source = new EventSource(`${API_BASE_URL}/models/downloads/stream`, { withCredentials: true });
        source.addEventListener('snapshot', (event) => onSnapshot(JSON.parse(event.data)));
        source.addEventListener('progress', (event) => onProgress(JSON.parse(event.data)));
        source.onerror = () => onError?.();
        return () => source.close();
    }
};

const cleanGraphicsName = (raw) => {
    if (!raw) return null;
    const angle = String(raw).match(/^ANGLE \([^,]+,\s*(.+?)(?:\s+\(0x[0-9a-f]+\))?(?:\s+Direct3D.*|\s+OpenGL.*|\s+Metal.*|\s+Vulkan.*)?,/i);
    const name = (angle ? angle[1] : String(raw)).replace(/\s+\(0x[0-9a-f]+\)/i, '').trim();
    return /swiftshader|llvmpipe|software/i.test(name) ? null : name;
};

const readGraphicsName = () => {
    try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (!gl) return null;
        const info = gl.getExtension('WEBGL_debug_renderer_info');
        return cleanGraphicsName(gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER));
    } catch {
        return null;
    }
};

export const readBrowserDevice = () => ({
    graphicsName: readGraphicsName(),
    memoryGb: navigator.deviceMemory || null,
    processorThreads: navigator.hardwareConcurrency || null,
    system: navigator.userAgentData?.platform || navigator.platform || null
});

export const formatGb = (megabytes, digits = 0) => {
    if (megabytes === null || megabytes === undefined) return 'Unknown';
    return `${(megabytes / 1024).toFixed(digits)} GB`;
};
