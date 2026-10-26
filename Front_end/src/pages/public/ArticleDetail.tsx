import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { App, Spin } from 'antd';
import { Calendar, User, ChevronLeft, MapPin } from 'lucide-react';
import { contentApi, type ArticleDetailDto } from '../../services/contentApi';
import { adminApi, type AttractionDto } from '../../services/adminApi';
import ReviewSection from '../../components/common/ReviewSection';

const ArticleDetail: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { message } = App.useApp();
  const [article, setArticle] = useState<ArticleDetailDto | null>(null);
  const [attraction, setAttraction] = useState<AttractionDto | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    
    const fetchArticle = async () => {
      setLoading(true);
      try {
        const data = await contentApi.getArticleBySlug(slug);
        setArticle(data);
        if (data.attractionId) {
          try {
            const attrData = await adminApi.getAttractionById(data.attractionId);
            setAttraction(attrData);
          } catch (e) {
            console.error('Failed to load attraction');
          }
        }
        // Tweak page title
        document.title = `${data.title} | KANT`;
      } catch (err: any) {
        message.error('Không thể tải chi tiết bài viết.');
      } finally {
        setLoading(false);
      }
    };

    void fetchArticle();
    
    return () => {
      document.title = 'KANT Hotel';
    };
  }, [slug, message]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9F6F1] flex items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-[#F9F6F1] flex flex-col items-center justify-center px-4">
        <h2 className="text-3xl font-display font-bold text-gray-800 mb-4">Bài viết không tồn tại</h2>
        <Link to="/news" className="text-primary hover:underline font-semibold flex items-center gap-2">
          <ChevronLeft size={16} /> Quay lại danh sách tin tức
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-subtle)] pb-24">
      {/* Article Cover */}
      <div className="relative h-[40vh] md:h-[60vh] w-full bg-dark-navy overflow-hidden">
        {article.thumbnailUrl ? (
          <img 
            src={article.thumbnailUrl} 
            alt={article.title}
            className="absolute inset-0 w-full h-full object-cover opacity-60"
          />
        ) : (
          <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-dark-navy to-primary/30" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#F9F6F1] via-transparent to-transparent" />
      </div>

      {/* Article Header */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 -mt-32 md:-mt-48 mb-12">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-8 md:p-12"
        >
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <span className="bg-primary/10 text-primary px-4 py-1.5 rounded-full font-bold text-xs uppercase tracking-widest">
              {article.category.name}
            </span>
            <div className="flex items-center text-sm text-[var(--text-muted)] font-medium">
              <Calendar size={16} className="text-primary mr-2" />
              {new Date(article.publishedAt).toLocaleDateString('vi-VN')}
            </div>
            <div className="flex items-center text-sm text-[var(--text-muted)] font-medium">
              <User size={16} className="text-primary mr-2" />
              {article.author}
            </div>
          </div>
          
          <h1 className="text-3xl md:text-5xl font-display font-semibold text-[var(--text-title)] leading-tight mb-8">
            {article.title}
          </h1>

          <div className="w-16 h-1 bg-primary mb-8 rounded-full" />

          {/* Article Content */}
          <div 
            className="prose prose-lg max-w-none text-[var(--text-body)]
                      prose-headings:font-display prose-headings:font-semibold prose-headings:text-[var(--text-title)]
                      prose-a:text-primary hover:prose-a:text-primary-dark
                      prose-img:rounded-2xl prose-img:shadow-md"
            dangerouslySetInnerHTML={{ __html: article.content }}
          />

          {attraction && (
            <Link 
              to={`/attractions?id=${attraction.id}`} 
              className="block mt-12 bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-2xl p-6 hover:shadow-lg transition-all duration-300 cursor-pointer group"
            >
              <h3 className="flex items-center gap-2 font-display font-bold text-lg text-title mb-4 group-hover:text-primary transition-colors">
                <MapPin className="text-primary" /> Điểm đến nhắc tới trong bài
              </h3>
              <div className="flex flex-col md:flex-row gap-6">
                {attraction.imageUrl && (
                  <img src={attraction.imageUrl} alt={attraction.name} className="w-full md:w-48 h-32 object-cover rounded-xl" />
                )}
                <div>
                  <h4 className="text-xl font-bold text-title group-hover:text-primary transition-colors">{attraction.name}</h4>
                  <p className="text-muted mt-1">{attraction.address}</p>
                  <p className="mt-2 text-sm text-[var(--text-body)] line-clamp-2">{attraction.description}</p>
                </div>
              </div>
            </Link>
          )}

          <ReviewSection targetType="Article" targetId={article.id} />
        </motion.div>
      </div>

      <div className="max-w-4xl mx-auto px-4 mt-16 text-center">
        <Link 
          to="/news"
          className="inline-flex items-center font-bold text-[var(--text-muted)] hover:text-primary transition-colors tracking-wide uppercase text-sm"
        >
          <ChevronLeft size={18} className="mr-2" />
          Các bài viết khác
        </Link>
      </div>
    </div>
  );
};

export default ArticleDetail;
