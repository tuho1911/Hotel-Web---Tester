import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { App, Tag } from 'antd';
import { Calendar, User, ArrowRight, Bookmark } from 'lucide-react';
import { contentApi, type ArticleListItemDto, type ArticleCategoryDto } from '../../services/contentApi';

const Articles: React.FC = () => {
  const { message } = App.useApp();
  const [articles, setArticles] = useState<ArticleListItemDto[]>([]);
  const [categories, setCategories] = useState<ArticleCategoryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategoryId, setActiveCategoryId] = useState<number | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [articlesData, categoriesData] = await Promise.all([
          contentApi.getArticles(),
          contentApi.getCategories()
        ]);
        setArticles(articlesData);
        setCategories(categoriesData);
      } catch (err: any) {
        message.error('Không thể tải danh sách bài viết.');
      } finally {
        setLoading(false);
      }
    };
    void fetchData();
  }, [message]);

  const filteredArticles = useMemo(() => {
    if (!activeCategoryId) return articles;
    return articles.filter(a => {
      const cat = categories.find(c => c.name === a.category);
      return cat?.id === activeCategoryId;
    });
  }, [articles, categories, activeCategoryId]);

  const featuredArticle = useMemo(() => {
    return articles.length > 0 ? articles[0] : null;
  }, [articles]);

  const remainingArticles = useMemo(() => {
    return filteredArticles.filter(a => a.id !== featuredArticle?.id || activeCategoryId !== null);
  }, [filteredArticles, featuredArticle, activeCategoryId]);

  return (
    <div className="min-h-screen bg-[var(--bg-main)] pt-32 pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Page Header */}
        <div className="text-center mb-16">
          <motion.span 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-[10px] font-bold uppercase tracking-[0.5em] text-[#C6A96B] mb-4 block"
          >
            Tin tức & Sự kiện
          </motion.span>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-[var(--text-title)] tracking-tight"
          >
            KANT Journal
          </motion.h1>
          <motion.div 
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            className="w-20 h-0.5 bg-[#C6A96B] mx-auto mt-6"
          />
        </div>

        {/* Category Navigation */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-16">
          <button
            onClick={() => setActiveCategoryId(null)}
            className={`px-8 py-2.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all duration-300 border ${
              activeCategoryId === null 
                ? 'bg-[var(--text-title)] border-[var(--text-title)] text-[var(--card-bg)] shadow-xl shadow-black/10 scale-105' 
                : 'bg-[var(--card-bg)] border-[var(--border-color)] text-[var(--text-muted)] hover:border-primary hover:text-primary'
            }`}
          >
            Tất cả
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setActiveCategoryId(category.id)}
              className={`px-8 py-2.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all duration-300 border ${
                activeCategoryId === category.id 
                  ? 'bg-[var(--text-title)] border-[var(--text-title)] text-[var(--card-bg)] shadow-xl shadow-black/10 scale-105' 
                  : 'bg-[var(--card-bg)] border-[var(--border-color)] text-[var(--text-muted)] hover:border-primary hover:text-primary'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-3xl h-96 animate-pulse border border-gray-100" />
            ))}
          </div>
        ) : (
          <div className="space-y-16">
            
            {/* Featured Article (only on "All") */}
            {activeCategoryId === null && featuredArticle && (
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                className="group relative bg-[var(--card-bg)] rounded-[2.5rem] overflow-hidden shadow-2xl shadow-black/[0.03] border border-[var(--border-color)]"
              >
                <div className="grid grid-cols-1 lg:grid-cols-2">
                  <div className="relative h-80 lg:h-[500px] overflow-hidden bg-[#f8f8f8]">
                    {featuredArticle.thumbnailUrl ? (
                      <img 
                        src={featuredArticle.thumbnailUrl} 
                        alt={featuredArticle.title}
                        className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#C6A96B]/20 text-4xl font-display italic">KANT</div>
                    )}
                    <div className="absolute top-8 left-8">
                      <span className="bg-white/95 backdrop-blur-md text-[#C6A96B] px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm">
                        Mới nhất
                      </span>
                    </div>
                  </div>
                  <div className="p-8 lg:p-16 flex flex-col justify-center">
                    <div className="flex items-center gap-6 text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-6">
                      <span className="flex items-center gap-2"><Calendar size={14} className="text-primary"/> {new Date(featuredArticle.publishedAt).toLocaleDateString('vi-VN')}</span>
                      <span className="flex items-center gap-2"><User size={14} className="text-primary"/> {featuredArticle.author || 'ADMIN'}</span>
                    </div>
                    <h2 className="text-3xl lg:text-4xl font-display font-bold text-[var(--text-title)] mb-6 leading-tight group-hover:text-primary transition-colors">
                      {featuredArticle.title}
                    </h2>
                    <p className="text-[var(--text-body)] leading-relaxed mb-10 line-clamp-3 text-lg font-light">
                      {featuredArticle.title} — Khám phá những trải nghiệm độc bản và những câu chuyện thú vị chỉ có tại KANT Hotel. Chúng tôi mang đến cho bạn không gian của sự xa hoa và tinh tế nhất.
                    </p>
                    <Link 
                      to={`/news/${featuredArticle.slug}`}
                      className="flex items-center gap-3 text-[var(--text-title)] font-black text-xs uppercase tracking-[0.2em] group/btn"
                    >
                      Đọc tiếp
                      <div className="w-10 h-10 rounded-full bg-[var(--bg-subtle)] flex items-center justify-center transition-all group-hover/btn:bg-[var(--text-title)] group-hover/btn:text-[var(--card-bg)] group-hover/btn:translate-x-2">
                        <ArrowRight size={16} />
                      </div>
                    </Link>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Articles Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
              <AnimatePresence mode='popLayout'>
                {remainingArticles.map((article, idx) => (
                  <motion.article
                    key={article.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: idx * 0.05 }}
                    className="group bg-[var(--card-bg)] rounded-[2rem] overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 border border-[var(--border-color)] flex flex-col"
                  >
                    <Link to={`/news/${article.slug}`} className="block relative aspect-[4/3] overflow-hidden bg-[#f8f8f8]">
                      {article.thumbnailUrl ? (
                        <img 
                          src={article.thumbnailUrl} 
                          alt={article.title}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[#C6A96B]/10 text-2xl font-display italic">KANT</div>
                      )}
                      <div className="absolute top-5 left-5">
                        <span className="bg-[#1a1a1a]/80 backdrop-blur-sm text-white px-4 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest">
                          {article.category}
                        </span>
                      </div>
                    </Link>
                    
                    <div className="p-8 flex flex-col flex-1">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-[10px] font-bold text-[#C6A96B] uppercase tracking-widest">
                          {new Date(article.publishedAt).toLocaleDateString('vi-VN')}
                        </span>
                        <Bookmark size={14} className="text-[#dddddd] group-hover:text-[#C6A96B] transition-colors cursor-pointer" />
                      </div>
                      
                      <Link to={`/news/${article.slug}`}>
                        <h3 className="text-xl font-display font-bold text-[var(--text-title)] leading-snug group-hover:text-primary transition-colors line-clamp-3 mb-6">
                          {article.title}
                        </h3>
                      </Link>

                      <div className="mt-auto flex items-center justify-between pt-6 border-t border-[var(--border-color)]">
                        <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                          {article.author || 'ADMIN'}
                        </span>
                        <Link 
                          to={`/news/${article.slug}`}
                          className="w-8 h-8 rounded-full bg-[var(--bg-subtle)] flex items-center justify-center text-[var(--text-title)] hover:bg-[var(--text-title)] hover:text-[var(--card-bg)] transition-all"
                        >
                          <ArrowRight size={14} />
                        </Link>
                      </div>
                    </div>
                  </motion.article>
                ))}
              </AnimatePresence>
            </div>

            {remainingArticles.length === 0 && !loading && (
              <div className="text-center py-32 bg-[var(--card-bg)] rounded-[3rem] shadow-sm border border-[var(--border-color)]">
                <div className="w-20 h-20 bg-[var(--bg-subtle)] rounded-full flex items-center justify-center mx-auto mb-6 text-primary/30">
                  <Bookmark size={32} />
                </div>
                <h3 className="text-2xl font-display font-bold text-[var(--text-title)] mb-2">Chưa có bài viết</h3>
                <p className="text-[var(--text-body)] font-light">Danh mục này hiện đang được cập nhật nội dung mới.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Articles;
