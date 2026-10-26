import axiosClient from '../api/axiosClient';

export type VoucherDiscountType = 'Percentage' | 'Fixed';

export interface VoucherResponseDto {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  discountType: VoucherDiscountType;
  discountValue: number;
  minBookingAmount: number;
  maxDiscountAmount?: number | null;
  startDate: string;
  endDate: string;
  usageLimit?: number | null;
  eligibleMembershipId?: number | null;
  eligibleMemberOnly: boolean;
  usageCount: number;
  isActive: boolean;
  isCurrentlyValid: boolean;
  estimatedDiscountAmount?: number | null;
}

export interface UpsertVoucherDto {
  code: string;
  name: string;
  description?: string | null;
  discountType: VoucherDiscountType;
  discountValue: number;
  minBookingAmount: number;
  maxDiscountAmount?: number | null;
  startDate: string;
  endDate: string;
  usageLimit?: number | null;
  eligibleMembershipId?: number | null;
  eligibleMemberOnly: boolean;
  isActive: boolean;
}

export const voucherApi = {
  getAll: async (): Promise<VoucherResponseDto[]> =>
    (await axiosClient.get('/api/Vouchers')) as unknown as VoucherResponseDto[],

  getPublic: async (bookingAmount?: number): Promise<VoucherResponseDto[]> =>
    (await axiosClient.get('/api/Vouchers/public', {
      params: bookingAmount !== undefined ? { bookingAmount } : undefined,
    })) as unknown as VoucherResponseDto[],

  getVip: async (membershipId: number, bookingAmount?: number): Promise<VoucherResponseDto[]> =>
    (await axiosClient.get('/api/Vouchers/vip', {
      params: {
        membershipId,
        ...(bookingAmount !== undefined ? { bookingAmount } : {}),
      },
    })) as unknown as VoucherResponseDto[],

  create: async (dto: UpsertVoucherDto): Promise<VoucherResponseDto> =>
    (await axiosClient.post('/api/Vouchers', dto)) as unknown as VoucherResponseDto,

  update: async (id: number, dto: UpsertVoucherDto): Promise<VoucherResponseDto> =>
    (await axiosClient.put(`/api/Vouchers/${id}`, dto)) as unknown as VoucherResponseDto,

  remove: async (id: number): Promise<void> => {
    await axiosClient.delete(`/api/Vouchers/${id}`);
  },

  validate: async (id: number, bookingAmount: number): Promise<VoucherResponseDto> =>
    (await axiosClient.get(`/api/Vouchers/${id}/validate?bookingAmount=${bookingAmount}`)) as unknown as VoucherResponseDto,
};
