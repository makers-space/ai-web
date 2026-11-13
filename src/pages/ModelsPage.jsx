import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Page, Container, Card, Typography, Button, ButtonGroup, Badge, Icon, Input, Select, ProgressBar } from '@components/Components';
import { useNotification } from '@contexts/NotificationContext';
import { deviceService, modelService, describeError, useGuide } from '../client/ai.client';

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

const CREATIVITY = [
    { label: 'Precise', value: 0.2 },
    { label: 'Balanced', value: 0.7 },
    { label: 'Inventive', value: 1.2 }
];
const creativityOf = (value) => (Number(value) <= 0.3 ? 'Precise' : Number(value) <= 0.9 ? 'Balanced' : 'Inventive');

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
    <Container layout="flex" justify="between" align="center" gap="sm" padding="none" width="100%" wrap={false}>{children}</Container>
);

const Stat = ({ icon, label, value, note }) => (
    <Card layout="flex" align="center" gap="sm" padding="sm" hover={false} shadow={false} wrap={false} width="100%">
        <Icon name={icon} size="sm" color="primary" />
        <Container layout="flex-column" gap="none" padding="none" minWidth="0">
            <Typography size="xxs" color="muted">{label}</Typography>
            <Typography size="sm" weight="semibold" truncate>{value}</Typography>
            {note && <Typography size="xxs" color="muted" truncate>{note}</Typography>}
        </Container>
    </Card>
);

const SectionTitle = ({ icon, title, count, children }) => (
    <Row>
        <Container layout="flex" align="center" gap="xs" padding="none" wrap={false}>
            <Icon name={icon} size="xs" color="primary" />
            <Typography as="h2" size="sm" weight="semibold">{title}</Typography>
            {count !== undefined && <Badge size="xs" color="secondary">{count}</Badge>}
        </Container>
        {children}
    </Row>
);

const Empty = ({ icon, title, text }) => (
    <Card layout="flex" align="center" gap="sm" padding="md" width="100%" hover={false} shadow={false} wrap={false}>
        <Icon name={icon} size="sm" color="secondary" />
        <Container layout="flex-column" gap="none" padding="none">
            <Typography size="sm" weight="semibold">{title}</Typography>
            <Typography size="xs" color="muted">{text}</Typography>
        </Container>
    </Card>
);

const abilities = (model) => model.capabilities.map((ability) => ABILITY_LABELS[ability]).filter(Boolean);

const DownloadsPanel = ({ jobs, canManage, onResume, onPause, onCancel }) => {
    const order = { downloading: 0, queued: 1, paused: 2, failed: 3 };
    const open = jobs
        .filter((job) => job.status in order)
        .sort((a, b) => order[a.status] - order[b.status] || new Date(a.createdAt) - new Date(b.createdAt));
    if (open.length === 0) return null;

    return (
        <Card layout="flex-column" gap="sm" padding="md" width="100%" hover={false}>
            <SectionTitle icon="FiDownload" title="Downloads" count={open.length}>
                <Typography size="xxs" color="muted">They carry on if you close this page.</Typography>
            </SectionTitle>
            <Container layout="grid" columns="auto-lg" gap="sm" padding="none" width="100%">
                {open.map((job) => (
                    <Container key={job.id} layout="flex-column" gap="xs" padding="none" width="100%" minWidth="0">
                        <Row>
                            <Typography size="xs" weight="semibold" truncate>{job.model}</Typography>
                            <Typography size="xxs" color="muted">
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
                            size="sm"
                            color={job.status === 'failed' ? 'error' : job.status === 'paused' || job.stalled ? 'warning' : 'primary'}
                            animated={job.status === 'downloading' && !job.stalled}
                            width="100%"
                        />
                        {job.stalled && (
                            <Typography size="xxs" color="warning">
                                No data is arriving. Check the internet connection. The download carries on by itself when
                                the connection is back, or you can pause it.
                            </Typography>
                        )}
                        {job.error && <Typography size="xxs" color="error">{job.error.message} {job.error.action}</Typography>}
                        {canManage && (
                            <Container layout="flex" gap="xs" padding="none">
                                {job.status === 'downloading' && (
                                    <Button size="xs" color="secondary" onClick={() => onPause(job)}>Pause</Button>
                                )}
                                {(job.status === 'paused' || (job.status === 'failed' && RESUMABLE.includes(job.error?.code))) && (
                                    <Button size="xs" onClick={() => onResume(job)}>Resume</Button>
                                )}
                                <Button size="xs" color="secondary" onClick={() => onCancel(job)}>
                                    {job.status === 'failed' ? 'Remove from list' : 'Cancel'}
                                </Button>
                            </Container>
                        )}
                    </Container>
                ))}
            </Container>
        </Card>
    );
};

