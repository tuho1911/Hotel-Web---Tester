import { useState, useCallback, useEffect } from 'react';
import type {
  Equipment,
  LossDamage,
  DamageReportForm,
  ExcelRow,
} from '../types/equipment.types';
import { equipmentApi, lossApi, calcStock } from '../services/equipmentApi';

export type Toast = {
  id  : number;
  msg : string;
  type: 'success' | 'error' | 'info' | 'warning';
};

export interface EquipmentFilter {
  search?  : string;
  category?: string;
  isActive?: boolean;
}

// ✅ FIX: Normalize response từ backend (có thể trả về PascalCase hoặc camelCase)
// Backend C# với System.Text.Json mặc định trả về camelCase nếu cấu hình đúng,
// nhưng nếu không cấu hình thì trả về PascalCase.
// Hàm này đảm bảo frontend luôn nhận được camelCase chuẩn.
function normalizeEquipment(raw: Record<string, unknown>): Equipment {
  return {
    id:                   (raw['id']                   ?? raw['Id']                   ?? 0)          as number,
    itemCode:             (raw['itemCode']             ?? raw['ItemCode']             ?? '')          as string,
    name:                 (raw['name']                 ?? raw['Name']                 ?? '')          as string,
    category:             (raw['category']             ?? raw['Category']             ?? '')          as string,
    unit:                 (raw['unit']                 ?? raw['Unit']                 ?? '')          as string,
    totalQuantity:        (raw['totalQuantity']        ?? raw['TotalQuantity']        ?? 0)           as number,
    inUseQuantity:        (raw['inUseQuantity']        ?? raw['InUseQuantity']        ?? 0)           as number,
    damagedQuantity:      (raw['damagedQuantity']      ?? raw['DamagedQuantity']      ?? 0)           as number,
    liquidatedQuantity:   (raw['liquidatedQuantity']   ?? raw['LiquidatedQuantity']   ?? 0)           as number,
    inStockQuantity:      (raw['inStockQuantity']      ?? raw['InStockQuantity']      ?? 0)           as number,
    basePrice:            (raw['basePrice']            ?? raw['BasePrice']            ?? 0)           as number,
    defaultPriceIfLost:   (raw['defaultPriceIfLost']   ?? raw['DefaultPriceIfLost']   ?? 0)           as number,
    supplier:             (raw['supplier']             ?? raw['Supplier']             ?? null)        as string | null,
    imageUrl:             (raw['imageUrl']             ?? raw['ImageUrl']             ?? null)        as string | null,
    isActive:             (raw['isActive']             ?? raw['IsActive']             ?? true)        as boolean,
    createdAt:            (raw['createdAt']            ?? raw['CreatedAt']            ?? '')          as string,
    updatedAt:            (raw['updatedAt']            ?? raw['UpdatedAt']            ?? null)        as string | null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────

export function useEquipmentStore() {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [damages,   setDamages]   = useState<LossDamage[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [toasts,    setToasts]    = useState<Toast[]>([]);
  const [filter,    setFilter]    = useState<EquipmentFilter>({});

  // ── Toast ──────────────────────────────────────────────────────────────────
  const toast = useCallback((msg: string, type: Toast['type'] = 'success') => {
    const id = Date.now();
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);

  // ── Load data ──────────────────────────────────────────────────────────────
  const loadAll = useCallback(async (params?: EquipmentFilter) => {
    setLoading(true);
    try {
      const [rawEqs, dmgs] = await Promise.all([
        equipmentApi.getAll(params),
        lossApi.getAll(),
      ]);

      // ✅ FIX: Normalize từng item để đảm bảo camelCase nhất quán
      const eqs = (rawEqs as unknown as Record<string, unknown>[]).map(normalizeEquipment);

      // ✅ FIX: Tính lại inStockQuantity từ các trường khác (phòng trường hợp BE không trả về)
      const eqsWithStock = eqs.map((e) => ({
        ...e,
        inStockQuantity: e.inStockQuantity > 0
          ? e.inStockQuantity
          : calcStock(e),
      }));

      setEquipment(eqsWithStock);
      setDamages(dmgs);
    } catch (err: unknown) {
      const status = (err as { response?: { status: number } })?.response?.status;
      if (status !== 401 && status !== 403) {
        toast('❌ Không thể tải dữ liệu vật tư', 'error');
        console.error('[useEquipmentStore] loadAll error:', err);
      }
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ── Search ─────────────────────────────────────────────────────────────────
  const applyFilter = useCallback((newFilter: EquipmentFilter) => {
    setFilter(newFilter);
    loadAll(newFilter);
  }, [loadAll]);

  const clearFilter = useCallback(() => {
    setFilter({});
    loadAll({});
  }, [loadAll]);

  // ── CRUD Equipment ─────────────────────────────────────────────────────────
  const addEquipment = useCallback(async (data: Partial<Equipment>) => {
    setLoading(true);
    try {
      const raw = await equipmentApi.create(data);
      const created = normalizeEquipment(raw as unknown as Record<string, unknown>);
      setEquipment((prev) => [...prev, { ...created, inStockQuantity: calcStock(created) }]);
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
      const raw = await equipmentApi.update(id, data);
      const updated = normalizeEquipment(raw as unknown as Record<string, unknown>);
      setEquipment((prev) =>
        prev.map((e) => e.id === id
          ? { ...updated, inStockQuantity: calcStock(updated) }
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

  // ── Ghi nhận hỏng ──────────────────────────────────────────────────────────
  const reportDamage = useCallback(async (form: DamageReportForm) => {
    setLoading(true);
    try {
      const record = await lossApi.create({
        equipment_id   : form.equipment_id,
        quantity       : form.quantity,
        penalty_amount : form.penalty_amount,
        description    : form.description,
        ImageUrl       : form.ImageUrl,
      });
      setDamages((prev) => [record, ...prev]);

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

  // ── Huỷ / Xác nhận ─────────────────────────────────────────────────────────
  const updateDamageStatus = useCallback(
    async (id: number, status: LossDamage['status']) => {
      try {
        await lossApi.updateStatus(id, status);

        setDamages((prev) =>
          prev.map((d) => (d.id === id ? { ...d, status } : d))
        );

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

  // ── Import Excel ───────────────────────────────────────────────────────────
  const importExcel = useCallback(async (rows: ExcelRow[]) => {
    setLoading(true);
    try {
      const result = await equipmentApi.importBatch(rows);
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

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = {
    totalTypes   : equipment.length,
    totalUnits   : equipment.reduce((s, e) => s + e.totalQuantity,      0),
    inStock      : equipment.reduce((s, e) => s + e.inStockQuantity,    0),
    inUse        : equipment.reduce((s, e) => s + e.inUseQuantity,      0),
    damaged      : equipment.reduce((s, e) => s + e.damagedQuantity,    0),
    liquidated   : equipment.reduce((s, e) => s + e.liquidatedQuantity, 0),
    totalValue   : equipment.reduce((s, e) => s + e.basePrice * e.totalQuantity, 0),
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
    applyFilter,
    clearFilter,
    addEquipment,
    updateEquipment,
    reportDamage,
    updateDamageStatus,
    importExcel,
    toast,
  };
}