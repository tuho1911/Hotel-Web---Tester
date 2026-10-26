import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../../hooks/useAppStore';
import { getAuthorizedHomePath } from '../../utils/authNavigation';

const UnauthorizedPage: React.FC = () => {
  const navigate = useNavigate();
  const user = useAppSelector((s) => s.auth.user);
  const homePath = getAuthorizedHomePath(user);

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <div style={styles.code}>401</div>
        <h1 style={styles.title}>Không có quyền truy cập</h1>
        <p style={styles.msg}>
          {user
            ? `Tài khoản "${user.fullName}" (${user.role}) không được phép truy cập trang này.`
            : 'Bạn chưa đăng nhập hoặc phiên làm việc đã hết hạn.'}
        </p>
        <div style={styles.actions}>
          <button style={styles.backBtn} onClick={() => navigate(-1)}>
            ← Quay lại
          </button>
          {user ? (
            <button style={styles.homeBtn} onClick={() => navigate(homePath)}>
              Về trang chủ
            </button>
          ) : (
            <button style={styles.homeBtn} onClick={() => navigate('/login')}>
              Đăng nhập
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)',
    fontFamily: "'Segoe UI', system-ui, sans-serif",
  },
  card: {
    background: '#fff',
    borderRadius: 20,
    padding: '56px 48px',
    textAlign: 'center',
    maxWidth: 480,
    width: '100%',
    boxShadow: '0 25px 60px rgba(0,0,0,0.4)',
  },
  code: {
    fontSize: 80,
    fontWeight: 900,
    color: '#ef4444',
    lineHeight: 1,
    marginBottom: 16,
    letterSpacing: '-4px',
  },
  title: {
    fontSize: 24,
    fontWeight: 800,
    color: '#0f172a',
    margin: '0 0 12px',
  },
  msg: {
    fontSize: 15,
    color: '#64748b',
    lineHeight: 1.6,
    margin: '0 0 32px',
  },
  actions: { display: 'flex', gap: 12, justifyContent: 'center' },
  backBtn: {
    padding: '12px 24px',
    border: '1.5px solid #e2e8f0',
    background: '#f8fafc',
    borderRadius: 10,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 600,
  },
  homeBtn: {
    padding: '12px 24px',
    background: 'linear-gradient(135deg, #1e3a5f, #2563eb)',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 700,
  },
};

export default UnauthorizedPage;
