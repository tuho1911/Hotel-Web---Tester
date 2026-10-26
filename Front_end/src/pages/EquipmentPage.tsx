import React from 'react';
import { useEquipmentStore } from '../hooks/useEquipmentStore';

const EquipmentPage: React.FC = () => {
  const { equipment, damages, loading, stats, toasts } = useEquipmentStore();

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>
        Quản lý vật tư
      </h1>
      <p style={{ fontSize: 14, color: '#64748b', marginBottom: 24 }}>
        {stats.totalTypes} loại  {stats.inStock} trong kho  {stats.damaged} hỏng
      </p>

      {loading && <p style={{ color: '#64748b' }}>Đang tải...</p>}

      {toasts.map((t) => (
        <div key={t.id} style={{
          background: t.type === 'error' ? '#fef2f2' : '#f0fdf4',
          border: `1px solid ${t.type === 'error' ? '#fca5a5' : '#86efac'}`,
          color: t.type === 'error' ? '#dc2626' : '#16a34a',
          borderRadius: 8, padding: '10px 14px', marginBottom: 8, fontSize: 13,
        }}>
          {t.msg}
        </div>
      ))}

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
        <thead>
          <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
            <th style={th}>Mã</th>
            <th style={th}>Tên vật tư</th>
            <th style={th}>Danh mục</th>
            <th style={th}>Tổng</th>
            <th style={th}>Trong kho</th>
            <th style={th}>Đang dùng</th>
            <th style={th}>Hỏng</th>
            <th style={th}>Trạng thái</th>
            <th style={{ ...th, textAlign: 'center' }}>Hành động</th>
          </tr>
        </thead>
        <tbody>
          {equipment.map((e) => (
            <tr key={e.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
              <td style={td}>{e.itemCode}</td>
              <td style={{ ...td, fontWeight: 600, color: '#0f172a' }}>{e.name}</td>
              <td style={td}>{e.category}</td>
              <td style={td}>{e.totalQuantity}</td>
              <td style={td}>{e.inStockQuantity}</td>
              <td style={td}>{e.inUseQuantity}</td>
              <td style={{ ...td, color: e.damagedQuantity > 0 ? '#dc2626' : '#64748b' }}>
                {e.damagedQuantity}
              </td>
              <td style={td}>
                <span style={{
                  padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                  background: e.isActive ? '#d1fae5' : '#fee2e2',
                  color: e.isActive ? '#065f46' : '#991b1b',
                }}>
                  {e.isActive ? 'Hoạt động' : 'Ngừng'}
                </span>
              </td>
            </tr>
          ))}
          {!loading && equipment.length === 0 && (
            <tr>
              <td colSpan={8} style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
                Chưa có vật tư nào
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

const th: React.CSSProperties = {
  padding: '10px 12px', textAlign: 'left', fontWeight: 600,
  fontSize: 12, color: '#475569', textTransform: 'uppercase',
};

const td: React.CSSProperties = {
  padding: '10px 12px', color: '#374151',
};

export default EquipmentPage;
