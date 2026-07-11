'use client';

import { useState, useCallback } from 'react';
import { Card, Upload, Button, Select, Input, Typography, Space, message, Result, Table, Tag, Progress, Row, Col, Statistic, Alert, Divider } from 'antd';
import { UploadOutlined, InboxOutlined, CheckCircleOutlined, FileTextOutlined, ClockCircleOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared/lib/api';
import { ProtectedRoute, RoleGuard } from '@/shared/lib/guards';

const { Title, Text, Paragraph } = Typography;
const { Dragger } = Upload;

type UploadHistory = {
  id: string;
  filename: string;
  doc_type: string;
  version: string;
  status: string;
  created_at: string;
  chunks?: number;
};

const DOC_TYPES = [
  { value: 'primary_source', label: 'Основной источник', desc: 'Книга, статья, документ' },
  { value: 'secondary_source', label: 'Вторичный источник', desc: 'Рецензия, анализ, обзор' },
  { value: 'external', label: 'Внешний документ', desc: 'Справочник, словарь, ссылка' },
];

const ACCEPTED_TYPES = '.txt,.md,.json,.pdf,.doc,.docx';
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

// ── Upload Form ──────────────────────────────────

function UploadForm({ onUploadComplete }: { onUploadComplete: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [docType, setDocType] = useState('primary_source');
  const [version, setVersion] = useState('1.0.0');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<any>(null);

  const beforeUpload = useCallback((f: File) => {
    const isValidSize = f.size <= MAX_FILE_SIZE;
    if (!isValidSize) {
      message.error(`Файл слишком большой. Максимум: ${MAX_FILE_SIZE / 1024 / 1024}MB`);
      return false;
    }
    setFile(f);
    setResult(null);
    return false;
  }, []);

  const handleUpload = async () => {
    if (!file) { message.warning('Выберите файл'); return; }
    setUploading(true);
    setProgress(0);

    // Симуляция прогресса
    const progressInterval = setInterval(() => {
      setProgress(prev => Math.min(prev + 10, 90));
    }, 200);

    try {
      const formData = new FormData();
      formData.append('file', file);
      const resp = await fetch(`/book/os/pipeline/ingest?doc_type=${docType}&version=${version}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${document.cookie.split('; ').find(c => c.startsWith('arkaim_session='))?.split('=')[1] || ''}` },
        body: formData,
      });
      const data = await resp.json();
      setResult(data);
      setProgress(100);
      message.success('Документ обработан');
      onUploadComplete();
    } catch {
      message.error('Ошибка загрузки');
      setProgress(0);
    } finally {
      clearInterval(progressInterval);
      setUploading(false);
    }
  };

  return (
    <Card title="Новый документ" style={{ marginBottom: 16 }}>
      <Dragger
        accept={ACCEPTED_TYPES}
        maxCount={1}
        beforeUpload={beforeUpload}
        showUploadList={file ? true : false}
        disabled={uploading}
      >
        <p className="ant-upload-drag-icon"><InboxOutlined /></p>
        <p className="ant-upload-text">Нажмите или перетащите файл</p>
        <p className="ant-upload-hint">
          Поддерживаются: .txt, .md, .json, .pdf, .doc, .docx (макс. 50MB)
        </p>
      </Dragger>

      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col span={8}>
          <Text strong style={{ display: 'block', marginBottom: 4 }}>Тип документа</Text>
          <Select value={docType} onChange={setDocType} style={{ width: '100%' }}>
            {DOC_TYPES.map(dt => (
              <Select.Option key={dt.value} value={dt.value}>
                <div><Text strong>{dt.label}</Text><br /><Text type="secondary" style={{ fontSize: 11 }}>{dt.desc}</Text></div>
              </Select.Option>
            ))}
          </Select>
        </Col>
        <Col span={8}>
          <Text strong style={{ display: 'block', marginBottom: 4 }}>Версия</Text>
          <Input value={version} onChange={e => setVersion(e.target.value)} placeholder="1.0.0" />
        </Col>
        <Col span={8}>
          <Text strong style={{ display: 'block', marginBottom: 4 }}>&nbsp;</Text>
          <Button type="primary" block onClick={handleUpload} loading={uploading} disabled={!file} icon={<UploadOutlined />}>
            Загрузить и обработать
          </Button>
        </Col>
      </Row>

      {uploading && (
        <Progress percent={progress} status="active" style={{ marginTop: 16 }} />
      )}

      {result && (
        <Alert
          type={result.status === 'ok' || !result.error ? 'success' : 'error'}
          icon={<CheckCircleOutlined />}
          message="Документ обработан"
          description={
            <Space direction="vertical">
              <Text>Статус: <Tag color="green">{result.status || 'ok'}</Tag></Text>
              {result.chunks && <Text>Извлечено чанков: {result.chunks}</Text>}
              {result.entities && <Text>Найдено сущностей: {result.entities}</Text>}
            </Space>
          }
          style={{ marginTop: 16 }}
        />
      )}
    </Card>
  );
}

