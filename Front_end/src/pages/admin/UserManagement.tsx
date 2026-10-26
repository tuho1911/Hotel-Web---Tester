import React, { useEffect, useState } from 'react';
import { Table, Button, Input, Modal, Form, Select, Space, Tag, Popconfirm, App, Tooltip } from 'antd';
import { Search, Plus, Edit2, Lock, Unlock, Trash2 } from 'lucide-react';
import axiosClient from '../../api/axiosClient';
import { usePermission, useAppSelector } from '../../hooks/useAppStore';

const UserManagement: React.FC = () => {
  const canManageUsers = usePermission('MANAGE_USERS');
  const [users, setUsers] = useState<any[]>([]);
  const { message, notification } = App.useApp();
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [togglingUserId, setTogglingUserId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [form] = Form.useForm();

  const currentUserId = useAppSelector((s) => s.auth.user?.id);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data: any = await axiosClient.get('/api/UserManagement');
      setUsers(data);
    } catch {
      message.error('Không thể lấy danh sách người dùng');
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const data: any = await axiosClient.get('/api/Roles');
      setRoles(data);
    } catch (err) {
      console.error('Lỗi lấy danh sách Roles', err);
    }
  };

  useEffect(() => {
    void fetchUsers();
    void fetchRoles();
  }, []);

  const applyUserStatusLocally = (id: number, nextStatus: boolean) => {
    setUsers((prev) => prev.map((user) => (user.id === id ? { ...user, status: nextStatus } : user)));
  };

  const handleSaveUser = async (values: any) => {
    try {
      let roleChangedForSelf = false;
      if (editingUser) {
        await axiosClient.put(`/api/UserManagement/${editingUser.id}`, {
          fullName: values.fullName,
          phone: values.phone,
          status: values.status,
          password: values.password || undefined,
        });

        if (values.roleId && values.roleId !== editingUser.roleId) {
          await axiosClient.put(`/api/UserManagement/${editingUser.id}/change-role`, {
            roleId: values.roleId,
          });
          if (editingUser.id.toString() === currentUserId?.toString()) {
            roleChangedForSelf = true;
          }
        }

        message.success('Cập nhật người dùng thành công');
      } else {
        await axiosClient.post('/api/UserManagement', {
          fullName: values.fullName,
          email: values.email,
          password: values.password,
          roleId: values.roleId,
        });
        message.success('Tạo người dùng và gửi email thành công');
      }
      setIsModalOpen(false);
      form.resetFields();
      void fetchUsers();

      if (roleChangedForSelf) {
        message.loading({ content: 'Đang tải lại giao diện với quyền mới của bạn...', key: 'reloadUserSelf' });
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Có lỗi xảy ra');
    }
  };

  const handleToggleStatus = async (id: number, currentStatus: boolean, fullName: string, phone: string) => {
    const nextStatus = !currentStatus;
    const previousUsers = users;

    setTogglingUserId(id);
    applyUserStatusLocally(id, nextStatus);

    try {
      await axiosClient.put(`/api/UserManagement/${id}`, {
        fullName,
        phone,
        status: nextStatus,
      });

      notification.success({
        message: nextStatus ? 'Mở khóa thành công' : 'Khóa tài khoản thành công',
        description: `${fullName} hiện ${nextStatus ? 'đã hoạt động trở lại' : 'đang ở trạng thái khóa'}.`,
        placement: 'topRight',
      });
    } catch {
      setUsers(previousUsers);
      message.error('Lỗi khi thay đổi trạng thái');
    } finally {
      setTogglingUserId(null);
    }
  };

  const handleDeleteUser = async (id: number, fullName: string) => {
    const previousUsers = users;

    setTogglingUserId(id);
    applyUserStatusLocally(id, false);

    try {
      await axiosClient.delete(`/api/UserManagement/${id}`);
      notification.success({
        message: 'Khóa tài khoản thành công',
        description: `${fullName} đang ở trạng thái khóa.`,
        placement: 'topRight',
      });
    } catch (err: any) {
      setUsers(previousUsers);
      message.error(err.response?.data?.message || 'Không thể khóa tài khoản');
    } finally {
      setTogglingUserId(null);
    }
  };

  const columns = [
    {
      title: 'User',
      key: 'user',
      render: (record: any) => (
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
            {record.fullName?.charAt(0) || '?'}
          </div>
          <div>
            <div className="font-bold text-title">{record.fullName}</div>
            <div className="text-xs text-muted">{record.email}</div>
          </div>
        </div>
      ),
    },
    {
      title: 'Role',
      dataIndex: 'roleName',
      key: 'roleName',
      render: (roleName: string) => (
        <Tag color={roleName === 'Admin' ? 'gold' : roleName === 'Staff' ? 'blue' : 'default'}>
          {roleName}
        </Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: boolean) => (
        <Tag color={status ? 'green' : 'red'} className="min-w-[88px] text-center font-semibold">
          {status ? 'Active' : 'Locked'}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (record: any) => canManageUsers ? (
        <Space>
          <Tooltip title="Chỉnh sửa người dùng">
            <Button
              type="text"
              icon={<Edit2 size={16} className="text-primary" />}
              onClick={() => {
                setEditingUser(record);
                form.setFieldsValue(record);
                setIsModalOpen(true);
              }}
            />
          </Tooltip>
          <Popconfirm
            title={record.status ? 'Khóa tài khoản này?' : 'Mở khóa tài khoản này?'}
            description={record.status ? 'Người dùng sẽ không thể đăng nhập cho tới khi được mở khóa.' : 'Người dùng sẽ có thể đăng nhập lại ngay.'}
            okText={record.status ? 'Khóa' : 'Mở khóa'}
            cancelText="Hủy"
            onConfirm={() => handleToggleStatus(record.id, record.status, record.fullName, record.phone)}
            disabled={record.id.toString() === currentUserId?.toString()}
          >
            <Button
              type="text"
              disabled={record.id.toString() === currentUserId?.toString()}
              loading={togglingUserId === record.id}
              icon={
                record.status ? (
                  <Lock size={16} className={record.id.toString() === currentUserId?.toString() ? 'text-gray-600' : 'text-red-400'} />
                ) : (
                  <Unlock size={16} className={record.id.toString() === currentUserId?.toString() ? 'text-gray-600' : 'text-green-400'} />
                )
              }
            />
          </Popconfirm>
          <Popconfirm
            title="Khóa mềm tài khoản này?"
            description="Trạng thái sẽ chuyển sang Locked ngay trên bảng."
            onConfirm={() => handleDeleteUser(record.id, record.fullName)}
            disabled={record.id.toString() === currentUserId?.toString()}
          >
            <Button
              type="text"
              disabled={record.id.toString() === currentUserId?.toString()}
              loading={togglingUserId === record.id}
              icon={<Trash2 size={16} className={record.id.toString() === currentUserId?.toString() ? 'text-gray-600' : 'text-gray-500 hover:text-red-500'} />}
            />
          </Popconfirm>
        </Space>
      ) : null,
    },
  ];

  const filteredUsers = users.filter((u) => {
    const q = searchTerm.toLowerCase();
    return (u.fullName || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q);
  });

  return (
    <div className="glass-card p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 sm:gap-6 mb-8">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <Input 
            placeholder="Tìm kiếm theo tên, email..." 
            className="input-luxury pl-12"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        {canManageUsers ? (
          <button
            onClick={() => {
              setEditingUser(null);
              form.resetFields();
              setIsModalOpen(true);
            }}
            className="btn-gold flex items-center justify-center space-x-2 w-full md:w-auto"
          >
            <Plus size={20} />
            <span>ADD NEW USER</span>
          </button>
        ) : null}
      </div>

      <Table
        className="responsive-table"
        columns={columns}
        dataSource={filteredUsers}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 5 }}
        scroll={{ x: 840 }}
      />

      <Modal
        title={<span className="text-title font-display text-xl">{editingUser ? 'Edit User' : 'Add New User'}</span>}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        className="luxury-modal"
        centered
        forceRender
      >
        <Form form={form} layout="vertical" className="mt-6" onFinish={handleSaveUser}>
          <Form.Item label={<span className="text-muted">Full Name</span>} name="fullName" rules={[{ required: true }]}>
            <Input className="input-luxury" placeholder="Enter full name" />
          </Form.Item>

          <Form.Item label={<span className="text-muted">Email Address</span>} name="email" rules={[{ required: true, type: 'email' }]}>
            <Input className="input-luxury" placeholder="Enter email" disabled={!!editingUser} />
          </Form.Item>

          <Form.Item label={<span className="text-muted">Password</span>} name="password" rules={[{ required: !editingUser, min: 6 }]}>
            <Input.Password className="input-luxury" placeholder={editingUser ? 'Enter new password (leave blank to keep current)' : 'Enter password (min 6 chars)'} />
          </Form.Item>

          <Form.Item label={<span className="text-muted">Phone Number</span>} name="phone">
            <Input className="input-luxury" placeholder="Enter phone number" />
          </Form.Item>

          <Form.Item label={<span className="text-muted">Role</span>} name="roleId" rules={[{ required: true }]}>
            <Select className="luxury-select" placeholder="Select a role" options={roles.map((r) => ({ value: r.id, label: r.name }))} />
          </Form.Item>

          {editingUser && (
            <Form.Item label={<span className="text-muted">Status</span>} name="status">
              <Select
                className="luxury-select"
                disabled={editingUser.id.toString() === currentUserId?.toString()}
                options={[
                  { value: true, label: 'Active' },
                  { value: false, label: 'Locked' },
                ]}
              />
            </Form.Item>
          )}

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-8">
            <Button onClick={() => setIsModalOpen(false)} className="flex-grow h-12 border-[var(--border-color)] text-title hover:bg-black/5 dark:hover:bg-white/5">
              CANCEL
            </Button>
            <Button type="primary" htmlType="submit" className="flex-grow h-12 bg-primary border-none text-dark-base font-bold">
              {editingUser ? 'SAVE CHANGES' : 'CREATE USER'}
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default UserManagement;
