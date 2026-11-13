import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    Page, Container, Card, Typography, Button, ButtonGroup, Badge, Icon, Input, Select, Switch, Divider, Data, Image, CircularProgress
} from '@components/Components';
import { useAuth } from '@contexts/AuthContext';
import { useTheme } from '@contexts/ThemeContext';
import { useNotification } from '@contexts/NotificationContext';
import { authService } from '../client/auth.client';
import { userService } from '../client/user.client';
import { themeService } from '../client/theme.client';
import { deviceService, describeError } from '../client/ai.client';
import { listFontKeys, ensureFontsLoaded } from '@styles/font.registry';

const failText = (error, fallback) => error?.response?.data?.message || fallback;

const Section = ({ title, note, action, children }) => (
    <Container layout="flex-column" gap="sm" padding="none" width="100%">
        <Container layout="flex" justify="between" align="center" gap="sm" padding="none" width="100%">
            <Container layout="flex-column" gap="none" padding="none">
                <Typography as="h3" size="sm" weight="semibold">{title}</Typography>
                {note && <Typography size="xs" color="muted">{note}</Typography>}
            </Container>
            {action}
        </Container>
        {children}
    </Container>
);

const AiTab = () => {
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

    if (failed) {
        return (
            <Container layout="flex" align="center" justify="between" gap="sm" padding="none" width="100%">
                <Typography size="sm" weight="semibold">Settings could not be loaded.</Typography>
                <Button size="sm" onClick={load}>Try again</Button>
            </Container>
        );
    }
    if (!settings) return <CircularProgress size="sm" />;

    return (
        <Container layout="flex" justify="center" padding="none" width="100%">
        <Container layout="flex-column" gap="md" padding="none" width="100%" maxWidth="640px">
            {!canManage && <Typography size="xs" color="muted">Only an admin or owner can change these settings.</Typography>}
            <Section
                title="Where Ollama is"
                note="Ollama is the program that runs the models. Change this only if it is on a different address than usual."
                action={settings.ollamaBaseUrlIsDefault ? <Badge size="xs" color="tertiary">Standard address</Badge> : null}
            >
                <Input
                    size="sm"
                    label="Ollama address"
                    value={address}
                    onChange={(event) => { setAddress(event.target.value); setTestResult(null); }}
                    disabled={!canManage}
                    width="100%"
                />
                {testResult && <Typography size="xs" color={testResult.ok ? 'success' : 'error'} weight="semibold">{testResult.text}</Typography>}
                {canManage && (
                    <Container layout="flex" gap="xs" padding="none">
                        <Button size="sm" color="secondary" onClick={testConnection} disabled={busy || !address.trim()}>
                            <Icon name="FiActivity" size="xs" />Test connection
                        </Button>
                        <Button size="sm" onClick={() => save({ ollamaBaseUrl: address.trim() }, 'Ollama address saved. It is in use now.')} disabled={busy || !address.trim()}>
                            <Icon name="FiSave" size="xs" />Save
                        </Button>
                        {!settings.ollamaBaseUrlIsDefault && (
                            <Button size="sm" color="secondary" disabled={busy} onClick={() => { setTestResult(null); save({ ollamaBaseUrl: '' }, 'Back to the standard Ollama address.'); }}>
                                Use the standard address
                            </Button>
                        )}
                    </Container>
                )}
            </Section>

            <Divider color="surface" margin="xs" />

            <Section title="Running models" note="How many replies are written at once, and how long a model stays in memory.">
                <Container layout="grid" columns={2} gap="sm" padding="none" width="100%">
                    <Input
                        size="sm"
                        label="Replies at the same time (1 to 8)"
                        helpText="Keep this at 1 unless the graphics card has memory to spare."
                        value={concurrent}
                        onChange={(event) => setConcurrent(event.target.value)}
                        disabled={!canManage}
                        width="100%"
                    />
                    <Input
                        size="sm"
                        label="Minutes a model stays loaded"
                        helpText="Longer means faster follow-ups; shorter frees memory sooner."
                        value={keepAlive}
                        onChange={(event) => setKeepAlive(event.target.value)}
                        disabled={!canManage}
                        width="100%"
                    />
                </Container>
                {canManage && (
                    <Container layout="flex" justify="end" padding="none" width="100%">
                        <Button size="sm" onClick={saveRunning} disabled={busy}><Icon name="FiSave" size="xs" />Save</Button>
                    </Container>
                )}
            </Section>
        </Container>
        </Container>
    );
};

