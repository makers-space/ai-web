import { createContext, createElement, useCallback, useContext, useEffect, useState } from 'react';
import { useAuth } from '@contexts/AuthContext';
import { Button, Container, Icon, Typography } from '@components/Components';
import { sharedAPI as api, API_BASE_URL, refreshCsrfToken, appService } from './app.client.js';

export const guideService = {
    get: () => api.get('/guide'),
    set: (on) => api.put('/guide', { on }),
    seen: (key) => api.post('/guide/seen', { key })
};

export const GUIDE_TEXT = {
    'nav.chat': ['Chat', 'Talk to a model that runs on this computer. Your chats are saved, and only you can open them.'],
    'nav.models': ['Models', 'Find models that fit this device, download them, and make your own versions.'],
    'nav.devices': ['Devices', 'What AI Base reads from this computer: graphics card, memory and free disk.'],
    'nav.settings': ['Settings', 'Your account, sign-in security, themes, and how AI Base reaches Ollama.'],
    'chat.send': ['Sending a message', 'The reply is written on this computer and keeps going if you leave the page. You can send another message while it is being written; it waits its turn.'],
    'chat.new': ['New chat', 'Starts an empty conversation. The earlier ones stay in the list on the left.'],
    'models.installed': ['Installed', 'The models already on this device, with their size on disk.'],
    'models.running': ['Running', 'Models loaded in memory right now. They unload by themselves after a few minutes.'],
    'models.mine': ['My models', 'An installed model with your own instructions built in, saved under its own name.'],
    'models.refresh': ['Refresh', 'Reads the model lists and the free disk space again, for example after a download finished elsewhere.'],
    'models.download': ['Download', 'The download runs on the server, so it carries on if you close this page. Its progress shows at the top.'],
    'devices.read': ['Read this computer again', 'Reads the hardware again, for example after a graphics card was changed.'],
    'devices.correct': ['Correct these details', 'Use this only when what AI Base reads is wrong. It changes which models are said to fit.']
};

const NO_ACTIVITY = { replies: [], downloads: [], canManage: false };
const ActivityContext = createContext({ ...NO_ACTIVITY, refresh: async () => {}, stopReply: async () => {}, cancelDownload: async () => {} });
export const useActivity = () => useContext(ActivityContext);

export const ActivityProvider = ({ children }) => {
    const { user } = useAuth();
    const userId = user?.id || user?._id || null;
    const [activity, setActivity] = useState(NO_ACTIVITY);

    const refresh = useCallback(async () => {
        try {
            const result = await api.get('/activity');
            setActivity({
                replies: result.replies,
                downloads: result.downloads.filter((job) => job.status === 'queued' || job.status === 'downloading'),
                canManage: Boolean(result.permissions?.manage)
            });
        } catch {
            return;
        }
    }, []);

    useEffect(() => {
        if (!userId) {
            setActivity(NO_ACTIVITY);
            return undefined;
        }
        refresh();
        const stopListening = appService.onNotification('activity:changed', refresh);
        const stopDownloads = appService.onNotification('download:finished', () => window.dispatchEvent(new CustomEvent('ollama-availability-changed')));
        const timer = setInterval(() => {
            if (!document.hidden) refresh();
        }, 60000);
        return () => {
            stopListening();
            stopDownloads();
            clearInterval(timer);
        };
    }, [userId, refresh]);

    const stopReply = useCallback(async (chatId) => {
        await api.post(`/chats/${chatId}/stop`, {}).catch(() => {});
        refresh();
    }, [refresh]);
    const cancelDownload = useCallback(async (id) => {
        await api.post('/models/downloads/cancel', { id, action: 'cancel' }).catch(() => {});
        refresh();
    }, [refresh]);

    return createElement(ActivityContext.Provider, { value: { ...activity, refresh, stopReply, cancelDownload } }, children);
};

const GUIDE_OFF = { on: false, seen: [], steps: [] };
const GuideContext = createContext({ ...GUIDE_OFF, setOn: async () => {}, tip: () => ({}) });
export const useGuide = () => useContext(GuideContext);

export const GuideProvider = ({ children }) => {
    const { user } = useAuth();
    const userId = user?.id || user?._id || null;
    const [guide, setGuide] = useState(GUIDE_OFF);
    const [showing, setShowing] = useState([]);

    useEffect(() => {
        if (!userId) {
            setGuide(GUIDE_OFF);
            return;
        }
        guideService.get().then((result) => setGuide(result.guide)).catch(() => setGuide(GUIDE_OFF));
    }, [userId]);

    const setOn = useCallback(async (on) => {
        setGuide((await guideService.set(on)).guide);
    }, []);

    const begin = (key) => {
        setShowing((now) => (now.includes(key) ? now : [...now, key]));
        if (guide.seen.includes(key)) return;
        setGuide((now) => ({ ...now, seen: [...now.seen, key] }));
        guideService.seen(key).then((result) => setGuide(result.guide)).catch(() => {});
    };
    const end = (key) => setShowing((now) => now.filter((item) => item !== key));

    const tip = (key, action = null) => {
        const known = GUIDE_TEXT[key];
        const due = guide.on && guide.steps.includes(key) && !guide.seen.includes(key);
        if (!known || (!due && !showing.includes(key))) return {};
        return {
            genie: {
                trigger: 'click',
                padding: 'none',
                backgroundColor: 'background',
                borderColor: 'tertiary',
                borderStyle: 'dotted',
                shadow: false,
                width: '250px',
                content: createElement(Container, { layout: 'flex-column', gap: 'xs', padding: 'sm', width: '100%' },
                    createElement(Typography, { size: 'xs', weight: 'semibold' }, known[0]),
                    createElement(Typography, { size: 'xs', color: 'muted' }, known[1]),
                    createElement(Container, { layout: 'flex', align: 'center', justify: 'between', gap: 'sm', padding: 'none', width: '100%', wrap: false },
                        createElement(Container, { layout: 'flex', align: 'center', gap: 'xs', padding: 'none', wrap: false },
                            createElement(Icon, { name: 'MdSupportAgent', size: 'xs', color: 'tertiary' }),
                            createElement(Typography, { size: 'xxs', color: 'tertiary' }, 'Helper')),
                        action ? createElement(Button, { size: 'xs', color: 'tertiary', onClick: action.run }, action.label) : null))
            },
            genieTrigger: 'click',
            onGenieShow: () => begin(key),
            onGenieHide: () => end(key)
        };
    };

    return createElement(GuideContext.Provider, { value: { ...guide, setOn, tip } }, children);
};

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
    getPublicCatalogue: (memoryMb, gpuMemoryMb) => api.get('/catalogue', { params: { memoryMb, gpuMemoryMb } }),

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
