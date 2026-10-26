import React from 'react';
import { Star } from 'lucide-react';

interface TestimonialCardProps {
  name: string;
  avatar?: string;
  rating: number;
  review: string;
}

const TestimonialCard: React.FC<TestimonialCardProps> = ({ name, avatar, rating, review }) => {
  return (
    <div className="bg-[var(--card-bg)] p-8 rounded-[var(--radius-luxury)] shadow-sm border border-luxury hover:shadow-xl hover:scale-[1.02] transition-all duration-500 h-full flex flex-col">
      <div className="flex items-center space-x-4 mb-6">
        <div className="w-12 h-12 rounded-full overflow-hidden bg-subtle shrink-0">
          <img 
            src={avatar || `https://ui-avatars.com/api/?name=${name}&background=C6A96B&color=fff`} 
            alt={name} 
            className="w-full h-full object-cover"
          />
        </div>
        <div>
          <h4 className="font-bold text-title">{name}</h4>
          <div className="flex text-primary">
            {[...Array(5)].map((_, i) => (
              <Star 
                key={i} 
                size={12} 
                fill={i < rating ? "currentColor" : "none"} 
                className={i < rating ? "" : "text-muted"}
              />
            ))}
          </div>
        </div>
      </div>
      
      <p className="text-muted italic leading-relaxed flex-1">
        "{review}"
      </p>
    </div>
  );
};

export default TestimonialCard;