const AccountTab = ({ user }) => {
    const { success, error: notifyError } = useNotification();
    const [profile, setProfile] = useState({
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
        username: user?.username || '',
        email: user?.email || '',
        bio: user?.bio || ''
    });
    const [password, setPassword] = useState({ current: '', next: '', confirm: '' });
    const [busy, setBusy] = useState(null);
    const field = (key) => (event) => setProfile((now) => ({ ...now, [key]: event.target.value }));
    const secret = (key) => (event) => setPassword((now) => ({ ...now, [key]: event.target.value }));

    const run = async (name, work, done, fallback) => {
        setBusy(name);
        try {
            await work();
            success(done);
            return true;
        } catch (error) {
            notifyError(failText(error, fallback));
            return false;
        } finally {
            setBusy(null);
        }
    };

    const savePassword = async () => {
        if (password.next !== password.confirm) {
            notifyError('The two new passwords do not match.');
            return;
        }
        if (password.next.length < 8) {
            notifyError('A password needs at least 8 characters.');
            return;
        }
        const changed = await run('password', () => userService.changePassword(user._id || user.id, password.current, password.next), 'Password changed.', 'The password could not be changed.');
        if (changed) setPassword({ current: '', next: '', confirm: '' });
    };

    return (
        <Container layout="flex" justify="center" padding="none" width="100%">
        <Container layout="flex-column" gap="md" padding="none" width="100%" maxWidth="640px">
            <Section title="Profile" note="The same account is used in FilesystemOne and Makerspace One.">
                <Container layout="grid" columns={2} gap="sm" padding="none" width="100%">
                    <Input size="sm" label="First name" value={profile.firstName} onChange={field('firstName')} width="100%" />
                    <Input size="sm" label="Last name" value={profile.lastName} onChange={field('lastName')} width="100%" />
                    <Input size="sm" label="Username" value={profile.username} onChange={field('username')} width="100%" />
                    <Input size="sm" label="Email" type="email" value={profile.email} onChange={field('email')} width="100%" />
                </Container>
                <Container layout="flex" align="center" gap="xs" padding="none">
                    <Badge size="xs" color={user?.emailVerified ? 'success' : 'warning'}>{user?.emailVerified ? 'Email verified' : 'Email not verified'}</Badge>
                    {!user?.emailVerified && (
                        <Button
                            size="xs"
                            color="secondary"
                            disabled={busy === 'verify'}
                            onClick={() => run('verify', () => authService.sendVerificationEmail(), 'Verification email sent. Check your inbox.', 'The verification email could not be sent.')}
                        >
                            <Icon name="FiMail" size="xs" />{busy === 'verify' ? 'Sending…' : 'Send verification email'}
                        </Button>
                    )}
                </Container>
                <Input size="sm" label="Bio" multiline rows={3} placeholder="Tell others about yourself" value={profile.bio} onChange={field('bio')} width="100%" />
                <Container layout="flex" justify="end" padding="none" width="100%">
                    <Button size="sm" disabled={busy === 'profile'} onClick={() => run('profile', () => userService.updateProfile(profile), 'Profile updated.', 'The profile could not be updated.')}>
                        <Icon name="FiSave" size="xs" />{busy === 'profile' ? 'Saving…' : 'Save changes'}
                    </Button>
                </Container>
            </Section>

            <Divider color="surface" margin="xs" />

            <Section title="Change password">
                <Input size="sm" label="Current password" type="password" value={password.current} onChange={secret('current')} width="100%" />
                <Container layout="grid" columns={2} gap="sm" padding="none" width="100%">
                    <Input size="sm" label="New password" type="password" value={password.next} onChange={secret('next')} width="100%" />
                    <Input size="sm" label="Confirm new password" type="password" value={password.confirm} onChange={secret('confirm')} width="100%" />
                </Container>
                <Container layout="flex" justify="end" padding="none" width="100%">
                    <Button size="sm" disabled={busy === 'password' || !password.current || !password.next} onClick={savePassword}>
                        <Icon name="FiLock" size="xs" />{busy === 'password' ? 'Saving…' : 'Update password'}
                    </Button>
                </Container>
            </Section>
        </Container>
        </Container>
    );
};

