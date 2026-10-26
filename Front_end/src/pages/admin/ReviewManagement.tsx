import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { App, Button, Modal, Table, Tag, Popconfirm } from 'antd';
import { CheckCircle, XCircle, Trash2, Eye } from 'lucide-react';
import type { ColumnsType } from 'antd/es/table';
import { reviewApi, ReviewDto } from '../../services/reviewApi';
import * as signalR from '@microsoft/signalr';

const ReviewManagement: React.FC = () => {
  const { message } = App.useApp();
  const [reviews, setReviews] = useState<ReviewDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewReview, setViewReview] = useState<ReviewDto | null>(null);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const data = await reviewApi.getAllForAdmin();
      setReviews(data);
    } catch (err) {
      message.error('Không thể tải danh sách bình luận');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchReviews();

    const token = localStorage.getItem('token');
    if (!token) return;

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5206';
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${apiUrl}/notificationHub`, {
        accessTokenFactory: () => token,
      })
      .withAutomaticReconnect()
      .build();

    connection.on('ReviewUpdated', () => {
      void fetchReviews();
    });

    connection.start()
      .catch((err) => console.error('[SignalR] Lỗi kết nối trong ReviewManagement:', err));

    return () => {
      connection.stop().catch(() => {});
    };
  }, []);

  const handleApprove = async (id: number) => {
    try {
      await reviewApi.approveReview(id);
      message.success('Đã duyệt bình luận');
      void fetchReviews();
    } catch (err) {
      message.error('Duyệt thất bại');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await reviewApi.deleteReview(id);
      message.success('Đã xóa bình luận');
      void fetchReviews();
    } catch (err) {
      message.error('Xóa thất bại');
    }
  };

  const columns: ColumnsType<ReviewDto> = [
    { title: 'Tác giả', dataIndex: 'authorName', key: 'authorName' },
    { title: 'Loại', dataIndex: 'targetType', key: 'targetType', render: (val) => <Tag color={val === 'Article' ? 'blue' : 'purple'}>{val}</Tag> },
    { title: 'Item ID', dataIndex: 'targetId', key: 'targetId' },
    { title: 'Số Sao', dataIndex: 'rating', key: 'rating', render: (val) => <b className="text-yellow-500">{val} ⭐</b> },
    { title: 'Nội dung', dataIndex: 'comment', key: 'comment', ellipsis: true },
    { title: 'Trạng thái', dataIndex: 'isApproved', key: 'isApproved', render: (val) => <Tag color={val ? 'green' : 'orange'}>{val ? 'Đã duyệt' : 'Chờ duyệt'}</Tag> },
    { title: 'Ngày tạo', dataIndex: 'createdAt', key: 'createdAt', render: (val) => new Date(val).toLocaleString('vi-VN') },
    {
      title: 'Hành động',
      key: 'action',
      render: (_, record) => (
        <div className="flex gap-2">
          <Button type="text" icon={<Eye size={16} className="text-info" />} onClick={() => setViewReview(record)} />
          {!record.isApproved && (
            <Button type="text" icon={<CheckCircle size={16} className="text-success" />} onClick={() => handleApprove(record.id)} />
          )}
          <Popconfirm title="Xóa bình luận này?" onConfirm={() => handleDelete(record.id)}>
            <Button type="text" icon={<Trash2 size={16} className="text-error" />} />
          </Popconfirm>
        </div>
      )
    }
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 pb-10">
      <div>
        <h1 className="text-4xl text-title font-display">Review Management</h1>
        <p className="text-muted mt-2">Duyệt và xóa các bình luận, đánh giá của khách hàng</p>
      </div>

      <div className="admin-card !p-0 overflow-hidden">
        <Table columns={columns} dataSource={reviews} rowKey="id" loading={loading} scroll={{ x: 1000 }} />
      </div>

      <Modal open={!!viewReview} title="Chi tiết bình luận" onCancel={() => setViewReview(null)} footer={null}>
        {viewReview && (
          <div className="space-y-4 pt-4">
            <div><p className="text-muted">Người viết:</p><p className="font-bold text-title">{viewReview.authorName}</p></div>
            <div><p className="text-muted">Đối tượng:</p><p className="font-bold">{viewReview.targetType} (ID: {viewReview.targetId})</p></div>
            <div><p className="text-muted">Số sao:</p><p className="text-yellow-500 font-bold">{viewReview.rating} ⭐</p></div>
            <div><p className="text-muted">Nội dung:</p><div className="bg-subtle p-4 rounded-xl mt-1">{viewReview.comment || <i>Không có nội dung bìn luận</i>}</div></div>
            <div className="flex justify-end gap-3 mt-6">
              <Button onClick={() => setViewReview(null)}>Đóng</Button>
              {!viewReview.isApproved && (
                <Button type="primary" onClick={() => { handleApprove(viewReview.id); setViewReview(null); }} className="btn-gold">
                  Duyệt đăng
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </motion.div>
  );
};

export default ReviewManagement;
