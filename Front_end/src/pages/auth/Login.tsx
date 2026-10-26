import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { motion } from 'framer-motion';
import { Mail, Lock, ArrowRight, ShieldCheck } from 'lucide-react';
import { loginThunk } from '../../store/slices/authSlice';
import type { AppDispatch } from '../../store';
import { getAuthorizedHomePath } from '../../utils/authNavigation';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '' });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);

    try {
      const resultAction = await dispatch(
        loginThunk({
          email: formData.email,
          password: formData.password,
        }),
      );

      if (loginThunk.fulfilled.match(resultAction)) {
        navigate(getAuthorizedHomePath(resultAction.payload.user), { replace: true });
        return;
      }

      alert((resultAction.payload as string) || 'Email hoặc mật khẩu không chính xác');
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

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-display font-bold text-primary mb-2 tracking-widest">KANT</h1>
          <p className="text-muted">Chào mừng trở lại hệ thống</p>
        </div>

        <div className="glass-card p-10">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted uppercase tracking-widest">Địa chỉ Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/50" size={18} />
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  className="input-luxury w-full pl-12"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-muted uppercase tracking-widest">Mật khẩu</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/50" size={18} />
                <input
                  type="password"
                  required
                  placeholder="********"
                  className="input-luxury w-full pl-12"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
              <div className="flex justify-end">
                <button type="button" onClick={() => navigate('/forgot-password')} className="text-xs text-primary hover:underline">Quên mật khẩu?</button>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <input type="checkbox" id="remember" className="rounded border-luxury bg-[var(--bg-main)] text-primary focus:ring-primary" />
              <label htmlFor="remember" className="text-sm text-muted">Ghi nhớ đăng nhập trong 30 ngày</label>
            </div>

            <button type="submit" disabled={loading} className="btn-gold w-full py-4 text-lg flex items-center justify-center group">
              {loading ? (
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  ĐĂNG NHẬP <ArrowRight size={20} className="ml-2 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-10 pt-8 border-t border-luxury text-center">
            <p className="text-muted text-sm">
              Chưa có tài khoản?{' '}
              <button onClick={() => navigate('/register')} className="text-primary font-bold hover:underline">
                Đăng ký ngay
              </button>
            </p>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-center space-x-2 text-muted text-xs">
          <ShieldCheck size={14} />
          <span>Bảo mật xác thực doanh nghiệp</span>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