const CatalogueCard = ({ model, job, canManage, ollamaUp, onDownload }) => {
    const guide = useGuide();
    const busy = job && ['queued', 'downloading'].includes(job.status);
    let action = null;

    if (model.installed) action = <Badge size="xs" color="success">Installed</Badge>;
    else if (busy) action = <Badge size="xs" color="primary">{job.status === 'queued' ? 'Waiting' : `Downloading ${job.percent}%`}</Badge>;
    else if (!model.fit.fits) action = <Badge size="xs" color="error">Too large</Badge>;
    else if (!model.fitsDisk) action = <Badge size="xs" color="error">Not enough disk</Badge>;
    else if (canManage) {
        action = (
            <Button size="xs" onClick={() => onDownload(model.tag)} disabled={!ollamaUp} {...guide.tip('models.download')}>
                <Icon name="FiDownload" size="xs" />
                {job?.status === 'paused' || job?.status === 'failed' ? 'Resume' : 'Download'}
            </Button>
        );
    }

    return (
        <Card layout="flex-column" gap="xs" padding="md" width="100%" height="100%" minWidth="0" wrap={false}>
            <Row>
                <Typography as="h3" size="sm" weight="semibold" truncate title={model.name}>{model.name}</Typography>
                {model.pick && <Badge size="xs" color="primary">{PICK_LABELS[model.pick]}</Badge>}
            </Row>
            <Typography size="xs" color="muted">{model.description}</Typography>
            <Container layout="flex" gap="xs" padding="none" align="center">
                <Badge size="xs" color={FIT_COLORS[model.fit.verdict]}>{model.fit.label}</Badge>
                {abilities(model).map((ability) => <Badge key={ability} size="xs" color="secondary">{ability}</Badge>)}
            </Container>
            <Container padding="none" flexFill />
            <Row>
                <Container padding="none" flexFill minWidth="0">
                    <Typography size="xxs" color="muted" truncate>
                        {[`${gb(model.sizeMb)}`, model.fit.tokensPerSecond ? speedWords(model.fit.tokensPerSecond) : null].filter(Boolean).join(' · ')}
                    </Typography>
                </Container>
                {action}
            </Row>
        </Card>
    );
};

const DiscoverTab = ({ catalogue, jobs, canManage, ollamaUp, onDownload }) => {
    const [purpose, setPurpose] = useState('all');
    const [customName, setCustomName] = useState('');

    if (!catalogue) return <Typography size="xs" color="muted">Working out which models fit this device…</Typography>;

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
            <Row>
                <ButtonGroup size="xs" justify="start" wrap={false} selectable={false}>
                    {PURPOSES.map((option) => (
                        <Button
                            key={option.id}
                            size="xs"
                            color={purpose === option.id ? 'primary' : 'secondary'}
                            selected={purpose === option.id}
                            onClick={() => setPurpose(option.id)}
                        >
                            {option.label}
                        </Button>
                    ))}
                </ButtonGroup>
                {!canManage && <Typography size="xxs" color="muted">Only an admin or owner can download models.</Typography>}
            </Row>

            {recommended.length > 0 && (
                <>
                    <SectionTitle icon="FiStar" title="Recommended for this device" count={recommended.length} />
                    <Container layout="grid" columns="auto-lg" gap="sm" padding="none" width="100%" align="stretch">{recommended.map(card)}</Container>
                </>
            )}

            {catalogue.models.every((model) => !model.pick) && (
                <Typography size="xs" color="muted">
                    None of the listed models is a comfortable fit for this device. Smaller ones may still run slowly.
                </Typography>
            )}

            {others.length > 0 && (
                <>
                    <SectionTitle icon="FiGrid" title="All models" count={others.length} />
                    <Container layout="grid" columns="auto-lg" gap="sm" padding="none" width="100%" align="stretch">{others.map(card)}</Container>
                </>
            )}

            {canManage && (
                <Card layout="flex-column" gap="xs" padding="md" width="100%" hover={false} shadow={false}>
                    <SectionTitle icon="FiPlus" title="Add a model by name" />
                    <Typography size="xxs" color="muted">
                        For a model that is not listed. Type its name exactly as Ollama lists it, for example llama3.2:1b.
                        AI Base cannot tell in advance whether it will fit.
                    </Typography>
                    <Container layout="flex" gap="xs" padding="none" align="center" width="100%" wrap={false}>
                        <Input
                            size="sm"
                            placeholder="Model name"
                            value={customName}
                            onChange={(event) => setCustomName(event.target.value)}
                            width="100%"
                            flexFill
                        />
                        <Button
                            size="sm"
                            disabled={!customName.trim() || !ollamaUp}
                            onClick={() => { onDownload(customName.trim()); setCustomName(''); }}
                        >
                            <Icon name="FiDownload" size="xs" />Download
                        </Button>
                    </Container>
                </Card>
            )}
        </Container>
    );
};

