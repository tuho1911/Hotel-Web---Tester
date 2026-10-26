import React from 'react';
import { motion } from 'framer-motion';
import TestimonialCard from './TestimonialCard';

const GuestExperiences: React.FC = () => {
  const testimonials = [
    {
      name: 'Sarah Mitchell',
      rating: 5,
      review: 'Một trải nghiệm hoàn toàn ngoạn mục. Sự chú ý đến từng chi tiết và dịch vụ cá nhân hóa đã làm cho kỷ niệm của chúng tôi thực sự đặc biệt. KANT là chuẩn mực vàng của sự sang trọng.',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=1974&auto=format&fit=crop'
    },
    {
      name: 'James Wilson',
      rating: 5,
      review: 'Khách sạn tinh tế nhất mà tôi từng ở. Từ hồ bơi vô cực đến ẩm thực đẳng cấp thế giới, mọi thứ đều hoàn hảo. Rất khuyến khích cho khách đi công tác.',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=1974&auto=format&fit=crop'
    },
    {
      name: 'Elena Rodriguez',
      rating: 5,
      review: 'Một thiên đường yên bình ngay giữa lòng thành phố. Đội ngũ nhân viên đã làm việc hết mình để đảm bảo sự thoải mái cho chúng tôi. Căn hộ Hoàng gia thật sự tráng lệ.',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=1974&auto=format&fit=crop'
    }
  ];

  return (
    <section className="py-24 px-4 bg-[var(--bg-main)]">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <motion.h3 
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-xs font-bold text-primary tracking-[0.3em] uppercase mb-4"
          >
            Trải nghiệm của Khách hàng
          </motion.h3>
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-6xl font-display font-bold text-title mb-6"
          >
            Khách hàng nói gì về chúng tôi
          </motion.h2>
          <div className="w-20 h-1 bg-primary/30 mx-auto" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <TestimonialCard {...testimonial} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default GuestExperiences;