const SecurityTab = () => {
    const { success, error: notifyError } = useNotification();
    const [status, setStatus] = useState(null);
    const [loadingStatus, setLoadingStatus] = useState(true);
    const [setup, setSetup] = useState(null);
    const [code, setCode] = useState('');
    const [confirm, setConfirm] = useState({ password: '', token: '' });
    const [backupCodes, setBackupCodes] = useState(null);
    const [devices, setDevices] = useState(null);
    const settingUp = useRef(false);

    const loadStatus = useCallback(async () => {
        setLoadingStatus(true);
        try {
            setStatus(await authService.get2FAStatus());
        } catch {
            setStatus(null);
        } finally {
            setLoadingStatus(false);
        }
    }, []);

    useEffect(() => {
        loadStatus();
        authService.getDevices().then((result) => setDevices(result?.devices || [])).catch(() => setDevices([]));
    }, [loadStatus]);

    const startSetup = async () => {
        if (settingUp.current || setup) return;
        settingUp.current = true;
        try {
            setSetup(await authService.setup2FA());
        } catch (error) {
            notifyError(failText(error, 'Two-step sign-in could not be set up.'));
        } finally {
            settingUp.current = false;
        }
    };

    const finishSetup = async () => {
        try {
            const result = await authService.verifySetup2FA(code);
            success('Two-step sign-in is on. Save your backup codes.');
            setBackupCodes(result?.backupCodes || null);
            setSetup(null);
            setCode('');
            loadStatus();
        } catch (error) {
            notifyError(failText(error, 'That code was not accepted. Try again.'));
        }
    };

    const turnOff = async () => {
        try {
            await authService.disable2FA(confirm.password, confirm.token);
            success('Two-step sign-in is off.');
            setConfirm({ password: '', token: '' });
            setBackupCodes(null);
            loadStatus();
        } catch {
            notifyError('It could not be turned off. Check your password and code.');
        }
    };

    const fetchBackupCodes = async () => {
        try {
            setBackupCodes((await authService.getBackupCodes(confirm.password, confirm.token))?.backupCodes || []);
        } catch {
            notifyError('The backup codes could not be fetched. Check your password and code.');
        }
    };

    const enabled = Boolean(status?.enabled);
    const confirmFields = (
        <>
            <Input size="sm" label="Password" type="password" value={confirm.password} onChange={(event) => setConfirm((now) => ({ ...now, password: event.target.value }))} width="100%" />
            <Input size="sm" label="Code from your app" placeholder="000000" maxLength={6} value={confirm.token} onChange={(event) => setConfirm((now) => ({ ...now, token: event.target.value }))} width="100%" />
        </>
    );

    const setupGenie = (
        <Container layout="flex-column" gap="sm" padding="md" width="300px">
            {!setup ? (
                <Container layout="flex" align="center" gap="sm" padding="none">
                    <CircularProgress size="xs" />
                    <Typography size="xs" color="secondary">Preparing…</Typography>
                </Container>
            ) : (
                <>
                    <Typography size="xs" weight="medium">1. Scan this code with your authenticator app</Typography>
                    {setup.qrCode && (
                        <Container layout="flex" justify="center" padding="none" width="100%">
                            <Image src={setup.qrCode} alt="Code to scan for two-step sign-in" width="160px" height="160px" />
                        </Container>
                    )}
                    {setup.manualEntryKey && (
                        <>
                            <Typography size="xxs" color="secondary">Or type this key into the app:</Typography>
                            <Input size="xs" value={setup.manualEntryKey} readOnly width="100%" aria-label="Key to type into your authenticator app" />
                        </>
                    )}
                    <Typography size="xs" weight="medium">2. Enter the 6-digit code it shows</Typography>
                    <Input size="sm" placeholder="000000" maxLength={6} value={code} onChange={(event) => setCode(event.target.value)} width="100%" />
                    <Button size="sm" width="100%" disabled={code.length !== 6} onClick={finishSetup}>Check and turn on</Button>
                </>
            )}
        </Container>
    );

    const offGenie = (
        <Container layout="flex-column" gap="sm" padding="md" width="280px">
            <Typography size="xs" weight="medium">Confirm with your password and a current code</Typography>
            {confirmFields}
            <Button size="sm" color="error" width="100%" disabled={!confirm.password || !confirm.token} onClick={turnOff}>Turn off</Button>
        </Container>
    );

    const codesGenie = (
        <Container layout="flex-column" gap="sm" padding="md" width="280px">
            {backupCodes ? (
                <>
                    <Typography size="xs" weight="semibold">Backup codes</Typography>
                    <Typography size="xxs" color="secondary">Each one works once. Keep them somewhere safe.</Typography>
                    <Container layout="grid" columns={2} gap="xs" padding="sm" width="100%" backgroundColor="surface">
                        {backupCodes.map((item) => <Typography key={item} size="xs" font="monospace">{item}</Typography>)}
                    </Container>
                    <Button size="sm" color="secondary" width="100%" onClick={() => setBackupCodes(null)}>Done</Button>
                </>
            ) : (
                <>
                    <Typography size="xs" weight="medium">Confirm with your password and a current code</Typography>
                    {confirmFields}
                    <Button size="sm" width="100%" disabled={!confirm.password || !confirm.token} onClick={fetchBackupCodes}>Show codes</Button>
                </>
            )}
        </Container>
    );

    return (
        <Container layout="flex-column" gap="md" padding="none" width="100%">
            <Section
                title="Two-step sign-in"
                note={enabled
                    ? 'On. You need your authenticator app each time you sign in.'
                    : 'Adds a code from an authenticator app when you sign in.'}
                action={loadingStatus ? <CircularProgress size="xs" /> : (
                    <Container layout="flex" align="center" gap="xs" padding="none">
                        <Badge size="xs" color={enabled ? 'success' : 'secondary'}>{enabled ? 'On' : 'Off'}</Badge>
                        {!enabled && (
                            <Button size="sm" genie={setupGenie} genieTrigger="click" onGenieShow={startSetup}>
                                <Icon name="FiShield" size="xs" />Turn on
                            </Button>
                        )}
                        {enabled && (
                            <>
                                <Button size="sm" color="secondary" genie={codesGenie} genieTrigger="click"><Icon name="FiKey" size="xs" />Backup codes</Button>
                                <Button size="sm" color="error" genie={offGenie} genieTrigger="click"><Icon name="FiShieldOff" size="xs" />Turn off</Button>
                            </>
                        )}
                    </Container>
                )}
            >
                {backupCodes && !enabled && null}
                {backupCodes && enabled && (
                    <Card layout="flex-column" gap="xs" padding="sm" width="100%" hover={false} shadow={false} borderColor="primary">
                        <Typography size="xs" weight="semibold">Save these backup codes now</Typography>
                        <Container layout="grid" columns="auto-sm" gap="xs" padding="none" width="100%">
                            {backupCodes.map((item) => <Typography key={item} size="xs" font="monospace">{item}</Typography>)}
                        </Container>
                        <Container layout="flex" padding="none"><Button size="xs" color="secondary" onClick={() => setBackupCodes(null)}>I have saved them</Button></Container>
                    </Card>
                )}
            </Section>

            <Divider color="surface" margin="xs" />

            <Section title="Signed-in devices" note="Browsers and computers that have signed in to your account.">
                {devices === null && <CircularProgress size="sm" />}
                {devices?.length === 0 && <Typography size="xs" color="muted">No sign-in history yet.</Typography>}
                {devices?.length > 0 && (
                    <Data
                        data={devices.map((device) => ({
                            device: [device.browser, device.os].filter(Boolean).join(' on ') || 'Unknown device',
                            address: device.ipAddress || '—',
                            place: [device.location?.city, device.location?.country].filter(Boolean).join(', ') || '—',
                            lastSeen: device.lastSeenAt ? new Date(device.lastSeenAt).toLocaleString() : '—'
                        }))}
                        variant="table"
                        size="xxs"
                        sortable={false}
                        searchable={false}
                        filterable={false}
                        paginated={false}
                        width="100%"
                    />
                )}
            </Section>
        </Container>
    );
};