const InstalledTab = ({ installed, canManage, onDelete }) => {
    if (!installed) return <Typography size="xs" color="muted">Looking for installed models…</Typography>;
    if (!installed.ollamaAvailable) {
        return <Empty icon="FiAlertCircle" title="Ollama is not running" text="Installed models cannot be listed until it is started." />;
    }
    if (installed.models.length === 0) {
        return <Empty icon="FiBox" title="No models are installed yet" text="Open Discover to download one that fits this device." />;
    }

    return (
        <Container layout="grid" columns="auto-lg" gap="sm" padding="none" width="100%">
            {installed.models.map((model) => (
                <Card key={model.name} layout="flex-column" gap="xs" padding="md" width="100%" height="100%" minWidth="0" wrap={false}>
                    <Row>
                        <Typography as="h3" size="sm" weight="semibold" truncate title={model.displayName}>{model.displayName}</Typography>
                        {canManage && (
                            <Button size="xxs" variant="ghost" color="error" title="Delete" aria-label={`Delete ${model.displayName}`} onClick={() => onDelete(model)}>
                                <Icon name="FiTrash2" />
                            </Button>
                        )}
                    </Row>
                    {model.displayName !== model.name && <Typography size="xxs" color="muted" truncate>{model.name}</Typography>}
                    {model.description && <Typography size="xs" color="muted">{model.description}</Typography>}
                    <Container layout="flex" gap="xs" padding="none" align="center">
                        {model.personal && <Badge size="xs" color="primary">Yours, on {model.basedOn}</Badge>}
                        {abilities(model).map((ability) => <Badge key={ability} size="xs" color="secondary">{ability}</Badge>)}
                    </Container>
                    <Typography size="xxs" color="muted">
                        {[
                            `${gbFromBytes(model.sizeBytes)} on disk`,
                            model.parameterSize,
                            model.quantization,
                            model.contextLength ? `reads ${model.contextLength.toLocaleString()} tokens` : null
                        ].filter(Boolean).join(' · ')}
                    </Typography>
                </Card>
            ))}
        </Container>
    );
};

const RunningTab = ({ running, canManage, onUnload }) => {
    if (!running) return <Typography size="xs" color="muted">Checking what is loaded…</Typography>;
    if (running.unavailable) {
        return <Empty icon="FiAlertCircle" title="Ollama is not running" text="Loaded models cannot be listed until it is started." />;
    }
    if (running.models.length === 0) {
        return <Empty icon="FiMoon" title="No model is loaded in memory" text="A model loads when it is used and is unloaded again after a few minutes." />;
    }

    return (
        <Container layout="grid" columns="auto-lg" gap="sm" padding="none" width="100%">
            {running.models.map((model) => (
                <Card key={model.name} layout="flex-column" gap="xs" padding="md" width="100%" minWidth="0" wrap={false}>
                    <Row>
                        <Typography as="h3" size="sm" weight="semibold" truncate>{model.displayName}</Typography>
                        {canManage && <Button size="xs" color="secondary" onClick={() => onUnload(model)}>Unload</Button>}
                    </Row>
                    <Container layout="flex" gap="xs" padding="none" align="center">
                        {model.healthy && <Badge size="xs" color="success">Fully on GPU</Badge>}
                        {!model.healthy && model.gpuPercent > 0 && (
                            <Badge size="xs" color="warning">Partly on CPU, so slower ({model.gpuPercent}% on GPU)</Badge>
                        )}
                        {model.gpuPercent === 0 && <Badge size="xs" color="warning">On the processor, so slower</Badge>}
                        <Typography size="xxs" color="muted">{gbFromBytes(model.sizeBytes)} in memory</Typography>
                    </Container>
                </Card>
            ))}
        </Container>
    );
};

