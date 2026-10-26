// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import { message as antdMessage, Button, Card as AntCard, Col, Row, Select, Space, Statistic, Table, Tag, Typography, Modal, Form, InputNumber, Input, Upload } from 'antd';
import { adminApi, RoomDto, RoomInventoryDto } from '../../services/adminApi';
import { useAppSelector } from '../../hooks/useAppStore';
import { AlertTriangle, ImagePlus, Coffee } from 'lucide-react';

const CleaningPage: React.FC = () => {
  const user = useAppSelector((state) => state.auth.user);
  const [rooms, setRooms] = useState<RoomDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const isHousekeeping = user?.role === 'Housekeeping';

  // Report Damage State
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<RoomDto | null>(null);
  const [roomInventory, setRoomInventory] = useState<RoomInventoryDto[]>([]);
  const [damageImage, setDamageImage] = useState<File | null>(null);
  const [reportForm] = Form.useForm();

  // Minibar State
  const [minibarModalOpen, setMinibarModalOpen] = useState(false);
  const [minibarServices, setMinibarServices] = useState<any[]>([]);
  const [minibarForm] = Form.useForm();

  const loadData = async () => {
    setLoading(true);
    try {
      const roomData = await adminApi.getRooms();
      setRooms(roomData);
    } catch (err: any) {
      antdMessage.error(err.response?.data?.message || 'Không thể tải danh sách đơn phòng');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const summary = useMemo(() => {
    const dirty = rooms.filter((room) => (room.cleaningStatus || '').toLowerCase() === 'dirty').length;
    const cleaning = rooms.filter((room) => room.status === 'Cleaning').length;
    const clean = rooms.filter((room) => (room.cleaningStatus || '').toLowerCase() === 'clean').length;

    return { dirty, cleaning, clean };
  }, [rooms]);

  const filteredRooms = useMemo(() => {
    if (!statusFilter) return rooms;
    return rooms.filter((room) => (room.cleaningStatus || '').toLowerCase() === statusFilter.toLowerCase());
  }, [rooms, statusFilter]);

  const updateCleaning = async (record: RoomDto, nextCleaningStatus: string, nextStatus?: string) => {
    try {
      await adminApi.updateRoomCleaningStatus(record.id, {
        cleaningStatus: nextCleaningStatus,
        status: nextStatus || record.status,
      });
      antdMessage.success('Đã cập nhật trạng thái đơn phòng');
      loadData();
    } catch (err: any) {
      const statusCode = err.response?.status;
      const fallbackMessage =
        statusCode === 404
          ? 'Backend chưa nạp endpoint cleaning-status. Hãy restart API.'
          : statusCode === 403
            ? 'Tài khoản hiện tại không được phép cập nhật đơn phòng.'
            : 'Không thể cập nhật trạng thái';
      antdMessage.error(err.response?.data?.message || fallbackMessage);
    }
  };

  const openReportModal = async (room: RoomDto) => {
    setSelectedRoom(room);
    setReportModalOpen(true);
    reportForm.resetFields();
    setDamageImage(null);
    setRoomInventory([]);
    try {
      const inventory = await adminApi.getRoomInventory(room.id);
      setRoomInventory(inventory);
    } catch (err: any) {
      antdMessage.error('Không thể lấy danh sách vật tư của phòng này');
    }
  };

  const handleReportSubmit = async (values: any) => {
    try {
      const inventoryItem = roomInventory.find((item) => item.id === values.roomInventoryId);
      if (!inventoryItem) {
         antdMessage.error('Vui lòng chọn vật tư bị hỏng');
         return;
      }
      
      const penalty = (inventoryItem.priceIfLost || 0) * values.quantity;

      const res = await adminApi.reportDamage({
        equipmentId: inventoryItem.equipmentId,
        quantity: values.quantity,
        penaltyAmount: penalty,
        description: values.description,
        roomInventoryId: inventoryItem.id
      }) as any;

      const responseData = res.data || res;
      const damageId = responseData.damageId;
      const penaltyAmount = responseData.penaltyAmount || (inventoryItem.priceIfLost || 0) * values.quantity;
      const isLinked = responseData.isLinkedToBooking;
      const bCode = responseData.bookingCode;

      if (damageId && damageImage) {
        try {
          await adminApi.uploadDamageImage(damageId, damageImage);
        } catch (uploadErr) {
          antdMessage.warning('Đã tạo báo cáo nhưng không thể tải ảnh lên');
        }
      }

      if (isLinked) {
        antdMessage.success(`Đã báo hỏng ${inventoryItem.equipmentName} thành công. Phí bồi thường ${penaltyAmount.toLocaleString()} VNĐ đã được cộng vào hóa đơn booking ${bCode}.`);
      } else {
        antdMessage.success(`Đã báo hỏng thành công. Do phòng hiện không có khách thuê hoặc hóa đơn đã tất toán, phí này chỉ được ghi nhận vào kho hỏng.`);
      }

      loadData();
      setReportModalOpen(false);
      setDamageImage(null);
    } catch (err: any) {
      console.error('Report damage error:', err);
      antdMessage.error(err.response?.data?.message || 'Không thể gửi báo cáo');
    }
  };

  const openMinibarModal = async (room: RoomDto) => {
    setSelectedRoom(room);
    setMinibarModalOpen(true);
    minibarForm.resetFields();
    try {
      const services = await adminApi.getServices();
      setMinibarServices(services || []);
    } catch (err: any) {
      antdMessage.error('Không thể lấy danh sách dịch vụ');
    }
  };

  const handleMinibarSubmit = async (values: any) => {
    try {
      if (!values.items || values.items.length === 0) {
        antdMessage.error('Vui lòng chọn ít nhất 1 dịch vụ');
        return;
      }
      const res = await adminApi.reportMinibar(selectedRoom!.id, values.items) as any;
      const data = res.data || res;
      antdMessage.success(`${data.message}. Số tiền: ${data.totalAmount?.toLocaleString()} VNĐ (Booking: ${data.bookingCode})`);
      setMinibarModalOpen(false);
      loadData();
    } catch (err: any) {
      antdMessage.error(err.response?.data?.message || 'Không thể cộng Minibar');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <Typography.Title level={2} style={{ marginBottom: 0 }}>
          {isHousekeeping ? 'Công việc dọn phòng' : 'Danh sách dọn phòng'}
        </Typography.Title>
        <Typography.Paragraph style={{ color: '#9ca3af', marginTop: 8 }}>
          {isHousekeeping
            ? 'Nhân viên buồng phòng cập nhật tiến độ xử lý phòng theo thời gian thực.'
            : 'Theo dõi các phòng cần dọn và cập nhật trạng thái hoàn tất.'}
        </Typography.Paragraph>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <AntCard className="glass-card">
            <Statistic title="Phòng bận" value={summary.dirty} />
          </AntCard>
        </Col>
        <Col xs={24} md={8}>
          <AntCard className="glass-card">
            <Statistic title="Đang dọn" value={summary.cleaning} />
          </AntCard>
        </Col>
        <Col xs={24} md={8}>
          <AntCard className="glass-card">
            <Statistic title="Sach" value={summary.clean} />
          </AntCard>
        </Col>
      </Row>

      <AntCard className="glass-card">
        <Space wrap>
          <Select
            allowClear
            className="w-full sm:w-[240px] h-10 md:h-12"
            placeholder="Lọc trạng thái vệ sinh"
            value={statusFilter}
            options={['Clean', 'Dirty', 'Inspecting'].map((value) => ({ value, label: value }))}
            onChange={setStatusFilter}
          />
          <Button
            onClick={() => {
              setStatusFilter(undefined);
              loadData();
            }}
          >
            Lam moi
          </Button>
        </Space>
      </AntCard>

      <AntCard className="glass-card">
        <Table
          rowKey="id"
          loading={loading}
          dataSource={filteredRooms}
          scroll={{ x: 960 }}
          columns={[
            { title: 'Phòng', dataIndex: 'roomNumber', render: (value: string) => <strong>{value}</strong> },
            { title: 'Hạng', dataIndex: 'roomTypeName', render: (value: string) => <Tag color="blue">{value}</Tag> },
            { title: 'Tầng', dataIndex: 'floor', render: (value?: number | null) => value ?? '-' },
            { title: 'Trạng thái phòng', dataIndex: 'status' },
            {
              title: 'Vệ sinh',
              dataIndex: 'cleaningStatus',
              render: (value?: string | null) => (
                <Tag color={(value || '').toLowerCase() === 'dirty' ? 'red' : (value || '').toLowerCase() === 'clean' ? 'green' : 'gold'}>
                  {value || 'Chưa cập nhật'}
                </Tag>
              ),
            },
            {
              title: 'Cập nhật',
              render: (_, record: RoomDto) => {
                const isCleaning = record.status === 'Cleaning';
                const isOccupied = record.status === 'Occupied';
                
                return (
                  <Space wrap>
                    {!isCleaning && (
                      <Button onClick={() => updateCleaning(record, 'Inspecting', 'Cleaning')}>
                        Bắt đầu dọn
                      </Button>
                    )}
                    
                    <Button danger icon={<AlertTriangle size={14} />} onClick={() => openReportModal(record)}>
                      Báo sự cố
                    </Button>
                    <Button icon={<Coffee size={14} />} onClick={() => openMinibarModal(record)}>
                      Báo Minibar
                    </Button>

                    {isCleaning && (
                      <Button type="primary" onClick={() => updateCleaning(record, 'Clean', 'Available')}>
                        Hoàn tất dọn dẹp
                      </Button>
                    )}

                    {(!isOccupied && record.cleaningStatus !== 'Dirty' && !isCleaning) && (
                      <Button onClick={() => updateCleaning(record, 'Dirty')}>Đánh dấu bận</Button>
                    )}
                  </Space>
                );
              },
            },
          ]}
        />
      </AntCard>

      <Modal 
        open={reportModalOpen} 
        title={<Space><AlertTriangle style={{ color: '#dc2626' }} size={18} /><span>Báo hỏng vật tư - Phòng {selectedRoom?.roomNumber || ''}</span></Space>}
        onCancel={() => setReportModalOpen(false)} 
        footer={null}
        className="max-w-[95vw]"
      >
        {roomInventory.length === 0 ? (
          <div style={{ padding: '24px 0', textAlign: 'center' }}>
            <div style={{ color: '#9ca3af', marginBottom: 12 }}>Phòng này hiện chưa được thiết lập danh mục vật tư.</div>
            <Button onClick={() => setReportModalOpen(false)}>Quay lại</Button>
          </div>
        ) : (
          <Form form={reportForm} layout="vertical" onFinish={handleReportSubmit}>
            <div style={{ marginBottom: 16, padding: 12, background: '#fef2f2', borderRadius: 8, fontSize: 13, color: '#991b1b' }}>
              ℹ️ Các khoản bồi thường sẽ được tự động cộng vào hóa đơn của khách đang ở (nếu có).
            </div>
            <Form.Item name="roomInventoryId" label="Vật tư bị hỏng/thiếu" rules={[{ required: true, message: 'Vui lòng chọn vật tư' }]}>
              <Select 
                options={roomInventory.map((item) => ({ value: item.id, label: `${item.equipmentName} (Kho phòng: ${item.quantity || 0})` }))} 
                placeholder="Chọn vật tư"
              />
            </Form.Item>
          <Form.Item name="quantity" label="Số lượng hỏng/mất" rules={[{ required: true, message: 'Vui lòng nhập số lượng' }]}>
            <InputNumber min={1} style={{ width: '100%' }} placeholder="Nhập số lượng" />
          </Form.Item>
          <Form.Item name="description" label="Mô tả sự cố (nếu có)">
            <Input.TextArea rows={3} placeholder="Mô tả chi tiết tình trạng hỏng hóc..." />
          </Form.Item>
          <Form.Item label="Ảnh minh chứng">
            <Upload 
              beforeUpload={(file) => {
                setDamageImage(file);
                return false; // Ngăn không cho tự động upload
              }}
              maxCount={1}
              onRemove={() => setDamageImage(null)}
            >
              <Button icon={<ImagePlus size={16} />}>Chọn ảnh đính kèm</Button>
            </Upload>
          </Form.Item>
          <div className="flex justify-end gap-3">
            <Button onClick={() => setReportModalOpen(false)}>Hủy</Button>
            <Button type="primary" danger htmlType="submit">
              Gửi báo cáo
            </Button>
          </div>
          </Form>
        )}
      </Modal>

      <Modal 
        open={minibarModalOpen} 
        title={<Space><Coffee style={{ color: '#0ea5e9' }} size={18} /><span>Báo dùng Minibar - Phòng {selectedRoom?.roomNumber || ''}</span></Space>}
        onCancel={() => setMinibarModalOpen(false)} 
        footer={null}
        className="max-w-[95vw]"
      >
        <Form form={minibarForm} layout="vertical" onFinish={handleMinibarSubmit}>
          <div style={{ marginBottom: 16, padding: 12, background: '#f0f9ff', borderRadius: 8, fontSize: 13, color: '#0369a1' }}>
            ℹ️ Tiền dịch vụ sẽ được cộng tự động vào hóa đơn của booking đang ở.
          </div>
          
          <Form.List name="items">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                    <Form.Item
                      {...restField}
                      name={[name, 'serviceId']}
                      rules={[{ required: true, message: 'Chọn dịch vụ' }]}
                    >
                      <Select
                        placeholder="Chọn dịch vụ"
                        style={{ width: 250 }}
                        showSearch
                        optionFilterProp="children"
                        options={minibarServices.map(s => ({ value: s.id, label: `${s.name} (${s.price?.toLocaleString()}đ)` }))}
                      />
                    </Form.Item>
                    <Form.Item
                      {...restField}
                      name={[name, 'quantity']}
                      rules={[{ required: true, message: 'Nhập số lượng' }]}
                    >
                      <InputNumber min={1} placeholder="SL" />
                    </Form.Item>
                    <Button danger onClick={() => remove(name)}>Xóa</Button>
                  </Space>
                ))}
                <Form.Item>
                  <Button type="dashed" onClick={() => add()} block>
                    + Thêm món
                  </Button>
                </Form.Item>
              </>
            )}
          </Form.List>

          <div className="flex justify-end gap-3 mt-4">
            <Button onClick={() => setMinibarModalOpen(false)}>Hủy</Button>
            <Button type="primary" htmlType="submit">
              Lưu Minibar
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default CleaningPage;
