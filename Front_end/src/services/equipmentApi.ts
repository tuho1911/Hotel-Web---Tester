import api from '../services/axiosInstance';
import type {
  Equipment,
  LossDamage,
  ExcelRow,
} from '../types/equipment.types';

// ── Categories (dùng cho dropdown, filter) ─────────────────────────────────
export const CATEGORIES = [
  'Vải vóc', 'Đồ giường', 'Điện tử', 'Tiện nghi',
  'Đồ dùng bếp', 'Vệ sinh', 'Nội thất', 'Khác',
];

// ── Helpers ────────────────────────────────────────────────────────────────
export const calcStock = (e: Partial<Equipment>) =>
  (e.totalQuantity || 0)
  - (e.inUseQuantity || 0)
  - (e.damagedQuantity || 0)
  - (e.liquidatedQuantity || 0);

export const fmtVND = (n: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);

export const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString('vi-VN');

// ── Equipment API ──────────────────────────────────────────────────────────
export const equipmentApi = {

  /**
   * Lấy danh sách + tìm kiếm
   * Interceptor tự đính Bearer token; nếu 401 → refresh → nếu fail → /login
   */
  getAll: async (params?: {
    search?: string;
    category?: string;
    isActive?: boolean;
  }): Promise<Equipment[]> => {
    const res = await api.get('/Equipments', { params });
    return res.data;
  },

  getById: async (id: number): Promise<Equipment> => {
    const res = await api.get(`/Equipments/${id}`);
    return res.data;
  },

  // Thêm vật tư
  create: async (data: Partial<Equipment>): Promise<Equipment> => {
    const res = await api.post('/Equipments', {
      itemCode          : data.itemCode,
      name              : data.name,
      category          : data.category,
      unit              : data.unit,
      totalQuantity     : data.totalQuantity,
      basePrice         : data.basePrice,
      defaultPriceIfLost: data.defaultPriceIfLost,
      supplier          : data.supplier,
      imageUrl          : data.imageUrl,
    });
    return res.data;
  },

  update: async (id: number, data: Partial<Equipment>): Promise<Equipment> => {
    const res = await api.put(`/Equipments/${id}`, {
      name              : data.name,
      category          : data.category,
      unit              : data.unit,
      totalQuantity     : data.totalQuantity,
      basePrice         : data.basePrice,
      defaultPriceIfLost: data.defaultPriceIfLost,
      supplier          : data.supplier,
      imageUrl          : data.imageUrl,
      isActive          : data.isActive,
    });
    return res.data;
  },

  /**
   * Đồng bộ kho + phòng sau khi ghi nhận hỏng
   * (gọi report-damage endpoint – BE tự tăng DamagedQuantity + sync Room_Inventory)
   */
  syncAfterDamage: async (
    equipmentId: number,
    damagedQty : number,
    opts?: { roomInventoryId?: number; bookingDetailId?: number }
  ): Promise<{
    message      : string;
    damageId     : number;
    penaltyAmount: number;
    newDamaged   : number;
    inStock      : number;
  }> => {
    const res = await api.post('/Equipments/report-damage', {
      equipmentId,
      quantity        : damagedQty,
      penaltyAmount   : 0,         // 0 → BE dùng DefaultPriceIfLost
      description     : null,
      roomInventoryId : opts?.roomInventoryId,
      bookingDetailId : opts?.bookingDetailId,
    });
    return res.data;
  },

  // Task 6: Import batch từ Excel
  importBatch: async (rows: ExcelRow[]): Promise<{ imported: number; skipped: string[] }> => {
    const payload = rows.map((r) => ({
      itemCode          : r.itemCode,
      name              : r.name,
      category          : r.category,
      unit              : r.unit,
      totalQuantity     : r.totalQuantity || 0,
      basePrice         : r.basePrice || 0,
      defaultPriceIfLost: r.defaultPriceIfLost || 0,
      supplier          : r.supplier,
      imageUrl          : null,
    }));
    const res = await api.post('/Equipments/import', payload);
    return res.data;
  },
};

// ── Loss & Damage API ──────────────────────────────────────────────────────
export const lossApi = {

  getAll: async (params?: {
    status?    : string;
    equipmentId?: number;
  }): Promise<LossDamage[]> => {
    const res = await api.get('/Equipments/damages', { params });
    return res.data;
  },

  /**
   * Ghi nhận hỏng/mất – Liên kết kho vật tư
   * Đền bù – penaltyAmount (nếu 0 → BE tự tính)
   */
  create: async (data: {
    equipment_id    : number;
    quantity        : number;
    penalty_amount  : number;
    description?    : string;
    ImageUrl?       : string;
    booking_detail_id?: number;
    room_inventory_id?: number;
  }): Promise<LossDamage> => {
    const res = await api.post('/Equipments/report-damage', {
      equipmentId    : data.equipment_id,
      quantity       : data.quantity,
      penaltyAmount  : data.penalty_amount,
      description    : data.description,
      imageUrl       : data.ImageUrl,
      bookingDetailId: data.booking_detail_id,
      roomInventoryId: data.room_inventory_id,
    });

    // BE trả về { damageId, ... } – map sang LossDamage shape
    return {
      id              : res.data.damageId,
      equipment_id    : data.equipment_id,
      quantity        : data.quantity,
      penalty_amount  : res.data.penaltyAmount,
      description     : data.description,
      created_at      : new Date().toISOString().slice(0, 10),
      status          : 'pending',
      ImageUrl        : data.ImageUrl,
    };
  },

  /**
   * Hủy thao tác / Xác nhận đồng bộ
   * status: "confirmed" | "cancelled"
   */
  updateStatus: async (id: number, status: LossDamage['status']): Promise<LossDamage> => {
    const res = await api.put(`/Equipments/damage/${id}/status`, { status });
    return res.data;
  },
};

// ── MOCK DATA (giữ lại để fallback dev nếu BE chưa sẵn sàng) ───────────────
// Có thể xóa khi deploy production

export const MOCK_EQUIPMENT: Equipment[] = [];
export const MOCK_DAMAGES: LossDamage[]  = [];
export const MOCK_ROOMS                  = [] as { id: number; room_number: string; floor: number; status: string; room_type_id: number }[];