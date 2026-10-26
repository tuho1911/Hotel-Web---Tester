import React from 'react';
import { motion } from 'framer-motion';
import { User, Clock, ChevronRight } from 'lucide-react';

interface ArrivalCardProps {
  guestName: string;
  roomNumber: string;
  bookingId: string;
  time: string;
  onConfirm: () => void;
}

const ArrivalCard: React.FC<ArrivalCardProps> = ({ guestName, roomNumber, bookingId, time, onConfirm }) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-4"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary">
            <User size={20} />
          </div>
          <div>
            <h4 className="font-semibold text-gray-800">{guestName}</h4>
            <p className="text-xs text-gray-500">{bookingId}</p>
          </div>
        </div>
        <span className="bg-dark-base text-white px-2 py-1 rounded text-xs font-bold">
          RM {roomNumber}
        </span>
      </div>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center text-gray-500 text-xs">
          <Clock size={14} className="mr-1" />
          <span>{time}</span>
        </div>
        <div className="flex items-center space-x-2">
          <button className="p-1.5 text-gray-400 hover:text-primary transition-colors">
            <ChevronRight size={18} />
          </button>
          <button
            onClick={onConfirm}
            className="bg-primary text-white px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-primary-dark transition-all hover:shadow-lg hover:shadow-primary/20"
          >
            Confirm Check-in
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default ArrivalCard;