const ROLE_INFO = {
    CREATOR: { label: 'Creator', text: 'Create and share public content, including custom themes.' },
    ADMIN: { label: 'Admin', text: 'Download and remove models, change machine settings and manage users.' },
    OWNER: { label: 'Owner', text: 'Full access to this install.' }
};
const ROLE_COLORS = { OWNER: 'primary', ADMIN: 'warning', CREATOR: 'tertiary' };

const RolesTab = ({ user }) => {
    const { success, error: notifyError } = useNotification();
    const [role, setRole] = useState('CREATOR');
    const [reason, setReason] = useState('');
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(null);

    const pending = sent || (user?.roleApprovalStatus === 'PENDING' ? { roles: user.pendingRoles || [], reason: user.roleApprovalRequest?.reason } : null);
    const rejected = !sent && user?.roleApprovalStatus === 'REJECTED';

    const request = async () => {
        setSending(true);
        try {
            await authService.requestRoleElevation([role], reason.trim());
            success('Your request was sent to an administrator.');
            setSent({ roles: [role], reason: reason.trim() });
            setReason('');
        } catch (error) {
            notifyError(failText(error, 'The request could not be sent.'));
        } finally {
            setSending(false);
        }
    };

    return (
        <Container layout="flex-column" gap="md" padding="none" width="100%">
            <Section
                title="Your roles"
                note="Roles decide what you can do here and in the sibling apps."
                action={(
                    <Container layout="flex" gap="xs" padding="none">
                        {(user?.roles || []).map((name) => <Badge key={name} size="sm" color={ROLE_COLORS[name] || 'secondary'}>{name}</Badge>)}
                    </Container>
                )}
            />

            {pending && (
                <Card layout="flex" align="center" gap="sm" padding="sm" width="100%" hover={false} shadow={false} borderColor="secondary" wrap={false}>
                    <Icon name="FiClock" size="sm" color="warning" />
                    <Container layout="flex-column" gap="none" padding="none">
                        <Typography size="sm" weight="semibold">A request is waiting for approval</Typography>
                        <Typography size="xs" color="muted">Asked for: {pending.roles.join(', ')}{pending.reason ? `. Reason: ${pending.reason}` : ''}</Typography>
                    </Container>
                </Card>
            )}

            {rejected && (
                <Card layout="flex" align="center" gap="sm" padding="sm" width="100%" hover={false} shadow={false} wrap={false}>
                    <Icon name="FiXCircle" size="sm" color="error" />
                    <Container layout="flex-column" gap="none" padding="none">
                        <Typography size="sm" weight="semibold">Your last request was turned down</Typography>
                        {user.roleApprovalRequest?.reason && <Typography size="xs" color="muted">Reason: {user.roleApprovalRequest.reason}</Typography>}
                    </Container>
                </Card>
            )}

            {!pending && (
                <Section title="Ask for a higher role" note="An administrator reviews each request.">
                    <Container layout="grid" columns={3} gap="sm" padding="none" width="100%">
                        {Object.entries(ROLE_INFO).map(([name, info]) => (
                            <Card
                                key={name}
                                layout="flex-column"
                                gap="xs"
                                padding="sm"
                                minWidth="0"
                                shadow={false}
                                borderColor={role === name ? 'primary' : null}
                                backgroundColor={role === name ? 'surface' : 'background'}
                                role="button"
                                tabIndex={0}
                                onClick={() => setRole(name)}
                                onKeyDown={(event) => event.key === 'Enter' && setRole(name)}
                            >
                                <Container layout="flex" align="center" justify="between" padding="none" width="100%" wrap={false}>
                                    <Typography size="xs" weight="semibold">{info.label}</Typography>
                                    {role === name && <Icon name="FiCheck" size="xs" color="primary" />}
                                </Container>
                                <Typography size="xs" color="muted">{info.text}</Typography>
                            </Card>
                        ))}
                    </Container>
                    <Input size="sm" label="Reason" multiline rows={3} placeholder="Why do you need this role?" value={reason} onChange={(event) => setReason(event.target.value)} width="100%" />
                    <Container layout="flex" justify="end" padding="none" width="100%">
                        <Button size="sm" disabled={sending || !reason.trim()} onClick={request}>
                            <Icon name="FiArrowUp" size="xs" />{sending ? 'Sending…' : 'Send request'}
                        </Button>
                    </Container>
                </Section>
            )}
        </Container>
    );
};

