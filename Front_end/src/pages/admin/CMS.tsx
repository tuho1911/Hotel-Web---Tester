import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { App, Button, Form, Input, Modal, Select, Table, Tabs, Tag, Upload, Switch, DatePicker } from 'antd';
import { Edit3, FileText, FolderTree, Image as ImageIcon, Plus, Trash2 } from 'lucide-react';
import type { ColumnsType } from 'antd/es/table';
import RichEditor from '../../components/common/RichEditor';
import { contentApi, type ArticleCategoryDto, type ArticleListItemDto } from '../../services/contentApi';
import { userApi, type UserResponseDto } from '../../services/userApi';
import { usePermission } from '../../hooks/useAppStore';
import { adminApi } from '../../services/adminApi';
import dayjs from 'dayjs';

const CMS: React.FC = () => {
  const { message } = App.useApp();
  const canManageContent = usePermission('MANAGE_CONTENT');
  const [articles, setArticles] = useState<ArticleListItemDto[]>([]);
  const [categories, setCategories] = useState<ArticleCategoryDto[]>([]);
  const [users, setUsers] = useState<UserResponseDto[]>([]);
  const [attractions, setAttractions] = useState<any[]>([]);
  const [loadingArticles, setLoadingArticles] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [articleModalOpen, setArticleModalOpen] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<ArticleListItemDto | null>(null);
  const [editingCategory, setEditingCategory] = useState<ArticleCategoryDto | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [articleForm] = Form.useForm();
  const [categoryForm] = Form.useForm();

  const loadCategories = async () => {
    setLoadingCategories(true);
    try {
      setCategories(await contentApi.getCategories());
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Không thể tải danh mục bài viết');
    } finally {
      setLoadingCategories(false);
    }
  };

  const loadArticles = async () => {
    setLoadingArticles(true);
    try {
      setArticles(await contentApi.getArticles());
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Không thể tải danh sách bài viết');
    } finally {
      setLoadingArticles(false);
    }
  };

  useEffect(() => {
    void Promise.all([
      loadArticles(), 
      loadCategories(), 
      userApi.getAll().then(setUsers),
      adminApi.getAttractions().then(data => setAttractions(data || []))
    ]);
  }, []);

  const articleStats = useMemo(
    () => ({
      total: articles.length,
      categories: categories.length,
      withThumbnail: articles.filter((item) => item.thumbnailUrl).length,
    }),
    [articles, categories],
  );

  const openCreateArticle = () => {
    setEditingArticle(null);
    setThumbnailFile(null);
    articleForm.resetFields();
    setArticleModalOpen(true);
  };

  const openEditArticle = async (record: ArticleListItemDto) => {
    try {
      const detail = await contentApi.getArticleBySlug(record.slug);
      setEditingArticle(record);
      setThumbnailFile(null);
      articleForm.setFieldsValue({
        title: detail.title,
        content: detail.content,
        categoryId: detail.category.id,
        authorId: detail.authorId,
        isActive: detail.isActive,
        attractionId: detail.attractionId,
        publishedAt: detail.publishedAt ? dayjs(detail.publishedAt) : undefined,
      });
      setArticleModalOpen(true);
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Không thể tải chi tiết bài viết');
    }
  };

  const submitArticle = async (values: any) => {
    try {
      const payload = {
        ...values,
        publishedAt: values.publishedAt ? values.publishedAt.toISOString() : undefined,
      };

      if (editingArticle) {
        await contentApi.updateArticle(editingArticle.id, payload);
        if (thumbnailFile) await contentApi.uploadThumbnail(editingArticle.id, thumbnailFile);
        message.success('Đã cập nhật bài viết');
      } else {
        const created = await contentApi.createArticle(payload);
        if (thumbnailFile) await contentApi.uploadThumbnail(created.id, thumbnailFile);
        message.success('Đã tạo bài viết mới');
      }

      setArticleModalOpen(false);
      setThumbnailFile(null);
      articleForm.resetFields();
      await loadArticles();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Không thể lưu bài viết');
    }
  };

  const removeArticle = async (record: ArticleListItemDto) => {
    try {
      await contentApi.deleteArticle(record.id);
      message.success('Đã xóa bài viết');
      await loadArticles();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Không thể xóa bài viết');
    }
  };

  const openCreateCategory = () => {
    setEditingCategory(null);
    categoryForm.resetFields();
    categoryForm.setFieldsValue({ isActive: true });
    setCategoryModalOpen(true);
  };

  const openEditCategory = (record: ArticleCategoryDto) => {
    setEditingCategory(record);
    categoryForm.setFieldsValue({ name: record.name, description: record.description, isActive: record.isActive });
    setCategoryModalOpen(true);
  };

  const submitCategory = async (values: any) => {
    try {
      if (editingCategory) {
        await contentApi.updateCategory(editingCategory.id, values);
        message.success('Đã cập nhật danh mục');
      } else {
        await contentApi.createCategory(values);
        message.success('Đã tạo danh mục');
      }

      setCategoryModalOpen(false);
      categoryForm.resetFields();
      await loadCategories();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Không thể lưu danh mục');
    }
  };

  const removeCategory = async (record: ArticleCategoryDto) => {
    try {
      await contentApi.deleteCategory(record.id);
      message.success('Đã vô hiệu hóa danh mục');
      await loadCategories();
      await loadArticles();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Không thể xóa danh mục');
    }
  };

  const articleColumns: ColumnsType<ArticleListItemDto> = [
    { title: 'Title', dataIndex: 'title', render: (value: string) => <span className="font-bold text-primary">{value}</span> },
    { title: 'Category', dataIndex: 'category' },
    { title: 'Author', dataIndex: 'author' },
    { title: 'Published', dataIndex: 'publishedAt', render: (value: string) => new Date(value).toLocaleDateString('vi-VN') },
    { title: 'Attraction', render: (_, record) => {
        const linkedAttr = attractions.find(a => a.id === record.attractionId);
        return linkedAttr ? <Tag color="purple">{linkedAttr.name}</Tag> : <span className="text-gray-400">-</span>;
    }},
    { title: 'Status', render: (_, record) => <Tag color={record.isActive === false ? 'default' : 'green'}>{record.isActive === false ? 'Draft' : (record.thumbnailUrl ? 'Published + image' : 'Published')}</Tag> },
    {
      title: 'Actions',
      render: (_, record) => (
        <div className="flex items-center gap-2">
          {canManageContent ? <Button type="text" icon={<Edit3 size={16} className="text-blue-500" />} onClick={() => openEditArticle(record)} /> : null}
          {canManageContent ? <Button type="text" icon={<Trash2 size={16} className="text-red-500" />} onClick={() => removeArticle(record)} /> : null}
        </div>
      ),
    },
  ];

  const categoryColumns: ColumnsType<ArticleCategoryDto> = [
    { title: 'Category', dataIndex: 'name', render: (value: string) => <span className="font-bold text-title">{value}</span> },
    { title: 'Status', dataIndex: 'isActive', render: (value?: boolean) => <Tag color={value === false ? 'default' : 'green'}>{value === false ? 'Inactive' : 'Active'}</Tag> },
    { title: 'Articles', dataIndex: 'articleCount', render: (value?: number) => <Tag color="blue">{value || 0}</Tag> },
    {
      title: 'Actions',
      render: (_, record) => (
        <div className="flex items-center gap-2">
          {canManageContent ? <Button type="text" icon={<Edit3 size={16} className="text-blue-500" />} onClick={() => openEditCategory(record)} /> : null}
          {canManageContent ? <Button type="text" icon={<Trash2 size={16} className="text-red-500" />} onClick={() => removeCategory(record)} /> : null}
        </div>
      ),
    },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-10 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl text-title">Content Management</h1>
          <p className="text-muted mt-1">Quản lý bài viết và danh mục bài viết từ backend hiện có</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {canManageContent ? (
          <Button icon={<FolderTree size={16} />} onClick={openCreateCategory} className="h-12 rounded-xl">New Category</Button>
          ) : null}
          {canManageContent ? (
          <Button type="primary" icon={<Plus size={16} />} onClick={openCreateArticle} className="btn-gold h-12">New Article</Button>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="admin-card"><p className="text-xs font-bold uppercase tracking-widest text-muted">Articles</p><p className="text-3xl font-bold text-title mt-2">{articleStats.total}</p></div>
        <div className="admin-card"><p className="text-xs font-bold uppercase tracking-widest text-muted">Categories</p><p className="text-3xl font-bold text-title mt-2">{articleStats.categories}</p></div>
        <div className="admin-card"><p className="text-xs font-bold uppercase tracking-widest text-muted">With Thumbnail</p><p className="text-3xl font-bold text-title mt-2">{articleStats.withThumbnail}</p></div>
      </div>

      <div className="admin-card !p-0 overflow-hidden">
        <Tabs
          defaultActiveKey="articles"
          items={[
            {
              key: 'articles',
              label: <span className="flex items-center gap-2"><FileText size={16} />Articles</span>,
              children: <Table rowKey="id" columns={articleColumns} dataSource={articles} loading={loadingArticles} className="custom-table" />,
            },
            {
              key: 'categories',
              label: <span className="flex items-center gap-2"><FolderTree size={16} />Categories</span>,
              children: <Table rowKey="id" columns={categoryColumns} dataSource={categories} loading={loadingCategories} className="custom-table" />,
            },
          ]}
        />
      </div>

      <Modal
        title={<span className="text-title font-display text-lg font-bold">{editingArticle ? 'Cập nhật bài viết' : 'Tạo bài viết mới'}</span>}
        open={articleModalOpen}
        onCancel={() => setArticleModalOpen(false)}
        footer={null}
        width={840}
      >
        <Form form={articleForm} layout="vertical" onFinish={submitArticle} className="mt-6">
          <Form.Item name="title" label="Title" rules={[{ required: true, message: 'Nhap tieu de bai viet' }]}><Input className="h-12 rounded-xl" /></Form.Item>
          
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="categoryId" label="Category" rules={[{ required: true, message: 'Chon danh muc' }]}><Select className="h-12" options={categories.map((category) => ({ value: category.id, label: category.name }))} /></Form.Item>
            <Form.Item name="authorId" label="Author"><Select className="h-12" allowClear placeholder="Chon tac gia (mac dinh User hien tai)" options={users.map((u) => ({ value: u.id, label: u.fullName }))} /></Form.Item>
          </div>

          <Form.Item name="attractionId" label="Gắn với Địa điểm / Điểm tham quan (Tùy chọn)">
            <Select 
              className="h-12" 
              allowClear 
              placeholder="Chọn điểm tham quan liên quan đến bài viết này" 
              options={attractions.map((a) => ({ value: a.id, label: a.name }))} 
            />
          </Form.Item>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="publishedAt" label="Published Date"><DatePicker className="h-12 w-full" format="YYYY-MM-DD HH:mm:ss" showTime /></Form.Item>
            <Form.Item name="isActive" label="Status" valuePropName="checked" initialValue={true}><Switch checkedChildren="Published" unCheckedChildren="Draft" /></Form.Item>
          </div>

          <Form.Item name="content" label="Nội dung bài viết" rules={[{ required: true, message: 'Nhập nội dung bài viết' }]}>
            <RichEditor placeholder="Viết nội dung bài viết ở đây..." minHeight={350} />
          </Form.Item>
          <Form.Item label="Thumbnail">
            <Upload.Dragger beforeUpload={(file) => { setThumbnailFile(file); return false; }} maxCount={1} accept="image/*">
              <p className="ant-upload-drag-icon"><ImageIcon size={36} className="mx-auto text-primary" /></p>
              <p className="font-bold text-title">Click or drag image here</p>
              <p className="text-muted text-sm">Optional cover image for article thumbnail</p>
            </Upload.Dragger>
          </Form.Item>
          <div className="flex justify-end gap-3">
            <Button onClick={() => setArticleModalOpen(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit" className="btn-gold">{editingArticle ? 'Save Changes' : 'Publish Article'}</Button>
          </div>
        </Form>
      </Modal>

      <Modal
        title={<span className="text-title font-display text-lg font-bold">{editingCategory ? 'Cập nhật danh mục' : 'Tạo danh mục mới'}</span>}
        open={categoryModalOpen}
        onCancel={() => setCategoryModalOpen(false)}
        footer={null}
      >
        <Form form={categoryForm} layout="vertical" onFinish={submitCategory} className="mt-6">
          <Form.Item name="name" label="Category Name" rules={[{ required: true, message: 'Nhap ten danh muc' }]}><Input className="h-12 rounded-xl" /></Form.Item>
          <Form.Item name="description" label="Description"><Input.TextArea rows={4} className="rounded-xl" /></Form.Item>
          <Form.Item name="isActive" label="Status" valuePropName="checked"><Switch checkedChildren="Active" unCheckedChildren="Inactive" /></Form.Item>
          <div className="flex justify-end gap-3">
            <Button onClick={() => setCategoryModalOpen(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit" className="btn-gold">{editingCategory ? 'Save' : 'Create'}</Button>
          </div>
        </Form>
      </Modal>
    </motion.div>
  );
};

export default CMS;
