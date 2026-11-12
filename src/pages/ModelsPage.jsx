import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Page, Container, Card, Typography, Button, Badge, Input, ProgressBar } from '@components/Components';
import { useNotification } from '@contexts/NotificationContext';
import { deviceService, modelService, describeError } from '../client/ai.client';

const TABS = [
    { id: 'discover', label: 'Discover' },
    { id: 'installed', label: 'Installed' },
    { id: 'running', label: 'Running' },
    { id: 'mine', label: 'My models' }
];

const PURPOSES = [
    { id: 'all', label: 'All' },
    { id: 'chat', label: 'Chat' },
    { id: 'writing', label: 'Writing' },
    { id: 'code', label: 'Code' },
    { id: 'reasoning', label: 'Reasoning' }
];

const PICK_LABELS = { fast: 'Fastest', balanced: 'Best balance', best: 'Best quality' };
const FIT_COLORS = { gpu: 'success', mixed: 'warning', cpu: 'warning', too_large: 'error' };
const RESUMABLE = ['DOWNLOAD_INTERRUPTED', 'OLLAMA_DOWN', 'DISK_FULL'];
const ABILITY_LABELS = { tools: 'Can use tools', vision: 'Can read images', thinking: 'Thinks step by step' };

const TEMPLATES = [
    {
        id: 'coding',
        label: 'Coding helper',
        displayName: 'Coding helper',
        system: 'You are a careful programming assistant. Explain what the code does before changing it, keep changes small, and say how to test them.',
        creativity: 0.2
    },
    {
        id: 'reviewer',
        label: 'Careful reviewer',
        displayName: 'Careful reviewer',
        system: 'You review work for mistakes. List each problem you find, say why it matters, and suggest a fix. If you find nothing wrong, say so plainly.',
        creativity: 0.1
    },
    {
        id: 'writer',
        label: 'Friendly writer',
        displayName: 'Friendly writer',
        system: 'You write in a warm, clear, plain style. Use short sentences and everyday words. Keep the meaning of what you are given.',
        creativity: 0.8
    },
    { id: 'blank', label: 'Blank', displayName: '', system: '', creativity: 0.7 }
];

const gb = (megabytes) => {
    if (megabytes === null || megabytes === undefined) return 'Unknown';
    const value = megabytes / 1024;
    return `${value >= 10 ? value.toFixed(0) : value.toFixed(1)} GB`;
};
const gbFromBytes = (bytes) => gb(bytes / (1024 * 1024));

const speedWords = (range) => {
    if (!range) return null;
    const label = range[0] >= 30 ? 'Fast' : range[0] >= 10 ? 'Comfortable' : range[0] >= 3 ? 'Slow' : 'Very slow';
    return `${label} (about ${range[0]} to ${range[1]} tokens a second)`;
};

const timeLeft = (seconds) => {
    if (seconds === null || seconds === undefined) return '';
    if (seconds < 60) return 'less than a minute left';
    if (seconds < 3600) return `about ${Math.ceil(seconds / 60)} min left`;
    return `about ${(seconds / 3600).toFixed(1)} hours left`;
};

const slug = (text) => text.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);

const Row = ({ children }) => (
    <Container layout="flex" justify="between" align="center" gap="md" padding="none" width="100%">{children}</Container>
);

