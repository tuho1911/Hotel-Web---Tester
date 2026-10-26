import { useEffect, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { App } from 'antd';
import * as signalR from '@microsoft/signalr';
import { addNotification, setConnected } from '../store/slices/notificationSlice';

export const useNotification = () => {
  const dispatch = useDispatch();
  const { notification } = App.useApp();

  const requestPermission = useCallback(async () => {
    if (!("Notification" in window)) {
      console.warn('This browser does not support desktop notification');
      return false;
    }

    if (Notification.permission === 'granted') return true;

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  }, []);

  const showPushNotification = useCallback((title: string, body: string) => {
    if (Notification.permission === 'granted') {
      new Notification(title, { body });
    }
  }, []);

  const notify = useCallback((notificationData: any) => {
    const title = notificationData.title ?? notificationData.Title ?? 'Thông báo mới';
    const content = notificationData.content ?? notificationData.Content ?? notificationData.message ?? '';
    const rawType = notificationData.type ?? notificationData.Type ?? 'update';
    const type = (typeof rawType === 'string' ? rawType.toLowerCase() : 'update') as
      | 'booking'
      | 'reminder'
      | 'update'
      | 'message'
      | 'payment'
      | 'warning';

    dispatch(
      addNotification({
        id: notificationData.id ?? notificationData.Id,
        title,
        description: content,
        type,
        createdAt: notificationData.createdAt || notificationData.CreatedAt || new Date().toISOString(),
      })
    );

    notification[type === 'warning' ? 'warning' : type === 'update' ? 'info' : 'success']({
      message: title,
      description: content,
      placement: 'topRight',
    });

    showPushNotification(title, content);
  }, [dispatch, notification, showPushNotification]);

  useEffect(() => {
    let isMounted = true;
    const token = localStorage.getItem('token');
    if (!token) return;

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5206';
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${apiUrl}/notificationHub`, {
        accessTokenFactory: () => token,
      })
      .withAutomaticReconnect()
      .build();

    connection.on('ReceiveNotification', (data) => {
      notify(data);
    });

    connection.onreconnecting(() => {
      if (isMounted) {
        dispatch(setConnected(false));
      }
    });

    connection.onreconnected(() => {
      if (isMounted) {
        dispatch(setConnected(true));
      }
    });

    connection.onclose(() => {
      if (isMounted) {
        dispatch(setConnected(false));
      }
    });

    const startPromise = connection.start();

    startPromise
      .then(() => {
        if (!isMounted) return;
        dispatch(setConnected(true));
      })
      .catch((err) => {
        if (isMounted) {
          dispatch(setConnected(false));
          console.error('SignalR Connection Error:', err);
        }
      });

    return () => {
      isMounted = false;
      dispatch(setConnected(false));
      startPromise.then(() => connection.stop()).catch(() => {});
    };
  }, [dispatch, notify]);

  return { notify, requestPermission };
};