const BUILT_IN = ['modern', 'dark', 'minimal', 'vibrant', 'admin', 'pink'];
const COLOR_FIELDS = [
    ['primary', 'Primary'], ['primaryAccent', 'Primary accent'],
    ['secondary', 'Secondary'], ['secondaryAccent', 'Secondary accent'],
    ['tertiary', 'Tertiary'], ['tertiaryAccent', 'Tertiary accent'],
    ['success', 'Success'], ['warning', 'Warning'], ['error', 'Error'],
    ['background', 'Background'], ['surface', 'Surface'], ['surfaceAccent', 'Surface accent'],
    ['border', 'Border'], ['text', 'Text'], ['textContrast', 'Contrast text']
];
const RADII_FIELDS = [
    ['base', 'Base'], ['card', 'Cards'], ['input', 'Inputs'], ['button', 'Buttons'],
    ['checkbox', 'Checkboxes'], ['fab', 'Round buttons'], ['progress', 'Progress bars'], ['notification', 'Notifications']
];
const NEW_THEME = {
    name: '', slug: '', description: '', visibility: 'private', darkMode: false,
    colors: {
        primary: '#12355B', primaryAccent: '#1A4A7A', secondary: '#FF570A', secondaryAccent: '#CC4000',
        tertiary: '#A5D8FF', tertiaryAccent: '#70BFFF', success: '#1E7A3A', warning: '#E88500', error: '#CC2200',
        background: '#FFFFFF', surface: '#EAF5FF', surfaceAccent: '#C8EAFF', border: '#A5D8FF', text: '#12355B', textContrast: '#FFFFFF'
    },
    fonts: { primary: 'urbanist', secondary: 'montserrat-alternates', monospace: 'jetbrains-mono' },
    radii: { base: '0.375rem', card: '0.5rem', input: '0.375rem', button: '0.375rem', checkbox: '0.25rem', fab: '50%', progress: '9999px', notification: '0.5rem' }
};
const slugify = (value = '') => value.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').slice(0, 50);
const idOf = (doc) => doc.id || doc._id;
const fontOptions = (kind) => listFontKeys(kind).map((key) => ({ value: key, label: key }));

const Swatches = ({ colors }) => (
    <Container layout="flex" gap="none" padding="none" wrap={false}>
        {colors.filter(Boolean).map((color, index) => (
            <Input key={index} type="color" size="xxs" width="26px" value={color} disabled aria-label={`Colour ${color}`} />
        ))}
    </Container>
);
const swatchesOf = (doc) => {
    const colors = doc?.tokens?.colors || {};
    return [colors.primary, colors.secondary, colors.tertiary, colors.background, colors.surface];
};

const ThemePreview = ({ theme }) => (
    <Container theme={theme} layout="flex" align="center" gap="xs" padding="sm" width="100%" backgroundColor="background" wrap={false}>
        <Button size="xxs" color="primary">Aa</Button>
        <Button size="xxs" color="secondary">Aa</Button>
        <Badge size="xs" color="tertiary">Tag</Badge>
        <Typography size="xxs" color="muted">Sample text</Typography>
    </Container>
);