const DownloadsPanel = ({ jobs, canManage, onResume, onPause, onCancel }) => {
    const order = { downloading: 0, queued: 1, paused: 2, failed: 3 };
    const open = jobs
        .filter((job) => job.status in order)
        .sort((a, b) => order[a.status] - order[b.status] || new Date(a.createdAt) - new Date(b.createdAt));
    if (open.length === 0) return null;

    return (
        <Card layout="flex-column" gap="md" padding="lg" width="100%" hover={false}>
            <Typography as="h2" size="lg" weight="bold">Downloads</Typography>
            <Typography size="sm" color="muted">Downloads carry on if you close this page.</Typography>
            {open.map((job) => (
                <Container key={job.id} layout="flex-column" gap="xs" padding="none" width="100%">
                    <Row>
                        <Typography weight="semibold">{job.model}</Typography>
                        <Typography size="sm" color="muted">
                            {job.status === 'queued' && 'Waiting for its turn'}
                            {job.status === 'paused' && `Paused at ${job.percent}%`}
                            {job.status === 'failed' && 'Stopped'}
                            {job.status === 'downloading' && job.stalled && `Waiting at ${job.percent}%`}
                            {job.status === 'downloading' && !job.stalled && [
                                `${job.percent}%`,
                                job.totalBytes ? `${gbFromBytes(job.completedBytes)} of ${gbFromBytes(job.totalBytes)}` : null,
                                job.speedBps ? `${(job.speedBps / 1048576).toFixed(1)} MB a second` : null,
                                timeLeft(job.etaSeconds)
                            ].filter(Boolean).join(' · ')}
                        </Typography>
                    </Row>
                    <ProgressBar
                        value={job.percent}
                        color={job.status === 'failed' ? 'error' : job.status === 'paused' || job.stalled ? 'warning' : 'primary'}
                        animated={job.status === 'downloading' && !job.stalled}
                        width="100%"
                    />
                    {job.stalled && (
                        <Typography size="sm" color="warning">
                            No data is arriving. Check the internet connection. The download carries on by itself when
                            the connection is back, or you can pause it.
                        </Typography>
                    )}
                    {job.error && (
                        <Typography size="sm" color="error">{job.error.message} {job.error.action}</Typography>
                    )}
                    {canManage && (
                        <Container layout="flex" gap="sm" padding="none">
                            {job.status === 'downloading' && (
                                <Button size="sm" color="secondary" onClick={() => onPause(job)}>Pause</Button>
                            )}
                            {(job.status === 'paused' || (job.status === 'failed' && RESUMABLE.includes(job.error?.code))) && (
                                <Button size="sm" onClick={() => onResume(job)}>Resume</Button>
                            )}
                            <Button size="sm" color="secondary" onClick={() => onCancel(job)}>
                                {job.status === 'failed' ? 'Remove from list' : 'Cancel'}
                            </Button>
                        </Container>
                    )}
                </Container>
            ))}
        </Card>
    );
};

const CatalogueCard = ({ model, job, canManage, ollamaUp, onDownload }) => {
    const busy = job && ['queued', 'downloading'].includes(job.status);
    let action = null;

    if (model.installed) action = <Badge color="success">Installed</Badge>;
    else if (busy) action = <Badge color="primary">{job.status === 'queued' ? 'Waiting' : `Downloading ${job.percent}%`}</Badge>;
    else if (!model.fit.fits) action = <Badge color="error">Too large for this device</Badge>;
    else if (!model.fitsDisk) action = <Badge color="error">Not enough disk space</Badge>;
    else if (canManage) {
        action = (
            <Button onClick={() => onDownload(model.tag)} disabled={!ollamaUp}>
                {job?.status === 'paused' || job?.status === 'failed' ? 'Resume download' : 'Download'}
            </Button>
        );
    }

    return (
        <Card layout="flex-column" gap="sm" padding="lg" width="100%" hover={false}>
            <Row>
                <Container layout="flex" gap="sm" padding="none" align="center">
                    <Typography as="h3" size="lg" weight="bold">{model.name}</Typography>
                    {model.pick && <Badge color="primary">{PICK_LABELS[model.pick]}</Badge>}
                </Container>
                {action}
            </Row>
            <Typography>{model.description}</Typography>
            <Container layout="flex" gap="xs" padding="none" align="center">
                <Badge color={FIT_COLORS[model.fit.verdict]}>{model.fit.label}</Badge>
                <Typography size="sm" color="muted">
                    {[`${gb(model.sizeMb)} download`, ...model.capabilities.map((ability) => ABILITY_LABELS[ability]).filter(Boolean)].join(' · ')}
                </Typography>
            </Container>
            {model.fit.tokensPerSecond && (
                <Typography size="sm" color="muted">Speed on this device: {speedWords(model.fit.tokensPerSecond)}</Typography>
            )}
        </Card>
    );
};

