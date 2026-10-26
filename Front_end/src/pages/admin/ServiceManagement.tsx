import React, { useEffect, useState } from 'react';
import { App, Button, Card, Col, Form, Input, InputNumber, Modal, Popconfirm, Row, Select, Space, Table, Tabs, Typography } from 'antd';
import { Plus, Edit2, Trash2, Tag, ShoppingBag } from 'lucide-react';
import { serviceOrderApi, ServiceCategoryDto, ServiceDto } from '../../services/serviceOrderApi';

const { Title, Paragraph } = Typography;

const ServiceManagementPage: React.FC = () => {
  const { message } = App.useApp();
  const [categories, setCategories] = useState<ServiceCategoryDto[]>([]);
  const [services, setServices] = useState<ServiceDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('services');

  const [openCategoryForm, setOpenCategoryForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ServiceCategoryDto | null>(null);
  const [catForm] = Form.useForm();

  const [openServiceForm, setOpenServiceForm] = useState(false);
  const [editingService, setEditingService] = useState<ServiceDto | null>(null);
  const [srvForm] = Form.useForm();

  const loadData = async () => {
    setLoading(true);
    try {
      const [cats, srvs] = await Promise.all([
        serviceOrderApi.getCategories(),
        serviceOrderApi.getServices(),
      ]);
      setCategories(cats);
      setServices(srvs);
    } catch (err: any) {
      message.error('Không thể tải dữ liệu dịch vụ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // --- Category Handlers ---
  const handleOpenCategory = (cat?: ServiceCategoryDto) => {
    setEditingCategory(cat || null);
    if (cat) catForm.setFieldsValue(cat);
    else catForm.resetFields();
    setOpenCategoryForm(true);
  };

  const submitCategory = async (values: any) => {
    try {
      if (editingCategory) {
        await serviceOrderApi.updateCategory(editingCategory.id, values.name);
        message.success('Cập nhật danh mục thành công');
      } else {
        await serviceOrderApi.createCategory(values.name);
        message.success('Thêm danh mục thành công');
      }
      setOpenCategoryForm(false);
      loadData();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Có lỗi xảy ra');
    }
  };

  const deleteCategory = async (id: number) => {
    try {
      await serviceOrderApi.deleteCategory(id);
      message.success('Đã xóa danh mục');
      loadData();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Không thể xóa danh mục đang có dịch vụ');
    }
  };

  // --- Service Handlers ---
  const handleOpenService = (srv?: ServiceDto) => {
    setEditingService(srv || null);
    if (srv) srvForm.setFieldsValue(srv);
    else srvForm.resetFields();
    setOpenServiceForm(true);
  };

  const submitService = async (values: any) => {
    try {
      if (editingService) {
        await serviceOrderApi.updateService(editingService.id, values);
        message.success('Cập nhật dịch vụ thành công');
      } else {
        await serviceOrderApi.createService(values);
        message.success('Thêm dịch vụ thành công');
      }
      setOpenServiceForm(false);
      loadData();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Có lỗi xảy ra');
    }
  };

  const deleteService = async (id: number) => {
    try {
      await serviceOrderApi.deleteService(id);
      message.success('Đã xóa dịch vụ');
      loadData();
    } catch (err: any) {
      message.error('Không thể xóa dịch vụ này');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <Title level={2} style={{ marginBottom: 0 }}>Quản lý Danh mục & Dịch vụ</Title>
          <Paragraph style={{ color: '#9ca3af', marginTop: 8 }}>
            Tạo và cập nhật thực đơn đồ ăn, thức uống, spa, giặt ủi... cho khách sạn.
          </Paragraph>
        </div>
        <Space>
          {activeTab === 'categories' ? (
            <Button type="primary" className="btn-gold" icon={<Plus size={16} />} onClick={() => handleOpenCategory()}>
              Thêm Danh mục
            </Button>
          ) : (
            <Button type="primary" className="btn-gold" icon={<Plus size={16} />} onClick={() => handleOpenService()}>
              Thêm Dịch vụ
            </Button>
          )}
        </Space>
      </div>

      <Card className="glass-card !border-none" styles={{ body: { padding: '24px 24px 32px' } }}>
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <Tabs.TabPane tab={<span><ShoppingBag size={16} className="inline mr-2" />Dịch vụ</span>} key="services">
            <Table
              rowKey="id"
              loading={loading}
              dataSource={services}
              columns={[
                { title: 'Tên dịch vụ', dataIndex: 'name', key: 'name', render: (text) => <strong>{text}</strong> },
                {
                  title: 'Danh mục',
                  dataIndex: 'categoryId',
                  key: 'categoryId',
                  render: (val) => {
                    const c = categories.find(x => x.id === val);
                    return c ? c.name : '—';
                  }
                },
                {
                  title: 'Giá',
                  dataIndex: 'price',
                  key: 'price',
                  render: (val) => `${(val || 0).toLocaleString('vi-VN')} ₫`
                },
                { title: 'Đơn vị tính', dataIndex: 'unit', key: 'unit' },
                {
                  title: 'Thao tác',
                  key: 'action',
                  width: 200,
                  render: (_, record) => (
                    <Space size="middle">
                      <Button icon={<Edit2 size={14} />} onClick={() => handleOpenService(record)}>Sửa</Button>
                      <Popconfirm title="Xóa dịch vụ này?" onConfirm={() => deleteService(record.id)}>
                        <Button danger icon={<Trash2 size={14} />}>Xóa</Button>
                      </Popconfirm>
                    </Space>
                  ),
                },
              ]}
            />
          </Tabs.TabPane>
          <Tabs.TabPane tab={<span><Tag size={16} className="inline mr-2" />Danh mục</span>} key="categories">
            <Table
              rowKey="id"
              loading={loading}
              dataSource={categories}
              columns={[
                { title: 'Tên danh mục', dataIndex: 'name', key: 'name', render: (text) => <strong>{text}</strong> },
                {
                  title: 'Số lượng dịch vụ',
                  key: 'count',
                  render: (_, record) => services.filter(s => s.categoryId === record.id).length
                },
                {
                  title: 'Thao tác',
                  key: 'action',
                  width: 200,
                  render: (_, record) => (
                    <Space size="middle">
                      <Button icon={<Edit2 size={14} />} onClick={() => handleOpenCategory(record)}>Sửa</Button>
                      <Popconfirm title="Xóa danh mục này?" onConfirm={() => deleteCategory(record.id)}>
                        <Button danger icon={<Trash2 size={14} />}>Xóa</Button>
                      </Popconfirm>
                    </Space>
                  ),
                },
              ]}
            />
          </Tabs.TabPane>
        </Tabs>
      </Card>

      {/* Category Modal */}
      <Modal
        title={editingCategory ? 'Sửa danh mục' : 'Thêm danh mục'}
        open={openCategoryForm}
        onCancel={() => setOpenCategoryForm(false)}
        footer={null}
      >
        <Form form={catForm} layout="vertical" onFinish={submitCategory}>
          <Form.Item name="name" label="Tên danh mục" rules={[{ required: true, message: 'Nhập tên danh mục' }]}>
            <Input placeholder="Ví dụ: Đồ uống, Spa, Giặt ủi..." />
          </Form.Item>
          <div className="flex justify-end gap-3">
            <Button onClick={() => setOpenCategoryForm(false)}>Hủy</Button>
            <Button type="primary" htmlType="submit">Lưu</Button>
          </div>
        </Form>
      </Modal>

      {/* Service Modal */}
      <Modal
        title={editingService ? 'Sửa dịch vụ' : 'Thêm dịch vụ'}
        open={openServiceForm}
        onCancel={() => setOpenServiceForm(false)}
        footer={null}
      >
        <Form form={srvForm} layout="vertical" onFinish={submitService}>
          <Form.Item name="categoryId" label="Danh mục" rules={[{ required: true, message: 'Chọn danh mục' }]}>
            <Select options={categories.map(c => ({ value: c.id, label: c.name }))} placeholder="Chọn danh mục" />
          </Form.Item>
          <Form.Item name="name" label="Tên dịch vụ" rules={[{ required: true, message: 'Nhập tên dịch vụ' }]}>
            <Input placeholder="Ví dụ: Bia Heineken" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="price" label="Giá (₫)" rules={[{ required: true, message: 'Nhập giá' }]}>
                <InputNumber min={0} className="w-full" formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')} parser={value => value!.replace(/\./g, '') as any} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="unit" label="Đơn vị tính" rules={[{ required: true, message: 'Nhập đơn vị' }]}>
                <Input placeholder="Lon, chai, suất..." />
              </Form.Item>
            </Col>
          </Row>
          <div className="flex justify-end gap-3">
            <Button onClick={() => setOpenServiceForm(false)}>Hủy</Button>
            <Button type="primary" htmlType="submit">Lưu</Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default ServiceManagementPage;
