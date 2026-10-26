import axiosClient from '../api/axiosClient';

export interface ReviewDto {
  id: number;
  targetType: string;
  targetId: number;
  authorName: string;
  rating: number;
  comment?: string;
  isApproved: boolean;
  createdAt: string;
}

export interface ReviewResponse {
  averageRating: number;
  totalReviews: number;
  reviews: ReviewDto[];
}

export const reviewApi = {
  getReviews: async (targetType: string, targetId: number): Promise<ReviewResponse> =>
    (await axiosClient.get(`/api/Reviews/${targetType}/${targetId}`)) as any,

  createReview: async (dto: { targetType: string; targetId: number; rating: number; comment?: string; guestName?: string }) =>
    axiosClient.post('/api/Reviews', dto),

  // Admin
  getAllForAdmin: async (isApproved?: boolean): Promise<ReviewDto[]> =>
    (await axiosClient.get('/api/Reviews/admin', { params: { isApproved } })) as any,

  approveReview: async (id: number) =>
    axiosClient.put(`/api/Reviews/admin/${id}/approve`),

  deleteReview: async (id: number) =>
    axiosClient.delete(`/api/Reviews/admin/${id}`)
};
