import axiosClient from '../api/axiosClient';

export interface ArticleCategoryDto {
  id: number;
  name: string;
  description?: string;
  isActive?: boolean;
  articleCount?: number;
}

export interface ArticleListItemDto {
  id: number;
  title: string;
  slug: string;
  thumbnailUrl?: string | null;
  publishedAt: string;
  author: string;
  category: string;
  isActive?: boolean;
  attractionId?: number;
}

export interface ArticleDetailDto {
  id: number;
  title: string;
  slug: string;
  content: string;
  thumbnailUrl?: string | null;
  publishedAt: string;
  updatedAt?: string | null;
  author: string;
  category: {
    id: number;
    name: string;
  };
  isActive?: boolean;
  authorId?: number;
  attractionId?: number;
}

export const contentApi = {
  getCategories: async (): Promise<ArticleCategoryDto[]> =>
    (await axiosClient.get('/api/ArticleCategories')) as ArticleCategoryDto[],

  createCategory: async (dto: { name: string; description?: string; isActive?: boolean; }) =>
    axiosClient.post('/api/ArticleCategories', dto),

  updateCategory: async (id: number, dto: { name: string; description?: string; isActive?: boolean; }) =>
    axiosClient.put(`/api/ArticleCategories/${id}`, dto),

  deleteCategory: async (id: number) =>
    axiosClient.delete(`/api/ArticleCategories/${id}`),

  getArticles: async (params?: { categoryId?: number; page?: number }): Promise<ArticleListItemDto[]> =>
    (await axiosClient.get('/api/Articles', { params })) as ArticleListItemDto[],

  getArticleBySlug: async (slug: string): Promise<ArticleDetailDto> =>
    (await axiosClient.get(`/api/Articles/${slug}`)) as ArticleDetailDto,

  createArticle: async (dto: { title: string; content: string; categoryId: number; authorId?: number; attractionId?: number; publishedAt?: string; isActive?: boolean; }) =>
    axiosClient.post('/api/Articles', dto) as Promise<{ id: number; title: string; slug: string }>,

  updateArticle: async (id: number, dto: { title: string; content: string; categoryId: number; authorId?: number; attractionId?: number; publishedAt?: string; isActive?: boolean; }) =>
    axiosClient.put(`/api/Articles/${id}`, dto),

  deleteArticle: async (id: number) =>
    axiosClient.delete(`/api/Articles/${id}`),

  uploadThumbnail: async (id: number, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return axiosClient.post(`/api/Articles/${id}/thumbnail`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }) as Promise<{ message: string; thumbnailUrl: string }>;
  },
};

