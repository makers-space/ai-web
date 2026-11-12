import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@contexts/AuthContext';
import { Button } from './Button';
import { Typography } from './Typography';
import { deviceService } from '../client/ai.client';

const RECHECK_MS = 30000;
const RECHECK_PROBLEM_MS = 5000;

export const OllamaBanner = () => {
    const { user } = useAuth();
    const [problem, setProblem] = useState(null);
    const [checking, setChecking] = useState(false);

    const lastState = useRef(null);

    const check = useCallback(async () => {
        setChecking(true);
        let found = null;
        try {
            const status = await deviceService.getSetupStatus();
            found = status.ollama?.available ? null : status.ollama;
        } catch (error) {
            const data = error?.response?.data;
            if (data?.code === 'DATABASE_DOWN') {
                found = { message: data.message, action: data.action };
            } else if (!error?.response) {
                found = {
                    message: 'AI Base is not answering.',
                    action: 'Check that its server is running and that this device is online.'
                };
            }
        } finally {
            setProblem(found);
            const state = found ? found.message || 'down' : 'up';
            if (lastState.current !== null && lastState.current !== state) {
                window.dispatchEvent(new CustomEvent('ollama-availability-changed'));
            }
            lastState.current = state;
            setChecking(false);
        }
    }, []);

    useEffect(() => {
        if (!user) {
            setProblem(null);
            return undefined;
        }
        check();
        window.addEventListener('ollama-status-changed', check);
        window.addEventListener('online', check);
        window.addEventListener('offline', check);
        return () => {
            window.removeEventListener('ollama-status-changed', check);
            window.removeEventListener('online', check);
            window.removeEventListener('offline', check);
        };
    }, [user, check]);

    const showing = Boolean(problem);
    useEffect(() => {
        if (!user) return undefined;
        const timer = setInterval(check, showing ? RECHECK_PROBLEM_MS : RECHECK_MS);
        return () => clearInterval(timer);
    }, [user, check, showing]);

    if (!user || !problem) return null;

    return (
        <div
            role="alert"
            style={{
                position: 'sticky',
                top: 0,
                zIndex: 50,
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.75rem',
                padding: '0.6rem 1rem',
                background: 'var(--surface-color)',
                borderBottom: '4px solid var(--warning-color)'
            }}
        >
            <Typography weight="semibold">
                {problem.message || 'Ollama is not running on this device.'}
            </Typography>
            <Typography size="sm">
                {problem.action || 'Start Ollama, then check again.'}
            </Typography>
            <Button size="sm" color="secondary" onClick={check} disabled={checking}>
                {checking ? 'Checking…' : 'Check again'}
            </Button>
        </div>
    );
};

export default OllamaBanner;