const EMPTY_MODEL_FORM = { displayName: '', from: '', system: '', creativity: 0.7, contextSize: '' };

const ModelFields = ({ form, setForm, bases }) => {
    const [advanced, setAdvanced] = useState(form.contextSize !== '');
    const change = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
    return (
        <>
            <Input label="Name" value={form.displayName} onChange={change('displayName')} width="100%" />
            <Select
                label="Built on"
                width="100%"
                options={bases.map((model) => ({ value: model.name, label: model.displayName }))}
                value={form.from}
                onChange={(value) => setForm((current) => ({ ...current, from: value }))}
            />
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
                <Typography size="sm" weight="semibold">Creativity</Typography>
                <ButtonGroup size="sm" width="100%" wrap={false} justify="start" selectable={false}>
                    {CREATIVITY.map((level) => (
                        <Button
                            key={level.label}
                            size="sm"
                            color={creativityOf(form.creativity) === level.label ? 'primary' : 'secondary'}
                            selected={creativityOf(form.creativity) === level.label}
                            onClick={() => setForm((current) => ({ ...current, creativity: level.value }))}
                        >
                            {level.label}
                        </Button>
                    ))}
                </ButtonGroup>
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
        </>
    );
};

const MineTab = ({ installed, canManage, onCreated, onDelete }) => {
    const { success, error: notifyError } = useNotification();
    const [template, setTemplate] = useState(null);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(EMPTY_MODEL_FORM);
    const [busy, setBusy] = useState(false);

    if (!installed) return <Typography color="muted">Looking for installed models…</Typography>;

    const bases = installed.models.filter((model) => !model.personal);
    const mine = installed.models.filter((model) => model.personal);

    const choose = (option) => {
        setEditing(null);
        setTemplate(option.id);
        setForm({ ...EMPTY_MODEL_FORM, displayName: option.displayName, from: bases[0]?.name || '', system: option.system, creativity: option.creativity });
    };

    const startEdit = (model) => {
        setTemplate(null);
        setEditing(model.name);
        setForm({
            displayName: model.displayName,
            from: bases.find((base) => base.name === model.basedOn || base.name === `${model.basedOn}:latest`)?.name || model.basedOn || '',
            system: model.system || '',
            creativity: model.parameters?.temperature ?? 0.7,
            contextSize: model.parameters?.num_ctx ? String(model.parameters.num_ctx) : ''
        });
    };

    const parametersOf = () => {
        const parameters = { temperature: Number(form.creativity) };
        if (form.contextSize === '') return parameters;
        const size = Number(form.contextSize);
        if (!Number.isInteger(size) || size < 512 || size > 262144) {
            notifyError('Reading size must be a whole number from 512 to 262144.');
            return null;
        }
        return { ...parameters, num_ctx: size };
    };

    const run = async (work, done) => {
        setBusy(true);
        try {
            await work();
            success(done);
            setTemplate(null);
            setEditing(null);
            onCreated();
        } catch (error) {
            notifyError(describeError(error));
        } finally {
            setBusy(false);
        }
    };

    const create = () => {
        const name = slug(form.displayName);
        if (!name) {
            notifyError('Give your model a name using letters or numbers.');
            return;
        }
        const parameters = parametersOf();
        if (!parameters) return;
        const displayName = form.displayName.trim();
        run(
            () => modelService.createModel({ name, displayName, from: form.from, system: form.system, parameters }),
            `${displayName} is ready. It is in your Installed list.`
        );
    };

    const save = (model) => {
        const parameters = parametersOf();
        if (!parameters) return;
        const displayName = form.displayName.trim();
        run(
            () => modelService.updateModel({ name: model.name, displayName, from: form.from, system: form.system, parameters }),
            `${displayName} was updated.`
        );
    };

    return (
        <Container layout="flex-column" gap="md" padding="none" width="100%">
            <Typography size="xs" color="muted">
                A personal model is an installed model with your own instructions built in, saved under its own name.
                It takes almost no extra disk space.
                {!canManage && ' Only an admin or owner can create personal models.'}
            </Typography>

            {canManage && bases.length === 0 && (
                <Empty icon="FiBox" title="Install a model first" text="A personal model is built on one you have downloaded. Open Discover to get one." />
            )}

            {canManage && bases.length > 0 && (
                <Card layout="flex-column" gap="sm" padding="md" width="100%" maxWidth="720px" hover={false}>
                    <SectionTitle icon="FiPlus" title="New model, starting from" />
                    <ButtonGroup size="xs" width="100%" justify="start" selectable={false}>
                        {TEMPLATES.map((option) => (
                            <Button
                                key={option.id}
                                size="xs"
                                color={template === option.id ? 'primary' : 'secondary'}
                                selected={template === option.id}
                                onClick={() => choose(option)}
                            >
                                {option.label}
                            </Button>
                        ))}
                    </ButtonGroup>

                    {template && (
                        <>
                            <ModelFields key={template} form={form} setForm={setForm} bases={bases} />
                            <Container layout="flex" gap="xs" padding="none">
                                <Button size="sm" onClick={create} disabled={busy || !form.displayName.trim() || !form.from}>
                                    {busy ? 'Creating…' : 'Create model'}
                                </Button>
                                <Button size="sm" color="secondary" onClick={() => setTemplate(null)} disabled={busy}>Cancel</Button>
                            </Container>
                        </>
                    )}
                </Card>
            )}

            {mine.length > 0 && <SectionTitle icon="FiUser" title="Your models" count={mine.length} />}
            <Container layout="grid" columns="auto-lg" gap="sm" padding="none" width="100%">
                {mine.map((model) => (
                    <Card
                        key={model.name}
                        layout="flex-column"
                        gap="xs"
                        padding="md"
                        width="100%"
                        minWidth="0"
                        wrap={false}
                        hover={editing !== model.name}
                        span={editing === model.name ? 'full' : null}
                    >
                        <Row>
                            <Container layout="flex-column" gap="none" padding="none" minWidth="0">
                                <Typography as="h3" size="sm" weight="semibold" truncate>{model.displayName}</Typography>
                                <Typography size="xxs" color="muted" truncate>Built on {model.basedOn}</Typography>
                            </Container>
                            {canManage && editing !== model.name && (
                                <Container layout="flex" gap="none" padding="none" wrap={false}>
                                    <Button size="xxs" variant="ghost" title="Edit" aria-label={`Edit ${model.displayName}`} onClick={() => startEdit(model)}>
                                        <Icon name="FiEdit2" />
                                    </Button>
                                    <Button size="xxs" variant="ghost" color="error" title="Delete" aria-label={`Delete ${model.displayName}`} onClick={() => onDelete(model)}>
                                        <Icon name="FiTrash2" />
                                    </Button>
                                </Container>
                            )}
                        </Row>
                        {editing === model.name ? (
                            <Container layout="flex-column" gap="sm" padding="none" width="100%" maxWidth="720px">
                                <ModelFields key={model.name} form={form} setForm={setForm} bases={bases} />
                                <Container layout="flex" gap="xs" padding="none">
                                    <Button size="sm" onClick={() => save(model)} disabled={busy || !form.displayName.trim() || !form.from}>
                                        {busy ? 'Saving…' : 'Save changes'}
                                    </Button>
                                    <Button size="sm" color="secondary" onClick={() => setEditing(null)} disabled={busy}>Cancel</Button>
                                </Container>
                            </Container>
                        ) : (
                            <>
                                <Container layout="flex-column" gap="none" padding="none" width="100%" maxHeight="120px" overflow="auto">
                                    {model.system
                                        ? model.system.split('\n').map((line, index) => <Typography key={index} as="p" size="xs" color="muted">{line || ' '}</Typography>)
                                        : <Typography size="xs" color="muted">No instructions were given to this model.</Typography>}
                                </Container>
                                <Container layout="flex" gap="xs" padding="none" align="center">
                                    <Badge size="xs" color="secondary">{creativityOf(model.parameters?.temperature ?? 0.7)}</Badge>
                                    {model.parameters?.num_ctx && <Badge size="xs" color="secondary">Reads {model.parameters.num_ctx.toLocaleString()} tokens</Badge>}
                                </Container>
                            </>
                        )}
                    </Card>
                ))}
            </Container>
        </Container>
    );
};

