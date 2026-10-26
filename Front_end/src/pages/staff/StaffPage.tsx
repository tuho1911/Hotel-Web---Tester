import React, { useEffect, useMemo, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks/useAppStore';
import { fetchAllUsers, selectAllUsers, selectUsersLoading } from '../../store/slices/userSlice';
import { fetchRoles, selectAllRoles } from '../../store/slices/roleSlice';

/**
 * StaffPage: Hiển thị danh sách nhân sự nội bộ
 * = người dùng có role KHÔNG phải "Customer" (hoặc null role)
 * Lọc thêm theo tên, role, trạng thái
 */
const CUSTOMER_ROLES = ['Customer', 'Guest']; // Các role không phải nhân sự

const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
  Admin: { bg: 'rgba(245,158,11,0.12)', text: '#f59e0b' },
  Manager: { bg: 'rgba(139,92,246,0.12)', text: '#8b5cf6' },
  Receptionist: { bg: 'rgba(59,130,246,0.12)', text: '#3b82f6' },
  Housekeeping: { bg: 'rgba(16,185,129,0.12)', text: '#10b981' },
  default: { bg: 'rgba(100,116,139,0.1)', text: '#64748b' },
};

const StaffPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const allUsers = useAppSelector(selectAllUsers);
  const loading = useAppSelector(selectUsersLoading);
  const roles = useAppSelector(selectAllRoles);

  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState<'' | 'active' | 'inactive'>('');

  useEffect(() => {
    dispatch(fetchAllUsers());
    dispatch(fetchRoles());
  }, [dispatch]);

  // Lọc ra nhân sự (role nội bộ)
  const staffUsers = useMemo(() => {
    return allUsers.filter(
      (u) => u.roleName && !CUSTOMER_ROLES.includes(u.roleName)
    );
  }, [allUsers]);

  // Áp dụng filter UI
  const filtered = useMemo(() => {
    let list = staffUsers;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (u) =>
          u.fullName.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          (u.phone && u.phone.includes(q))
      );
    }
    if (filterRole) list = list.filter((u) => u.roleName === filterRole);
    if (filterStatus === 'active') list = list.filter((u) => u.status);
    if (filterStatus === 'inactive') list = list.filter((u) => !u.status);
    return list;
  }, [staffUsers, search, filterRole, filterStatus]);

  // Chỉ lấy roles nội bộ để filter
  const staffRoles = roles.filter((r) => !CUSTOMER_ROLES.includes(r.name));

  // Stats
  const totalActive = staffUsers.filter((u) => u.status).length;

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.h1}>Nhân sự</h1>
          <p style={styles.subtitle}>
            {staffUsers.length} nhân viên · {totalActive} đang hoạt động
          </p>
        </div>
      </div>

      {/* Stats cards */}
      <div style={styles.statsRow}>
        {staffRoles.map((r) => {
          const count = staffUsers.filter((u) => u.roleName === r.name).length;
          const color = ROLE_COLORS[r.name] ?? ROLE_COLORS.default;
          return (
            <div
              key={r.id}
              style={{ ...styles.statCard, background: color.bg, cursor: 'pointer' }}
              onClick={() => setFilterRole(filterRole === r.name ? '' : r.name)}
            >
              <div style={{ ...styles.statLabel, color: color.text }}>{r.name}</div>
              <div style={{ ...styles.statValue, color: color.text }}>{count}</div>
            </div>
          );
        })}
      </div>

      {/* Filter bar */}
      <div style={styles.filterBar}>
        <input
          style={styles.searchInput}
          placeholder="🔍 Tìm theo tên, email, SĐT..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          style={styles.select}
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
        >
          <option value="">Tất cả chức vụ</option>
          {staffRoles.map((r) => (
            <option key={r.id} value={r.name}>{r.name}</option>
          ))}
        </select>
        <select
          style={styles.select}
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as any)}
        >
          <option value="">Tất cả trạng thái</option>
          <option value="active">Đang làm việc</option>
          <option value="inactive">Đã nghỉ / Khóa</option>
        </select>
        {(search || filterRole || filterStatus) && (
          <button
            style={styles.resetBtn}
            onClick={() => { setSearch(''); setFilterRole(''); setFilterStatus(''); }}
          >
            ✕ Xóa lọc
          </button>
        )}
        <span style={styles.resultCount}>{filtered.length} kết quả</span>
      </div>

      {/* Grid cards */}
      {loading ? (
        <div style={styles.loadingWrap}>
          <div style={styles.spinner} />
          <p style={{ color: 'var(--text-muted)', marginTop: 12 }}>Đang tải nhân sự...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div style={styles.empty}>
          <div style={{ fontSize: 48 }}>🏨</div>
          <p style={{ color: 'var(--text-muted)' }}>Không tìm thấy nhân sự nào phù hợp</p>
        </div>
      ) : (
        <div style={styles.grid}>
          {filtered.map((u) => {
            const color = ROLE_COLORS[u.roleName ?? ''] ?? ROLE_COLORS.default;
            return (
              <div key={u.id} style={styles.card}>
                {/* Status indicator */}
                <div
                  style={{
                    ...styles.statusBar,
                    background: u.status ? '#22c55e' : '#ef4444',
                  }}
                />
                <div style={styles.cardBody}>
                  {/* Avatar */}
                  <div style={styles.avatarWrap}>
                    <div style={styles.avatar}>
                      {u.avatarUrl ? (
                        <img src={u.avatarUrl} alt={u.fullName} style={styles.avatarImg} />
                      ) : (
                        u.fullName.charAt(0).toUpperCase()
                      )}
                    </div>
                    <span
                      style={{
                        ...styles.onlineDot,
                        background: u.status ? '#22c55e' : '#94a3b8',
                      }}
                    />
                  </div>

                  {/* Info */}
                  <div style={styles.cardInfo}>
                    <h4 style={styles.cardName}>{u.fullName}</h4>
                    <span style={{ ...styles.roleBadge, background: color.bg, color: color.text }}>
                      {u.roleName}
                    </span>
                    <div style={styles.contactRow}>
                      <span title="Email">📧</span>
                      <span style={styles.contactText}>{u.email}</span>
                    </div>
                    {u.phone && (
                      <div style={styles.contactRow}>
                        <span title="SĐT">📱</span>
                        <span style={styles.contactText}>{u.phone}</span>
                      </div>
                    )}
                    <div style={styles.cardFooter}>
                      <span
                        style={{
                          ...styles.statusLabel,
                          color: u.status ? '#10b981' : '#ef4444',
                          background: u.status ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                          border: `1px solid ${u.status ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
                        }}
                      >
                        {u.status ? 'Đang làm việc' : 'Đã nghỉ'}
                      </span>
                      {u.createdAt && (
                        <span style={styles.joinDate}>
                          Từ {new Date(u.createdAt).toLocaleDateString('vi-VN')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  page: {},
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  h1: { fontSize: 24, fontWeight: 800, color: 'var(--text-title)', margin: '0 0 4px' },
  subtitle: { fontSize: 14, color: 'var(--text-muted)', margin: 0 },
  statsRow: { display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' },
  statCard: {
    borderRadius: 10, padding: '14px 20px', minWidth: 120,
    display: 'flex', flexDirection: 'column', gap: 4, transition: 'opacity 0.15s',
  },
  statLabel: { fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' },
  statValue: { fontSize: 28, fontWeight: 800 },
  filterBar: {
    display: 'flex', gap: 12, marginBottom: 24,
    flexWrap: 'wrap', alignItems: 'center',
  },
  searchInput: {
    flex: '1 1 240px', padding: '10px 14px',
    border: '1.5px solid var(--nav-border)', borderRadius: 8, fontSize: 14, outline: 'none',
    background: 'var(--card-bg, var(--nav-bg))', color: 'var(--text-body)',
  },
  select: {
    padding: '10px 14px', border: '1.5px solid var(--nav-border)',
    borderRadius: 8, fontSize: 14, background: 'var(--card-bg, var(--nav-bg))',
    color: 'var(--text-body)', cursor: 'pointer',
  },
  resetBtn: {
    padding: '10px 16px', background: 'rgba(239,68,68,0.1)',
    border: '1.5px solid rgba(239,68,68,0.3)', color: '#ef4444',
    borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
  },
  resultCount: { fontSize: 13, color: 'var(--text-muted)', marginLeft: 4 },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: 16,
  },
  card: {
    background: 'var(--card-bg, var(--nav-bg))', borderRadius: 12,
    border: '1px solid var(--nav-border)', overflow: 'hidden',
    display: 'flex', flexDirection: 'column',
    transition: 'box-shadow 0.2s, transform 0.2s',
  },
  statusBar: { height: 4, width: '100%' },
  cardBody: { padding: '20px', display: 'flex', gap: 16 },
  avatarWrap: { position: 'relative', flexShrink: 0 },
  avatar: {
    width: 52, height: 52, borderRadius: '50%',
    background: 'linear-gradient(135deg, #C6A96B, #A6894B)',
    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 700, fontSize: 20, overflow: 'hidden',
  },
  avatarImg: { width: '100%', height: '100%', objectFit: 'cover' },
  onlineDot: {
    position: 'absolute', bottom: 2, right: 2,
    width: 12, height: 12, borderRadius: '50%', border: '2px solid var(--nav-bg)',
  },
  cardInfo: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 },
  cardName: { fontSize: 16, fontWeight: 700, color: 'var(--text-title)', margin: 0 },
  roleBadge: {
    display: 'inline-block', padding: '2px 10px', borderRadius: 20,
    fontSize: 11, fontWeight: 700, width: 'fit-content',
  },
  contactRow: { display: 'flex', alignItems: 'center', gap: 6 },
  contactText: { fontSize: 13, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  cardFooter: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  statusLabel: { fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20 },
  joinDate: { fontSize: 11, color: 'var(--text-muted)' },
  loadingWrap: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', paddingTop: 80,
  },
  spinner: {
    width: 36, height: 36, border: '3px solid var(--nav-border)',
    borderTopColor: '#2563eb', borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
  },
  empty: {
    textAlign: 'center', color: 'var(--text-muted)', paddingTop: 80,
    fontSize: 15, display: 'flex', flexDirection: 'column',
    alignItems: 'center', gap: 12,
  },
};

export default StaffPage;
