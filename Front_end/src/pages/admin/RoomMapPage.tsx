import React, { useEffect, useState, useMemo } from 'react';
import { Typography, Row, Col, Card, Spin, Select, Tag, Space, Badge } from 'antd';
import { Bed, UserCheck, AlertTriangle, Sparkles, Paintbrush, PowerOff } from 'lucide-react';
import { adminApi, RoomDto, RoomTypeDto } from '../../services/adminApi';
import { message } from 'antd';
import { motion } from 'framer-motion';

const { Title, Text } = Typography;

const RoomMapPage: React.FC = () => {
  const [rooms, setRooms] = useState<RoomDto[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomTypeDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterFloor, setFilterFloor] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const loadData = async () => {
    setLoading(true);
    try {
      const [roomsRes, typesRes] = await Promise.all([
        adminApi.getRooms(),
        adminApi.getRoomTypes()
      ]);
      setRooms(roomsRes);
      setRoomTypes(typesRes);
    } catch (err) {
      message.error('Không thể tải sơ đồ phòng. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // In a real app, you would also connect to SignalR here to update statuses in real-time
  }, []);

  const floors = useMemo(() => {
    const uniqueFloors = Array.from(new Set(rooms.map(r => r.floor).filter(Boolean))) as number[];
    return uniqueFloors.sort((a, b) => a - b);
  }, [rooms]);

  const filteredRooms = useMemo(() => {
    return rooms.filter(room => {
      const matchFloor = filterFloor === 'all' || room.floor?.toString() === filterFloor;
      const matchStatus = filterStatus === 'all' || room.status === filterStatus;
      return matchFloor && matchStatus;
    });
  }, [rooms, filterFloor, filterStatus]);

  const groupedRooms = useMemo(() => {
    const groups: Record<number, RoomDto[]> = {};
    filteredRooms.forEach(room => {
      const floor = room.floor || 0;
      if (!groups[floor]) groups[floor] = [];
      groups[floor].push(room);
    });
    return groups;
  }, [filteredRooms]);

  const getStatusColor = (status: string, cleaningStatus: string) => {
    if (status === 'Maintenance') return { bg: 'bg-rose-50 border-rose-200', text: 'text-rose-600', icon: <AlertTriangle size={24} /> };
    if (status === 'Occupied') return { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-600', icon: <UserCheck size={24} /> };
    if (cleaningStatus === 'Dirty') return { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-600', icon: <Paintbrush size={24} /> };
    if (cleaningStatus === 'Inspecting') return { bg: 'bg-indigo-50 border-indigo-200', text: 'text-indigo-600', icon: <Sparkles size={24} /> };
    
    // Available & Clean
    return { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-600', icon: <Bed size={24} /> };
  };

  const getStatusLabel = (status: string) => {
    const map: any = { Available: 'Trống', Occupied: 'Có khách', Cleaning: 'Đang dọn', Maintenance: 'Bảo trì' };
    return map[status] || status;
  };

  const getCleaningLabel = (status: string) => {
    const map: any = { Clean: 'Sạch', Dirty: 'Bẩn', Inspecting: 'Chờ kiểm' };
    return map[status] || status;
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Spin size="large" tip="Đang tải sơ đồ phòng..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div>
          <Title level={2} style={{ marginBottom: 0 }}>Sơ đồ phòng</Title>
          <Text className="text-muted">Kiểm soát trực quan trạng thái tất cả các phòng</Text>
        </div>
        <Space wrap>
          <Select
            value={filterFloor}
            onChange={setFilterFloor}
            style={{ width: 150 }}
            options={[
              { value: 'all', label: 'Tất cả các tầng' },
              ...floors.map(f => ({ value: f.toString(), label: `Tầng ${f}` }))
            ]}
          />
          <Select
            value={filterStatus}
            onChange={setFilterStatus}
            style={{ width: 180 }}
            options={[
              { value: 'all', label: 'Tất cả trạng thái' },
              { value: 'Available', label: 'Trống' },
              { value: 'Occupied', label: 'Có khách' },
              { value: 'Maintenance', label: 'Bảo trì' },
            ]}
          />
        </Space>
      </div>

      {/* Legend */}
      <Card size="small" className="glass-card mb-6 border-luxury/20">
        <div className="flex flex-wrap gap-6 items-center text-sm font-medium">
          <span className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-emerald-100 border border-emerald-300"></div> Trống & Sạch</span>
          <span className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-blue-100 border border-blue-300"></div> Có khách</span>
          <span className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-amber-100 border border-amber-300"></div> Cần dọn dẹp</span>
          <span className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-rose-100 border border-rose-300"></div> Bảo trì</span>
        </div>
      </Card>

      {Object.keys(groupedRooms).length === 0 ? (
        <div className="text-center py-12 text-muted">Không tìm thấy phòng nào phù hợp.</div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedRooms).map(([floor, floorRooms]) => (
            <div key={floor} className="space-y-4">
              <h3 className="text-xl font-bold font-display border-b border-luxury/20 pb-2 flex items-center gap-2">
                Tầng {floor === '0' ? 'Trệt' : floor}
                <Badge count={floorRooms.length} style={{ backgroundColor: '#C6A96B' }} />
              </h3>
              
              <Row gutter={[16, 16]}>
                {floorRooms.map((room) => {
                  const ui = getStatusColor(room.status, room.cleaningStatus || '');
                  return (
                    <Col xs={12} sm={8} md={6} lg={4} key={room.id}>
                      <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                        <div className={`p-4 rounded-2xl border-2 shadow-sm flex flex-col h-full transition-colors cursor-pointer ${ui.bg}`}>
                          <div className="flex justify-between items-start mb-2">
                            <span className={`font-black text-xl ${ui.text}`}>{room.roomNumber}</span>
                            <div className={ui.text}>{ui.icon}</div>
                          </div>
                          
                          <div className="mt-auto space-y-2">
                            <div className="text-xs font-semibold text-gray-600 truncate">
                              {room.roomTypeName || 'Phòng thường'}
                            </div>
                            <div className="flex flex-wrap gap-1">
                              <Tag color={room.status === 'Available' ? 'green' : room.status === 'Occupied' ? 'blue' : 'red'} className="m-0 border-none font-bold text-[10px]">
                                {getStatusLabel(room.status)}
                              </Tag>
                              <Tag color={(room.cleaningStatus || '').toLowerCase() === 'clean' ? 'green' : 'orange'} className="m-0 border-none font-bold text-[10px]">
                                {getCleaningLabel(room.cleaningStatus || '')}
                              </Tag>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    </Col>
                  );
                })}
              </Row>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RoomMapPage;
