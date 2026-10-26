import React from 'react';

interface Props {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDialog: React.FC<Props> = ({
  title,
  message,
  confirmLabel = 'Xác nhận',
  cancelLabel = 'Hủy',
  danger = false,
  loading = false,
  onConfirm,
  onCancel,
}) => {
  return (
    <div style={overlay}>
      <div style={card}>
        <div style={iconWrap}>
          <span style={{ fontSize: 32 }}>{danger ? '⚠️' : 'ℹ️'}</span>
        </div>
        <h3 style={titleStyle}>{title}</h3>
        <p style={msgStyle}>{message}</p>
        <div style={actions}>
          <button style={cancelBtn} onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </button>
          <button
            style={danger ? dangerBtn : confirmBtn}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Đang xử lý...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 600,
};
const card: React.CSSProperties = {
  background: '#fff', borderRadius: 16, padding: '32px 28px',
  width: '100%', maxWidth: 400, textAlign: 'center',
  boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
};
const iconWrap: React.CSSProperties = { marginBottom: 12 };
const titleStyle: React.CSSProperties = {
  fontSize: 20, fontWeight: 800, color: '#0f172a', margin: '0 0 10px',
};
const msgStyle: React.CSSProperties = {
  fontSize: 14, color: '#64748b', margin: '0 0 24px', lineHeight: 1.6,
};
const actions: React.CSSProperties = {
  display: 'flex', gap: 10, justifyContent: 'center',
};
const cancelBtn: React.CSSProperties = {
  padding: '10px 24px', border: '1.5px solid #e2e8f0',
  background: '#f8fafc', borderRadius: 8, cursor: 'pointer', fontSize: 14,
};
const confirmBtn: React.CSSProperties = {
  padding: '10px 24px', background: '#2563eb',
  color: '#fff', border: 'none', borderRadius: 8,
  cursor: 'pointer', fontSize: 14, fontWeight: 700,
};
const dangerBtn: React.CSSProperties = {
  ...confirmBtn,
  background: 'linear-gradient(135deg, #dc2626, #ef4444)',
};

export default ConfirmDialog;
