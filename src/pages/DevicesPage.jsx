import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Page, Container, Card, Typography, Button, Badge, Input } from '@components/Components';
import { useNotification } from '@contexts/NotificationContext';
import { deviceService, describeError, readBrowserDevice, formatGb } from '../client/ai.client';

const Detail = ({ label, value, note }) => (
    <Container layout="flex" justify="between" align="center" gap="md" padding="none" width="100%">
        <Typography color="muted">{label}</Typography>
        <Container layout="flex-column" gap="none" padding="none" align="end">
            <Typography weight="semibold" style={{ textAlign: 'right' }}>{value}</Typography>
            {note && <Typography size="sm" color="muted" style={{ textAlign: 'right' }}>{note}</Typography>}
        </Container>
    </Container>
);

const toGbText = (megabytes) => (megabytes ? String(Math.round(megabytes / 1024)) : '');
const toMb = (gbText) => (gbText === '' ? null : Math.round(Number(gbText) * 1024));

const DeviceCard = ({ device, canManage, onChanged }) => {
    const { success, error: notifyError } = useNotification();
    const [editing, setEditing] = useState(false);
    const [busy, setBusy] = useState(false);
    const [form, setForm] = useState({ name: '', memoryGb: '', gpuName: '', gpuMemoryGb: '' });

    const { hardware, ollama } = device;

    const startEditing = () => {
        setForm({
            name: device.name,
            memoryGb: toGbText(hardware.memoryMb),
            gpuName: hardware.gpuName || '',
            gpuMemoryGb: hardware.hasGpu ? toGbText(hardware.gpuMemoryMb) : '0'
        });
        setEditing(true);
    };

    const run = async (action, doneMessage) => {
        setBusy(true);
        try {
            const result = await action();
            onChanged(result.device);
            success(doneMessage);
            setEditing(false);
        } catch (error) {
            notifyError(describeError(error));
        } finally {
            setBusy(false);
        }
    };

    const save = () => {
        const numbers = [form.memoryGb, form.gpuMemoryGb];
        if (numbers.some((value) => value !== '' && (!Number.isFinite(Number(value)) || Number(value) < 0))) {
            notifyError('Memory must be a number of gigabytes, for example 32.');
            return;
        }
        run(() => deviceService.updateDevice(device.id, {
            name: form.name.trim() || device.name,
            overrides: {
                memoryMb: toMb(form.memoryGb),
                gpuName: form.gpuName.trim(),
                gpuMemoryMb: toMb(form.gpuMemoryGb)
            }
        }), 'Device details saved.');
    };

    const useDetected = () => run(() => deviceService.updateDevice(device.id, {
        overrides: { memoryMb: null, gpuName: '', gpuMemoryMb: null }
    }), 'Back to the details read from this computer.');

    const readAgain = () => run(() => deviceService.detectDevice(device.id), 'This computer was read again.');

    const change = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

    return (
        <Card layout="flex-column" gap="md" padding="lg" width="100%" hover={false}>
            <Container layout="flex" justify="between" align="center" gap="sm" padding="none" width="100%">
                <Container layout="flex-column" gap="none" padding="none">
                    <Typography as="h2" size="xl" weight="bold">{device.name}</Typography>
                    <Typography size="sm" color="muted">
                        {device.kind === 'local' ? 'The computer AI Base is running on' : 'Registered device'}
                    </Typography>
                </Container>
                <Container layout="flex" gap="xs" padding="none" align="center">
                    <Badge color={device.online ? 'success' : 'default'}>{device.online ? 'Online' : 'Offline'}</Badge>
                    {device.edited && <Badge color="warning">Details corrected by hand</Badge>}
                </Container>
            </Container>

            <Container layout="flex" gap="sm" padding="none" align="center">
                <Badge color={ollama.available ? 'success' : 'error'}>
                    {ollama.available ? `Ollama ${ollama.version} is running` : 'Ollama is not running'}
                </Badge>
                {!ollama.available && (
                    <Typography size="sm" color="muted">Start Ollama on this computer, then read it again.</Typography>
                )}
            </Container>

            {!editing && (
                <Container layout="flex-column" gap="sm" padding="none" width="100%">
                    <Detail
                        label="Graphics card"
                        value={hardware.hasGpu ? (hardware.gpuName || 'Graphics card') : 'None found'}
                        note={hardware.hasGpu
                            ? `${formatGb(hardware.gpuMemoryMb)} of graphics memory`
                            : 'Models will run on the processor, which is slower'}
                    />
                    <Detail label="System memory" value={formatGb(hardware.memoryMb)} />
                    <Detail
                        label="Free disk space for models"
                        value={hardware.diskFreeMb === null ? 'Unknown' : `${formatGb(hardware.diskFreeMb)} free`}
                        note={hardware.diskTotalMb ? `of ${formatGb(hardware.diskTotalMb)}` : null}
                    />
                    <Detail
                        label="Processor"
                        value={hardware.cpu || 'Unknown'}
                        note={hardware.cpuThreads ? `${hardware.cpuThreads} threads` : null}
                    />
                    <Detail
                        label="Models installed"
                        value={ollama.available ? String(ollama.modelCount) : 'Unknown'}
                        note={ollama.available && ollama.modelCount === 0 ? 'None yet' : null}
                    />
                </Container>
            )}

            {editing && (
                <Container layout="flex-column" gap="sm" padding="none" width="100%">
                    <Typography size="sm" color="muted">
                        Change these only if what AI Base read is wrong. Leave a box empty to use what was read.
                    </Typography>
                    <Input label="Device name" value={form.name} onChange={change('name')} width="100%" />
                    <Input label="System memory (GB)" value={form.memoryGb} onChange={change('memoryGb')} width="100%" />
                    <Input label="Graphics card name" value={form.gpuName} onChange={change('gpuName')} width="100%" />
                    <Input label="Graphics memory (GB)" value={form.gpuMemoryGb} onChange={change('gpuMemoryGb')} width="100%" />
                    <Container layout="flex" gap="sm" padding="none">
                        <Button onClick={save} disabled={busy}>Save</Button>
                        <Button color="secondary" onClick={() => setEditing(false)} disabled={busy}>Cancel</Button>
                        {device.edited && (
                            <Button color="secondary" onClick={useDetected} disabled={busy}>Use what was read</Button>
                        )}
                    </Container>
                </Container>
            )}

            {canManage && !editing && (
                <Container layout="flex" gap="sm" padding="none">
                    <Button onClick={readAgain} disabled={busy}>{busy ? 'Reading…' : 'Read this computer again'}</Button>
                    <Button color="secondary" onClick={startEditing} disabled={busy}>Correct these details</Button>
                </Container>
            )}
        </Card>
    );
};

