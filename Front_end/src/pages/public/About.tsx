import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Award, ShieldCheck, Users, Sparkles, MapPin, Compass, Heart } from 'lucide-react';

const About: React.FC = () => {
  const navigate = useNavigate();

  const values = [
    {
      title: 'Sự Tinh Tế',
      desc: 'Chúng tôi chú trọng đến từng chi tiết nhỏ nhất trong thiết kế và dịch vụ.',
      icon: Sparkles
    },
    {
      title: 'Lòng Hiếu Khách',
      desc: 'Mọi vị khách đều được đón tiếp như những người thân trong gia đình.',
      icon: Heart
    },
    {
      title: 'Bền Vững',
      desc: 'Cam kết phát triển du lịch đi đôi với bảo vệ môi trường địa phương.',
      icon: ShieldCheck
    }
  ];

  return (
    <div className="bg-[#FDFCFB] min-h-screen">
      {/* Hero Section */}
      <section className="relative h-[80vh] flex items-center justify-center overflow-hidden">
        <motion.div 
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          transition={{ duration: 2 }}
          className="absolute inset-0"
        >
          <img 
            src="https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&q=80&w=1920" 
            alt="KANT Hotel" 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px]" />
        </motion.div>
        
        <div className="relative z-10 text-center px-4 max-w-5xl">
          <motion.span 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-[#C6A96B] font-black uppercase tracking-[0.6em] text-[10px] mb-8 block"
          >
            Từ năm 1998
          </motion.span>
          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-5xl md:text-8xl font-display font-bold text-white mb-8 leading-tight"
          >
            Nơi Sang Trọng <br/> <span className="text-[#C6A96B] italic">Trở Thành Di Sản</span>
          </motion.h1>
          <motion.div 
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 1, delay: 0.5 }}
            className="w-24 h-1 bg-[#C6A96B] mx-auto" 
          />
        </div>
      </section>

      {/* Philosophy Section */}
      <section className="py-32 px-4 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-8"
          >
            <h2 className="text-[10px] font-black text-[#C6A96B] tracking-[0.4em] uppercase">Về chúng tôi</h2>
            <h3 className="text-4xl md:text-5xl font-display font-bold text-[#1a1a1a] leading-tight">
              Định Nghĩa Lại Trải Nghiệm <br/> Lưu Trú Đương Đại
            </h3>
            <p className="text-[#666666] text-lg leading-relaxed font-light">
              KANT Hotel không chỉ là một nơi để ngủ; đó là một thiên đường nơi sự xa hoa hòa quyện với tâm hồn. 
              Mỗi căn phòng, mỗi bữa ăn và mỗi nụ cười đều được chúng tôi chuẩn bị kỹ lưỡng để kể một câu chuyện về lòng hiếu khách chân thành.
            </p>
            <div className="grid grid-cols-2 gap-8 pt-8">
              <div>
                <p className="text-3xl font-display font-bold text-[#1a1a1a] mb-2">250+</p>
                <p className="text-[10px] font-bold text-[#999999] uppercase tracking-widest">Nhân sự chuyên nghiệp</p>
              </div>
              <div>
                <p className="text-3xl font-display font-bold text-[#1a1a1a] mb-2">15+</p>
                <p className="text-[10px] font-bold text-[#999999] uppercase tracking-widest">Giải thưởng uy tín</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative"
          >
            <div className="rounded-[3rem] overflow-hidden shadow-2xl border border-black/5 aspect-[4/5]">
              <img 
                src="https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=1200" 
                alt="Luxury Lobby" 
                className="w-full h-full object-cover transition-transform duration-700 hover:scale-105" 
              />
            </div>
            <div className="absolute -bottom-8 -right-8 bg-white p-8 rounded-3xl shadow-xl border border-black/5 hidden md:block">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#C6A96B]/10 rounded-full flex items-center justify-center text-[#C6A96B]">
                  <Award size={24} />
                </div>
                <div>
                  <p className="font-bold text-[#1a1a1a]">Top 10 Khách sạn</p>
                  <p className="text-[10px] text-[#999999]">Bình chọn bởi Traveler 2024</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Vision & Values */}
      <section className="py-32 bg-[#1a1a1a] relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="text-center mb-20">
            <h2 className="text-[#C6A96B] text-[10px] font-black uppercase tracking-[0.5em] mb-4">Giá trị cốt lõi</h2>
            <h3 className="text-4xl md:text-5xl font-display font-bold text-white">Triết Lý Phục Vụ</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {values.map((v, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-white/5 backdrop-blur-xl border border-white/10 p-10 rounded-[2.5rem] hover:bg-white/10 transition-all group"
              >
                <div className="w-14 h-14 bg-[#C6A96B]/20 rounded-2xl flex items-center justify-center text-[#C6A96B] mb-8 group-hover:scale-110 transition-transform">
                  <v.icon size={28} strokeWidth={1.5} />
                </div>
                <h4 className="text-2xl font-display font-bold text-white mb-4">{v.title}</h4>
                <p className="text-gray-400 font-light leading-relaxed">{v.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Management Team - Temporarily hidden
      <section className="py-32 px-4 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-6 mb-16">
          <div className="max-w-2xl">
            <span className="text-[#C6A96B] font-black uppercase tracking-[0.4em] text-[10px] mb-4 block">Đội ngũ lãnh đạo</span>
            <h2 className="text-4xl md:text-5xl font-display font-bold text-[#1a1a1a]">Người Thổi Hồn Vào KANT</h2>
          </div>
          <p className="text-[#666666] max-w-md font-light">Những con người tận tâm luôn nỗ lực không ngừng để tạo ra những tiêu chuẩn mới trong ngành khách sạn.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {[
            { name: 'Hoàng Minh Anh', role: 'Tổng Giám đốc', img: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=800' },
            { name: 'Lê Thùy Chi', role: 'Giám đốc Điều hành', img: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=800' },
            { name: 'Trần Nam Việt', role: 'Bếp trưởng Điều hành', img: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&q=80&w=800' }
          ].map((member, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="group cursor-pointer"
            >
              <div className="relative aspect-[3/4] rounded-[2rem] overflow-hidden mb-6 shadow-lg">
                <img src={member.img} alt={member.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a1a]/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-8 text-white">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#C6A96B] mb-2">KANT Management</p>
                  <p className="text-sm font-light leading-relaxed">Gắn bó từ những ngày đầu và luôn đặt sự hài lòng của khách hàng lên hàng đầu.</p>
                </div>
              </div>
              <h4 className="text-xl font-display font-bold text-[#1a1a1a] text-center group-hover:text-[#C6A96B] transition-colors">{member.name}</h4>
              <p className="text-[#999999] text-[10px] font-bold uppercase tracking-widest text-center mt-2">{member.role}</p>
            </motion.div>
          ))}
        </div>
      </section>
      */}

      {/* Final CTA */}
      <section className="py-32 relative overflow-hidden bg-[#F9F7F2]">
        <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="space-y-10"
          >
            <h2 className="text-4xl md:text-6xl font-display font-bold text-[#1a1a1a]">Khám Phá Thế Giới Của KANT</h2>
            <p className="text-[#666666] text-lg font-light leading-relaxed max-w-2xl mx-auto">
              Chúng tôi mời bạn đến và trải nghiệm thực tế những điều tuyệt vời này. Thiên đường lưu trú của quý khách chỉ cách một cú nhấp chuột.
            </p>
            <div className="flex justify-center gap-6">
              <button onClick={() => navigate('/rooms')} className="btn-gold px-12 py-4 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl shadow-black/10">
                ĐẶT PHÒNG NGAY
              </button>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default About;
