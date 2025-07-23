import React, { createContext, useContext, useState, useCallback } from 'react';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
    id: string;
    type: NotificationType;
    title: string;
    message?: string;
    duration?: number;
    persistent?: boolean;
}

interface NotificationContextType {
    notifications: Notification[];
    addNotification: (notification: Omit<Notification, 'id'>) => void;
    removeNotification: (id: string) => void;
    clearAll: () => void;
    // Métodos de conveniencia
    success: (title: string, message?: string, duration?: number) => void;
    error: (title: string, message?: string, persistent?: boolean) => void;
    warning: (title: string, message?: string, duration?: number) => void;
    info: (title: string, message?: string, duration?: number) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
};

interface NotificationProviderProps {
    children: React.ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);

    const addNotification = useCallback((notification: Omit<Notification, 'id'>) => {
        const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
        const newNotification: Notification = {
            id,
            duration: 5000, // 5 segundos por defecto
            ...notification,
        };

        setNotifications(prev => [...prev, newNotification]);

        // Auto-remove si no es persistente
        if (!newNotification.persistent && newNotification.duration) {
            setTimeout(() => {
                removeNotification(id);
            }, newNotification.duration);
        }
    }, []);

    const removeNotification = useCallback((id: string) => {
        setNotifications(prev => prev.filter(notification => notification.id !== id));
    }, []);

    const clearAll = useCallback(() => {
        setNotifications([]);
    }, []);

    // Métodos de conveniencia
    const success = useCallback((title: string, message?: string, duration = 4000) => {
        addNotification({ type: 'success', title, message, duration });
    }, [addNotification]);

    const error = useCallback((title: string, message?: string, persistent = false) => {
        addNotification({
            type: 'error',
            title,
            message,
            persistent,
            duration: persistent ? undefined : 6000
        });
    }, [addNotification]);

    const warning = useCallback((title: string, message?: string, duration = 5000) => {
        addNotification({ type: 'warning', title, message, duration });
    }, [addNotification]);

    const info = useCallback((title: string, message?: string, duration = 4000) => {
        addNotification({ type: 'info', title, message, duration });
    }, [addNotification]);

    const value: NotificationContextType = {
        notifications,
        addNotification,
        removeNotification,
        clearAll,
        success,
        error,
        warning,
        info,
    };

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
};