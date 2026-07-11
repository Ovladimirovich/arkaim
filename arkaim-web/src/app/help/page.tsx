'use client';

import { useState } from 'react';
import { Card, Typography, Row, Col, Tag, Tabs, List, Space, Button, Divider, Alert } from 'antd';
import { BookOutlined, MessageOutlined, ReadOutlined, SearchOutlined, UserOutlined, TrophyOutlined, HistoryOutlined, DollarOutlined, RiseOutlined, BellOutlined, CodeOutlined, SettingOutlined, UploadOutlined, PictureOutlined, EditOutlined, EyeOutlined, LoginOutlined, QuestionCircleOutlined, ThunderboltOutlined, StarOutlined, BulbOutlined, KeyboardOutlined } from '@ant-design/icons';
import Link from 'next/link';

const { Title, Text, Paragraph } = Typography;

// ── Page Descriptions ──────────────────────────────────

const PAGES = [
  {
    category: 'Книга',
    color: '#2563eb',
    items: [
      { path: '/ask', icon: <QuestionCircleOutlined />, title: 'Задать вопрос', desc: 'Минималистичная страница для быстрого вопроса. Популярные вопросы, streaming ответов.', roles: ['all'] },
      { path: '/book', icon: <MessageOutlined />, title: 'Чат с книгой', desc: 'Полноценный чат с боковой панелью (темы, профиль, статистика). Streaming, сессии, история.', roles: ['all'] },
      { path: '/reading', icon: <ReadOutlined />, title: 'Чтение', desc: 'Режим чтения глав с оглавлением, настройкой размера шрифта и навигацией.', roles: ['all'] },
      { path: '/library', icon: <BookOutlined />, title: 'Библиотека', desc: 'Геном книги (темы, персонажи, ценности, мир) + слои сознания + история эволюции.', roles: ['all'] },
      { path: '/genres', icon: <StarOutlined />, title: 'Жанры', desc: 'Темы по 6 жанровым категориям (мифология, история, философия...) с поиском.', roles: ['all'] },
      { path: '/visual-view', icon: <EyeOutlined />, title: 'Визуал', desc: 'Галерея сцен, персонажей и локаций с подробным просмотром.', roles: ['all'] },
      { path: '/about', icon: <BulbOutlined />, title: 'О книге', desc: 'Геном + слои сознания (знание, смысл, идентичность, миссия) + эволюция.', roles: ['all'] },
      { path: '/search', icon: <SearchOutlined />, title: 'Поиск', desc: '4 вкладки: знания, факты, сущности, граф связей.', roles: ['all'] },
    ],
  },
  {
    category: 'Читатель',
    color: '#059669',
    items: [
      { path: '/profile', icon: <UserOutlined />, title: 'Профиль', desc: 'Быстрые действия, статистика, изученные темы, API-ключи, подписка.', roles: ['all'] },
      { path: '/recommendations', icon: <TrophyOutlined />, title: 'Рекомендации', desc: 'Персонализированные предложения, тренды, прогресс обучения.', roles: ['all'] },
      { path: '/history', icon: <HistoryOutlined />, title: 'История', desc: 'Вопросы, сессии, фильтры по времени.', roles: ['all'] },
      { path: '/settings', icon: <SettingOutlined />, title: 'Настройки', desc: 'Аккаунт, внешний вид, язык, уведомления, безопасность, конфиденциальность.', roles: ['all'] },
    ],
  },
  {
    category: 'Сообщество',
    color: '#d97706',
    items: [
      { path: '/crowdfunding', icon: <DollarOutlined />, title: 'Краудфандинг', desc: 'Кампании, майлстоуны, admin-панель.', roles: ['all'] },
      { path: '/notifications', icon: <BellOutlined />, title: 'Уведомления', desc: 'Предложения Presence, трендовые темы, email-рассылка, подписчики.', roles: ['all'] },
      { path: '/analytics', icon: <RiseOutlined />, title: 'Аналитика', desc: 'Запросы по типу/часам, граф знаний, системная статистика.', roles: ['all'] },
    ],
  },
  {
    category: 'Инструменты',
    color: '#7c3aed',
    items: [
      { path: '/api', icon: <CodeOutlined />, title: 'API', desc: 'Управление ключами, тестер эндпоинтов, примеры кода, документация.', roles: ['all'] },
      { path: '/upload', icon: <UploadOutlined />, title: 'Загрузка', desc: 'Drag-and-drop загрузка документов (.txt, .md, .json, .pdf, .doc).', roles: ['editor', 'admin'] },
      { path: '/visual', icon: <PictureOutlined />, title: 'Визуалы', desc: 'Создание сцен, персонажей, локаций + голосовой ввод.', roles: ['editor', 'admin'] },
      { path: '/editor', icon: <EditOutlined />, title: 'Редактор', desc: 'Создание и редактирование сцен, персонажей и локаций.', roles: ['editor', 'admin'] },
    ],
  },
  {
    category: 'Админ',
    color: '#dc2626',
    items: [
      { path: '/admin', icon: <SettingOutlined />, title: 'Админ-панель', desc: 'Дашборд, пользователи, инвайты, сессии, API-ключи, статистика.', roles: ['admin'] },
      { path: '/xray', icon: <RiseOutlined />, title: 'X-Ray', desc: 'Мониторинг трейсов, диагностика системы.', roles: ['admin'] },
    ],
  },
  {
    category: 'Авторизация',
    color: '#6b7280',
    items: [
      { path: '/login', icon: <LoginOutlined />, title: 'Вход', desc: 'Telegram бот, email, dev-режим.', roles: ['all'] },
      { path: '/register', icon: <UserOutlined />, title: 'Регистрация', desc: 'Создание аккаунта по email.', roles: ['all'] },
    ],
  },
];

