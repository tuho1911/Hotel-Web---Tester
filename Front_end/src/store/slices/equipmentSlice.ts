import { useState, useCallback, useEffect } from 'react';
import type {
  Equipment,
  LossDamage,
  DamageReportForm,
  ExcelRow,
} from '../../types/equipment.types';
import { equipmentApi, lossApi, calcStock } from '../../services/equipmentApi';

export type Toast = {
  id  : number;
  msg : string;
  type: 'success' | 'error' | 'info' | 'warning';
};

// ── Search / Filter params (Task 9) ───────────────────────────────────────
export interface EquipmentFilter {
  search?  : string;
  category?: string;
  isActive?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────

export function useEquipmentStore() {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [damages,   setDamages]   = useState<LossDamage[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [toasts,    setToasts]    = useState<Toast[]>([]);

  // filter state (chỉ dùng để gọi loadAll có param; EquipmentList vẫn filter FE thêm)
  const [filter, setFilter] = useState<EquipmentFilter>({});

  // ── Toast ─────────────────────────────────────────────────────────────
  const toast = useCallback((msg: string, type: Toast['type'] = 'success') => {
    const id = Date.now();
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);

  // ── Load data ─────────────────────────────────────────────────────────
  // Gọi BE với search params; nếu 401 → interceptor tự xử lý → /login
  const loadAll = useCallback(async (params?: EquipmentFilter) => {
    setLoading(true);
    try {
      const [eqs, dmgs] = await Promise.all([
        equipmentApi.getAll(params),
        lossApi.getAll(),
      ]);
      setEquipment(eqs);
      setDamages(dmgs);
    } catch (err: unknown) {
      // 401/403 đã được interceptor xử lý (redirect).
      // Các lỗi khác hiển thị toast.
      const status = (err as { response?: { status: number } })?.response?.status;
      if (status !== 401 && status !== 403) {
        toast('❌ Không thể tải dữ liệu vật tư', 'error');
      }
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ── Search – gọi BE với params ──────────────────────────────
  const applyFilter = useCallback((newFilter: EquipmentFilter) => {
    setFilter(newFilter);
    loadAll(newFilter);
  }, [loadAll]);

  const clearFilter = useCallback(() => {
    setFilter({});
    loadAll({});
  }, [loadAll]);

  // ── CRUD Equipment ────────────────────────────────────────────────────
  const addEquipment = useCallback(async (data: Partial<Equipment>) => {
    setLoading(true);
    try {
      const created = await equipmentApi.create(data);
      setEquipment((prev) => [...prev, { ...created, InStockQuantity: calcStock(created) }]);
      toast('✅ Đã thêm vật tư: ' + created.name);
      return created;
    } catch {
      toast('❌ Lỗi khi thêm vật tư', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const updateEquipment = useCallback(async (id: number, data: Partial<Equipment>) => {
    setLoading(true);
    try {
      const updated = await equipmentApi.update(id, data);
      setEquipment((prev) =>
        prev.map((e) => e.id === id
          ? { ...updated, InStockQuantity: calcStock(updated) }
          : e
        )
      );
      toast('✅ Đã cập nhật: ' + updated.name);
      return updated;
    } catch {
      toast('❌ Lỗi khi cập nhật', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // ── Ghi nhận hỏng + Đền bù ─────────────────────────
  // ── Đồng bộ kho + phòng ──────────────────────────────
  const reportDamage = useCallback(async (form: DamageReportForm) => {
    setLoading(true);
    try {
      // 1. Tạo bản ghi Loss_And_Damages + BE tự đồng bộ kho + Room_Inventory
      const record = await lossApi.create({
        equipment_id    : form.equipment_id,
        quantity        : form.quantity,
        penalty_amount  : form.penalty_amount,
        description     : form.description,
        ImageUrl        : form.ImageUrl,
      });
      setDamages((prev) => [record, ...prev]);

      // 2. Cập nhật state Equipment phía FE (phản ánh DamagedQuantity mới)
      setEquipment((prev) =>
        prev.map((e) => {
          if (e.id !== form.equipment_id) return e;
          const newDamaged = e.damagedQuantity + form.quantity;
          return {
            ...e,
            damagedQuantity : newDamaged,
            inStockQuantity : e.totalQuantity - e.inUseQuantity - newDamaged - e.liquidatedQuantity,
            updatedAt       : new Date().toISOString().slice(0, 10),
          };
        })
      );

      toast('⚠️ Ghi nhận hỏng thành công – Kho đã đồng bộ', 'warning');
      return record;
    } catch {
      toast('❌ Lỗi khi ghi nhận hỏng', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // ── Hủy thao tác / Xác nhận ─────────────────────────
  const updateDamageStatus = useCallback(
    async (id: number, status: LossDamage['status']) => {
      try {
        await lossApi.updateStatus(id, status);

        // Cập nhật damages state
        setDamages((prev) =>
          prev.map((d) => (d.id === id ? { ...d, status } : d))
        );

        // Task 1 – Hủy: hoàn lại DamagedQuantity trong FE state
        if (status === 'cancelled') {
          const cancelled = damages.find((d) => d.id === id);
          if (cancelled) {
            setEquipment((prev) =>
              prev.map((e) => {
                if (e.id !== cancelled.equipment_id) return e;
                const newDamaged = Math.max(0, e.damagedQuantity - cancelled.quantity);
                return {
                  ...e,
                  damagedQuantity : newDamaged,
                  inStockQuantity : e.totalQuantity - e.inUseQuantity - newDamaged - e.liquidatedQuantity,
                };
              })
            );
          }
        }

        toast(
          status === 'confirmed' ? '✅ Đã xác nhận' : '✖ Đã huỷ – kho được hoàn lại',
          status === 'confirmed' ? 'success' : 'info'
        );
      } catch {
        toast('❌ Lỗi', 'error');
      }
    },
    [toast, damages]
  );

  // ── Import Excel ──────────────────────────────────────────────
  const importExcel = useCallback(async (rows: ExcelRow[]) => {
    setLoading(true);
    try {
      const result = await equipmentApi.importBatch(rows);
      // Reload để lấy dữ liệu mới nhất từ BE
      await loadAll(filter);
      toast(`✅ Import xong: ${result.imported} thêm mới`
        + (result.skipped.length ? `, ${result.skipped.length} bỏ qua (trùng mã)` : ''));
      return result;
    } catch {
      toast('❌ Lỗi khi nhập Excel', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast, loadAll, filter]);

  // ── Stats ─────────────────────────────────────────────────────────────
  const stats = {
    totalTypes : equipment.length,
    totalUnits : equipment.reduce((s, e) => s + e.totalQuantity, 0),
    inStock    : equipment.reduce((s, e) => s + e.inStockQuantity, 0),
    inUse      : equipment.reduce((s, e) => s + e.inUseQuantity, 0),
    damaged    : equipment.reduce((s, e) => s + e.damagedQuantity, 0),
    liquidated : equipment.reduce((s, e) => s + e.liquidatedQuantity, 0),
    totalValue : equipment.reduce((s, e) => s + e.basePrice * e.totalQuantity, 0),
    lowStockItems: equipment.filter(
      (e) => e.totalQuantity > 0 && e.inStockQuantity / e.totalQuantity < 0.2
    ),
  };

  return {
    // State
    equipment,
    damages,
    loading,
    toasts,
    stats,
    filter,

    // Actions
    loadAll,
    applyFilter,   // Search – gọi BE với search params
    clearFilter,
    addEquipment,
    updateEquipment,
    reportDamage,
    updateDamageStatus,
    importExcel,
    toast,
  };
}