const DiscoverTab = ({ catalogue, jobs, canManage, ollamaUp, onDownload }) => {
    const [purpose, setPurpose] = useState('all');
    const [customName, setCustomName] = useState('');

    if (!catalogue) return <Typography color="muted">Working out which models fit this device…</Typography>;

    const jobFor = (tag) => jobs.find((job) => job.model === tag && job.status !== 'completed' && job.status !== 'cancelled');
    const shown = catalogue.models.filter((model) => purpose === 'all' || model.goodFor.includes(purpose));
    const recommended = shown.filter((model) => model.pick);
    const others = shown.filter((model) => !model.pick);
    const card = (model) => (
        <CatalogueCard
            key={model.tag}
            model={model}
            job={jobFor(model.tag)}
            canManage={canManage}
            ollamaUp={ollamaUp}
            onDownload={onDownload}
        />
    );

    return (
        <Container layout="flex-column" gap="md" padding="none" width="100%">
            <Container layout="flex" gap="xs" padding="none" align="center">
                {PURPOSES.map((option) => (
                    <Button
                        key={option.id}
                        size="sm"
                        color={purpose === option.id ? 'primary' : 'secondary'}
                        selected={purpose === option.id}
                        onClick={() => setPurpose(option.id)}
                    >
                        {option.label}
                    </Button>
                ))}
            </Container>

            {!canManage && (
                <Typography size="sm" color="muted">Only an admin or owner can download models.</Typography>
            )}

            {recommended.length > 0 && (
                <>
                    <Typography as="h2" size="xl" weight="bold">Recommended for this device</Typography>
                    {recommended.map(card)}
                </>
            )}

            {catalogue.models.every((model) => !model.pick) && (
                <Typography color="muted">
                    None of the listed models is a comfortable fit for this device. Smaller ones may still run slowly.
                </Typography>
            )}

            {others.length > 0 && <Typography as="h2" size="xl" weight="bold">All models</Typography>}
            {others.map(card)}

            {canManage && (
                <Card layout="flex-column" gap="sm" padding="lg" width="100%" hover={false}>
                    <Typography as="h3" size="lg" weight="bold">Add a model by name</Typography>
                    <Typography size="sm" color="muted">
                        For a model that is not listed here. Type its name exactly as Ollama lists it, for example
                        llama3.2:1b. AI Base cannot tell in advance whether it will fit.
                    </Typography>
                    <Input
                        label="Model name"
                        value={customName}
                        onChange={(event) => setCustomName(event.target.value)}
                        width="100%"
                    />
                    <Container layout="flex" gap="sm" padding="none">
                        <Button
                            disabled={!customName.trim() || !ollamaUp}
                            onClick={() => { onDownload(customName.trim()); setCustomName(''); }}
                        >
                            Download
                        </Button>
                    </Container>
                </Card>
            )}
        </Container>
    );
};

const InstalledTab = ({ installed, canManage, onDelete }) => {
    if (!installed) return <Typography color="muted">Looking for installed models…</Typography>;
    if (!installed.ollamaAvailable) {
        return <Typography color="muted">Installed models cannot be listed while Ollama is not running.</Typography>;
    }

    return (
        <Container layout="flex-column" gap="md" padding="none" width="100%">
            <Typography color="muted">
                Models use {gb(installed.disk.usedByModelsMb)} of disk. {gb(installed.disk.freeMb)} is free.
            </Typography>

            {installed.models.length === 0 && (
                <Card layout="flex-column" gap="sm" padding="lg" width="100%" hover={false}>
                    <Typography weight="semibold">No models are installed yet.</Typography>
                    <Typography color="muted">Open Discover to download one that fits this device.</Typography>
                </Card>
            )}

            {installed.models.map((model) => (
                <Card key={model.name} layout="flex-column" gap="sm" padding="lg" width="100%" hover={false}>
                    <Row>
                        <Container layout="flex-column" gap="none" padding="none">
                            <Typography as="h3" size="lg" weight="bold">{model.displayName}</Typography>
                            {model.displayName !== model.name && <Typography size="sm" color="muted">{model.name}</Typography>}
                        </Container>
                        {canManage && <Button color="secondary" onClick={() => onDelete(model)}>Delete</Button>}
                    </Row>
                    {model.description && <Typography>{model.description}</Typography>}
                    <Container layout="flex" gap="xs" padding="none" align="center">
                        {model.personal && <Badge color="primary">Your model, based on {model.basedOn}</Badge>}
                        <Typography size="sm" color="muted">
                            {[`${gbFromBytes(model.sizeBytes)} on disk`, ...model.capabilities.map((ability) => ABILITY_LABELS[ability]).filter(Boolean)].join(' · ')}
                        </Typography>
                    </Container>
                    <Typography size="sm" color="muted">
                        {[
                            model.parameterSize ? `Size: ${model.parameterSize}` : null,
                            model.quantization ? `Compression: ${model.quantization}` : null,
                            model.contextLength ? `Reads up to ${model.contextLength.toLocaleString()} tokens at once` : null
                        ].filter(Boolean).join(' · ')}
                    </Typography>
                </Card>
            ))}
        </Container>
    );
};