const NAV_GROUPS = [
  { title: 'Книга', color: '#2563eb', desc: 'Основные разделы для чтения и взаимодействия с книгой', pages: ['Задать вопрос', 'Чтение', 'Библиотека', 'Жанры', 'Визуал', 'О книге', 'Поиск'] },
  { title: 'Читатель', color: '#059669', desc: 'Персональные данные и настройки', pages: ['Профиль', 'Рекомендации', 'История', 'Настройки'] },
  { title: 'Сообщество', color: '#d97706', desc: 'Краудфандинг, уведомления, аналитика', pages: ['Краудфандинг', 'Уведомления', 'Аналитика'] },
  { title: 'Инструменты', color: '#7c3aed', desc: 'API, загрузка, редактирование контента', pages: ['API', 'Загрузка', 'Визуалы', 'Редактор'] },
  { title: 'Админ', color: '#dc2626', desc: 'Управление системой (только для администраторов)', pages: ['Админ-панель', 'X-Ray'] },
];

const SHORTCUTS = [
  { keys: 'Enter', desc: 'Отправить вопрос в чате' },
  { keys: 'Shift + Enter', desc: 'Новая строка в поле ввода' },
  { keys: 'Клик по теме', desc: 'Быстрый переход к вопросу по теме' },
];

// ── Main Page ──────────────────────────────────

