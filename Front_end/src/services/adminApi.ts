import axiosClient from '../api/axiosClient';

export interface RoomTypeImage {
  id: number;
  imageUrl: string;
  isPrimary?: boolean | null;
  isActive?: boolean | null;
}

export interface AmenityDto {
  id: number;
  name: string;
  iconUrl?: string | null;
}

export interface RoomTypeDto {
  id: number;
  name: string;
  description?: string | null;
  basePrice: number;
  capacityAdults: number;
  capacityChildren: number;
  sizeSqm?: number | null;
  bedType?: string | null;
  viewType?: string | null;
  isActive: boolean;
  slug?: string | null;
  content?: string | null;
  images?: RoomTypeImage[] | null;
  amenities?: AmenityDto[] | null;
}

export interface RoomDto {
  id: number;
  roomNumber: string;
  roomTypeName: string;
  roomTypeId: number;
  status: string;
  cleaningStatus?: string | null;
  isActive: boolean;
  floor?: number | null;
  extensionNumber?: string | null;
}

export interface RoomInventoryDto {
  id: number;
  roomId?: number | null;
  roomNumber?: string | null;
  equipmentId: number;
  equipmentName?: string | null;
  quantity?: number | null;
  priceIfLost?: number | null;
  note?: string | null;
  isActive?: boolean | null;
  itemType?: string | null;
}

export interface EquipmentDto {
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
  createdAt?: string;
  updatedAt?: string | null;
}

export interface EquipmentStats {
  overall: {
    total: number;
    inUse: number;
    damaged: number;
    inStock: number;
  };
  byCategory: Array<{
    category: string;
    totalItems: number;
    totalQuantity: number;
    inUseQuantity: number;
    damagedQuantity: number;
    inStockQuantity: number;
  }>;
}

export interface DamageDto {
  id: number;
  equipmentId: number;
  equipmentName?: string | null;
  equipmentCode?: string | null;
  quantity: number;
  penaltyAmount: number;
  description?: string | null;
  imageUrl?: string | null;
  status: 'pending' | 'confirmed' | 'cancelled' | string;
  bookingDetailId?: number | null;
  roomInventoryId?: number | null;
  roomNumber?: string | null;
  createdAt?: string | null;
}

