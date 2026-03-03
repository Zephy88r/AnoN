import { useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { refreshSession, isSessionExpired, getTimeUntilExpiry, clearSession } from '../services/session';
import { ApiError } from '../services/api';
import { useDialog } from '../contexts/DialogContext';

const REFRESH_BEFORE_EXPIRY = 5 * 60 * 1000; // Refresh 5 minutes before expiry
const CHECK_INTERVAL = 60 * 1000; // Check every minute

type BanErrorPayload = {
    code?: string;
    details?: {
        is_permanent?: boolean;
        ban_expires_at?: string;
        remaining_seconds?: number;
        ban_label?: string;
    };
};

function formatRemainingBanTime(seconds: number): string {
    const total = Math.max(0, Math.floor(seconds));
    const days = Math.floor(total / 86400);
    const hours = Math.floor((total % 86400) / 3600);
    const minutes = Math.floor((total % 3600) / 60);

    const parts: string[] = [];
    if (days > 0) parts.push(`${days} day${days > 1 ? 's' : ''}`);
    if (hours > 0) parts.push(`${hours} hour${hours > 1 ? 's' : ''}`);
    if (minutes > 0 || parts.length === 0) parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
    return parts.join(' ');
}

function getBanMessage(error: unknown): string | null {
    if (!(error instanceof ApiError) || error.status !== 403) {
        return null;
    }

    const payload = error.data as BanErrorPayload;
    if (payload?.code !== 'USER_BANNED') {
        return null;
    }

    if (payload.details?.is_permanent) {
        return 'You are banned permanently.';
    }

    if (typeof payload.details?.remaining_seconds === 'number') {
        return `You are banned for ${formatRemainingBanTime(payload.details.remaining_seconds)}.`;
    }

    if (payload.details?.ban_expires_at) {
        const until = new Date(payload.details.ban_expires_at);
        if (!Number.isNaN(until.getTime())) {
            return `You are banned until ${until.toLocaleString()}.`;
        }
    }

    return payload.details?.ban_label || 'You are currently banned.';
}

export function useSessionManager() {
    const navigate = useNavigate();
    const { showAlert } = useDialog();
    const intervalRef = useRef<number | null>(null);
    const refreshAttempted = useRef(false);

    const handleSessionExpired = useCallback(() => {
        console.log('[SessionManager] Session expired, logging out...');
        clearSession();
        navigate('/admin', { replace: true });
        void showAlert({ title: 'Session Expired', message: 'Your session has expired. Please log in again.', danger: true });
    }, [navigate, showAlert]);

    const handleSessionRefresh = useCallback(async () => {
        if (refreshAttempted.current) return;
        
        try {
            refreshAttempted.current = true;
            await refreshSession();
            console.log('[SessionManager] Session refreshed successfully');
            refreshAttempted.current = false;
        } catch (error) {
            console.error('[SessionManager] Failed to refresh session:', error);

            const banMessage = getBanMessage(error);
            if (banMessage) {
                clearSession({ keepDeviceKeys: true });
                navigate('/', { replace: true });
                void showAlert({ title: 'Access Restricted', message: banMessage, danger: true });
                return;
            }

            handleSessionExpired();
        }
    }, [handleSessionExpired, navigate, showAlert]);

    const checkSession = useCallback(() => {
        // Check if session is expired
        if (isSessionExpired()) {
            handleSessionExpired();
            return;
        }

        // Check if we should refresh soon
        const timeUntilExpiry = getTimeUntilExpiry();
        if (timeUntilExpiry > 0 && timeUntilExpiry <= REFRESH_BEFORE_EXPIRY && !refreshAttempted.current) {
            console.log('[SessionManager] Session expiring soon, refreshing...');
            handleSessionRefresh();
        }
    }, [handleSessionExpired, handleSessionRefresh]);

    useEffect(() => {
        // Check immediately on mount
        checkSession();

        // Set up interval to check periodically
        intervalRef.current = window.setInterval(checkSession, CHECK_INTERVAL);

        // Cleanup on unmount
        return () => {
            if (intervalRef.current !== null) {
                clearInterval(intervalRef.current);
            }
        };
    }, [checkSession]);

    // Also check on user activity
    useEffect(() => {
        const handleActivity = () => {
            checkSession();
        };

        // Listen for user activity events
        window.addEventListener('mousedown', handleActivity);
        window.addEventListener('keydown', handleActivity);
        window.addEventListener('touchstart', handleActivity);

        return () => {
            window.removeEventListener('mousedown', handleActivity);
            window.removeEventListener('keydown', handleActivity);
            window.removeEventListener('touchstart', handleActivity);
        };
    }, [checkSession]);

    return {
        refreshSession: handleSessionRefresh,
        checkSession,
    };
}
