import React from 'react';
import { motion } from 'framer-motion';
import StatusBadge from './StatusBadge';
import { RoomStatus } from '../../store/slices/staffSlice';

interface RoomCardProps {
  number: string;
  type: string;
  status: RoomStatus;
  onUpdateStatus: () => void;
}

const RoomCard: React.FC<RoomCardProps> = ({ number, type, status, onUpdateStatus }) => {
  return (
    <motion.div
      whileHover={{ y: -4, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)' }}
      className="bg-[var(--card-bg,var(--nav-bg))] p-6 rounded-2xl shadow-sm border border-[var(--nav-border)] transition-all duration-300"
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-3xl font-display font-bold text-[var(--text-title)]">{number}</h3>
          <p className="text-[var(--text-muted)] text-sm">{type}</p>
        </div>
        <StatusBadge status={status} />
      </div>
      
      <button
        onClick={onUpdateStatus}
        className="w-full py-2 text-sm font-semibold text-primary border border-primary/20 rounded-xl hover:bg-primary/5 transition-colors"
      >
        Update Status
      </button>
    </motion.div>
  );
};

export default RoomCard;
