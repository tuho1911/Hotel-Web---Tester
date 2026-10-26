import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Lock, Loader2 } from 'lucide-react';
import { message } from 'antd';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';

const ResetPassword = () => {
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = searchParams.get('token');
  const email = searchParams.get('email');

  useEffect(() => {
    if (!token || !email) {
      message.error('Đường dẫn không hợp lệ!');
      navigate('/login');
    }
  }, [token, email, navigate]);

  const handleFinish = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    if (!password || password.length < 6) {
      message.error('Mật khẩu phải có ít nhất 6 ký tự!');
      return;
    }

    if (password !== confirmPassword) {
      message.error('Mật khẩu không khớp!');
      return;
    }

    setLoading(true);
    try {
      await axiosClient.post('/api/Auth/reset-password', {
        email,
        token,
        newPassword: password
      });
      message.success('Đổi mật khẩu thành công! Bạn có thể đăng nhập ngay.');
      navigate('/login');
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Có lỗi xảy ra hoặc link đã hết hạn.');
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
            <Lock className="text-primary" size={32} />
          </div>
          <h2 className="text-3xl font-display font-bold text-primary mb-2 tracking-wide">Mật Khẩu Mới</h2>
          <p className="text-muted">Vui lòng nhập mật khẩu mới cho tài khoản của bạn</p>
        </div>

        <div className="glass-card p-8 sm:p-10 relative z-10">
          <form onSubmit={handleFinish} className="space-y-6">
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/50" size={18} />
              <input
                type="password"
                required
                name="password"
                placeholder="Mật khẩu mới"
                className="input-luxury w-full pl-12"
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/50" size={18} />
              <input
                type="password"
                required
                name="confirmPassword"
                placeholder="Xác nhận mật khẩu"
                className="input-luxury w-full pl-12"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-gold w-full py-4 text-lg flex items-center justify-center group"
            >
              {loading ? <Loader2 className="animate-spin" size={24} /> : 'ĐỔI MẬT KHẨU'}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default ResetPassword;