export interface NotificationDto {
  id: number;
  title: string;
  content: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

export interface AttractionDto {
  id: number;
  name: string;
  category?: string | null;
  address?: string | null;
  distanceKm?: number | null;
  description?: string | null;
  mapEmbedLink?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  imageUrl?: string | null;
  isActive: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface PieChartDataDto {
  name: string;
  value: number;
}

export interface DashboardAnalyticsDto {
  totalRevenue: number;
  roomRevenue: number;
  serviceRevenue: number;
  totalBookings: number;
  occupancyRate: number;
  revPAR: number;
  adr: number;
  revenueChart30Days: Array<{ date: string; revenue: number }>;
  revenueByRoomType: PieChartDataDto[];
  serviceUsage: PieChartDataDto[];
  bookingStatusDistribution: PieChartDataDto[];
}

export type DashboardPeriodType = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';

export interface DashboardMetricComparison {
  current: number;
  previous: number;
  difference: number;
  growthRate?: number | null;
  trend: 'up' | 'down' | 'stable';
  directionMeaning: 'positive' | 'negative' | 'neutral' | string;
}

export interface DashboardPeriodResponse {
  id: number;
  roleId: number;
  roleName: string;
  dashboardCode: string;
  dashboardTitle: string;
  periodType: string;
  periodKey: string;
  periodStart: string;
  periodEnd: string;
  status: string;
  isCurrent: boolean;
  version: number;
  updatedAt: string;
  dashboard?: any;
  comparison?: {
    base?: {
      comparisonType?: string;
      currentPeriodKey?: string;
    };
    metrics?: Record<string, DashboardMetricComparison>;
  };
}

export const adminApi = {
  getDashboardSummary: async () => {
    const [rooms, stockSummary, notifications] = await Promise.all([
      axiosClient.get('/api/Rooms'),
      axiosClient.get('/api/Equipments/stock-summary'),
      axiosClient.get('/api/Notifications'),
    ]);

    return {
      rooms: rooms as unknown as RoomDto[],
      stockSummary: stockSummary as unknown as EquipmentStats,
      notifications: notifications as unknown as NotificationDto[],
    };
  },

  getDashboardAnalytics: async () => {
    return (await axiosClient.get('/api/Dashboard/analytics')) as DashboardAnalyticsDto;
  },

  getCurrentDashboardPeriod: async (params: { roleName?: string; periodType: DashboardPeriodType }) => {
    const query = new URLSearchParams({ periodType: params.periodType });
    if (params.roleName) {
      query.set('roleName', params.roleName);
    }
    return (await axiosClient.get(`/api/dashboard-periods/current?${query.toString()}`)) as DashboardPeriodResponse;
  },

  getDashboardHistory: async (params: {
    roleName: string;
    periodType: DashboardPeriodType;
    take?: number;
  }) => {
    const query = new URLSearchParams({ take: String(params.take ?? 12) });
    return (await axiosClient.get(
      `/api/dashboard-periods/${encodeURIComponent(params.roleName)}/${params.periodType}/history?${query.toString()}`
    )) as Array<{
      id: number;
      roleName: string;
      dashboardCode: string;
      periodType: string;
      periodKey: string;
      periodStart: string;
      periodEnd: string;
      status: string;
      isCurrent: boolean;
      updatedAt: string;
    }>;
  },

  refreshDashboardPeriod: async (
    dashboardCode: string,
    payload: { roleId?: number; roleName?: string; periodType: DashboardPeriodType; periodKey?: string }
  ) => axiosClient.post(`/api/dashboards/${dashboardCode}/refresh`, payload),

  getAuditLogs: async (params?: { actionType?: string; entityType?: string; from?: string; to?: string; search?: string; userName?: string; page?: number; pageSize?: number }) =>
    (await axiosClient.get('/api/AuditLogs', { params })) as { TotalEvents: number; Events: any[] },

  exportAuditLogs: async (params?: { actionType?: string; entityType?: string; from?: string; to?: string; search?: string }) =>
    (await axiosClient.get('/api/AuditLogs/export', { params })) as any,

  cleanupAuditLogs: async (keepDays = 90) => axiosClient.post(`/api/AuditLogs/cleanup?keepDays=${keepDays}`, {}),

  getRooms: async (params?: { roomTypeId?: number; floor?: number; roomNumber?: string }) =>
    (await axiosClient.get('/api/Rooms', { params })) as RoomDto[],

  createRoom: async (dto: {
    roomNumber: string;
    roomTypeId: number;
    status: string;
    floor?: number;
    cleaningStatus?: string;
    extensionNumber?: string;
  }) => axiosClient.post('/api/Rooms', dto),

  updateRoom: async (
    id: number,
    dto: {
      roomNumber: string;
      roomTypeId: number;
      status: string;
      isActive: boolean;
      floor?: number;
      cleaningStatus?: string;
      extensionNumber?: string;
    }
  ) => axiosClient.put(`/api/Rooms/${id}`, dto),

  updateRoomCleaningStatus: async (
    id: number,
    dto: {
      status: string;
      cleaningStatus?: string;
    }
  ) => axiosClient.patch(`/api/Rooms/${id}/cleaning-status`, dto),

  deleteRoom: async (id: number) => axiosClient.delete(`/api/Rooms/${id}`),

  bulkCreateRooms: async (dto: {
    roomTypeId: number;
    floor: number;
    startNumber: number;
    count: number;
    templateRoomId?: number;
  }) => axiosClient.post('/api/Rooms/bulk-create', dto),

  cloneRoomItems: async (targetRoomId: number, templateRoomId: number) =>
    axiosClient.post(`/api/Rooms/${targetRoomId}/clone-items`, { templateRoomId }),

  syncRoomItems: async (templateRoomId: number) =>
    axiosClient.post(`/api/Rooms/${templateRoomId}/sync-items`, {}),

  getRoomTypes: async () => (await axiosClient.get('/api/RoomTypes')) as RoomTypeDto[],

  createRoomType: async (dto: {
    name: string;
    description?: string;
    basePrice: number;
    capacityAdults: number;
    capacityChildren: number;
    sizeSqm?: number;
    bedType?: string;
    viewType?: string;
    slug?: string;
    content?: string;
  }) => axiosClient.post('/api/RoomTypes', dto),

  updateRoomType: async (
    id: number,
    dto: {
      name: string;
      description?: string;
      basePrice: number;
      capacityAdults: number;
      capacityChildren: number;
      isActive: boolean;
      sizeSqm?: number;
      bedType?: string;
      viewType?: string;
      slug?: string;
      content?: string;
    }
  ) => axiosClient.put(`/api/RoomTypes/${id}`, dto),

  deleteRoomType: async (id: number) => axiosClient.delete(`/api/RoomTypes/${id}`),

  uploadRoomTypeImage: async (roomTypeId: number, file: File, isPrimary = false) => {
    const formData = new FormData();
    formData.append('file', file);
    return axiosClient.post(`/api/RoomTypes/${roomTypeId}/images?isPrimary=${isPrimary}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  deleteRoomTypeImage: async (imageId: number) => axiosClient.delete(`/api/RoomTypes/images/${imageId}`),

  setPrimaryRoomTypeImage: async (imageId: number) =>
    axiosClient.patch(`/api/RoomTypes/images/${imageId}/set-primary`, {}),

  getRoomInventory: async (roomId: number) =>
    (await axiosClient.get(`/api/Inventory/room/${roomId}`)) as RoomInventoryDto[],

  syncRoomInventory: async (dto: {
    roomId: number;
    equipmentId: number;
    quantity: number;
    priceIfLost?: number;
    note?: string;
    isActive?: boolean;
    itemType?: string;
  }) => axiosClient.post('/api/Inventory/sync', dto),

  updateRoomInventory: async (
    id: number,
    dto: { quantity?: number; priceIfLost?: number; note?: string; isActive?: boolean }
  ) => axiosClient.put(`/api/Inventory/${id}`, dto),

  deleteRoomInventory: async (id: number) => axiosClient.delete(`/api/Inventory/${id}`),

  getEquipments: async (params?: { search?: string; includeInactive?: boolean }) =>
    (await axiosClient.get('/api/Equipments', { params })) as EquipmentDto[],

  createEquipment: async (dto: {
    itemCode: string;
    name: string;
    category: string;
    unit: string;
    totalQuantity: number;
    basePrice: number;
    defaultPriceIfLost: number;
    supplier?: string;
  }) => axiosClient.post('/api/Equipments', dto),

  updateEquipment: async (
    id: number,
    dto: { name: string; category: string; unit: string; totalQuantity: number; supplier?: string }
  ) => axiosClient.put(`/api/Equipments/${id}`, dto),

  deleteEquipment: async (id: number) => axiosClient.delete(`/api/Equipments/${id}`),

  restoreEquipment: async (id: number) => axiosClient.post(`/api/Equipments/${id}/restore`, {}),

  updateEquipmentPrice: async (id: number, dto: { basePrice: number; defaultPriceIfLost: number }) =>
    axiosClient.put(`/api/Equipments/${id}/price`, dto),

  getEquipmentCompensation: async (id: number) =>
    axiosClient.get(`/api/Equipments/${id}/compensation`) as Promise<{
      id: number;
      name: string;
      basePrice: number;
      defaultPriceIfLost: number;
      suggestedCompensation: number;
    }>,

  updateEquipmentCompensation: async (id: number, defaultPriceIfLost: number) =>
    axiosClient.put(`/api/Equipments/${id}/compensation`, { defaultPriceIfLost }),

  getEquipmentStats: async () => (await axiosClient.get('/api/Equipments/stock-summary')) as EquipmentStats,

  importEquipmentExcel: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return axiosClient.post('/api/Equipments/import-excel', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  downloadEquipmentImportTemplate: async () =>
    axiosClient.get('/api/Equipments/import-template', {
      responseType: 'blob',
    }),

  exportEquipmentExcel: async (params?: { search?: string; includeInactive?: boolean }) =>
    axiosClient.get('/api/Equipments/export', {
      params,
      responseType: 'blob',
    }),

  reportDamage: async (dto: {
    equipmentId: number;
    quantity: number;
    penaltyAmount: number;
    description?: string;
    imageUrl?: string;
    bookingDetailId?: number;
    roomInventoryId?: number;
  }) => axiosClient.post('/api/Equipments/report-damage', dto),

  getDamages: async (params?: { status?: string; equipmentId?: number }) =>
    (await axiosClient.get('/api/Equipments/damages', { params })) as DamageDto[],

  createLossDamage: async (dto: {
    bookingDetailId?: number;
    roomInventoryId?: number;
    quantity: number;
    penaltyAmount: number;
    description?: string;
    imageUrl?: string;
  }) => axiosClient.post('/api/LossAndDamages', dto),

  getLossDamagesByBookingDetail: async (bookingDetailId: number) =>
    (await axiosClient.get('/api/LossAndDamages', { params: { bookingDetailId } })) as any[],

  updateDamageStatus: async (id: number, status: 'confirmed' | 'cancelled') =>
    axiosClient.put(`/api/Equipments/damage/${id}/status`, { status }),

  getOrderServicesByBookingId: async (bookingId: number) =>
    (await axiosClient.get(`/api/OrderServices/booking/${bookingId}`)) as any[],

  uploadEquipmentImage: async (equipmentId: number, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return axiosClient.post(`/api/Equipments/${equipmentId}/image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  uploadDamageImage: async (damageId: number, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return axiosClient.post(`/api/Equipments/damage/${damageId}/image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  getAttractions: async () => (await axiosClient.get('/api/Attractions')) as AttractionDto[],

  getAttractionById: async (id: number) => (await axiosClient.get(`/api/Attractions/${id}`)) as AttractionDto,

  createAttraction: async (dto: {
    name: string;
    category?: string;
    address?: string;
    distanceKm?: number;
    description?: string;
    mapEmbedLink?: string;
    latitude?: number;
    longitude?: number;
    imageUrl?: string;
  }) => axiosClient.post('/api/Attractions', dto),

  updateAttraction: async (
    id: number,
    dto: {
      name: string;
      category?: string;
      address?: string;
      distanceKm?: number;
      description?: string;
      mapEmbedLink?: string;
      latitude?: number;
      longitude?: number;
      imageUrl?: string;
      isActive: boolean;
    }
  ) => axiosClient.put(`/api/Attractions/${id}`, dto),

  deleteAttraction: async (id: number) => axiosClient.delete(`/api/Attractions/${id}`),

  uploadAttractionImage: async (attractionId: number, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return axiosClient.post(`/api/Attractions/${attractionId}/image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }) as Promise<{ message: string; imageUrl: string }>;
  },

  getServices: async () => (await axiosClient.get('/api/Services')) as any[],

  reportMinibar: async (roomId: number, items: { serviceId: number; quantity: number }[]) =>
    axiosClient.post(`/api/OrderServices/room/${roomId}/minibar`, items),

  getSystemSettings: async () => (await axiosClient.get('/api/SystemSettings')) as any[],

  updateSystemSettings: async (settings: any[]) => axiosClient.put('/api/SystemSettings', settings),

  getUsers: async () => (await axiosClient.get('/api/UserManagement')) as any[],

  getContactMessages: async () => (await axiosClient.get('/api/Contact')) as ContactMessageDto[],

  replyContactMessage: async (id: number, replyContent: string) =>
    axiosClient.post(`/api/Contact/${id}/reply`, JSON.stringify(replyContent), {
      headers: { 'Content-Type': 'application/json' },
    }),

  markContactAsRead: async (id: number) => axiosClient.patch(`/api/Contact/${id}/read`),
};

export interface ContactMessageDto {
  id: number;
  fullName: string;
  email: string;
  subject: string;
  message: string;
  createdAt: string;
  isRead: boolean;
  replyMessage?: string | null;
  repliedAt?: string | null;
}
