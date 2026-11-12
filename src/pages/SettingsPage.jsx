import React, { useCallback, useEffect, useState } from 'react';
import { Page, Container, Card, Typography, Button, Badge, Input } from '@components/Components';
import { useNotification } from '@contexts/NotificationContext';
import { deviceService, describeError } from '../client/ai.client';

const SettingsPage = () => {
    const { success, error: notifyError } = useNotification();
    const [settings, setSettings] = useState(null);
    const [canManage, setCanManage] = useState(false);
    const [failed, setFailed] = useState(false);
    const [address, setAddress] = useState('');
    const [concurrent, setConcurrent] = useState('1');
    const [keepAlive, setKeepAlive] = useState('5');
    const [testResult, setTestResult] = useState(null);
    const [busy, setBusy] = useState(false);

    const apply = (next) => {
        setSettings(next);
        setAddress(next.ollamaBaseUrl || '');
        setConcurrent(String(next.maxConcurrentGenerations));
        setKeepAlive(String(next.keepAliveMinutes));
    };

    const load = useCallback(async () => {
        try {
            const result = await deviceService.getSettings();
            apply(result.settings);
            setCanManage(Boolean(result.permissions?.manage));
            setFailed(false);
        } catch (error) {
            setFailed(true);
            notifyError(describeError(error, 'Settings could not be loaded.'));
        }
    }, [notifyError]);

    useEffect(() => {
        load();
    }, [load]);

    const testConnection = async () => {
        setBusy(true);
        setTestResult(null);
        try {
            const result = await deviceService.testConnection(address.trim());
            setTestResult({ ok: true, text: `Connected. Ollama ${result.ollama.version} answered at this address.` });
        } catch (error) {
            const text = error?.response?.data?.code === 'OLLAMA_DOWN'
                ? 'Nothing answered at this address. Check the address, and that Ollama is running there.'
                : describeError(error, 'This address could not be tested.');
            setTestResult({ ok: false, text });
        } finally {
            setBusy(false);
        }
    };

    const save = async (changes, doneMessage) => {
        setBusy(true);
        try {
            const result = await deviceService.updateSettings(changes);
            apply(result.settings);
            success(doneMessage);
            window.dispatchEvent(new CustomEvent('ollama-status-changed'));
        } catch (error) {
            notifyError(describeError(error));
        } finally {
            setBusy(false);
        }
    };

    const saveAddress = () => save({ ollamaBaseUrl: address.trim() }, 'Ollama address saved. It is in use now.');
    const useDefaultAddress = () => {
        setTestResult(null);
        save({ ollamaBaseUrl: '' }, 'Back to the standard Ollama address.');
    };

    const saveRunning = () => {
        const concurrentNumber = Number(concurrent);
        const keepAliveNumber = Number(keepAlive);
        if (!Number.isInteger(concurrentNumber) || concurrentNumber < 1 || concurrentNumber > 8) {
            notifyError('Replies at once must be a whole number from 1 to 8.');
            return;
        }
        if (!Number.isInteger(keepAliveNumber) || keepAliveNumber < 0 || keepAliveNumber > 1440) {
            notifyError('Minutes must be a whole number from 0 to 1440.');
            return;
        }
        save({ maxConcurrentGenerations: concurrentNumber, keepAliveMinutes: keepAliveNumber }, 'Saved. No restart needed.');
    };

    return (
        <Page layout="flex-column" align="center" gap="lg" padding="lg">
            <Container layout="flex-column" gap="lg" padding="none" width="100%" maxWidth="760px">
                <Container layout="flex-column" gap="xs" padding="none">
                    <Typography as="h1" size="3xl" weight="bold" font="secondary" color="primary">Settings</Typography>
                    <Typography color="muted">How AI Base reaches Ollama and runs models on this computer.</Typography>
                </Container>

                {settings === null && !failed && <Typography color="muted">Loading settings…</Typography>}

                {failed && (
                    <Card layout="flex-column" gap="sm" padding="lg" width="100%" hover={false}>
                        <Typography weight="semibold">Settings could not be loaded.</Typography>
                        <Button onClick={load}>Try again</Button>
                    </Card>
                )}

                {settings && !canManage && (
                    <Typography size="sm" color="muted">Only an admin or owner can change these settings.</Typography>
                )}

                {settings && (
                    <Card layout="flex-column" gap="md" padding="lg" width="100%" hover={false}>
                        <Container layout="flex" gap="sm" padding="none" align="center">
                            <Typography as="h2" size="lg" weight="bold">Where Ollama is</Typography>
                            {settings.ollamaBaseUrlIsDefault && <Badge color="tertiary">Standard address</Badge>}
                        </Container>
                        <Typography size="sm" color="muted">
                            Ollama is the program that runs the models. Change this only if Ollama is on a different
                            address than usual.
                        </Typography>
                        <Input
                            label="Ollama address"
                            value={address}
                            onChange={(event) => { setAddress(event.target.value); setTestResult(null); }}
                            disabled={!canManage}
                            width="100%"
                        />
                        {testResult && (
                            <Typography color={testResult.ok ? 'success' : 'error'} weight="semibold">{testResult.text}</Typography>
                        )}
                        {canManage && (
                            <Container layout="flex" gap="sm" padding="none">
                                <Button color="secondary" onClick={testConnection} disabled={busy || !address.trim()}>
                                    Test connection
                                </Button>
                                <Button onClick={saveAddress} disabled={busy || !address.trim()}>Save</Button>
                                {!settings.ollamaBaseUrlIsDefault && (
                                    <Button color="secondary" onClick={useDefaultAddress} disabled={busy}>
                                        Use the standard address
                                    </Button>
                                )}
                            </Container>
                        )}
                    </Card>
                )}

                {settings && (
                    <Card layout="flex-column" gap="md" padding="lg" width="100%" hover={false}>
                        <Typography as="h2" size="lg" weight="bold">Running models</Typography>
                        <Typography size="sm" color="muted">
                            These are saved now and take effect when chat is added in a later stage.
                        </Typography>
                        <Input
                            label="Replies written at the same time (1 to 8)"
                            helpText="Keep this at 1 unless the graphics card has memory to spare."
                            value={concurrent}
                            onChange={(event) => setConcurrent(event.target.value)}
                            disabled={!canManage}
                            width="100%"
                        />
                        <Input
                            label="Minutes a model stays loaded after use"
                            helpText="Longer means faster follow-up replies; shorter frees memory sooner."
                            value={keepAlive}
                            onChange={(event) => setKeepAlive(event.target.value)}
                            disabled={!canManage}
                            width="100%"
                        />
                        {canManage && (
                            <Container layout="flex" gap="sm" padding="none">
                                <Button onClick={saveRunning} disabled={busy}>Save</Button>
                            </Container>
                        )}
                    </Card>
                )}
            </Container>
        </Page>
    );
};

export default SettingsPage;