// ── Upload History ──────────────────────────────────

function UploadHistoryPanel() {
  const [history, setHistory] = useState<UploadHistory[]>(() => {
    if (typeof window !== 'undefined') {
      try { return JSON.parse(localStorage.getItem('upload_history') || '[]'); } catch { return []; }
    }
    return [];
  });

  const addToHistory = (result: any, filename: string, docType: string, version: string) => {
    setHistory(prev => {
      const next = [{
        id: Date.now().toString(),
        filename,
        doc_type: docType,
        version,
        status: result?.status || 'ok',
        created_at: new Date().toISOString(),
        chunks: result?.chunks,
      }, ...prev].slice(0, 20);
      localStorage.setItem('upload_history', JSON.stringify(next));
      return next;
    });
  };

  const columns = [
    { title: 'Файл', dataIndex: 'filename', key: 'filename', render: (v: string) => <Space><FileTextOutlined />{v}</Space> },
    { title: 'Тип', dataIndex: 'doc_type', key: 'type', render: (v: string) => <Tag>{v}</Tag> },
    { title: 'Версия', dataIndex: 'version', key: 'version' },
    { title: 'Статус', dataIndex: 'status', key: 'status', render: (v: string) => <Tag color="green">{v}</Tag> },
    { title: 'Чанки', dataIndex: 'chunks', key: 'chunks', render: (v: number) => v || '—' },
    { title: 'Время', dataIndex: 'created_at', key: 'time', render: (v: string) => new Date(v).toLocaleString('ru') },
  ];

  return (
    <Card title="История загрузок" extra={<Tag>{history.length} файлов</Tag>}>
      {history.length === 0 ? (
        <Text type="secondary">Пока нет загруженных файлов</Text>
      ) : (
        <Table columns={columns} dataSource={history} rowKey="id" size="small" pagination={{ pageSize: 5 }} />
      )}
    </Card>
  );
}

// ── Supported Formats ──────────────────────────────

function FormatsInfo() {
  const formats = [
    { ext: '.txt', name: 'Текст', desc: 'Обычный текстовый файл' },
    { ext: '.md', name: 'Markdown', desc: 'Форматированный текст' },
    { ext: '.json', name: 'JSON', desc: 'Структурированные данные' },
    { ext: '.pdf', name: 'PDF', desc: 'Документ (извлечение текста)' },
    { ext: '.doc', name: 'Word', desc: 'Документ Microsoft Word' },
    { ext: '.docx', name: 'Word (新版)', desc: 'Документ Microsoft Word' },
  ];

  return (
    <Card title="Поддерживаемые форматы" size="small">
      <Table
        dataSource={formats}
        rowKey="ext"
        size="small"
        pagination={false}
        columns={[
          { title: 'Расширение', dataIndex: 'ext', key: 'ext', render: (v: string) => <code>{v}</code> },
          { title: 'Формат', dataIndex: 'name', key: 'name' },
          { title: 'Описание', dataIndex: 'desc', key: 'desc' },
        ]}
      />
    </Card>
  );
}

// ── Main Content ──────────────────────────────────

function UploadContent() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <Title level={2}><UploadOutlined /> Загрузка документов</Title>
      <Paragraph type="secondary">
        Загружайте документы для обновления базы знаний книги «Наследие Аркаима».
        Система автоматически извлечёт текст, сущности и связи.
      </Paragraph>

      <Alert
        message="Важно"
        description="Загружайте только те документы, которые относятся к книге. Система автоматически обработает и индексирует содержимое."
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <UploadForm onUploadComplete={() => setRefreshKey(k => k + 1)} />
        </Col>
        <Col xs={24} lg={8}>
          <FormatsInfo />
        </Col>
      </Row>

      <Divider />

      <UploadHistoryPanel key={refreshKey} />
    </div>
  );
}

export default function UploadPage() {
  return (
    <ProtectedRoute>
      <RoleGuard roles={['editor', 'admin']}>
        <UploadContent />
      </RoleGuard>
    </ProtectedRoute>
  );
}
