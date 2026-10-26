import React from 'react';
import { motion } from 'framer-motion';

const WhyChooseKant: React.FC = () => {
  const features = [
    {
      title: 'Chất lượng Vượt trội',
      description: 'Mọi chi tiết đều được chăm chút tỉ mỉ để mang đến sự hoàn hảo trong mọi khía cạnh của kỳ lưu trú.'
    },
    {
      title: 'Trải nghiệm Xa hoa',
      description: 'Sự kết hợp hoàn hảo giữa sự sang trọng, thoải mái và tinh tế dành cho giới thượng lưu.'
    },
    {
      title: 'Dịch vụ Cá nhân hóa',
      description: 'Những trải nghiệm được thiết kế riêng biệt dựa trên nhu cầu và sở thích độc đáo của bạn.'
    },
    {
      title: 'Vị trí Đắc địa',
      description: 'Tọa lạc tại trái tim của thành phố, mang lại sự thuận tiện và dễ dàng tiếp cận tối đa.'
    }
  ];

  return (
    <section className="py-24 px-4 bg-subtle">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <div>
            <motion.h3 
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-xs font-bold text-primary tracking-[0.3em] uppercase mb-4"
            >
              Sự Khác Biệt Tại KANT
            </motion.h3>
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-4xl md:text-6xl font-display font-bold text-title mb-8 leading-tight"
            >
              Tại sao chọn KANT?
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-muted text-lg leading-relaxed mb-10 max-w-xl"
            >
              Trải nghiệm sự sang trọng tinh tế và dịch vụ vượt trội hơn cả mong đợi. Chúng tôi kiến tạo những khoảnh khắc đáng nhớ suốt đời.
            </motion.p>
            <div className="w-20 h-1 bg-primary/30" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -4 }}
                className="group"
              >
                <div className="w-10 h-[1px] bg-primary/40 mb-4 group-hover:w-full transition-all duration-500" />
                <h4 className="text-xl font-display font-bold text-title mb-2 group-hover:text-primary transition-colors">
                  {feature.title}
                </h4>
                <p className="text-muted text-sm leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default WhyChooseKant;
