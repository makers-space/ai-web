import { sharedAPI as api, API_BASE_URL, refreshCsrfToken } from './app.client.js';

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
    loadModel: (name) => api.post('/models/load', name ? { name } : {}),
    createModel: (request) => api.post('/models/create', request),
    updateModel: (request) => api.post('/models/update', request),

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

const csrfToken = async () => document.cookie.match(/(?:^|; )csrfToken=([^;]+)/)?.[1] || refreshCsrfToken();

const readEvents = async (response, onEvent) => {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();
        for (const line of lines) {
            if (line.trim()) onEvent(JSON.parse(line));
        }
    }
};

export const chatService = {
    list: (search) => api.get('/chats', { params: search ? { search } : {} }),
    create: (body = {}) => api.post('/chats', body),
    get: (id) => api.get(`/chats/${id}`),
    update: (id, changes) => api.patch(`/chats/${id}`, changes),
    remove: (id) => api.delete(`/chats/${id}`),
    summarise: (id) => api.post(`/chats/${id}/summary`, {}, { timeout: 0 }),
    exportChat: (id, format) => api.get(`/chats/${id}/export`, { params: { format } }),

    attachUpload: (id, file) => api.post(`/chats/${id}/attachments`, file, {
        params: { name: file.name },
        headers: { 'Content-Type': 'application/octet-stream' },
        timeout: 120000
    }),
    attachFile: (id, path) => api.post(`/chats/${id}/attachments`, { path }, { timeout: 60000 }),
    removeAttachment: (id, attachmentId) => api.delete(`/chats/${id}/attachments/${attachmentId}`),

    stop: (id) => api.post(`/chats/${id}/stop`, {}),

    async rejoin(id, { onEvent, signal }) {
        const response = await fetch(`${API_BASE_URL}/chats/${id}/reply`, { credentials: 'include', signal });
        if (response.status !== 200) return false;
        await readEvents(response, onEvent);
        return true;
    },

    async send(id, body, { onEvent, signal }) {
        const attempt = async () => fetch(`${API_BASE_URL}/chats/${id}/messages`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': await csrfToken() },
            body: JSON.stringify(body),
            signal
        });

        let response = await attempt();
        if (response.status === 401) {
            await api.get('/chats');
            response = await attempt();
        }
        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw Object.assign(new Error(data.message || 'The message could not be sent.'), { response: { data, status: response.status } });
        }

        if (response.status === 202) return response.json();
        await readEvents(response, onEvent);
        return null;
    }
};

export const promptService = {
    list: () => api.get('/prompts'),
    create: (prompt) => api.post('/prompts', prompt),
    update: (id, changes) => api.patch(`/prompts/${id}`, changes),
    remove: (id) => api.delete(`/prompts/${id}`)
};

export const fileService = {
    browse: (path = '/') => api.get('/files/browse', { params: { path } }),
    text: (path, model) => api.get('/files/text', { params: model ? { path, model } : { path }, timeout: 60000 }),
    save: (folder, name, content) => api.post('/files/save', { folder, name, content }),
    remote: (url) => api.get('/files/remote', { params: { url }, responseType: 'blob', timeout: 120000 })
};

export const downloadText = (fileName, content) => {
    const url = URL.createObjectURL(new Blob([content], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
};
