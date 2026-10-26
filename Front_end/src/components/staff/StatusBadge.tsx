import React from 'react';

interface StatusBadgeProps {
  status: 'VACANT' | 'OCCUPIED' | 'CLEANING';
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const styles = {
    VACANT: 'bg-green-100 text-green-700 border-green-200',
    OCCUPIED: 'bg-red-100 text-red-700 border-red-200',
    CLEANING: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  };

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${styles[status]}`}>
      {status}
    </span>
  );
};

export default StatusBadge;
