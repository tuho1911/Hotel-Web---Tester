import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft, Loader2 } from 'lucide-react';
import { Form, Input, Button, message } from 'antd';
import { useNavigate, Link } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';

const ForgotPassword = () => {
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const navigate = useNavigate();

  const handleFinish = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;

    if (!email) {
      message.error('Vui lòng nhập email!');
      return;
    }

    setLoading(true);
    try {
      await axiosClient.post('/api/Auth/forgot-password', { email });
      setIsSuccess(true);
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-20 bg-[var(--bg-main)] relative overflow-hidden transition-colors duration-300">
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary rounded-full blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Mail className="text-primary" size={32} />
          </div>
          <h2 className="text-3xl font-display font-bold text-primary mb-2 tracking-wide">Quên Mật Khẩu</h2>
          <p className="text-muted">
            {isSuccess ? 'Gửi yêu cầu thành công' : 'Nhập email để nhận link đặt lại mật khẩu'}
          </p>
        </div>

        <div className="glass-card p-8 sm:p-10 relative z-10">
          <button 
            onClick={() => navigate('/login')}
            className="flex items-center text-muted hover:text-primary transition-colors mb-8 text-sm"
          >
            <ArrowLeft size={16} className="mr-2" />
            Quay lại Đăng nhập
          </button>

        {isSuccess ? (
          <div className="text-center">
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 mb-6">
              <p className="text-green-400 text-sm">
                Chúng tôi đã gửi một đường dẫn đặt lại mật khẩu đến email của bạn. Vui lòng kiểm tra hộp thư (bao gồm cả thư mục Spam).
              </p>
            </div>
            <Link to="/login" className="text-yellow-500 hover:text-yellow-400 font-medium">
              Quay lại trang Đăng nhập
            </Link>
          </div>
        ) : (
          <form onSubmit={handleFinish} className="space-y-6">
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/50" size={18} />
              <input
                type="email"
                required
                name="email"
                placeholder="Email của bạn"
                className="input-luxury w-full pl-12"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-gold w-full py-4 text-lg flex items-center justify-center group"
            >
              {loading ? <Loader2 className="animate-spin" size={24} /> : 'GỬI YÊU CẦU'}
            </button>
          </form>
        )}
        </div>
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
