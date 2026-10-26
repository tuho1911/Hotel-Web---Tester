import React from 'react';
import { Card, Col, Row, Statistic, Tag, Typography } from 'antd';

export type RoleCardItem = {
  title: string;
  value: number;
  isMoney?: boolean;
};

type Props = {
  roleName: string;
  summary: any;
  loading: boolean;
};

function getRoleCards(roleName: string, summary: any): RoleCardItem[] {
  if (roleName === 'WarehouseStaff') {
    return [
      { title: 'Tồn kho', value: Number(summary?.inventory?.inStockQuantity || 0) },
      { title: 'Báo hỏng', value: Number(summary?.damage?.damageReports || 0) },
      { title: 'Tồn thấp', value: Number(summary?.risk?.lowStockItems || 0) },
      { title: 'Tiền phạt', value: Number(summary?.damage?.penaltyAmount || 0), isMoney: true },
    ];
  }

  if (roleName === 'Housekeeping') {
    return [
      { title: 'Báo hỏng', value: Number(summary?.damage?.damageReports || 0) },
      { title: 'SL hỏng/mất', value: Number(summary?.damage?.damagedQuantityInPeriod || 0) },
      { title: 'Tồn thấp', value: Number(summary?.risk?.lowStockItems || 0) },
      { title: 'Tiền phạt', value: Number(summary?.damage?.penaltyAmount || 0), isMoney: true },
    ];
  }

  if (roleName === 'Accountant') {
    return [
      { title: 'Doanh thu', value: Number(summary?.operations?.totalRevenue || summary?.revenue?.totalRevenue || 0), isMoney: true },
      { title: 'Tiền phạt', value: Number(summary?.damage?.penaltyAmount || 0), isMoney: true },
      { title: 'Báo hỏng', value: Number(summary?.damage?.damageReports || 0) },
      { title: 'Tồn thấp', value: Number(summary?.risk?.lowStockItems || 0) },
    ];
  }

  if (roleName === 'Receptionist') {
    return [
      { title: 'Booking', value: Number(summary?.operations?.totalBookings || summary?.booking?.totalBookings || 0) },
      { title: 'Doanh thu', value: Number(summary?.operations?.totalRevenue || summary?.revenue?.totalRevenue || 0), isMoney: true },
      { title: 'Báo hỏng', value: Number(summary?.damage?.damageReports || 0) },
      { title: 'Tồn thấp', value: Number(summary?.risk?.lowStockItems || 0) },
    ];
  }

  return [
    { title: 'Doanh thu', value: Number(summary?.operations?.totalRevenue || summary?.revenue?.totalRevenue || 0), isMoney: true },
    { title: 'Booking', value: Number(summary?.operations?.totalBookings || summary?.booking?.totalBookings || 0) },
    { title: 'Tồn thấp', value: Number(summary?.risk?.lowStockItems || 0) },
    { title: 'Báo hỏng', value: Number(summary?.damage?.damageReports || summary?.risk?.damageReports || 0) },
  ];
}

function getRoleHint(roleName: string): string {
  switch (roleName) {
    case 'WarehouseStaff':
      return 'Dashboard kho: tồn kho, hỏng/mất và cảnh báo vật tư';
    case 'Housekeeping':
      return 'Dashboard buồng phòng: hỏng/mất theo kỳ và mức độ rủi ro';
    case 'Accountant':
      return 'Dashboard kế toán: doanh thu, tiền phạt và chỉ số vận hành liên quan';
    case 'Receptionist':
      return 'Dashboard lễ tân: booking trong kỳ và tình hình vận hành chung';
    case 'Manager':
      return 'Dashboard quản lý: tổng hợp từ các dashboard vai trò con';
    case 'Admin':
      return 'Dashboard quản trị: góc nhìn hệ thống và tổng quan KPI';
    default:
      return 'Dashboard theo vai trò và kỳ thời gian';
  }
}

const RoleDashboardSection: React.FC<Props> = ({ roleName, summary, loading }) => {
  const cards = getRoleCards(roleName, summary);

  return (
    <>
      <Tag color="blue">{roleName}</Tag>
      <Typography.Text type="secondary">{getRoleHint(roleName)}</Typography.Text>

      <Row gutter={[16, 16]}>
        {cards.map((card) => (
          <Col xs={24} md={12} xl={6} key={card.title}>
            <Card loading={loading}>
              <Statistic
                title={card.title}
                value={card.value}
                formatter={(v) => (card.isMoney ? `${Number(v).toLocaleString('vi-VN')} đ` : Number(v).toLocaleString('vi-VN'))}
              />
            </Card>
          </Col>
        ))}
      </Row>
    </>
  );
};

export default RoleDashboardSection;
