'use client';

import { Suspense, useEffect, useState } from 'react';
import { Card, Typography, Space, Alert, Button, Divider, Spin, Result, message } from 'antd';
import { CodeOutlined, LoginOutlined, SendOutlined } from '@ant-design/icons';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/app/providers';

const { Title, Text } = Typography;

function LoginPageInner() {
  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'ARKAIM_AI_Bot';
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [loginState, setLoginState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  // Если уже авторизован — редирект на /profile
  useEffect(() => {
    if (user && !token) {
      router.push('/profile');
    }
  }, [user, router, token]);

  // Обработка токена из URL (?token=XXXX)
  useEffect(() => {
    if (!token) return;

    setLoginState('loading');
    fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ token }),
    })
      .then(async (resp) => {
        const data = await resp.json();
        if (resp.ok && data.ok) {
          setLoginState('success');
          setTimeout(() => router.push('/profile'), 1500);
        } else {
          setLoginState('error');
          setErrorMsg(data.detail || 'Ошибка авторизации');
        }
      })
      .catch(() => {
        setLoginState('error');
        setErrorMsg('Не удалось подключиться к серверу');
      });
  }, [token, router]);

  // Обработка callback от Telegram Widget
  useEffect(() => {
    const handler = async (e: MessageEvent) => {
      if (!e.data || typeof e.data !== 'string') return;
      try {
        const data = JSON.parse(e.data);
        if (data.id && data.hash) {
          const resp = await fetch('/auth/telegram/callback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify(data),
          });
          if (resp.ok) {
            window.location.reload();
          }
        }
      } catch {}
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  const [devLoading, setDevLoading] = useState(false);

  const handleDevLogin = async () => {
    setDevLoading(true);
    try {
      const resp = await fetch('/api/auth/dev-login', { method: 'POST' });
      const data = await resp.json();
      if (resp.ok && data.ok) {
        window.location.href = '/book';
      } else {
        message.error(data.error || 'Ошибка dev-входа');
      }
    } catch {
      message.error('Не удалось подключиться к серверу');
    } finally {
      setDevLoading(false);
    }
  };

  const handleBotLogin = () => {
    window.open(`https://t.me/${botUsername}?start=login`, '_blank');
  };

  // Состояние: обработка токена
  if (loginState === 'loading') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
        <Card style={{ maxWidth: 420, width: '100%', textAlign: 'center' }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}><Text>Авторизация...</Text></div>
        </Card>
      </div>
    );
  }

  if (loginState === 'success') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
        <Card style={{ maxWidth: 420, width: '100%', textAlign: 'center' }}>
          <Result status="success" title="Вход выполнен!" subTitle="Перенаправление..." />
        </Card>
      </div>
    );
  }

  if (loginState === 'error') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
        <Card style={{ maxWidth: 420, width: '100%', textAlign: 'center' }}>
          <Result status="error" title="Ошибка входа" subTitle={errorMsg}
            extra={<Button type="primary" onClick={() => { setLoginState('idle'); router.push('/login'); }}>Попробовать снова</Button>}
          />
        </Card>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
      <Card style={{ maxWidth: 420, width: '100%', textAlign: 'center' }}>
        <Title level={3}>Вход в систему</Title>
        <Text type="secondary">Получите доступ к книге «Наследие Аркаима»</Text>

        <Space direction="vertical" style={{ width: '100%', marginTop: 24 }} size="middle">
          {/* Вход через Telegram бота */}
          <Button
            type="primary"
            icon={<SendOutlined />}
            block
            size="large"
            onClick={handleBotLogin}
          >
            Войти через Telegram бота
          </Button>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Отправьте команду /login боту @{botUsername}
          </Text>

          <Divider plain><Text type="secondary" style={{ fontSize: 12 }}>или</Text></Divider>

          {/* Dev Login */}
          <Button
            icon={<CodeOutlined />}
            block
            size="large"
            onClick={handleDevLogin}
            loading={devLoading}
          >
            Войти как разработчик
          </Button>
        </Space>

        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <Text type="secondary" style={{ fontSize: 12 }}>Нет аккаунта? </Text>
          <Link href="/register" style={{ fontSize: 12 }}>Зарегистрироваться</Link>
        </div>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}><Spin size="large" /></div>}>
      <LoginPageInner />
    </Suspense>
  );
}
