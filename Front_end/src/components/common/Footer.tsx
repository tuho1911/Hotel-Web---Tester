import React from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Instagram, Twitter } from 'lucide-react';
import { useAppSelector } from '../../hooks/useAppStore';
import { selectSystemSettings } from '../../store/slices/systemSettingsSlice';

const Footer: React.FC = () => {
  const settings = useAppSelector(selectSystemSettings);

  const getSetting = (key: string, defaultValue: string) => {
    return settings.find(s => s.key === key)?.value || defaultValue;
  };

  const hotelName = getSetting('HotelName', 'KANT');
  const address = getSetting('Address', '123 Luxury Ave, Paradise City');
  const phone = getSetting('ContactPhone', '+1 (555) 123-4567');
  const email = getSetting('ContactEmail', 'contact@kant.com');

  return (
    <footer className="bg-[var(--card-bg)] border-t border-luxury py-16 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="col-span-1 md:col-span-2">
            <Link to="/" className="text-3xl font-display font-bold text-primary tracking-widest mb-6 block">
              {hotelName}
            </Link>
            <p className="text-muted max-w-md leading-relaxed mb-8">
              Trải nghiệm đỉnh cao của sự sang trọng và thoải mái tại Khách sạn {hotelName}. Các tiện nghi đẳng cấp thế giới và dịch vụ cá nhân hóa của chúng tôi đảm bảo mang lại một kỳ nghỉ khó quên ngay tại trái tim của thành phố.
            </p>
            <div className="flex space-x-6">
              {/* <a href="#" className="text-muted hover:text-primary hover:scale-110 transition-all duration-300">
                <Facebook size={20} strokeWidth={1.5} />
              </a>
              <a href="#" className="text-muted hover:text-primary hover:scale-110 transition-all duration-300">
                <Instagram size={20} strokeWidth={1.5} />
              </a>
              <a href="#" className="text-muted hover:text-primary hover:scale-110 transition-all duration-300">
                <Twitter size={20} strokeWidth={1.5} />
              </a> */}
            </div>
          </div>
          
          <div>
            <h3 className="text-xs font-bold text-title uppercase tracking-[0.2em] mb-8">Điều hướng</h3>
            <ul className="space-y-4">
              <li><Link to="/rooms" className="text-muted hover:text-primary transition-colors text-sm font-medium">Phòng nghỉ</Link></li>
              <li><Link to="/services" className="text-muted hover:text-primary transition-colors text-sm font-medium">Dịch vụ</Link></li>
              <li><Link to="/about" className="text-muted hover:text-primary transition-colors text-sm font-medium">Giới thiệu</Link></li>
              <li><Link to="/contact" className="text-muted hover:text-primary transition-colors text-sm font-medium">Liên hệ</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-bold text-title uppercase tracking-[0.2em] mb-8">Liên hệ</h3>
            <ul className="space-y-4 text-sm text-muted">
              <li className="flex flex-col">
                <span className="text-muted/60 text-[10px] uppercase font-bold mb-1">Địa chỉ</span>
                {address}
              </li>
              <li className="flex flex-col">
                <span className="text-muted/60 text-[10px] uppercase font-bold mb-1">Điện thoại</span>
                {phone}
              </li>
              <li className="flex flex-col">
                <span className="text-muted/60 text-[10px] uppercase font-bold mb-1">Email</span>
                {email}
              </li>
            </ul>
          </div>
        </div>
        
        <div className="mt-16 pt-8 border-t border-luxury flex flex-col md:flex-row justify-between items-center text-muted text-[10px] font-bold tracking-widest uppercase">
          <p>© {new Date().getFullYear()} KHÁCH SẠN {hotelName.toUpperCase()}. BẢN QUYỀN THUỘC VỀ KANT.</p>
          <div className="flex space-x-8 mt-4 md:mt-0">
            {/* <a href="#" className="hover:text-primary transition-colors">Chính sách bảo mật</a>
            <a href="#" className="hover:text-primary transition-colors">Điều khoản dịch vụ</a> */}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default React.memo(Footer);
