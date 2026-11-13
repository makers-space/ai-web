import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@contexts/AuthContext';
import { useNotification } from '@contexts/NotificationContext';
import { appService } from '@/client/app.client';
import Badge from './Badge';
import Button from './Button';
import Card from './Card';
import Container from './Container';
import Icon from './Icon';
import Typography from './Typography';

/**
 * The only place notices about what the server did are raised: every one comes
 * from a WebSocket event, so the same thing can never be announced twice.
 */
const AppNotifications = () => {
    const { user } = useAuth();
    const { success, info, warning, error } = useNotification();
    const userId = user?.id || user?._id;

    useEffect(() => {
        if (!userId) {
            appService.disconnectNotifications();
            return undefined;
        }
        const show = { success, info, warning, error };
        return appService.onNotification('*', (data = {}) => {
            if (!data.message) return;
            if (data.path && data.path === window.location.pathname) return;
            (show[data.level] || info)(data.message, data.title ? { title: data.title } : {});
        });
    }, [userId, success, info, warning, error]);

    return null;
};


const LEVEL_ICONS = {
    success: ['FiCheckCircle', 'success'],
    info: ['FiInfo', 'primary'],
    warning: ['FiAlertTriangle', 'warning'],
    error: ['FiXCircle', 'error']
};

const timeAgo = (date) => {
    const minutes = Math.round((Date.now() - new Date(date).getTime()) / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes} min ago`;
    if (minutes < 1440) return `${Math.round(minutes / 60)} h ago`;
    return `${Math.round(minutes / 1440)} d ago`;
};

/**
 * Dashboard card for the notices the server kept. The card shows a summary;
 * its Genie shows every notice with the actions to mark them read or delete them.
 * subscribe(callback) should call back when a new notice arrives and return a cleanup function.
 */
export const NotificationsCard = ({ subscribe = null }) => {
    const [list, setList] = useState(null);
    const [unread, setUnread] = useState(0);
    const subscribeRef = useRef(subscribe);
    subscribeRef.current = subscribe;

    const load = useCallback(async () => {
        try {
            const result = await appService.getNotifications();
            setList(result.notifications || []);
            setUnread(result.unread || 0);
        } catch {
            setList((now) => now || []);
        }
    }, []);

    useEffect(() => {
        load();
        const later = () => setTimeout(load, 500);
        const stop = subscribeRef.current ? subscribeRef.current(later) : appService.onNotification?.('*', later);
        window.addEventListener('focus', load);
        return () => {
            if (typeof stop === 'function') stop();
            window.removeEventListener('focus', load);
        };
    }, [load]);

    const act = (work) => work.then(load).catch(load);
    const notices = list || [];

    const details = (
        <Container layout="flex-column" gap="sm" padding="md" width="380px" maxWidth="90vw" backgroundColor="background" background="plus" backgroundFade="bottom">
            <Container layout="flex" align="center" justify="between" gap="sm" padding="none" width="100%">
                <Typography size="sm" weight="semibold">Notifications</Typography>
                <Container layout="flex" gap="xs" padding="none" wrap={false}>
                    <Button size="xs" color="secondary" disabled={unread === 0} onClick={() => act(appService.markNotificationsRead())}>
                        <Icon name="FiCheck" size="xs" />Mark all read
                    </Button>
                    <Button size="xs" color="error" disabled={notices.length === 0} onClick={() => act(appService.clearNotifications())}>
                        <Icon name="FiTrash2" size="xs" />Delete all
                    </Button>
                </Container>
            </Container>
            {notices.length === 0 && <Typography size="xs" color="muted">Nothing here. Notices you miss while you are away are kept for 30 days.</Typography>}
            <Container layout="flex-column" gap="xs" padding="none" width="100%" maxHeight="50vh" overflow="auto" wrap={false}>
                {notices.map((notice) => {
                    const [icon, color] = LEVEL_ICONS[notice.level] || LEVEL_ICONS.info;
                    return (
                        <Container key={notice.id} layout="flex" align="start" gap="sm" padding="xs" width="100%" wrap={false} backgroundColor={notice.read ? 'transparent' : 'surface'}>
                            <Icon name={icon} size="xs" color={color} />
                            <Container layout="flex-column" gap="none" padding="none" flexFill minWidth="0">
                                {notice.title && <Typography size="xs" weight="semibold">{notice.title}</Typography>}
                                <Typography size="xs">{notice.message}</Typography>
                                <Typography size="xxs" color="muted">{new Date(notice.createdAt).toLocaleString()}{notice.read ? '' : ' · not read'}</Typography>
                            </Container>
                            {!notice.read && (
                                <Button size="xxs" variant="ghost" title="Mark as read" aria-label="Mark as read" onClick={() => act(appService.markNotificationsRead(notice.id))}>
                                    <Icon name="FiCheck" />
                                </Button>
                            )}
                            <Button size="xxs" variant="ghost" color="error" title="Delete" aria-label="Delete" onClick={() => act(appService.clearNotifications(notice.id))}>
                                <Icon name="FiTrash2" />
                            </Button>
                        </Container>
                    );
                })}
            </Container>
        </Container>
    );

    return (
        <Card layout="flex-column" gap="xs" padding="md" width="100%" minWidth="0" background="plus" backgroundFade="left" genie={{ content: details, trigger: 'click', padding: 'none', backgroundColor: 'background' }} role="button" tabIndex={0} aria-label="Notifications">
            <Container layout="flex" justify="between" align="center" gap="sm" padding="none" width="100%" wrap={false}>
                <Container layout="flex" align="center" gap="xs" padding="none" wrap={false}>
                    <Icon name="FiBell" size="xs" color="primary" />
                    <Typography as="h2" size="sm" weight="semibold">Notifications</Typography>
                    {unread > 0 && <Badge size="xs" color="primary">{unread} new</Badge>}
                </Container>
                <Typography size="xxs" color="muted">{notices.length > 0 ? `${notices.length} kept · open to manage` : ''}</Typography>
            </Container>
            {list === null && <Typography size="xs" color="muted">Loading…</Typography>}
            {list !== null && notices.length === 0 && <Typography size="xs" color="muted">Nothing new. Notices you miss while you are away are kept here.</Typography>}
            {notices.slice(0, 3).map((notice) => {
                const [icon, color] = LEVEL_ICONS[notice.level] || LEVEL_ICONS.info;
                return (
                    <Container key={notice.id} layout="flex" align="center" gap="sm" padding="none" width="100%" wrap={false}>
                        <Icon name={icon} size="xs" color={color} />
                        <Container padding="none" flexFill minWidth="0">
                            <Typography size="xs" weight={notice.read ? 'normal' : 'semibold'} truncate>{notice.message}</Typography>
                        </Container>
                        <Typography size="xxs" color="muted">{timeAgo(notice.createdAt)}</Typography>
                    </Container>
                );
            })}
        </Card>
    );
};

export default AppNotifications;
