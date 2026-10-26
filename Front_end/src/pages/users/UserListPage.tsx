import React, { useEffect, useState, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks/useAppStore';
import {
  fetchFilteredUsers,
  createUser,
  updateUser,
  deleteUser,
  changeUserRole,
  setPage,
  setFilterParams,
  selectFilteredUsers,
  selectUsersTotal,
  selectFilterLoading,
  selectCurrentPage,
  selectPageSize,
} from '../../store/slices/userSlice';
import { fetchRoles, selectAllRoles } from '../../store/slices/roleSlice';
import UserFormModal from './UserFormModal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { UserResponseDto } from '../../services/userApi';

const StatusBadge: React.FC<{ active: boolean }> = ({ active }) => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      padding: '3px 10px',
      borderRadius: 20,
      fontSize: 12,
      fontWeight: 600,
      background: active ? '#dcfce7' : '#fee2e2',
      color: active ? '#16a34a' : '#dc2626',
    }}
  >
    <span style={{ fontSize: 8 }}>{active ? '●' : '●'}</span>
    {active ? 'Hoạt động' : 'Đã khóa'}
  </span>
);

const UserListPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const users = useAppSelector(selectFilteredUsers);
  const total = useAppSelector(selectUsersTotal);
  const loading = useAppSelector(selectFilterLoading);
  const currentPage = useAppSelector(selectCurrentPage);
  const pageSize = useAppSelector(selectPageSize);
  const roles = useAppSelector(selectAllRoles);

  // Filter state (local, debounced)
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'' | 'true' | 'false'>('');

  // Modal state
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserResponseDto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserResponseDto | null>(null);
  const [roleModalUser, setRoleModalUser] = useState<UserResponseDto | null>(null);
  const [newRoleId, setNewRoleId] = useState<number | ''>('');
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const totalPages = Math.ceil(total / pageSize);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Load roles một lần
  useEffect(() => {
    dispatch(fetchRoles());
  }, [dispatch]);

  // Fetch users khi filter hoặc page thay đổi (debounce 350ms cho text)
  const doFetch = useCallback(() => {
    const params: any = { page: currentPage, pageSize };
    if (phone.trim()) params.phone = phone.trim();
    if (email.trim()) params.email = email.trim();
    if (status !== '') params.status = status === 'true';
    dispatch(fetchFilteredUsers(params));
  }, [dispatch, phone, email, status, currentPage, pageSize]);

  useEffect(() => {
    const t = setTimeout(doFetch, 350);
    return () => clearTimeout(t);
  }, [doFetch]);

  const handleFilterReset = () => {
    setPhone('');
    setEmail('');
    setStatus('');
    dispatch(setPage(1));
  };

  // ── CRUD Handlers ──────────────────────────────────────────────────────────

  const handleCreateSubmit = async (dto: any) => {
    setActionLoading(true);
    const res = await dispatch(createUser(dto));
    setActionLoading(false);
    if (createUser.fulfilled.match(res)) {
      showToast('Tạo người dùng thành công');
      setModalMode(null);
      doFetch();
    } else {
      showToast(res.payload as string, 'error');
    }
  };

  const handleEditSubmit = async (dto: any) => {
    if (!selectedUser) return;
    setActionLoading(true);
    const res = await dispatch(updateUser({ id: selectedUser.id, dto }));
    setActionLoading(false);
    if (updateUser.fulfilled.match(res)) {
      showToast('Cập nhật thành công');
      setModalMode(null);
      doFetch();
    } else {
      showToast(res.payload as string, 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setActionLoading(true);
    const res = await dispatch(deleteUser(deleteTarget.id));
    setActionLoading(false);
    if (deleteUser.fulfilled.match(res)) {
      showToast('Đã xóa người dùng');
      setDeleteTarget(null);
      doFetch();
    } else {
      showToast(res.payload as string, 'error');
    }
  };

  const currentUserId = useAppSelector((s) => s.auth.user?.id);

  const handleChangeRole = async () => {
    if (!roleModalUser || newRoleId === '') return;
    setActionLoading(true);
    const res = await dispatch(changeUserRole({ userId: roleModalUser.id, roleId: newRoleId as number }));
    setActionLoading(false);
    if (changeUserRole.fulfilled.match(res)) {
      showToast('Đã thay đổi quyền');
      const isSelf = roleModalUser.id.toString() === currentUserId?.toString();
      setRoleModalUser(null);
      doFetch();
      if (isSelf) {
        showToast('Đang tải lại giao diện với quyền mới...', 'success');
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    } else {
      showToast(res.payload as string, 'error');
    }
  };

  return (
    <div style={styles.page}>
      {/* Toast */}
      {toast && (
        <div style={{ ...styles.toast, background: toast.type === 'success' ? '#16a34a' : '#dc2626' }}>
          {toast.type === 'success' ? '✓' : '✗'} {toast.msg}
        </div>
      )}

      {/* Page Header */}
      <div style={styles.pageHeader}>
        <div>
          <h1 style={styles.h1}>Quản lý người dùng</h1>
          <p style={styles.subtitle}>
            {total} tài khoản · Trang {currentPage}/{totalPages || 1}
          </p>
        </div>
        <button style={styles.primaryBtn} onClick={() => { setSelectedUser(null); setModalMode('create'); }}>
          + Tạo người dùng
        </button>
      </div>

      {/* Filter Bar */}
      <div style={styles.filterBar}>
        <input
          style={styles.filterInput}
          placeholder="🔍 Tìm theo số điện thoại"
          value={phone}
          onChange={(e) => { setPhone(e.target.value); dispatch(setPage(1)); }}
        />
        <input
          style={styles.filterInput}
          placeholder="🔍 Tìm theo email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); dispatch(setPage(1)); }}
        />
        <select
          style={styles.filterSelect}
          value={status}
          onChange={(e) => { setStatus(e.target.value as any); dispatch(setPage(1)); }}
        >
          <option value="">Tất cả trạng thái</option>
          <option value="true">Hoạt động</option>
          <option value="false">Đã khóa</option>
        </select>
        {(phone || email || status) && (
          <button style={styles.resetBtn} onClick={handleFilterReset}>✕ Xóa lọc</button>
        )}
      </div>

      {/* Table */}
      <div style={styles.tableWrap}>
        {loading && <div style={styles.loadingOverlay}><div style={styles.spinner} /></div>}
        <table style={styles.table}>
          <thead>
            <tr style={styles.thead}>
              <th style={styles.th}>Họ tên</th>
              <th style={styles.th}>Email</th>
              <th style={styles.th}>SĐT</th>
              <th style={styles.th}>Quyền</th>
              <th style={styles.th}>Trạng thái</th>
              <th style={styles.th}>Ngày tạo</th>
              <th style={{ ...styles.th, textAlign: 'center' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 && !loading ? (
              <tr>
                <td colSpan={7} style={styles.emptyCell}>
                  Không tìm thấy người dùng nào
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} style={styles.tr}>
                  <td style={styles.td}>
                    <div style={styles.userCell}>
                      <div style={styles.avatar}>{u.fullName.charAt(0).toUpperCase()}</div>
                      <span style={styles.fullName}>{u.fullName}</span>
                    </div>
                  </td>
                  <td style={{ ...styles.td, color: '#4b5563' }}>{u.email}</td>
                  <td style={{ ...styles.td, color: '#4b5563' }}>{u.phone ?? '—'}</td>
                  <td style={styles.td}>
                    <span style={styles.rolePill}>{u.roleName ?? 'Chưa có'}</span>
                  </td>
                  <td style={styles.td}>
                    <StatusBadge active={u.status} />
                  </td>
                  <td style={{ ...styles.td, color: '#94a3b8', fontSize: 13 }}>
                    {u.createdAt
                      ? new Date(u.createdAt).toLocaleDateString('vi-VN')
                      : '—'}
                  </td>
                  <td style={{ ...styles.td, textAlign: 'center' }}>
                    <div style={styles.actions}>
                      <button
                        style={styles.iconBtn}
                        title="Sửa"
                        onClick={() => { setSelectedUser(u); setModalMode('edit'); }}
                      >✏️</button>
                      <button
                        style={styles.iconBtn}
                        title="Đổi quyền"
                        onClick={() => { setRoleModalUser(u); setNewRoleId(u.roleId ?? ''); }}
                      >🔑</button>
                      <button
                        style={{ ...styles.iconBtn, color: '#ef4444' }}
                        title="Xóa"
                        onClick={() => setDeleteTarget(u)}
                      >🗑️</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={styles.pagination}>
          <button
            style={styles.pageBtn}
            disabled={currentPage <= 1}
            onClick={() => dispatch(setPage(currentPage - 1))}
          >← Trước</button>
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
            const p = i + 1;
            return (
              <button
                key={p}
                style={{ ...styles.pageBtn, ...(p === currentPage ? styles.pageActive : {}) }}
                onClick={() => dispatch(setPage(p))}
              >{p}</button>
            );
          })}
          <button
            style={styles.pageBtn}
            disabled={currentPage >= totalPages}
            onClick={() => dispatch(setPage(currentPage + 1))}
          >Tiếp →</button>
        </div>
      )}

      {/* Create / Edit Modal */}
      {modalMode && (
        <UserFormModal
          mode={modalMode}
          initialData={modalMode === 'edit' ? selectedUser : null}
          roles={roles}
          loading={actionLoading}
          onSubmit={modalMode === 'create' ? handleCreateSubmit : handleEditSubmit}
          onClose={() => setModalMode(null)}
        />
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <ConfirmDialog
          title="Xóa người dùng"
          message={`Bạn có chắc muốn xóa tài khoản "${deleteTarget.fullName}"? Hành động này không thể hoàn tác.`}
          confirmLabel="Xóa"
          danger
          loading={actionLoading}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* Change Role Modal */}
      {roleModalUser && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <h3 style={styles.modalTitle}>Đổi quyền người dùng</h3>
            <p style={styles.modalSub}>
              Tài khoản: <strong>{roleModalUser.fullName}</strong>
            </p>
            <select
              style={styles.filterSelect}
              value={newRoleId}
              onChange={(e) => setNewRoleId(Number(e.target.value))}
            >
              <option value="">-- Chọn quyền --</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
            <div style={styles.modalActions}>
              <button style={styles.cancelBtn} onClick={() => setRoleModalUser(null)}>Hủy</button>
              <button
                style={styles.primaryBtn}
                disabled={newRoleId === '' || actionLoading}
                onClick={handleChangeRole}
              >
                {actionLoading ? 'Đang lưu...' : 'Xác nhận'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  page: { position: 'relative' },
  toast: {
    position: 'fixed',
    top: 20,
    right: 24,
    color: '#fff',
    padding: '12px 20px',
    borderRadius: 10,
    fontWeight: 600,
    fontSize: 14,
    zIndex: 9999,
    boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
    animation: 'slideIn 0.3s ease',
  },
  pageHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  h1: { fontSize: 24, fontWeight: 800, color: '#0f172a', margin: '0 0 4px' },
  subtitle: { fontSize: 14, color: '#64748b', margin: 0 },
  filterBar: {
    display: 'flex',
    gap: 12,
    marginBottom: 20,
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  filterInput: {
    padding: '10px 14px',
    border: '1.5px solid #e2e8f0',
    borderRadius: 8,
    fontSize: 14,
    outline: 'none',
    minWidth: 220,
    flex: '1 1 200px',
  },
  filterSelect: {
    padding: '10px 14px',
    border: '1.5px solid #e2e8f0',
    borderRadius: 8,
    fontSize: 14,
    outline: 'none',
    cursor: 'pointer',
    background: '#fff',
  },
  resetBtn: {
    padding: '10px 16px',
    border: '1.5px solid #fca5a5',
    background: '#fef2f2',
    color: '#dc2626',
    borderRadius: 8,
    fontSize: 13,
    cursor: 'pointer',
    fontWeight: 600,
  },
  tableWrap: { position: 'relative', borderRadius: 12, overflow: 'hidden', border: '1px solid #e2e8f0' },
  loadingOverlay: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(255,255,255,0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  spinner: {
    width: 32,
    height: 32,
    border: '3px solid #e2e8f0',
    borderTopColor: '#2563eb',
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
  },
  table: { width: '100%', borderCollapse: 'collapse' },
  thead: { background: '#f8fafc' },
  th: {
    padding: '13px 16px',
    textAlign: 'left',
    fontSize: 12,
    fontWeight: 700,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    borderBottom: '1px solid #e2e8f0',
  },
  tr: { borderBottom: '1px solid #f1f5f9', transition: 'background 0.1s' },
  td: { padding: '13px 16px', fontSize: 14, color: '#374151', verticalAlign: 'middle' },
  emptyCell: { padding: '48px 16px', textAlign: 'center', color: '#94a3b8', fontSize: 15 },
  userCell: { display: 'flex', alignItems: 'center', gap: 10 },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #1e3a5f, #2563eb)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: 14,
    flexShrink: 0,
  },
  fullName: { fontWeight: 600, color: '#0f172a' },
  rolePill: {
    display: 'inline-block',
    padding: '3px 10px',
    background: '#eff6ff',
    color: '#2563eb',
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 600,
  },
  actions: { display: 'flex', gap: 6, justifyContent: 'center' },
  iconBtn: {
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    padding: '6px 8px',
    cursor: 'pointer',
    fontSize: 15,
    lineHeight: 1,
  },
  pagination: { display: 'flex', gap: 6, justifyContent: 'center', marginTop: 20 },
  pageBtn: {
    padding: '8px 14px',
    border: '1.5px solid #e2e8f0',
    borderRadius: 8,
    background: '#fff',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 600,
  },
  pageActive: { background: '#1e3a5f', color: '#fff', borderColor: '#1e3a5f' },
  primaryBtn: {
    background: 'linear-gradient(135deg, #1e3a5f, #2563eb)',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    padding: '10px 20px',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
  },
  cancelBtn: {
    background: '#f8fafc',
    border: '1.5px solid #e2e8f0',
    borderRadius: 10,
    padding: '10px 20px',
    fontSize: 14,
    cursor: 'pointer',
  },
  // Role modal
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 500,
  },
  modalCard: {
    background: '#fff',
    borderRadius: 16,
    padding: '32px',
    width: '100%',
    maxWidth: 400,
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  modalTitle: { fontSize: 20, fontWeight: 800, color: '#0f172a', margin: 0 },
  modalSub: { fontSize: 14, color: '#64748b', margin: 0 },
  modalActions: { display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 },
};

export default UserListPage;
