import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@contexts/AuthContext';
import { Page, Container, Card, Typography, Button, Badge, Icon, ProgressBar } from '@components/Components';
import { NotificationsCard } from '@components/AppNotifications';
import { chatService, deviceService, modelService, useActivity } from '../client/ai.client';

const gb = (megabytes) => {
    if (megabytes === null || megabytes === undefined) return 'Unknown';
    const value = megabytes / 1024;
    return `${value >= 10 ? value.toFixed(0) : value.toFixed(1)} GB`;
};

const ago = (date) => {
    const minutes = Math.round((Date.now() - new Date(date).getTime()) / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes} min ago`;
    if (minutes < 1440) return `${Math.round(minutes / 60)} h ago`;
    return `${Math.round(minutes / 1440)} d ago`;
};

const greeting = () => {
    const hour = new Date().getHours();
    return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
};

const Tile = ({ icon, label, value, note, color = 'primary' }) => (
    <Card layout="flex" align="center" gap="sm" padding="sm" hover={false} shadow={false} wrap={false} width="100%" minWidth="0">
        <Icon name={icon} size="sm" color={color} />
        <Container layout="flex-column" gap="none" padding="none" minWidth="0">
            <Typography size="xxs" color="muted">{label}</Typography>
            <Typography size="sm" weight="semibold" truncate title={String(value)}>{value}</Typography>
            {note && <Typography size="xxs" color="muted" truncate>{note}</Typography>}
        </Container>
    </Card>
);

const Heading = ({ icon, title, children }) => (
    <Container layout="flex" justify="between" align="center" gap="sm" padding="none" width="100%" wrap={false}>
        <Container layout="flex" align="center" gap="xs" padding="none" wrap={false}>
            <Icon name={icon} size="xs" color="primary" />
            <Typography as="h2" size="sm" weight="semibold">{title}</Typography>
        </Container>
        {children}
    </Container>
);

const Line = ({ icon, title, note, onClick, children }) => (
    <Container
        layout="flex"
        align="center"
        gap="sm"
        padding="xs"
        width="100%"
        wrap={false}
        hoverable={Boolean(onClick)}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        onClick={onClick}
        onKeyDown={onClick ? (event) => event.key === 'Enter' && onClick() : undefined}
    >
        <Icon name={icon} size="xs" color="secondary" />
        <Container layout="flex-column" gap="none" padding="none" flexFill minWidth="0">
            <Typography size="xs" weight="medium" truncate>{title}</Typography>
            {note && <Typography size="xxs" color="muted" truncate>{note}</Typography>}
        </Container>
        {children}
    </Container>
);

const DashboardPage = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const activity = useActivity();
    const [status, setStatus] = useState(null);
    const [running, setRunning] = useState(null);
    const [installed, setInstalled] = useState(null);
    const [chats, setChats] = useState(null);

    const load = useCallback(() => {
        deviceService.getSetupStatus().then(setStatus).catch(() => setStatus({ ollama: { available: false }, steps: {} }));
        modelService.listRunning().then((result) => setRunning(result.models || [])).catch(() => setRunning([]));
        modelService.listInstalled().then(setInstalled).catch(() => setInstalled({ models: [], disk: null }));
        chatService.list().then((result) => setChats(result.chats || [])).catch(() => setChats([]));
    }, []);

    useEffect(() => {
        load();
        window.addEventListener('focus', load);
        window.addEventListener('ollama-availability-changed', load);
        return () => {
            window.removeEventListener('focus', load);
            window.removeEventListener('ollama-availability-changed', load);
        };
    }, [load]);

    const ollamaUp = status?.ollama?.available;
    const loaded = running || [];
    const busy = activity.replies.length + activity.downloads.length;
    const today = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

    return (
        <Page layout="block" padding="none" background="plus" backgroundFade="bottom">
            <Container layout="flex" justify="center" padding="none" width="100%" wrap={false}>
                <Container layout="flex-column" gap="md" padding="lg" width="100%" maxWidth="1360px" wrap={false}>
                    <Container layout="flex" justify="between" align="center" gap="md" padding="none" width="100%">
                        <Container layout="flex-column" gap="none" padding="none">
                            <Typography size="xs" color="muted">{today}</Typography>
                            <Typography as="h1" size="2xl" weight="bold" animation="blur" animationDuration={600}>
                                {`${greeting()}, ${user?.firstName || user?.username || 'there'}`}
                            </Typography>
                        </Container>
                        <Container layout="flex" gap="xs" padding="none">
                            <Button size="sm" color="secondary" onClick={() => navigate('/models')}><Icon name="FiBox" size="xs" />Models</Button>
                            <Button size="sm" color="primary" onClick={() => navigate('/chat')}><Icon name="FiPlus" size="xs" />New chat</Button>
                        </Container>
                    </Container>

                    <Container layout="grid" columns="auto-sm" gap="sm" padding="none" width="100%">
                        <Tile
                            icon={ollamaUp ? 'FiCheckCircle' : 'FiAlertCircle'}
                            color={status === null ? 'secondary' : ollamaUp ? 'success' : 'error'}
                            label="Ollama"
                            value={status === null ? '…' : ollamaUp ? 'Running' : 'Not running'}
                            note={ollamaUp ? `Version ${status.ollama.version}` : status ? 'Start Ollama to use models' : null}
                        />
                        <Tile
                            icon="FiCpu"
                            label="In memory now"
                            value={running === null ? '…' : loaded.length === 0 ? 'Nothing loaded' : loaded.map((model) => model.displayName).join(', ')}
                            note={loaded.length > 0 ? (loaded.every((model) => model.healthy) ? 'Fully on the graphics card' : 'Partly on the processor, so slower') : 'A model loads when it is used'}
                        />
                        <Tile icon="FiBox" label="Installed" value={installed ? `${installed.models.length} models` : '…'} note={installed?.disk ? `${gb(installed.disk.usedByModelsMb)} on disk` : null} />
                        <Tile icon="FiHardDrive" label="Free disk" value={installed?.disk ? gb(installed.disk.freeMb) : '…'} />
                    </Container>

                    <Container layout="grid" columns={2} gap="sm" padding="none" width="100%">
                        <Card layout="flex-column" gap="xs" padding="md" width="100%" minWidth="0" hover={false}>
                            <Heading icon="FiMessageSquare" title="Recent chats">
                                <Button size="xs" variant="ghost" onClick={() => navigate('/chat')}>Open Chat<Icon name="FiArrowRight" size="xs" /></Button>
                            </Heading>
                            {chats === null && <Typography size="xs" color="muted">Loading your chats…</Typography>}
                            {chats?.length === 0 && (
                                <Line icon="FiMessageSquare" title="No chats yet" note="Start one and it will be listed here.">
                                    <Button size="xs" color="primary" onClick={() => navigate('/chat')}>Start a chat</Button>
                                </Line>
                            )}
                            {chats?.slice(0, 7).map((chat) => (
                                <Line key={chat.id} icon="FiMessageSquare" title={chat.title} note={[chat.model, ago(chat.updatedAt)].filter(Boolean).join(' · ')} onClick={() => navigate(`/chat/${chat.id}`)}>
                                    {activity.replies.some((reply) => reply.chatId === chat.id) && <Badge size="xs" color="primary">Replying</Badge>}
                                </Line>
                            ))}
                        </Card>

                        <Container layout="flex-column" gap="sm" padding="none" width="100%" minWidth="0">
                            <NotificationsCard />
                            <Card layout="flex-column" gap="xs" padding="md" width="100%" hover={false}>
                                <Heading icon="FiActivity" title="Running now">
                                    {busy > 0 && <Badge size="xs" color="primary">{busy}</Badge>}
                                </Heading>
                                {busy === 0 && <Line icon="FiMoon" title="Nothing is running" note="Replies being written and downloads show here, each with a way to stop it." />}
                                {activity.replies.map((reply) => (
                                    <Line key={reply.chatId} icon="FiEdit3" title={reply.title} note={`${reply.model} is replying${reply.waiting ? `, ${reply.waiting} more waiting` : ''}`} onClick={() => navigate(`/chat/${reply.chatId}`)}>
                                        <Button size="xs" color="error" onClick={(event) => { event.stopPropagation(); activity.stopReply(reply.chatId); }}>Stop</Button>
                                    </Line>
                                ))}
                                {activity.downloads.map((job) => (
                                    <Container key={job.id} layout="flex-column" gap="none" padding="none" width="100%">
                                        <Line icon="FiDownload" title={job.model} note={job.status === 'queued' ? 'Waiting to download' : `Downloading, ${job.percent}%`} onClick={() => navigate('/models')}>
                                            {activity.canManage && <Button size="xs" color="secondary" onClick={(event) => { event.stopPropagation(); activity.cancelDownload(job.id); }}>Cancel</Button>}
                                        </Line>
                                        <ProgressBar value={job.percent} size="sm" width="100%" animated={job.status === 'downloading'} />
                                    </Container>
                                ))}
                            </Card>

                            <Card layout="flex-column" gap="xs" padding="md" width="100%" hover={false}>
                                <Heading icon="FiZap" title="Next things to try" />
                                {installed?.models.length === 0 && <Line icon="FiDownload" title="Download your first model" note="Pick one that fits this device." onClick={() => navigate('/models')} />}
                                <Line icon="FiPaperclip" title="Ask about a document" note="Attach a PDF, Word file or spreadsheet in Chat." onClick={() => navigate('/chat')} />
                                <Line icon="FiUser" title="Make a model your own" note="Give an installed model its own name and instructions." onClick={() => navigate('/models')} />
                                <Line icon="FiMonitor" title="Check this device" note="See what AI Base reads from this computer." onClick={() => navigate('/devices')} />
                                <Line icon="FiSliders" title="Settings" note="Account, security, themes and Ollama." onClick={() => navigate('/settings')} />
                            </Card>
                        </Container>
                    </Container>
                </Container>
            </Container>
        </Page>
    );
};

export default DashboardPage;