const ThemeEditor = ({ initial, editingId, onSaved, onCancel }) => {
    const { success, error: notifyError } = useNotification();
    const [form, setForm] = useState(initial || NEW_THEME);
    const [slugTouched, setSlugTouched] = useState(Boolean(editingId));
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        ensureFontsLoaded(listFontKeys());
    }, []);

    const part = (group, key, value) => setForm((now) => ({ ...now, [group]: { ...now[group], [key]: value } }));

    const save = async () => {
        if (!form.name.trim() || !form.slug.trim()) {
            notifyError('A theme needs a name and a short name.');
            return;
        }
        setSaving(true);
        const payload = {
            name: form.name.trim(),
            slug: form.slug,
            description: form.description.trim(),
            visibility: form.visibility,
            tokens: { darkMode: form.darkMode, colors: form.colors, fonts: form.fonts, ...(form.radii ? { radii: form.radii } : {}) },
            ...(form.forkedFrom ? { forkedFrom: form.forkedFrom } : {})
        };
        try {
            const result = editingId ? await themeService.updateTheme(editingId, payload) : await themeService.createTheme(payload);
            success(editingId ? 'Theme updated.' : 'Theme created.');
            onSaved(result.theme);
        } catch (error) {
            notifyError(failText(error, 'The theme could not be saved.'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <Card layout="flex-column" gap="sm" padding="md" hover={false} shadow={false} borderColor="primary" width="100%">
            <Container layout="flex" align="center" justify="between" gap="sm" padding="none" width="100%">
                <Typography size="sm" weight="semibold">
                    {editingId ? 'Edit theme' : form.forkedFrom ? `Copy of ${form.forkedFromName || 'theme'}` : 'New theme'}
                </Typography>
                <Swatches colors={[form.colors.primary, form.colors.secondary, form.colors.tertiary, form.colors.background, form.colors.surface]} />
            </Container>
            <Container layout="grid" columns={2} gap="sm" padding="none" width="100%">
                <Input
                    size="sm"
                    label="Name"
                    value={form.name}
                    width="100%"
                    onChange={(event) => {
                        const name = event.target.value;
                        setForm((now) => ({ ...now, name, slug: slugTouched ? now.slug : slugify(name) }));
                    }}
                />
                <Input
                    size="sm"
                    label="Short name (used in links)"
                    value={form.slug}
                    width="100%"
                    onChange={(event) => { setSlugTouched(true); setForm((now) => ({ ...now, slug: slugify(event.target.value) })); }}
                />
            </Container>
            <Input size="sm" label="Description (optional)" value={form.description} width="100%" onChange={(event) => setForm((now) => ({ ...now, description: event.target.value }))} />
            <Container layout="flex" gap="md" align="end" padding="none">
                <Select
                    label="Who can see it"
                    width="260px"
                    options={[
                        { value: 'private', label: 'Private: only you' },
                        { value: 'unlisted', label: 'Unlisted: anyone with the link' },
                        { value: 'public', label: 'Public: listed for everyone' }
                    ]}
                    value={form.visibility}
                    onChange={(value) => setForm((now) => ({ ...now, visibility: value }))}
                />
                <Switch label="Dark theme" checked={form.darkMode} onChange={(event) => setForm((now) => ({ ...now, darkMode: event.target.checked }))} />
            </Container>

            <Divider color="surface" margin="xs" />
            <Typography size="xs" weight="semibold">Colours</Typography>
            <Container layout="grid" columns="auto-sm" gap="sm" padding="none" width="100%">
                {COLOR_FIELDS.map(([key, label]) => (
                    <Container key={key} layout="flex" align="center" gap="sm" padding="none" wrap={false}>
                        <Input type="color" size="sm" width="48px" value={form.colors[key] || '#000000'} onChange={(event) => part('colors', key, event.target.value)} aria-label={label} />
                        <Container layout="flex-column" gap="none" padding="none" minWidth="0">
                            <Typography size="xs" weight="medium">{label}</Typography>
                            <Typography size="xxs" color="muted" font="monospace">{form.colors[key]}</Typography>
                        </Container>
                    </Container>
                ))}
            </Container>

            <Divider color="surface" margin="xs" />
            <Typography size="xs" weight="semibold">Fonts</Typography>
            <Container layout="grid" columns={3} gap="sm" padding="none" width="100%">
                <Select label="Main text" options={fontOptions('sans')} value={form.fonts.primary} onChange={(value) => part('fonts', 'primary', value)} width="100%" />
                <Select label="Headings" options={fontOptions()} value={form.fonts.secondary} onChange={(value) => part('fonts', 'secondary', value)} width="100%" />
                <Select label="Code" options={fontOptions('mono')} value={form.fonts.monospace} onChange={(value) => part('fonts', 'monospace', value)} width="100%" />
            </Container>

            <Divider color="surface" margin="xs" />
            <Typography size="xs" weight="semibold">Corners</Typography>
            <Typography size="xxs" color="muted">Any CSS length works: 0 for sharp, 9999px for pills, 50% for circles.</Typography>
            <Container layout="grid" columns="auto-sm" gap="sm" padding="none" width="100%">
                {RADII_FIELDS.map(([key, label]) => (
                    <Input key={key} size="sm" label={label} value={form.radii?.[key] ?? ''} placeholder={NEW_THEME.radii[key]} onChange={(event) => part('radii', key, event.target.value)} width="100%" />
                ))}
            </Container>

            <Container layout="flex" gap="xs" padding="none">
                <Button size="sm" disabled={saving} onClick={save}><Icon name="FiSave" size="xs" />{saving ? 'Saving…' : editingId ? 'Save changes' : 'Create theme'}</Button>
                <Button size="sm" color="secondary" disabled={saving} onClick={onCancel}>Cancel</Button>
            </Container>
        </Card>
    );
};

const ThemeCard = ({ doc, applied, onApply, onFork, onEdit, onDelete }) => (
    <Card layout="flex-column" gap="xs" padding="sm" hover={false} shadow={false} minWidth="0" borderColor={applied ? 'primary' : null}>
        <Container layout="flex" align="center" gap="xs" padding="none" width="100%" wrap={false}>
            <Typography size="sm" weight="semibold" truncate>{doc.name}</Typography>
            {applied && <Badge size="xs" color="success">In use</Badge>}
            {!doc.isPreset && doc.visibility && doc.visibility !== 'private' && <Badge size="xs" color="tertiary">{doc.visibility}</Badge>}
        </Container>
        {doc.description && <Typography size="xs" color="muted" truncate>{doc.description}</Typography>}
        <Swatches colors={swatchesOf(doc)} />
        <Container layout="flex" gap="xs" padding="none">
            <Button size="xs" disabled={applied} onClick={onApply}><Icon name="FiCheck" size="xs" />{applied ? 'In use' : 'Use'}</Button>
            {onFork && <Button size="xs" color="secondary" onClick={onFork}><Icon name="FiCopy" size="xs" />Copy</Button>}
            {onEdit && <Button size="xs" color="secondary" onClick={onEdit}><Icon name="FiEdit2" size="xs" />Edit</Button>}
            {onDelete && <Button size="xs" color="error" onClick={onDelete}><Icon name="FiTrash2" size="xs" />Delete</Button>}
        </Container>
    </Card>
);

const AppearanceTab = ({ user }) => {
    const { currentTheme, switchTheme, applyCustomTheme, clearCustomTheme, customTheme, themes } = useTheme();
    const { success, error: notifyError } = useNotification();
    const [presets, setPresets] = useState([]);
    const [mine, setMine] = useState([]);
    const [shared, setShared] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editor, setEditor] = useState(null);
    const canCreate = ['CREATOR', 'SUPER_CREATOR', 'ADMIN', 'OWNER'].some((name) => (user?.roles || []).includes(name));

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [presetResult, mineResult, publicResult] = await Promise.all([
                themeService.getPresets().catch(() => ({ themes: [] })),
                themeService.getMyThemes().catch(() => ({ themes: [] })),
                themeService.getPublicThemes({ limit: 12 }).catch(() => ({ themes: [] }))
            ]);
            setPresets(presetResult.themes || []);
            setMine(mineResult.themes || []);
            const own = new Set((mineResult.themes || []).map((doc) => String(idOf(doc))));
            setShared((publicResult.themes || []).filter((doc) => !own.has(String(idOf(doc)))));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const draftFrom = (doc, fork) => {
        const tokens = doc.tokens || {};
        return {
            name: fork ? `${doc.name} (copy)` : doc.name,
            slug: fork ? slugify(`${doc.slug}-copy`) : doc.slug,
            description: doc.description || '',
            visibility: fork ? 'private' : doc.visibility || 'private',
            darkMode: Boolean(tokens.darkMode),
            colors: { ...NEW_THEME.colors, ...(tokens.colors || {}) },
            fonts: { ...NEW_THEME.fonts, ...(tokens.fonts || {}) },
            radii: { ...NEW_THEME.radii, ...(tokens.radii || {}) },
            ...(fork ? { forkedFrom: idOf(doc), forkedFromName: doc.name } : {})
        };
    };
    const openFork = (doc) => setEditor({ initial: draftFrom(doc, true), editingId: null });
    const openEdit = (doc) => setEditor({ initial: draftFrom(doc, false), editingId: idOf(doc) });

    const remove = async (doc) => {
        try {
            await themeService.deleteTheme(idOf(doc));
            success(`Theme "${doc.name}" deleted.`);
            if (customTheme?.slug === doc.slug) clearCustomTheme();
            load();
        } catch (error) {
            notifyError(failText(error, 'The theme could not be deleted.'));
        }
    };

    const saved = (theme) => {
        setEditor(null);
        load();
        if (theme && customTheme && theme.slug === customTheme.slug) applyCustomTheme(theme);
    };

    const usingCustom = (doc) => customTheme?.slug === doc.slug && currentTheme === `custom-${doc.slug}`;
    const applyDoc = (doc) => {
        applyCustomTheme(doc);
        success(`Theme "${doc.name}" is in use.`);
    };

    return (
        <Container layout="flex-column" gap="md" padding="none" width="100%">
            <Section title="Built-in themes" note="Use one as it is, or copy it as the start of your own.">
                <Container layout="grid" columns="auto-sm" gap="sm" padding="none" width="100%">
                    {BUILT_IN.map((slug) => {
                        const preset = presets.find((doc) => doc.slug === slug);
                        const applied = currentTheme === slug;
                        return (
                            <Card key={slug} layout="flex-column" gap="xs" padding="sm" hover={false} shadow={false} minWidth="0" borderColor={applied ? 'primary' : null}>
                                <Container layout="flex" align="center" justify="between" padding="none" width="100%" wrap={false}>
                                    <Typography size="sm" weight="semibold">{themes?.[slug]?.name || slug}</Typography>
                                    {applied && <Badge size="xs" color="success">In use</Badge>}
                                </Container>
                                <ThemePreview theme={slug} />
                                <Container layout="flex" gap="xs" padding="none" wrap={false}>
                                    <Button size="xs" disabled={applied} onClick={() => switchTheme(slug)}><Icon name="FiCheck" size="xs" />{applied ? 'In use' : 'Use'}</Button>
                                    {canCreate && preset && <Button size="xs" color="secondary" onClick={() => openFork(preset)}><Icon name="FiCopy" size="xs" />Copy</Button>}
                                </Container>
                            </Card>
                        );
                    })}
                </Container>
            </Section>

            <Divider color="surface" margin="xs" />

            <Section
                title="My themes"
                note={canCreate ? null : 'Making your own themes needs a Creator role or above. Ask for one under Roles.'}
                action={canCreate && !editor ? (
                    <Button size="sm" onClick={() => setEditor({ initial: null, editingId: null })}><Icon name="FiPlus" size="xs" />New theme</Button>
                ) : null}
            >
                {editor && <ThemeEditor initial={editor.initial} editingId={editor.editingId} onSaved={saved} onCancel={() => setEditor(null)} />}
                {loading && <CircularProgress size="sm" />}
                {!loading && mine.length === 0 && !editor && <Typography size="xs" color="muted">No themes of your own yet.</Typography>}
                {!loading && mine.length > 0 && (
                    <Container layout="grid" columns="auto" gap="sm" padding="none" width="100%">
                        {mine.map((doc) => (
                            <ThemeCard
                                key={idOf(doc)}
                                doc={doc}
                                applied={usingCustom(doc)}
                                onApply={() => applyDoc(doc)}
                                onFork={canCreate ? () => openFork(doc) : null}
                                onEdit={canCreate ? () => openEdit(doc) : null}
                                onDelete={canCreate ? () => remove(doc) : null}
                            />
                        ))}
                    </Container>
                )}
            </Section>

            {shared.length > 0 && (
                <>
                    <Divider color="surface" margin="xs" />
                    <Section title="Shared themes" note="Public themes made by other people.">
                        <Container layout="grid" columns="auto" gap="sm" padding="none" width="100%">
                            {shared.map((doc) => (
                                <ThemeCard key={idOf(doc)} doc={doc} applied={usingCustom(doc)} onApply={() => applyDoc(doc)} onFork={canCreate ? () => openFork(doc) : null} />
                            ))}
                        </Container>
                    </Section>
                </>
            )}
        </Container>
    );
};

const TABS = [
    { id: 'ai', label: 'AI and Ollama', icon: 'FiCpu', note: 'Connection and running models' },
    { id: 'appearance', label: 'Appearance', icon: 'FiDroplet', note: 'Themes' },
    { id: 'account', label: 'Account', icon: 'FiUser', note: 'Profile and password' },
    { id: 'security', label: 'Security', icon: 'FiShield', note: 'Two-step sign-in and devices' },
    { id: 'roles', label: 'Roles', icon: 'FiBriefcase', note: 'What you are allowed to do' }
];

const SettingsPage = () => {
    const { user } = useAuth();
    const [params, setParams] = useSearchParams();
    const tab = TABS.some((item) => item.id === params.get('tab')) ? params.get('tab') : 'ai';
    const active = TABS.find((item) => item.id === tab);
    const open = (id) => setParams({ tab: id }, { replace: true });

    return (
        <Page layout="block" padding="none" background="plus" backgroundFade="bottom">
            <Container layout="flex" justify="center" padding="none" width="100%" wrap={false}>
            <Container layout="flex-column" gap="md" padding="lg" width="100%" maxWidth="1200px" wrap={false}>
                <Container layout="flex-column" gap="none" padding="none">
                    <Typography as="h1" size="2xl" weight="bold" animation="blur" animationDuration={600}>Settings</Typography>
                    <Typography size="xs" color="muted">{user?.username ? `Signed in as ${user.username}.` : 'Your account and this install.'}</Typography>
                </Container>

                <Container layout="flex" gap="md" align="start" padding="none" width="100%">
                    <Card layout="flex-column" gap="none" padding="xs" hover={false} width="240px" minWidth="200px">
                        {TABS.map((item) => (
                            <Container
                                key={item.id}
                                layout="flex"
                                align="center"
                                gap="sm"
                                padding="sm"
                                width="100%"
                                wrap={false}
                                hoverable
                                backgroundColor={tab === item.id ? 'surface' : 'transparent'}
                                role="button"
                                tabIndex={0}
                                onClick={() => open(item.id)}
                                onKeyDown={(event) => event.key === 'Enter' && open(item.id)}
                            >
                                <Icon name={item.icon} size="sm" color={tab === item.id ? 'primary' : 'text'} />
                                <Container layout="flex-column" gap="none" padding="none" minWidth="0">
                                    <Typography size="sm" weight={tab === item.id ? 'semibold' : 'medium'} color={tab === item.id ? 'primary' : 'default'}>{item.label}</Typography>
                                    <Typography size="xxs" color="muted" truncate>{item.note}</Typography>
                                </Container>
                            </Container>
                        ))}
                    </Card>

                    <Card layout="flex-column" gap="md" padding="lg" hover={false} flexFill minWidth="320px">
                        <Container layout="flex" align="center" gap="sm" padding="none">
                            <Icon name={active.icon} size="sm" color="primary" />
                            <Typography as="h2" size="md" weight="semibold">{active.label}</Typography>
                        </Container>
                        <Divider margin="none" />
                        {tab === 'ai' && <AiTab />}
                        {tab === 'appearance' && <AppearanceTab user={user} />}
                        {tab === 'account' && <AccountTab user={user} />}
                        {tab === 'security' && <SecurityTab />}
                        {tab === 'roles' && <RolesTab user={user} />}
                    </Card>
                </Container>
            </Container>
            </Container>
        </Page>
    );
};

export default SettingsPage;
