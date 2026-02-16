import { useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { refreshSession, isSessionExpired, getTimeUntilExpiry, clearSession } from '../services/session';

const REFRESH_BEFORE_EXPIRY = 5 * 60 * 1000; // Refresh 5 minutes before expiry
const CHECK_INTERVAL = 60 * 1000; // Check every minute

export function useSessionManager() {
    const navigate = useNavigate();
    const intervalRef = useRef<number | null>(null);
    const refreshAttempted = useRef(false);

    const handleSessionExpired = useCallback(() => {
        console.log('[SessionManager] Session expired, logging out...');
        clearSession();
        navigate('/admin', { replace: true });
        alert('Your session has expired. Please log in again.');
    }, [navigate]);

    const handleSessionRefresh = useCallback(async () => {
        if (refreshAttempted.current) return;
        
        try {
            refreshAttempted.current = true;
            await refreshSession();
            console.log('[SessionManager] Session refreshed successfully');
            refreshAttempted.current = false;
        } catch (error) {
            console.error('[SessionManager] Failed to refresh session:', error);
            handleSessionExpired();
        }
    }, [handleSessionExpired]);

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