const DevicesPage = () => {
    const { error: notifyError } = useNotification();
    const [devices, setDevices] = useState(null);
    const [canManage, setCanManage] = useState(false);
    const [failed, setFailed] = useState(false);
    const browser = useMemo(() => readBrowserDevice(), []);

    const load = useCallback(async () => {
        try {
            const result = await deviceService.listDevices();
            setDevices(result.devices);
            setCanManage(Boolean(result.permissions?.manage));
            setFailed(false);
        } catch (error) {
            setFailed(true);
            notifyError(describeError(error, 'Your devices could not be loaded.'));
        }
    }, [notifyError]);

    useEffect(() => {
        load();
        window.addEventListener('ollama-availability-changed', load);
        return () => window.removeEventListener('ollama-availability-changed', load);
    }, [load]);

    const replaceDevice = (updated) => {
        setDevices((current) => current.map((device) => (device.id === updated.id ? updated : device)));
        window.dispatchEvent(new CustomEvent('ollama-status-changed'));
    };

    return (
        <Page layout="flex-column" align="center" gap="lg" padding="lg">
            <Container layout="flex-column" gap="lg" padding="none" width="100%" maxWidth="760px">
                <Container layout="flex-column" gap="xs" padding="none">
                    <Typography as="h1" size="3xl" weight="bold" font="secondary" color="primary">Devices</Typography>
                    <Typography color="muted">
                        The computers that run your AI models. AI Base reads each one so it can tell you which models fit.
                    </Typography>
                </Container>

                {devices === null && !failed && <Typography color="muted">Reading this computer…</Typography>}

                {failed && (
                    <Card layout="flex-column" gap="sm" padding="lg" width="100%" hover={false}>
                        <Typography weight="semibold">Your devices could not be loaded.</Typography>
                        <Button onClick={load}>Try again</Button>
                    </Card>
                )}

                {devices?.map((device) => (
                    <DeviceCard key={device.id} device={device} canManage={canManage} onChanged={replaceDevice} />
                ))}

                {devices && !canManage && (
                    <Typography size="sm" color="muted">
                        Only an admin or owner can correct a device's details.
                    </Typography>
                )}

                <Card layout="flex-column" gap="sm" padding="lg" width="100%" hover={false}>
                    <Typography as="h2" size="lg" weight="bold">What this browser can see</Typography>
                    <Typography size="sm" color="muted">
                        A web page only gets a rough picture of the device it is opened on. These figures are
                        approximate, and a page cannot download or run models by itself.
                    </Typography>
                    <Detail label="Graphics card" value={browser.graphicsName || 'Not shared by this browser'} />
                    <Detail
                        label="System memory"
                        value={browser.memoryGb ? `About ${browser.memoryGb} GB` : 'Not shared by this browser'}
                        note={browser.memoryGb ? 'Browsers round this figure and may report less than is installed' : null}
                    />
                    <Detail label="Processor threads" value={browser.processorThreads || 'Not shared by this browser'} />
                </Card>

                <Card layout="flex-column" gap="sm" padding="lg" width="100%" hover={false}>
                    <Container layout="flex" gap="sm" padding="none" align="center">
                        <Typography as="h2" size="lg" weight="bold">Add another device</Typography>
                        <Badge color="tertiary">Coming later</Badge>
                    </Container>
                    <Typography size="sm" color="muted">
                        You will be able to register other computers by installing a small companion app on each one.
                        While it is running, that computer's models can be used from here.
                    </Typography>
                </Card>
            </Container>
        </Page>
    );
};

export default DevicesPage;