const RunningTab = ({ running, canManage, onUnload }) => {
    if (!running) return <Typography color="muted">Checking what is loaded…</Typography>;
    if (running.unavailable) {
        return <Typography color="muted">Loaded models cannot be listed while Ollama is not running.</Typography>;
    }
    if (running.models.length === 0) {
        return (
            <Card layout="flex-column" gap="sm" padding="lg" width="100%" hover={false}>
                <Typography weight="semibold">No model is loaded in memory.</Typography>
                <Typography color="muted">A model loads when it is used and is unloaded again after a few minutes.</Typography>
            </Card>
        );
    }

    return (
        <Container layout="flex-column" gap="md" padding="none" width="100%">
            {running.models.map((model) => (
                <Card key={model.name} layout="flex-column" gap="sm" padding="lg" width="100%" hover={false}>
                    <Row>
                        <Typography as="h3" size="lg" weight="bold">{model.displayName}</Typography>
                        {canManage && <Button color="secondary" onClick={() => onUnload(model)}>Unload</Button>}
                    </Row>
                    <Container layout="flex" gap="xs" padding="none" align="center">
                        {model.healthy && <Badge color="success">Fully on GPU</Badge>}
                        {!model.healthy && model.gpuPercent > 0 && (
                            <Badge color="warning">Partly on CPU, so slower ({model.gpuPercent}% on GPU)</Badge>
                        )}
                        {model.gpuPercent === 0 && <Badge color="warning">On the processor, so slower</Badge>}
                        <Typography size="sm" color="muted">{gbFromBytes(model.sizeBytes)} in memory</Typography>
                    </Container>
                </Card>
            ))}
        </Container>
    );
};

