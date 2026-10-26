import React, { useEffect, useState } from 'react';
import { Card, Form, Input, Button, Tabs, Typography, message, Space, Divider, Row, Col } from 'antd';
import { Save, Settings, Info, ShieldCheck, DollarSign, Clock } from 'lucide-react';
import { adminApi } from '../../services/adminApi';

interface SystemSetting {
  key: string;
  value: string;
  description: string;
  group: string;
}

const SystemSettingsPage: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<SystemSetting[]>([]);

  const loadSettings = async () => {
    try {
      const data = await adminApi.getSystemSettings();
      setSettings(data);
      
      const formValues: Record<string, string> = {};
      data.forEach((s: SystemSetting) => {
        formValues[s.key] = s.value;
      });
      form.setFieldsValue(formValues);
    } catch (error) {
      message.error('Không thể tải cấu hình hệ thống');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const onFinish = async (values: Record<string, string>) => {
    setSaving(true);
    try {
      const updatePayload = Object.entries(values).map(([key, value]) => ({
        key,
        value: value.toString()
      }));
      await adminApi.updateSystemSettings(updatePayload);
      message.success('Đã lưu cấu hình hệ thống thành công');
      loadSettings();
    } catch (error) {
      message.error('Lỗi khi lưu cấu hình');
    } finally {
      setSaving(false);
    }
  };

  const renderGroup = (groupName: string) => {
    const groupSettings = settings.filter(s => s.group === groupName);
    return (
      <div className="space-y-6 py-4">
        {groupSettings.map(s => (
          <Row key={s.key} gutter={24} align="middle">
            <Col span={8}>
              <div className="space-y-1">
                <Typography.Text strong>{s.description}</Typography.Text>
                <br />
                <Typography.Text type="secondary" className="text-xs">
                  Mã cấu hình: <code className="bg-muted px-1 rounded">{s.key}</code>
                </Typography.Text>
              </div>
            </Col>
            <Col span={16}>
              <Form.Item name={s.key} style={{ margin: 0 }}>
                <Input size="large" className="rounded-xl border-luxury" />
              </Form.Item>
            </Col>
          </Row>
        ))}
      </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-2xl">
            <Settings size={28} className="text-primary" />
          </div>
          <div>
            <Typography.Title level={2} style={{ margin: 0 }}>Thiết lập hệ thống</Typography.Title>
            <Typography.Text type="secondary">Cấu hình thông tin chung và các quy tắc vận hành của khách sạn.</Typography.Text>
          </div>
        </div>
        <Button 
          type="primary" 
          icon={<Save size={18} />} 
          size="large" 
          onClick={() => form.submit()}
          loading={saving}
          className="btn-gold px-8 rounded-xl h-12 shadow-lg shadow-primary/20"
        >
          Lưu thay đổi
        </Button>
      </div>

      <Card className="glass-card border-none shadow-sm overflow-hidden" styles={{ body: { padding: 0 } }}>
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Tabs
            tabBarStyle={{ padding: '0 24px', background: 'rgba(var(--primary-rgb), 0.02)' }}
            className="settings-tabs"
            items={[
              {
                key: 'General',
                label: <span className="flex items-center gap-2 py-3 px-2"><Info size={16} /> Thông tin chung</span>,
                children: <div className="p-8">{renderGroup('General')}</div>
              },
              {
                key: 'Policy',
                label: <span className="flex items-center gap-2 py-3 px-2"><Clock size={16} /> Chính sách nhận/trả phòng</span>,
                children: <div className="p-8">{renderGroup('Policy')}</div>
              },
              {
                key: 'Finance',
                label: <span className="flex items-center gap-2 py-3 px-2"><DollarSign size={16} /> Tài chính & Thuế</span>,
                children: <div className="p-8">{renderGroup('Finance')}</div>
              }
            ]}
          />
        </Form>
      </Card>

      <style>{`
        .settings-tabs .ant-tabs-nav::before {
          border-bottom: 1px solid var(--border-color);
        }
        .settings-tabs .ant-tabs-tab-active .ant-tabs-tab-btn {
          color: var(--primary) !important;
          font-weight: 700 !important;
        }
        .settings-tabs .ant-tabs-ink-bar {
          background: var(--primary) !important;
          height: 3px !important;
          border-radius: 3px 3px 0 0;
        }
      `}</style>
    </div>
  );
};

export default SystemSettingsPage;