function HelpContent() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filteredPages = selectedCategory
    ? PAGES.filter(p => p.category === selectedCategory)
    : PAGES;

  const allPages = PAGES.flatMap(p => p.items);

  const categoryItems = [
    {
      key: 'all',
      label: '📋 Все страницы',
      children: (
        <List
          dataSource={allPages}
          renderItem={(item) => (
            <List.Item
              actions={[<Link key="go" href={item.path}><Button size="small" type="link">Перейти →</Button></Link>]}
            >
              <List.Item.Meta
                avatar={<div style={{ fontSize: 18 }}>{item.icon}</div>}
                title={<Space>{item.title} <Text type="secondary" style={{ fontSize: 12 }}>({item.path})</Text></Space>}
                description={
                  <div>
                    <Text style={{ fontSize: 13 }}>{item.desc}</Text>
                    {item.roles[0] !== 'all' && (
                      <div style={{ marginTop: 4 }}>
                        {item.roles.map(r => <Tag key={r} style={{ fontSize: 10 }}>{r}</Tag>)}
                      </div>
                    )}
                  </div>
                }
              />
            </List.Item>
          )}
        />
      ),
    },
    ...PAGES.map(cat => ({
      key: cat.category,
      label: <Space><span style={{ color: cat.color }}>●</span> {cat.category}</Space>,
      children: (
        <Row gutter={[12, 12]}>
          {cat.items.map(item => (
            <Col xs={24} sm={12} lg={8} key={item.path}>
              <Card size="small" hoverable style={{ height: '100%', borderTop: `3px solid ${cat.color}` }}>
                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                  <Space>
                    <span style={{ fontSize: 18, color: cat.color }}>{item.icon}</span>
                    <Text strong>{item.title}</Text>
                  </Space>
                  <Text type="secondary" style={{ fontSize: 12 }}>{item.desc}</Text>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                    <Text code style={{ fontSize: 11 }}>{item.path}</Text>
                    <Link href={item.path}><Button size="small" type="link">Открыть →</Button></Link>
                  </div>
                </Space>
              </Card>
            </Col>
          ))}
        </Row>
      ),
    })),
    {
      key: 'nav',
      label: '🧭 Навигация',
      children: (
        <Row gutter={[16, 16]}>
          {NAV_GROUPS.map(group => (
            <Col xs={24} sm={12} lg={8} key={group.title}>
              <Card size="small" title={<span style={{ color: group.color }}>{group.title}</span>}>
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>{group.desc}</Text>
                <List size="small" dataSource={group.pages} renderItem={(page) => (
                  <List.Item style={{ padding: '2px 0' }}><Text style={{ fontSize: 12 }}>• {page}</Text></List.Item>
                )} />
              </Card>
            </Col>
          ))}
        </Row>
      ),
    },
    {
      key: 'shortcuts',
      label: <><KeyboardOutlined /> Горячие клавиши</>,
      children: (
        <Card>
          <List
            dataSource={SHORTCUTS}
            renderItem={(item) => (
              <List.Item>
                <Space>
                  <Tag color="blue" style={{ fontFamily: 'monospace' }}>{item.keys}</Tag>
                  <Text>{item.desc}</Text>
                </Space>
              </List.Item>
            )}
          />
        </Card>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ marginBottom: 16 }}>
        <Title level={2} style={{ marginBottom: 4 }}>Инструкции</Title>
        <Text type="secondary">Справочник по всем страницам и функциям приложения</Text>
      </div>

      <Alert
        message="Добро пожаловать в «Наследие Аркаима»"
        description="Эта страница поможет вам разобраться в функционале. Выберите нужный раздел или воспользуйтесь поиском."
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      {/* Stats */}
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={8}><Card size="small" hoverable><div style={{ textAlign: 'center' }}><BookOutlined style={{ fontSize: 20, color: '#2563eb' }} /><div><Text strong style={{ fontSize: 18 }}>{allPages.length}</Text></div><Text type="secondary" style={{ fontSize: 11 }}>страниц</Text></div></Card></Col>
        <Col xs={8}><Card size="small" hoverable><div style={{ textAlign: 'center' }}><ThunderboltOutlined style={{ fontSize: 20, color: '#7c3aed' }} /><div><Text strong style={{ fontSize: 18 }}>{PAGES.length}</Text></div><Text type="secondary" style={{ fontSize: 11 }}>категорий</Text></div></Card></Col>
        <Col xs={8}><Card size="small" hoverable><div style={{ textAlign: 'center' }}><KeyboardOutlined style={{ fontSize: 20, color: '#059669' }} /><div><Text strong style={{ fontSize: 18 }}>{SHORTCUTS.length}</Text></div><Text type="secondary" style={{ fontSize: 11 }}>команд</Text></div></Card></Col>
      </Row>

      <Tabs items={categoryItems} />
    </div>
  );
}

export default function HelpPage() {
  return <HelpContent />;
}
