import React from 'react';
import { useNotification } from '@contexts/NotificationContext';
import { Button, ButtonGroup, Card, Container, Icon, Typography } from './Components';

/**
 * NotificationDisplay - Component to display notifications from NotificationContext
 *
 * Features:
 * - Auto-positioning notification toast
 * - Different types: success, error, warning, info
 * - Auto-dismiss after duration
 * - Manual dismiss capability
 * - Theme-aware styling
 */
export const NotificationDisplay = ({
                                        position = 'top-right',
                                        className = '',
                                        ...props
                                    }) => {
    const {notifications, removeNotification} = useNotification();

    if (!notifications || notifications.length === 0) {
        return null;
    }

    const getPositionStyles = () => {
        const baseStyles = {
            position: 'fixed',
            zIndex: 999999, // Above everything else
            pointerEvents: 'none' // Allow clicks through container
        };

        switch (position) {
            case 'top-left':
                return {...baseStyles, top: 16, left: 16};
            case 'top-center':
                return {...baseStyles, top: 16, left: '50%', transform: 'translateX(-50%)'};
            case 'top-right':
                return {...baseStyles, top: 16, right: 16};
            case 'bottom-left':
                return {...baseStyles, bottom: 16, left: 16};
            case 'bottom-center':
                return {...baseStyles, bottom: 16, left: '50%', transform: 'translateX(-50%)'};
            case 'bottom-right':
                return {...baseStyles, bottom: 16, right: 16};
            default:
                return {...baseStyles, top: 16, right: 16};
        }
    };

    const getNotificationIcon = (type) => {
        switch (type) {
            case 'success':
                return 'FiCheckCircle';
            case 'error':
                return 'FiXCircle';
            case 'warning':
                return 'FiAlertTriangle';
            case 'info':
                return 'FiInfo';
            default:
                return 'FiBell';
        }
    };

    const getNotificationVariant = (type) => {
        switch (type) {
            case 'success':
                return 'success';
            case 'error':
                return 'error';
            case 'warning':
                return 'warning';
            case 'info':
                return 'info';
            default:
                return 'primary';
        }
    };

    return (
        <div
            className={`notification-display ${className}`}
            style={getPositionStyles()}
            {...props}
        >
            <Container layout="flex-column" gap="sm">
                {notifications.map((notification) => (
                    <Card
                        key={notification.id}
                        className={`notification notification-${notification.type}`}
                        padding="md"
                        style={{
                            pointerEvents: 'all', // Re-enable clicks for individual notifications
                            minWidth: '300px',
                            maxWidth: '500px',
                            animation: 'slideIn 0.3s ease-out',
                            border: `1px solid var(--${getNotificationVariant(notification.type)}-color)`,
                            backgroundColor: `var(--${getNotificationVariant(notification.type)}-color-10, var(--surface-color))`,
                        }}
                    >
                        <Container layout="flex" gap="sm" align="center">
                            <Icon
                                name={getNotificationIcon(notification.type)}
                                size="md"
                                variant={getNotificationVariant(notification.type)}
                            />

                            <Container layout="flex-column" gap="xs" flexFill>
                                {notification.title && (
                                    <Typography
                                        as="h4"
                                        size="sm"
                                        weight="semibold"
                                        color={getNotificationVariant(notification.type)}
                                    >
                                        {notification.title}
                                    </Typography>
                                )}

                                <Typography
                                    as="p"
                                    size="sm"
                                >
                                    {notification.message}
                                </Typography>

                                {notification.actions?.length > 0 && (
                                    <ButtonGroup size="xs" selectable={false} wrap={false} justify="start" marginTop="xs">
                                        {notification.actions.map((action, index) => (
                                            <Button
                                                key={action.label}
                                                color={action.color || (index === 0 ? 'primary' : 'secondary')}
                                                onClick={() => {
                                                    removeNotification(notification.id);
                                                    action.onClick?.();
                                                }}
                                            >
                                                {action.label}
                                            </Button>
                                        ))}
                                    </ButtonGroup>
                                )}
                            </Container>

                            {!(notification.actions?.length > 0) && <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeNotification(notification.id)}
                                style={{
                                    flexShrink: 0,
                                    padding: '4px',
                                    minWidth: 'unset',
                                    width: '24px',
                                    height: '24px'
                                }}
                                aria-label="Close notification"
                            >
                                <Icon name="FiX" size="xs"/>
                            </Button>}
                        </Container>
                    </Card>
                ))}
            </Container>

            <style jsx="true">{`
                @keyframes slideIn {
                    from {
                        opacity: 0;
                        transform: translateX(${position.includes('right') ? '100%' : position.includes('left') ? '-100%' : '0'});
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0);
                    }
                }
                
                .notification {
                    box-shadow: var(--shadow-lg);
                    border-radius: var(--border-radius-md);
                    backdrop-filter: blur(8px);
                }
                
                .notification:hover {
                    transform: translateY(-1px);
                    box-shadow: var(--shadow-xl);
                    transition: all 0.2s ease;
                }
            `}</style>
        </div>
    );
};

export default NotificationDisplay;
