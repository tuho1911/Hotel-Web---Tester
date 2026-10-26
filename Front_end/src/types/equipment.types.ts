export interface Equipment {
  id: number;
  itemCode: string;
  name: string;
  category: string;
  unit: string;
  totalQuantity: number;
  inUseQuantity: number;
  damagedQuantity: number;
  liquidatedQuantity: number;
  inStockQuantity: number;
  basePrice: number;
  defaultPriceIfLost: number;
  supplier?: string | null;
  imageUrl?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string | null;
}

export interface LossDamage {
  id: number;
  equipment_id: number;
  quantity: number;
  penalty_amount: number;
  description?: string | null;
  ImageUrl?: string | null;
  status: 'pending' | 'confirmed' | 'cancelled';
  booking_detail_id?: number | null;
  room_inventory_id?: number | null;
  created_at: string;
}

export interface DamageReportForm {
  equipment_id: number;
  quantity: number;
  penalty_amount: number;
  description?: string;
  ImageUrl?: string;
  booking_detail_id?: number;
  room_inventory_id?: number;
}

export interface ExcelRow {
  itemCode: string;
  name: string;
  category: string;
  unit: string;
  totalQuantity?: number;
  basePrice?: number;
  defaultPriceIfLost?: number;
  supplier?: string;
}
