import React, { useEffect, useState } from 'react';
import { UserResponseDto } from '../../services/userApi';
import { RoleResponseDto } from '../../services/roleApi';

interface Props {
  mode: 'create' | 'edit';
  initialData: UserResponseDto | null;
  roles: RoleResponseDto[];
  loading: boolean;
  onSubmit: (dto: any) => void;
  onClose: () => void;
}

const UserFormModal: React.FC<Props> = ({ mode, initialData, roles, loading, onSubmit, onClose }) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [roleId, setRoleId] = useState<number | ''>('');
  const [status, setStatus] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (mode === 'edit' && initialData) {
      setFullName(initialData.fullName);
      setEmail(initialData.email);
      setPhone(initialData.phone ?? '');
      setRoleId(initialData.roleId ?? '');
      setStatus(initialData.status);
    }
  }, [mode, initialData]);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!fullName.trim()) errs.fullName = 'Vui lòng nhập họ tên';
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) errs.email = 'Email không hợp lệ';
    if (mode === 'create' && password.length < 6) errs.password = 'Mật khẩu tối thiểu 6 ký tự';
    return errs;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    if (mode === 'create') {
      onSubmit({ fullName, email, password, phone: phone || undefined, roleId: roleId || undefined });
    } else {
      onSubmit({ fullName, phone: phone || undefined, status });
    }
  };

  return (
    <div style={overlay}>
      <div style={card}>
        <div style={header}>
          <h3 style={title}>{mode === 'create' ? '+ Tạo người dùng' : '✏️ Chỉnh sửa người dùng'}</h3>
          <button style={closeBtn} onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} noValidate style={form}>
          {/* Họ tên */}
          <Field label="Họ và tên *">
            <input
              style={input(!!errors.fullName)}
              value={fullName}
              onChange={(e) => { setFullName(e.target.value); setErrors((p) => ({ ...p, fullName: '' })); }}
              placeholder="Nguyễn Văn A"
            />
            {errors.fullName && <ErrMsg msg={errors.fullName} />}
          </Field>

          {/* Email */}
          <Field label="Email *">
            <input
              style={input(!!errors.email)}
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: '' })); }}
              placeholder="example@hotel.vn"
              disabled={mode === 'edit'}
            />
            {errors.email && <ErrMsg msg={errors.email} />}
          </Field>

          {/* SĐT */}
          <Field label="Số điện thoại">
            <input
              style={input()}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0901234567"
            />
          </Field>

          {/* Mật khẩu (chỉ tạo mới) */}
          {mode === 'create' && (
            <Field label="Mật khẩu *">
              <input
                style={input(!!errors.password)}
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: '' })); }}
                placeholder="Tối thiểu 6 ký tự"
              />
              {errors.password && <ErrMsg msg={errors.password} />}
            </Field>
          )}

          {/* Role (chỉ tạo mới) */}
          {mode === 'create' && (
            <Field label="Quyền">
              <select style={input()} value={roleId} onChange={(e) => setRoleId(Number(e.target.value) || '')}>
                <option value="">-- Chọn quyền --</option>
                {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </Field>
          )}

          {/* Trạng thái (chỉ edit) */}
          {mode === 'edit' && (
            <Field label="Trạng thái">
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={status}
                  onChange={(e) => setStatus(e.target.checked)}
                  style={{ width: 18, height: 18 }}
                />
                <span style={{ fontSize: 14, color: status ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
                  {status ? 'Đang hoạt động' : 'Đã bị khóa'}
                </span>
              </label>
            </Field>
          )}

          <div style={footer}>
            <button type="button" style={cancelBtn} onClick={onClose}>Hủy</button>
            <button type="submit" style={submitBtn} disabled={loading}>
              {loading ? 'Đang lưu...' : mode === 'create' ? 'Tạo tài khoản' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
    <label style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{label}</label>
    {children}
  </div>
);

const ErrMsg: React.FC<{ msg: string }> = ({ msg }) => (
  <span style={{ fontSize: 12, color: '#dc2626' }}>{msg}</span>
);

const input = (hasErr = false): React.CSSProperties => ({
  padding: '10px 14px',
  border: `1.5px solid ${hasErr ? '#fca5a5' : '#e2e8f0'}`,
  borderRadius: 8,
  fontSize: 14,
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
  background: hasErr ? '#fef2f2' : '#fff',
});

const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500,
};
const card: React.CSSProperties = {
  background: '#fff', borderRadius: 16, width: '100%', maxWidth: 480,
  boxShadow: '0 20px 60px rgba(0,0,0,0.2)', overflow: 'hidden',
};
const header: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '20px 24px', borderBottom: '1px solid #f1f5f9',
};
const title: React.CSSProperties = { fontSize: 18, fontWeight: 800, color: '#0f172a', margin: 0 };
const closeBtn: React.CSSProperties = {
  background: '#f1f5f9', border: 'none', borderRadius: 6,
  width: 30, height: 30, cursor: 'pointer', fontSize: 14, fontWeight: 700,
};
const form: React.CSSProperties = {
  padding: '24px', display: 'flex', flexDirection: 'column', gap: 18,
};
const footer: React.CSSProperties = {
  display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8,
};
const cancelBtn: React.CSSProperties = {
  padding: '10px 20px', border: '1.5px solid #e2e8f0', borderRadius: 8,
  background: '#f8fafc', cursor: 'pointer', fontSize: 14,
};
const submitBtn: React.CSSProperties = {
  padding: '10px 24px', background: 'linear-gradient(135deg, #1e3a5f, #2563eb)',
  color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer',
  fontSize: 14, fontWeight: 700,
};

export default UserFormModal;