const MineTab = ({ installed, canManage, onCreated, onDelete }) => {
    const { success, error: notifyError } = useNotification();
    const [template, setTemplate] = useState(null);
    const [form, setForm] = useState({ displayName: '', from: '', system: '', creativity: 0.7, contextSize: '' });
    const [advanced, setAdvanced] = useState(false);
    const [busy, setBusy] = useState(false);

    if (!installed) return <Typography color="muted">Looking for installed models…</Typography>;

    const bases = installed.models.filter((model) => !model.personal);
    const mine = installed.models.filter((model) => model.personal);

    const choose = (option) => {
        setTemplate(option.id);
        setForm({
            displayName: option.displayName,
            from: bases[0]?.name || '',
            system: option.system,
            creativity: option.creativity,
            contextSize: ''
        });
        setAdvanced(false);
    };

    const change = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

    const create = async () => {
        const name = slug(form.displayName);
        if (!name) {
            notifyError('Give your model a name using letters or numbers.');
            return;
        }
        const parameters = { temperature: Number(form.creativity) };
        if (form.contextSize !== '') {
            const size = Number(form.contextSize);
            if (!Number.isInteger(size) || size < 512 || size > 262144) {
                notifyError('Reading size must be a whole number from 512 to 262144.');
                return;
            }
            parameters.num_ctx = size;
        }

        setBusy(true);
        try {
            await modelService.createModel({
                name,
                displayName: form.displayName.trim(),
                from: form.from,
                system: form.system,
                parameters
            });
            success(`${form.displayName.trim()} is ready. It is in your Installed list.`);
            setTemplate(null);
            onCreated();
        } catch (error) {
            notifyError(describeError(error));
        } finally {
            setBusy(false);
        }
    };

    return (
        <Container layout="flex-column" gap="md" padding="none" width="100%">
            <Typography color="muted">
                A personal model is an installed model with your own instructions built in, saved under its own name.
                It takes almost no extra disk space.
            </Typography>

            {!canManage && <Typography size="sm" color="muted">Only an admin or owner can create personal models.</Typography>}

            {canManage && bases.length === 0 && (
                <Card layout="flex-column" gap="sm" padding="lg" width="100%" hover={false}>
                    <Typography weight="semibold">Install a model first.</Typography>
                    <Typography color="muted">A personal model is built on one you have downloaded. Open Discover to get one.</Typography>
                </Card>
            )}

            {canManage && bases.length > 0 && (
                <Card layout="flex-column" gap="md" padding="lg" width="100%" hover={false}>
                    <Typography as="h3" size="lg" weight="bold">Start from</Typography>
                    <Container layout="flex" gap="xs" padding="none" align="center">
                        {TEMPLATES.map((option) => (
                            <Button
                                key={option.id}
                                size="sm"
                                color={template === option.id ? 'primary' : 'secondary'}
                                selected={template === option.id}
                                onClick={() => choose(option)}
                            >
                                {option.label}
                            </Button>
                        ))}
                    </Container>

                    {template && (
                        <>
                            <Input label="Name" value={form.displayName} onChange={change('displayName')} width="100%" />
                            <Container layout="flex-column" gap="xs" padding="none" width="100%">
                                <Typography as="label" size="sm" weight="semibold" htmlFor="base-model">Built on</Typography>
                                <select
                                    id="base-model"
                                    value={form.from}
                                    onChange={change('from')}
                                    style={{
                                        width: '100%',
                                        padding: '0.6rem',
                                        borderRadius: '0.5rem',
                                        border: '1px solid var(--border-color)',
                                        background: 'var(--background-color)',
                                        color: 'var(--text-color)',
                                        font: 'inherit'
                                    }}
                                >
                                    {bases.map((model) => (
                                        <option key={model.name} value={model.name}>{model.displayName}</option>
                                    ))}
                                </select>
                            </Container>
                            <Input
                                label="Instructions"
                                helpText="How this model should behave every time it is used."
                                multiline
                                rows={5}
                                value={form.system}
                                onChange={change('system')}
                                width="100%"
                            />
                            <Container layout="flex-column" gap="xs" padding="none" width="100%">
                                <Typography as="label" size="sm" weight="semibold" htmlFor="creativity">
                                    Creativity: {Number(form.creativity) <= 0.3 ? 'Precise' : Number(form.creativity) <= 0.9 ? 'Balanced' : 'Inventive'}
                                </Typography>
                                <input
                                    id="creativity"
                                    type="range"
                                    min="0"
                                    max="1.5"
                                    step="0.1"
                                    value={form.creativity}
                                    onChange={change('creativity')}
                                    style={{ width: '100%' }}
                                />
                            </Container>
                            <Container layout="flex" gap="sm" padding="none">
                                <Button size="sm" color="secondary" onClick={() => setAdvanced((open) => !open)}>
                                    {advanced ? 'Hide advanced' : 'Advanced'}
                                </Button>
                            </Container>
                            {advanced && (
                                <Input
                                    label="Reading size in tokens (optional)"
                                    helpText="How much text the model can take in at once. Leave empty to use the model's own setting. Larger uses more memory."
                                    value={form.contextSize}
                                    onChange={change('contextSize')}
                                    width="100%"
                                />
                            )}
                            <Container layout="flex" gap="sm" padding="none">
                                <Button onClick={create} disabled={busy || !form.displayName.trim() || !form.from}>
                                    {busy ? 'Creating…' : 'Create model'}
                                </Button>
                                <Button color="secondary" onClick={() => setTemplate(null)} disabled={busy}>Cancel</Button>
                            </Container>
                        </>
                    )}
                </Card>
            )}

            {mine.length > 0 && <Typography as="h2" size="xl" weight="bold">Your models</Typography>}
            {mine.map((model) => (
                <Card key={model.name} layout="flex-column" gap="sm" padding="lg" width="100%" hover={false}>
                    <Row>
                        <Container layout="flex-column" gap="none" padding="none">
                            <Typography as="h3" size="lg" weight="bold">{model.displayName}</Typography>
                            <Typography size="sm" color="muted">Built on {model.basedOn}</Typography>
                        </Container>
                        {canManage && <Button color="secondary" onClick={() => onDelete(model)}>Delete</Button>}
                    </Row>
                </Card>
            ))}
        </Container>
    );
};

