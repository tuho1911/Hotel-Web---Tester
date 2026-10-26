import React, { useEffect, useState } from 'react';
import { Table, Tag, Button, Modal, Input, Form, Typography, Space, Card, Badge, Tooltip } from 'antd';
import { Mail, MessageCircle, Reply, CheckCircle, Clock, Search, Filter, Send } from 'lucide-react';
import { adminApi, type ContactMessageDto } from '../../services/adminApi';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const ContactManagement: React.FC = () => {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<ContactMessageDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<ContactMessageDto | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [replyLoading, setReplyLoading] = useState(false);
  const [form] = Form.useForm();

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const data = await adminApi.getContactMessages();
      setMessages(data);
    } catch (error) {
      console.error('Failed to fetch contact messages:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  const handleOpenReply = (message: ContactMessageDto) => {
    setSelectedMessage(message);
    setIsModalOpen(true);
    form.setFieldsValue({ reply: message.replyMessage || '' });
    
    if (!message.isRead) {
      adminApi.markContactAsRead(message.id).then(() => {
        setMessages(prev => prev.map(m => m.id === message.id ? { ...m, isRead: true } : m));
      });
    }
  };

  const handleReplySubmit = async (values: { reply: string }) => {
    if (!selectedMessage) return;
    setReplyLoading(true);
    try {
      await adminApi.replyContactMessage(selectedMessage.id, values.reply);
      Modal.success({
        title: 'Thành công',
        content: 'Phản hồi đã được gửi đi qua email của khách hàng.',
      });
      setIsModalOpen(false);
      fetchMessages();
    } catch (error) {
      console.error('Failed to send reply:', error);
      Modal.error({
        title: 'Thất bại',
        content: 'Không thể gửi phản hồi. Vui lòng thử lại sau.',
      });
    } finally {
      setReplyLoading(false);
    }
  };

  const columns = [
    {
      title: 'Khách hàng',
      dataIndex: 'fullName',
      key: 'fullName',
      render: (text: string, record: ContactMessageDto) => (
        <Space direction="vertical" size={0}>
          <Text strong className="text-title">{text}</Text>
          <Text type="secondary" className="text-xs">{record.email}</Text>
        </Space>
      ),
    },
    {
      title: 'Chủ đề',
      dataIndex: 'subject',
      key: 'subject',
      render: (text: string) => <Text className="font-medium">{text}</Text>,
    },
    {
      title: 'Thời gian',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => (
        <Tooltip title={dayjs(date).format('DD/MM/YYYY HH:mm')}>
          <Text type="secondary">{dayjs(date).fromNow()}</Text>
        </Tooltip>
      ),
    },
    {
      title: 'Trạng thái',
      key: 'status',
      render: (_: any, record: ContactMessageDto) => (
        <Space>
          {!record.isRead ? (
            <Badge status="processing" text="Mới" color="blue" />
          ) : record.replyMessage ? (
            <Badge status="success" text="Đã phản hồi" color="green" />
          ) : (
            <Badge status="default" text="Đã đọc" color="orange" />
          )}
        </Space>
      ),
    },
    {
      title: 'Thao tác',
      key: 'action',
      render: (_: any, record: ContactMessageDto) => (
        <Button 
          type="primary" 
          icon={<Reply size={16} />} 
          onClick={() => handleOpenReply(record)}
          className="btn-gold-small flex items-center gap-2"
        >
          {record.replyMessage ? 'Xem lại' : 'Phản hồi'}
        </Button>
      ),
    },
  ];

  return (
    <div className="p-4 sm:p-8">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <Title level={2} className="!mb-1 text-title">Quản lý Liên hệ</Title>
          <Text type="secondary">Xem và phản hồi các yêu cầu từ khách hàng</Text>
        </div>
        
        <div className="flex gap-3">
          <Input 
            prefix={<Search size={18} className="text-muted" />} 
            placeholder="Tìm kiếm lời nhắn..." 
            className="input-luxury w-full md:w-64"
          />
          <Button icon={<Filter size={18} />} className="flex items-center gap-2">Lọc</Button>
        </div>
      </motion.div>

      <Card className="glass-card shadow-sm overflow-hidden">
        <Table 
          columns={columns} 
          dataSource={messages} 
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
          className="luxury-table"
        />
      </Card>

      <Modal
        title={
          <div className="flex items-center gap-3 pb-4 border-b">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <Mail size={24} />
            </div>
            <div>
              <div className="text-xs font-black uppercase tracking-widest text-primary">Chi tiết lời nhắn</div>
              <div className="text-lg font-bold text-title">{selectedMessage?.subject}</div>
            </div>
          </div>
        }
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        width={700}
        centered
        className="luxury-modal"
      >
        {selectedMessage && (
          <div className="py-6 space-y-8">
            {/* Customer Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Text type="secondary" className="text-[10px] font-black uppercase tracking-widest">Từ khách hàng</Text>
                <div className="font-bold text-title">{selectedMessage.fullName}</div>
              </div>
              <div className="space-y-1">
                <Text type="secondary" className="text-[10px] font-black uppercase tracking-widest">Email</Text>
                <div className="font-bold text-title">{selectedMessage.email}</div>
              </div>
            </div>

            {/* Content */}
            <div className="space-y-2">
              <Text type="secondary" className="text-[10px] font-black uppercase tracking-widest">Nội dung yêu cầu</Text>
              <div className="p-5 bg-muted/5 rounded-2xl border border-luxury/10 italic text-title leading-relaxed">
                "{selectedMessage.message}"
              </div>
              <div className="text-right">
                <Text type="secondary" className="text-xs">Gửi lúc: {dayjs(selectedMessage.createdAt).format('HH:mm - DD/MM/YYYY')}</Text>
              </div>
            </div>

            <div className="h-px bg-luxury/10" />

            {/* Reply Form */}
            <Form form={form} onFinish={handleReplySubmit} layout="vertical" className="space-y-6">
              <Form.Item 
                name="reply" 
                label={<span className="text-[10px] font-black uppercase tracking-widest text-primary">Nội dung phản hồi</span>}
                rules={[{ required: true, message: 'Vui lòng nhập nội dung phản hồi' }]}
              >
                <TextArea 
                  rows={6} 
                  placeholder="Nhập nội dung phản hồi cho khách hàng..." 
                  className="input-luxury !py-4"
                  readOnly={!!selectedMessage.replyMessage}
                />
              </Form.Item>

              {!selectedMessage.replyMessage ? (
                <div className="flex justify-end gap-3">
                  <Button onClick={() => setIsModalOpen(false)}>Hủy</Button>
                  <Button 
                    type="primary" 
                    htmlType="submit" 
                    loading={replyLoading}
                    icon={<Send size={18} />}
                    className="btn-gold px-8 flex items-center gap-2"
                  >
                    Gửi phản hồi qua Email
                  </Button>
                </div>
              ) : (
                <div className="bg-green-50/50 p-4 rounded-xl border border-green-100 flex gap-4">
                  <CheckCircle className="text-green-500 shrink-0" size={24} />
                  <div>
                    <div className="text-sm font-bold text-green-800">Đã phản hồi vào {dayjs(selectedMessage.repliedAt).format('HH:mm - DD/MM/YYYY')}</div>
                    <Text type="secondary" className="text-xs italic">Một bản sao của phản hồi này đã được gửi đến email của khách hàng.</Text>
                  </div>
                </div>
              )}
            </Form>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ContactManagement;
