'use client';

import { useState, useEffect } from 'react';
import { Card, Typography, Form, Input, Button, Space, message, Result } from 'antd';
import { UserOutlined, MailOutlined, LockOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/app/providers';

const { Title, Text } = Typography;

export default function RegisterPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (user) router.push('/profile');
  }, [user, router]);

  const onFinish = async (values: { username: string; display_name: string; email: string }) => {
    setLoading(true);
    try {
      const resp = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: values.username,
          display_name: values.display_name || values.username,
          email: values.email,
        }),
      });
      const data = await resp.json();
      if (resp.ok && data.ok) {
        setSuccess(true);
        setTimeout(() => router.push('/profile'), 1500);
      } else {
        message.error(data.detail || data.error?.message || 'Ошибка регистрации');
      }
    } catch {
      message.error('Не удалось подключиться к серверу');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
        <Card style={{ maxWidth: 420, width: '100%', textAlign: 'center' }}>
          <Result status="success" title="Регистрация успешна!" subTitle="Перенаправление..." />
        </Card>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
      <Card style={{ maxWidth: 420, width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Title level={3} style={{ margin: 0 }}>Регистрация</Title>
          <Text type="secondary">Создайте аккаунт в «Наследие Аркаима»</Text>
        </div>

        <Form layout="vertical" onFinish={onFinish} autoComplete="off">
          <Form.Item
            name="username"
            label="Имя пользователя"
            rules={[
              { required: true, message: 'Введите имя пользователя' },
              { min: 3, message: 'Минимум 3 символа' },
            ]}
          >
            <Input prefix={<UserOutlined />} placeholder="username" size="large" />
          </Form.Item>

          <Form.Item name="display_name" label="Отображаемое имя">
            <Input prefix={<UserOutlined />} placeholder="Как вас называть?" size="large" />
          </Form.Item>

          <Form.Item name="email" label="Email" rules={[{ type: 'email', message: 'Некорректный email' }]}>
            <Input prefix={<MailOutlined />} placeholder="your@email.com" size="large" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block size="large" loading={loading}>
              Зарегистрироваться
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: 'center' }}>
          <Text type="secondary">Уже есть аккаунт? </Text>
          <Link href="/login">Войти</Link>
        </div>
      </Card>
    </div>
  );
}
