import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Clock3, Mail, MapPin, Phone, Send, MessageSquare } from 'lucide-react';
import { bookingApi } from '../../services/bookingApi';
import { publicHotelApi } from '../../services/publicHotelApi';
import { App } from 'antd';
import { useTranslation } from 'react-i18next';

const Contact: React.FC = () => {
  const { message } = App.useApp();
  const { t } = useTranslation();
  const [settings, setSettings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    subject: '',
    message: ''
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await bookingApi.getSystemSettings();
        setSettings(data);
      } catch (error) {
        console.error('Failed to fetch contact settings:', error);
      }
    };
    fetchSettings();
  }, []);

  const getSetting = (key: string, defaultValue: string) => {
    return settings.find(s => s.key === key)?.value || defaultValue;
  };

  const hotelName = getSetting('HotelName', 'KANT Luxury Hotel');
  const address = getSetting('Address', '123 Ocean Avenue, Quận 1, Thành phố Hồ Chí Minh, Việt Nam');
  const phone = getSetting('ContactPhone', '+84 28 1234 5678');
  const email = getSetting('ContactEmail', 'hello@kanthotel.vn');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.email || !formData.message) {
      message.error('Vui lòng điền đầy đủ các thông tin bắt buộc.');
      return;
    }

    setLoading(true);
    try {
      await publicHotelApi.sendContactMessage(formData);
      message.success(t('contact.success'));
      setFormData({ fullName: '', email: '', subject: '', message: '' });
    } catch (error) {
      console.error('Failed to send message:', error);
      message.error('Gửi lời nhắn thất bại. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[var(--bg-main)] min-h-screen py-24 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-4xl mx-auto mb-20 sm:mb-24">
          <motion.span 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-primary font-black tracking-[0.5em] uppercase text-[10px] sm:text-xs mb-6 block"
          >
            {t('contact.title')}
          </motion.span>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-7xl lg:text-8xl font-display font-bold text-title mb-10 leading-[1.1]"
          >
            {t('contact.hero_title')} <br/> <span className="text-primary italic font-serif">{t('contact.hero_title_highlight')}</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-muted text-lg sm:text-xl font-light leading-relaxed max-w-2xl mx-auto"
          >
            {t('contact.hero_desc', { hotelName })}
          </motion.p>
          <motion.div 
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.4, duration: 1 }}
            className="w-24 h-0.5 bg-primary/30 mx-auto mt-12"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
          {/* Info Cards */}
          <div className="lg:col-span-5 space-y-12">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="glass-card p-10 sm:p-12 space-y-12 border border-luxury/10 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute -top-12 -right-12 w-48 h-48 bg-primary/5 rounded-full blur-3xl" />
              <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-primary/5 rounded-full blur-3xl" />
              <div className="flex gap-6 group">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary transition-transform group-hover:scale-110">
                  <MapPin size={24} />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-primary mb-3">{t('contact.address')}</h3>
                  <p className="text-lg font-display font-semibold text-title leading-relaxed">
                    {address}
                  </p>
                </div>
              </div>

              <div className="flex gap-6 group">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary transition-transform group-hover:scale-110">
                  <Phone size={24} />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-primary mb-3">{t('contact.phone')}</h3>
                  <p className="text-lg font-display font-semibold text-title tracking-wide">{phone}</p>
                </div>
              </div>

              <div className="flex gap-6 group">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary transition-transform group-hover:scale-110">
                  <Mail size={24} />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-primary mb-3">{t('contact.email')}</h3>
                  <p className="text-lg font-display font-semibold text-title">{email}</p>
                </div>
              </div>

              <div className="flex gap-6 group">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary transition-transform group-hover:scale-110">
                  <Clock3 size={24} />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-primary mb-3">{t('contact.hours')}</h3>
                  <p className="text-lg font-display font-semibold text-title">{t('contact.reception')}</p>
                  <p className="text-lg font-display font-semibold text-title">{t('contact.spa_gym')}</p>
                </div>
              </div>
            </motion.div>

            {/* Social Links placeholder */}
            <div className="flex justify-between items-center px-4">
              <h4 className="text-xs font-bold text-muted uppercase tracking-[0.2em]">{t('contact.follow_us')}</h4>
              <div className="flex gap-6">
                {['FB', 'IG', 'TW', 'LI'].map(s => (
                  <button key={s} className="text-muted hover:text-primary font-bold text-xs transition-colors">{s}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-7"
          >
            <div className="glass-card p-10 md:p-12 border border-luxury shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-12 opacity-5">
                <MessageSquare size={160} className="text-primary" />
              </div>
              
              <h2 className="text-3xl sm:text-4xl font-display font-bold text-title mb-12">{t('contact.form_title')}</h2>
              
              <form className="space-y-8" onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="block text-xs font-bold text-muted uppercase tracking-widest">{t('contact.fullname')}</label>
                    <input 
                      className="input-luxury w-full" 
                      placeholder="Nguyễn Văn A" 
                      value={formData.fullName}
                      onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                      required
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="block text-xs font-bold text-muted uppercase tracking-widest">{t('contact.email_addr')}</label>
                    <input 
                      className="input-luxury w-full" 
                      placeholder="email@vi-du.com" 
                      type="email" 
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-muted uppercase tracking-widest">{t('contact.subject')}</label>
                  <input 
                    className="input-luxury w-full" 
                    placeholder="Yêu cầu đặt phòng, thắc mắc..." 
                    value={formData.subject}
                    onChange={(e) => setFormData({...formData, subject: e.target.value})}
                  />
                </div>
                
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-muted uppercase tracking-widest">{t('contact.message')}</label>
                  <textarea 
                    className="input-luxury w-full min-h-[160px] resize-none py-4" 
                    placeholder={t('contact.message_placeholder')}
                    value={formData.message}
                    onChange={(e) => setFormData({...formData, message: e.target.value})}
                    required
                  />
                </div>
                
                <div className="pt-6">
                  <button 
                    type="submit" 
                    disabled={loading}
                    className="btn-gold w-full md:w-auto px-16 py-5 flex items-center justify-center gap-4 group text-sm font-black tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? t('contact.sending') : t('contact.send_now')}
                    {!loading && <Send size={18} className="transition-all group-hover:translate-x-2 group-hover:-translate-y-2" />}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>

        {/* Map Section */}
        <motion.section 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-32 rounded-3xl overflow-hidden h-[500px] border border-luxury relative shadow-2xl group"
        >
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1526772662000-3f88f10405ff?q=80&w=2034&auto=format&fit=crop')] bg-cover bg-center grayscale opacity-30 group-hover:grayscale-0 transition-all duration-1000 group-hover:scale-105" />
          <div className="absolute inset-0 bg-gradient-to-t from-var(--bg-main) to-transparent opacity-60" />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="glass-card p-10 md:p-12 border border-luxury/30 text-center backdrop-blur-2xl max-w-lg w-full shadow-3xl">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mx-auto mb-6">
                <MapPin size={32} />
              </div>
              <h3 className="text-2xl md:text-3xl font-display font-bold text-title mb-3 tracking-tight">{t('contact.find_way')}</h3>
              <p className="text-muted text-sm mb-10 font-light leading-relaxed">
                {t('contact.map_desc', { hotelName })}
              </p>
              <button 
                onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank')}
                className="btn-gold mx-auto block px-12 py-4 text-xs font-black tracking-widest uppercase hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/20"
              >
                {t('contact.view_map')}
              </button>
            </div>
          </div>
        </motion.section>
      </div>
    </div>
  );
};

export default Contact;
