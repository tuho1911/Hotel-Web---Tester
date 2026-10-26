// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import {
  App,
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import { Bed, Boxes, Copy, Edit2, Plus, RefreshCcw, Trash2 } from 'lucide-react';
import { adminApi, EquipmentDto, RoomDto, RoomInventoryDto, RoomTypeDto } from '../../services/adminApi';
import { usePermission } from '../../hooks/useAppStore';
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5206';

const RoomsPage: React.FC = () => {
  const canManageRooms = usePermission('MANAGE_ROOMS');
  const canManageInventory = usePermission('MANAGE_INVENTORY');
  const { message } = App.useApp();
  const [rooms, setRooms] = useState<RoomDto[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomTypeDto[]>([]);
  const [equipments, setEquipments] = useState<EquipmentDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<{ roomTypeId?: number; floor?: number; roomNumber?: string }>({});
  const [editingRoom, setEditingRoom] = useState<RoomDto | null>(null);
  const [openRoomForm, setOpenRoomForm] = useState(false);
  const [openBulkForm, setOpenBulkForm] = useState(false);
  const [inventoryRoom, setInventoryRoom] = useState<RoomDto | null>(null);
  const [roomInventory, setRoomInventory] = useState<RoomInventoryDto[]>([]);
  const [selectedTemplateRoomId, setSelectedTemplateRoomId] = useState<number | undefined>();
  const [roomForm] = Form.useForm();
  const [bulkForm] = Form.useForm();
  const [inventoryForm] = Form.useForm();

  const loadBaseData = async (nextFilters = filters) => {
    setLoading(true);
    try {
      const [roomData, roomTypeData, equipmentData] = await Promise.all([
        adminApi.getRooms(nextFilters),
        adminApi.getRoomTypes(),
        canManageInventory ? adminApi.getEquipments() : Promise.resolve([]),
      ]);
      setRooms(roomData);
      setRoomTypes(roomTypeData);
      setEquipments(equipmentData);
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Không thể tải dữ liệu phòng');
    } finally {
      setLoading(false);
    }
  };

  const loadRoomInventory = async (room: RoomDto) => {
    setInventoryRoom(room);
    setSelectedTemplateRoomId(undefined);
    inventoryForm.resetFields();
    try {
      const data = await adminApi.getRoomInventory(room.id);
      setRoomInventory(data);
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Không thể tải vật tư trong phòng');
      setRoomInventory([]);
    }
  };

  useEffect(() => {
    loadBaseData(filters);

    const token = localStorage.getItem('token');
    const connection = new HubConnectionBuilder()
      .withUrl(`${API_URL}/notificationHub`, {
        accessTokenFactory: () => token || '',
      })
      .configureLogging(LogLevel.Information)
      .withAutomaticReconnect()
      .build();

    connection
      .start()
      .then(() => {
        connection.on('RoomStatusChanged', (roomId: number, status: string, cleaningStatus: string) => {
          setRooms((prev) =>
            prev.map((room) =>
              room.id === roomId ? { ...room, status, cleaningStatus } : room
            )
          );
        });
      })
      .catch((err) => console.error('SignalR Connection Error: ', err));

    return () => {
      connection.stop();
    };
  }, []);

  const roomTypeOptions = useMemo(
    () => roomTypes.map((item) => ({ value: item.id, label: `${item.name} (${item.basePrice.toLocaleString('vi-VN')} đ)` })),
    [roomTypes]
  );

  const openCreateRoom = () => {
    setEditingRoom(null);
    roomForm.resetFields();
    roomForm.setFieldsValue({ status: 'Available', cleaningStatus: 'Clean', isActive: true });
    setOpenRoomForm(true);
  };

  const openEditRoom = (record: RoomDto) => {
    setEditingRoom(record);
    roomForm.setFieldsValue(record);
    setOpenRoomForm(true);
  };

  const submitRoom = async (values: any) => {
    try {
      if (editingRoom) {
        await adminApi.updateRoom(editingRoom.id, { ...editingRoom, ...values });
        message.success('Đã cập nhật phòng');
      } else {
        await adminApi.createRoom(values);
        message.success('Đã tạo phòng');
      }

      setOpenRoomForm(false);
      loadBaseData(filters);
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Không thể lưu phòng');
    }
  };

  const submitBulkCreate = async (values: any) => {
    try {
      const result: any = await adminApi.bulkCreateRooms(values);
      message.success(result.message || 'Đã tạo hàng loạt');
      setOpenBulkForm(false);
      bulkForm.resetFields();
      loadBaseData(filters);
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Không thể tạo hàng loạt');
    }
  };

  const deleteRoom = async (id: number) => {
    try {
      await adminApi.deleteRoom(id);
      message.success('Đã vô hiệu hóa phòng');
      loadBaseData(filters);
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Không thể xóa phòng');
    }
  };

  const addInventoryItem = async (values: any) => {
    if (!inventoryRoom) return;

    try {
      await adminApi.syncRoomInventory({
        roomId: inventoryRoom.id,
        equipmentId: values.equipmentId,
        quantity: values.quantity,
        priceIfLost: values.priceIfLost,
        note: values.note,
        isActive: true,
        itemType: values.itemType,
      });
      message.success('Đã đồng bộ vật tư vào phòng');
      inventoryForm.resetFields();
      loadRoomInventory(inventoryRoom);
      loadBaseData(filters);
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Không thể đồng bộ vật tư');
    }
  };

  const updateInventoryItem = async (record: RoomInventoryDto) => {
    try {
      await adminApi.updateRoomInventory(record.id, {
        quantity: record.quantity,
        priceIfLost: record.priceIfLost,
        note: record.note,
        isActive: record.isActive ?? true,
      });
      message.success('Đã cập nhật vật tư phòng');
      if (inventoryRoom) {
        loadRoomInventory(inventoryRoom);
        loadBaseData(filters);
      }
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Không thể cập nhật');
    }
  };

  const removeInventoryItem = async (record: RoomInventoryDto) => {
    try {
      await adminApi.deleteRoomInventory(record.id);
      message.success('Đã xóa vật tư khỏi phòng');
      if (inventoryRoom) {
        loadRoomInventory(inventoryRoom);
        loadBaseData(filters);
      }
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Không thể xóa vật tư');
    }
  };

  const cloneFromTemplate = async () => {
    if (!inventoryRoom || !selectedTemplateRoomId) return;

    try {
      const result: any = await adminApi.cloneRoomItems(inventoryRoom.id, selectedTemplateRoomId);
      message.success(result.message || 'Đã clone vật tư từ phòng mẫu');
      loadRoomInventory(inventoryRoom);
      loadBaseData(filters);
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Không thể clone vật tư');
    }
  };

  const syncTemplateToSameType = async () => {
    if (!inventoryRoom) return;

    try {
      const result: any = await adminApi.syncRoomItems(inventoryRoom.id);
      message.success(result.message || 'Đã đồng bộ các phòng cùng hạng');
      loadRoomInventory(inventoryRoom);
      loadBaseData(filters);
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Không thể đồng bộ cùng hạng');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <Typography.Title level={2} style={{ marginBottom: 0 }}>
            Quản lý phòng
          </Typography.Title>
          <Typography.Paragraph style={{ color: '#9ca3af', marginTop: 8 }}>
            Tạo phòng, lọc theo tầng/hạng/số phòng, đồng bộ vật tư và tạo hàng loạt.
          </Typography.Paragraph>
        </div>

        <Space wrap>
          {canManageRooms && (
            <>
          <Button icon={<Copy size={16} />} onClick={() => setOpenBulkForm(true)}>
            Tạo hàng loạt
          </Button>
          <Button type="primary" className="btn-gold" icon={<Plus size={16} />} onClick={openCreateRoom}>
            Thêm phòng
          </Button>
            </>
          )}
        </Space>
      </div>

      <Card className="glass-card !border-none" styles={{ body: { padding: '24px 24px 32px' } }}>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 items-end">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold uppercase tracking-widest text-primary ml-1">Số phòng</span>
            <Input
              size="large"
              placeholder="Nhập số phòng..."
              value={filters.roomNumber}
              onChange={(e) => setFilters((prev) => ({ ...prev, roomNumber: e.target.value || undefined }))}
              className="rounded-xl border-luxury"
            />
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold uppercase tracking-widest text-primary ml-1">Hạng phòng</span>
            <Select
              allowClear
              size="large"
              placeholder="Chọn hạng phòng..."
              value={filters.roomTypeId}
              options={roomTypeOptions}
              onChange={(value) => setFilters((prev) => ({ ...prev, roomTypeId: value }))}
              className="w-full custom-select-luxury"
            />
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold uppercase tracking-widest text-primary ml-1">Tầng</span>
            <InputNumber
              size="large"
              min={1}
              placeholder="Chọn tầng..."
              value={filters.floor}
              onChange={(value) => setFilters((prev) => ({ ...prev, floor: value || undefined }))}
              className="w-full rounded-xl border-luxury"
            />
          </div>

          <div className="flex gap-3">
            <Button 
              type="primary" 
              size="large"
              className="btn-gold flex-1 rounded-xl h-12"
              icon={<RefreshCcw size={18} />}
              onClick={() => loadBaseData(filters)}
            >
              Lọc
            </Button>
            <Button
              size="large"
              className="flex-1 rounded-xl h-12"
              onClick={() => {
                const next = {};
                setFilters(next);
                loadBaseData(next);
              }}
            >
              Xóa lọc
            </Button>
          </div>
        </div>
      </Card>

      <Card className="glass-card">
        <Table
          rowKey="id"
          loading={loading}
          dataSource={rooms}
          scroll={{ x: 1100 }}
          columns={[
            {
              title: 'Phòng',
              dataIndex: 'roomNumber',
              render: (value: string) => (
                <div className="flex items-center gap-2">
                  <Bed size={18} color="#C6A96B" />
                  <strong>{value}</strong>
                </div>
              ),
            },
            { title: 'Hạng phòng', dataIndex: 'roomTypeName', render: (value: string) => <Tag color="blue">{value}</Tag> },
            { title: 'Tầng', dataIndex: 'floor', render: (value?: number | null) => value ?? '-' },
            { title: 'Trạng thái phòng', dataIndex: 'status' },
            {
              title: 'Vệ sinh',
              dataIndex: 'cleaningStatus',
              render: (value?: string | null) => (
                <Tag color={(value || '').toLowerCase() === 'dirty' ? 'red' : 'gold'}>{value || 'Chưa cập nhật'}</Tag>
              ),
            },
            {
              title: 'Kích hoạt',
              dataIndex: 'isActive',
              render: (value: boolean) => <Tag color={value ? 'green' : 'red'}>{value ? 'Có' : 'Không'}</Tag>,
            },
            {
              title: 'Thao tác',
              render: (_, record: RoomDto) => (
                <Space wrap>
                  {canManageRooms && <Button icon={<Edit2 size={14} />} onClick={() => openEditRoom(record)}>
                    Sửa
                  </Button>}
                  {canManageInventory && <Button icon={<Boxes size={14} />} onClick={() => loadRoomInventory(record)}>
                    Vật tư
                  </Button>}
                  {canManageRooms && <Popconfirm title="Vô hiệu hóa phòng này?" onConfirm={() => deleteRoom(record.id)}>
                    <Button danger icon={<Trash2 size={14} />}>
                      Xóa
                    </Button>
                  </Popconfirm>}
                </Space>
              ),
            },
          ]}
        />
      </Card>

      <Modal open={openRoomForm} title={editingRoom ? 'Cập nhật phòng' : 'Thêm phòng mới'} onCancel={() => setOpenRoomForm(false)} footer={null}>
        <Form form={roomForm} layout="vertical" onFinish={submitRoom}>
          <Form.Item name="roomNumber" label="Số phòng" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="roomTypeId" label="Hạng phòng" rules={[{ required: true }]}>
            <Select options={roomTypeOptions} />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="floor" label="Tầng">
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="extensionNumber" label="Số nội bộ">
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="status" label="Trạng thái phòng" rules={[{ required: true }]}>
                <Select options={['Available', 'Occupied', 'Cleaning', 'Maintenance'].map((value) => ({ value, label: value }))} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="cleaningStatus" label="Trạng thái vệ sinh">
                <Select options={['Clean', 'Dirty', 'Inspecting'].map((value) => ({ value, label: value }))} />
              </Form.Item>
            </Col>
          </Row>
          {editingRoom ? (
            <Form.Item name="isActive" label="Kích hoạt">
              <Select options={[{ value: true, label: 'Đang dùng' }, { value: false, label: 'Tạm ẩn' }]} />
            </Form.Item>
          ) : null}
          <div className="flex justify-end gap-3">
            <Button onClick={() => setOpenRoomForm(false)}>Hủy</Button>
            <Button type="primary" htmlType="submit">
              {editingRoom ? 'Lưu thay đổi' : 'Tạo phòng'}
            </Button>
          </div>
        </Form>
      </Modal>

      <Modal open={openBulkForm && canManageRooms} title="Tạo phòng hàng loạt" onCancel={() => setOpenBulkForm(false)} footer={null}>
        <Form form={bulkForm} layout="vertical" onFinish={submitBulkCreate}>
          <Form.Item name="roomTypeId" label="Hạng phòng" rules={[{ required: true }]}>
            <Select options={roomTypeOptions} />
          </Form.Item>
          <Row gutter={12}>
            <Col span={6}>
              <Form.Item name="floor" label="Tầng" rules={[{ required: true }]}>
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="startNumber" label="Bắt đầu" rules={[{ required: true }]}>
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="step" label="Bước nhảy" initialValue={1} rules={[{ required: true }]}>
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="count" label="Số lượng" rules={[{ required: true }]}>
                <InputNumber min={1} max={50} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="templateRoomId" label="Clone vật tư từ phòng mẫu">
            <Select allowClear options={rooms.map((room) => ({ value: room.id, label: `${room.roomNumber} - ${room.roomTypeName}` }))} />
          </Form.Item>
          <div className="flex justify-end gap-3">
            <Button onClick={() => setOpenBulkForm(false)}>Hủy</Button>
            <Button type="primary" htmlType="submit">
              Tạo hàng loạt
            </Button>
          </div>
        </Form>
      </Modal>

      <Modal open={!!inventoryRoom && canManageInventory} title={`Vật tư phòng ${inventoryRoom?.roomNumber || ''}`} onCancel={() => setInventoryRoom(null)} footer={null} width={1100}>
        <div className="space-y-4">
          <Card>
            <Row gutter={[12, 12]}>
              <Col xs={24} md={8}>
                <Select
                  allowClear
                  style={{ width: '100%' }}
                  placeholder="Chọn phòng mẫu để clone"
                  value={selectedTemplateRoomId}
                  options={rooms.filter((room) => room.id !== inventoryRoom?.id).map((room) => ({ value: room.id, label: `${room.roomNumber} - ${room.roomTypeName}` }))}
                  onChange={setSelectedTemplateRoomId}
                />
              </Col>
              <Col xs={24} md={16}>
                <Space wrap>
                  <Button icon={<Copy size={14} />} onClick={cloneFromTemplate} disabled={!selectedTemplateRoomId}>
                    Clone từ phòng mẫu
                  </Button>
                  <Button icon={<RefreshCcw size={14} />} onClick={syncTemplateToSameType}>
                    Đồng bộ sang phòng cùng hạng
                  </Button>
                </Space>
              </Col>
            </Row>
          </Card>

          <Card title="Đồng bộ vật tư vào phòng">
            <Form form={inventoryForm} layout="vertical" onFinish={addInventoryItem}>
              <Row gutter={12}>
                <Col xs={24} md={10}>
                  <Form.Item name="equipmentId" label="Vật tư" rules={[{ required: true }]}>
                    <Select
                      showSearch
                      optionFilterProp="label"
                      options={equipments.map((item) => ({ value: item.id, label: `${item.itemCode} - ${item.name}` }))}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={4}>
                  <Form.Item name="quantity" label="Số lượng" rules={[{ required: true }]}>
                    <InputNumber min={1} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={5}>
                  <Form.Item name="priceIfLost" label="Giá đền bù">
                    <InputNumber min={0} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={5}>
                  <Form.Item name="itemType" label="Loại">
                    <Select options={[{ value: 'Asset', label: 'Asset' }, { value: 'Consumable', label: 'Consumable' }]} />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item name="note" label="Ghi chú">
                <Input />
              </Form.Item>
              <div className="flex justify-end">
                <Button type="primary" htmlType="submit">
                  Đồng bộ vật tư
                </Button>
              </div>
            </Form>
          </Card>

          <Card>
            <Table
              rowKey="id"
              dataSource={roomInventory}
              pagination={false}
              scroll={{ x: 900 }}
              columns={[
                { title: 'Vật tư', dataIndex: 'equipmentName' },
                {
                  title: 'Số lượng',
                  dataIndex: 'quantity',
                  render: (value: number, record: RoomInventoryDto) => (
                    <InputNumber
                      min={0}
                      value={value}
                      onChange={(next) => setRoomInventory((prev) => prev.map((item) => (item.id === record.id ? { ...item, quantity: Number(next) } : item)))}
                    />
                  ),
                },
                {
                  title: 'Giá đền bù',
                  dataIndex: 'priceIfLost',
                  render: (value: number, record: RoomInventoryDto) => (
                    <InputNumber
                      min={0}
                      value={value}
                      onChange={(next) => setRoomInventory((prev) => prev.map((item) => (item.id === record.id ? { ...item, priceIfLost: Number(next) } : item)))}
                    />
                  ),
                },
                {
                  title: 'Ghi chú',
                  dataIndex: 'note',
                  render: (value: string, record: RoomInventoryDto) => (
                    <Input
                      value={value || ''}
                      onChange={(event) => setRoomInventory((prev) => prev.map((item) => (item.id === record.id ? { ...item, note: event.target.value } : item)))}
                    />
                  ),
                },
                { title: 'Loại', dataIndex: 'itemType' },
                {
                  title: 'Thao tác',
                  render: (_, record: RoomInventoryDto) => (
                    <Space>
                      <Button onClick={() => updateInventoryItem(record)}>Lưu</Button>
                      <Button danger onClick={() => removeInventoryItem(record)}>
                        Xóa
                      </Button>
                    </Space>
                  ),
                },
              ]}
            />
          </Card>
        </div>
      </Modal>
    </div>
  );
};

export default RoomsPage;