const ModelsPage = () => {
    const { success, error: notifyError, confirm } = useNotification();
    const [tab, setTab] = useState('discover');
    const guide = useGuide();
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
    const [refreshing, setRefreshing] = useState(false);

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

    const refresh = useCallback(async () => {
        setRefreshing(true);
        await Promise.all([loadInstalled(), device ? loadCatalogue(device.id) : null, loadRunning()]);
        setRefreshing(false);
    }, [device, loadInstalled, loadCatalogue, loadRunning]);

    useEffect(() => {
        const onFocus = () => refreshRef.current();
        window.addEventListener('focus', onFocus);
        return () => window.removeEventListener('focus', onFocus);
    }, []);

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
        if (before && before !== 'completed' && job.status === 'completed') refreshRef.current();
    }, []);

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
        <Page layout="flex-column" padding="none" gap="none" background="dots" backgroundFade="bottom">
            <Container layout="flex-column" align="center" gap="none" padding="none" width="100%" height="100vh" wrap={false} overflow="hidden">
            <Container layout="flex-column" gap="md" padding="lg" width="100%" maxWidth="1360px" wrap={false}>
                <Row>
                    <Container layout="flex-column" gap="none" padding="none">
                        <Typography as="h1" size="2xl" weight="bold" animation="blur" animationDuration={600}>Models</Typography>
                        <Typography size="xs" color="muted">
                            {device ? `Find, download and manage AI models on ${device.name}.` : 'Find, download and manage AI models.'}
                        </Typography>
                    </Container>
                    <Button size="sm" color="secondary" disabled={refreshing} title="Refresh models and disk space" onClick={refresh} {...guide.tip('models.refresh')}>
                        <Icon name="FiRefreshCw" size="xs" />Refresh
                    </Button>
                </Row>

                <Container layout="grid" columns="auto-sm" gap="sm" padding="none" width="100%">
                    <Stat icon="FiBox" label="Installed" value={installed ? `${installed.models.length} models` : '…'} />
                    <Stat icon="FiHardDrive" label="Used by models" value={installed?.disk ? gb(installed.disk.usedByModelsMb) : '…'} />
                    <Stat icon="FiDatabase" label="Free disk" value={installed?.disk ? gb(installed.disk.freeMb) : '…'} />
                    <Stat
                        icon="FiCpu"
                        label="This device"
                        value={catalogue?.hardware?.gpuName || device?.hardware?.gpuName || device?.name || '…'}
                        note={device?.hardware?.gpuMemoryMb ? `${gb(device.hardware.gpuMemoryMb)} graphics memory` : null}
                    />
                </Container>

                <DownloadsPanel jobs={jobs} canManage={canManage} onResume={(job) => download(job.model)} onPause={pause} onCancel={cancel} />

                <Container layout="flex" gap="xs" padding="none" align="center">
                    {TABS.map((option) => (
                        <Button
                            key={option.id}
                            size="sm"
                            color={tab === option.id ? 'primary' : 'secondary'}
                            selected={tab === option.id}
                            onClick={() => setTab(option.id)}
                            {...guide.tip(`models.${option.id}`)}
                        >
                            {option.label}{option.id === 'installed' && counts.installed !== null ? ` (${counts.installed})` : ''}
                        </Button>
                    ))}
                </Container>

            </Container>
            <Container layout="flex" justify="center" padding="none" width="100%" flexFill minHeight="0" overflow="auto">
            <Container layout="flex-column" gap="md" padding="lg" width="100%" maxWidth="1360px" wrap={false}>
                {tab === 'discover' && (
                    <DiscoverTab catalogue={catalogue} jobs={jobs} canManage={canManage} ollamaUp={ollamaUp} onDownload={download} />
                )}
                {tab === 'installed' && <InstalledTab installed={installed} canManage={canManage} onDelete={deleteModel} />}
                {tab === 'running' && <RunningTab running={running} canManage={canManage} onUnload={unload} />}
                {tab === 'mine' && (
                    <MineTab installed={installed} canManage={canManage} onCreated={refresh} onDelete={deleteModel} />
                )}
            </Container>
            </Container>
            </Container>
        </Page>
    );
};

export default ModelsPage;