const ModelsPage = () => {
    const { success, error: notifyError, confirm } = useNotification();
    const [tab, setTab] = useState('discover');
    const [device, setDevice] = useState(null);
    const [catalogue, setCatalogue] = useState(null);
    const [installed, setInstalled] = useState(null);
    const [running, setRunning] = useState(null);
    const [jobs, setJobs] = useState([]);
    const [canManage, setCanManage] = useState(false);
    const statuses = useRef(new Map());

    const loadInstalled = useCallback(async () => {
        try {
            const result = await modelService.listInstalled();
            setInstalled(result);
            setCanManage(Boolean(result.permissions?.manage));
        } catch (error) {
            notifyError(describeError(error, 'Installed models could not be loaded.'));
        }
    }, [notifyError]);

    const loadCatalogue = useCallback(async (deviceId) => {
        try {
            setCatalogue(await modelService.getDeviceCatalogue(deviceId));
        } catch (error) {
            notifyError(describeError(error, 'The model list could not be loaded.'));
        }
    }, [notifyError]);

    const loadRunning = useCallback(async () => {
        try {
            setRunning(await modelService.listRunning());
        } catch (error) {
            setRunning({ unavailable: true, models: [] });
        }
    }, []);

    const refresh = useCallback(() => {
        loadInstalled();
        if (device) loadCatalogue(device.id);
    }, [device, loadInstalled, loadCatalogue]);

    useEffect(() => {
        (async () => {
            try {
                const result = await deviceService.listDevices();
                setDevice(result.devices[0]);
                loadCatalogue(result.devices[0].id);
            } catch (error) {
                notifyError(describeError(error, 'This device could not be read.'));
            }
        })();
        loadInstalled();
    }, [loadCatalogue, loadInstalled, notifyError]);

    useEffect(() => {
        if (tab !== 'running') return undefined;
        loadRunning();
        const timer = setInterval(loadRunning, 5000);
        return () => clearInterval(timer);
    }, [tab, loadRunning]);

    const refreshRef = useRef(() => {});
    useEffect(() => {
        refreshRef.current = refresh;
    }, [refresh]);

    useEffect(() => {
        const reload = () => {
            refreshRef.current();
            loadRunning();
        };
        window.addEventListener('ollama-availability-changed', reload);
        return () => window.removeEventListener('ollama-availability-changed', reload);
    }, [loadRunning]);

    const noteJob = useCallback((job) => {
        const before = statuses.current.get(job.id);
        statuses.current.set(job.id, job.status);
        if (before && before !== 'completed' && job.status === 'completed') {
            success(`${job.model} has finished downloading.`);
            refreshRef.current();
        }
    }, [success]);

    useEffect(() => {
        let poll = null;
        const loadJobs = async () => {
            try {
                const result = await modelService.listDownloads();
                result.downloads.forEach(noteJob);
                setJobs(result.downloads);
            } catch {
                return;
            }
        };
        const stop = modelService.watchDownloads({
            onSnapshot: (list) => {
                list.forEach((job) => statuses.current.set(job.id, job.status));
                setJobs(list);
                window.dispatchEvent(new CustomEvent('ollama-status-changed'));
            },
            onProgress: (job) => {
                noteJob(job);
                setJobs((current) => (current.some((existing) => existing.id === job.id)
                    ? current.map((existing) => (existing.id === job.id ? job : existing))
                    : [job, ...current]));
            },
            onError: () => {
                if (!poll) poll = setInterval(loadJobs, 3000);
            }
        });
        return () => {
            stop();
            if (poll) clearInterval(poll);
        };
    }, [noteJob]);

    const act = async (action, failMessage) => {
        try {
            const result = await action();
            window.dispatchEvent(new CustomEvent('ollama-status-changed'));
            return result;
        } catch (error) {
            notifyError(describeError(error, failMessage));
            return null;
        }
    };

    const applyJob = (result) => {
        const job = result?.download;
        if (!job) return;
        statuses.current.set(job.id, job.status);
        setJobs((current) => (current.some((existing) => existing.id === job.id)
            ? current.map((existing) => (existing.id === job.id ? job : existing))
            : [job, ...current]));
    };

    const download = async (name) => applyJob(await act(() => modelService.startDownload(name), 'The download could not be started.'));
    const pause = async (job) => applyJob(await act(() => modelService.pauseDownload(job.id), 'The download could not be paused.'));
    const cancel = async (job) => {
        if (job.status === 'failed') {
            applyJob(await act(() => modelService.cancelDownload(job.id), 'The download could not be removed.'));
            return;
        }
        if (!(await confirm(`Cancel the download of ${job.model}?`, { confirmLabel: 'Cancel download', cancelLabel: 'Keep downloading' }))) return;
        applyJob(await act(() => modelService.cancelDownload(job.id), 'The download could not be cancelled.'));
    };

    const deleteModel = async (model) => {
        const dependants = model.usedBy?.length
            ? ` These personal models are built on it and will stop working: ${model.usedBy.join(', ')}.`
            : '';
        const agreed = await confirm(
            `Delete ${model.displayName} from this device? You can download it again later.${dependants}`,
            { confirmLabel: 'Delete', color: 'error' }
        );
        if (!agreed) return;
        const result = await act(() => modelService.deleteModel(model.name), 'The model could not be deleted.');
        if (result) {
            success(`${model.displayName} was deleted.`);
            refresh();
        }
    };

    const unload = async (model) => {
        const result = await act(() => modelService.unloadModel(model.name), 'The model could not be unloaded.');
        if (result) {
            success(`${model.displayName} was removed from memory.`);
            loadRunning();
        }
    };

    const ollamaUp = installed ? installed.ollamaAvailable : true;
    const counts = useMemo(() => ({ installed: installed?.models.length ?? null }), [installed]);

    return (
        <Page layout="flex-column" align="center" gap="lg" padding="lg">
            <Container layout="flex-column" gap="lg" padding="none" width="100%" maxWidth="760px">
                <Container layout="flex-column" gap="xs" padding="none">
                    <Typography as="h1" size="3xl" weight="bold" font="secondary" color="primary">Models</Typography>
                    <Typography color="muted">
                        {device ? `Find, download and manage AI models on ${device.name}.` : 'Find, download and manage AI models.'}
                    </Typography>
                </Container>

                <DownloadsPanel jobs={jobs} canManage={canManage} onResume={(job) => download(job.model)} onPause={pause} onCancel={cancel} />

                <Container layout="flex" gap="xs" padding="none" align="center">
                    {TABS.map((option) => (
                        <Button
                            key={option.id}
                            color={tab === option.id ? 'primary' : 'secondary'}
                            selected={tab === option.id}
                            onClick={() => setTab(option.id)}
                        >
                            {option.label}{option.id === 'installed' && counts.installed !== null ? ` (${counts.installed})` : ''}
                        </Button>
                    ))}
                </Container>

                {tab === 'discover' && (
                    <DiscoverTab catalogue={catalogue} jobs={jobs} canManage={canManage} ollamaUp={ollamaUp} onDownload={download} />
                )}
                {tab === 'installed' && <InstalledTab installed={installed} canManage={canManage} onDelete={deleteModel} />}
                {tab === 'running' && <RunningTab running={running} canManage={canManage} onUnload={unload} />}
                {tab === 'mine' && (
                    <MineTab installed={installed} canManage={canManage} onCreated={refresh} onDelete={deleteModel} />
                )}
            </Container>
        </Page>
    );
};

export default ModelsPage;
