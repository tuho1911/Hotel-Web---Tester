import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Filter, Star, Wifi, Coffee, Wind } from 'lucide-react';
import { MOCK_ROOMS, ROOM_TYPES } from '../../constants/mockData';

const RoomList: React.FC = () => {
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('all');

  const filteredRooms = MOCK_ROOMS.filter(room => {
    const matchesSearch = room.name.toLowerCase().includes(search.toLowerCase());
    const matchesType = selectedType === 'all' || room.type === selectedType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="bg-dark-base min-h-screen py-12 sm:py-16 lg:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12 sm:mb-16">
          <span className="text-primary font-bold tracking-widest uppercase text-xs mb-4 block">Our Sanctuary</span>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-sans font-black text-white mb-6 tracking-tighter">Suites & Rooms</h1>
          <p className="text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Explore our collection of meticulously designed rooms, each offering a unique blend of luxury, comfort, and breathtaking views.
          </p>
        </div>

        {/* Filters */}
        <div className="glass-card p-4 sm:p-6 mb-10 sm:mb-12 flex flex-col lg:flex-row gap-4 sm:gap-6 items-stretch lg:items-center justify-between">
          <div className="relative w-full lg:max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
            <input 
              type="text" 
              placeholder="Search rooms..." 
              className="input-luxury w-full pl-12"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-3 sm:gap-4 w-full overflow-x-auto pb-2">
            <button 
              onClick={() => setSelectedType('all')}
              className={`px-4 sm:px-6 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap ${selectedType === 'all' ? 'bg-primary text-dark-base' : 'border border-white/10 text-gray-400 hover:border-primary/50'}`}
            >
              ALL ROOMS
            </button>
            {ROOM_TYPES.map(type => (
              <button 
                key={type.id}
                onClick={() => setSelectedType(type.id)}
                className={`px-4 sm:px-6 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap ${selectedType === type.id ? 'bg-primary text-dark-base' : 'border border-white/10 text-gray-400 hover:border-primary/50'}`}
              >
                {type.name.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Room Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 lg:gap-10">
          {filteredRooms.map((room, idx) => (
            <motion.div 
              key={room.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              whileHover={{ y: -10 }}
              className="group bg-dark-navy rounded-2xl overflow-hidden border border-white/5"
            >
              <div className="relative h-64 sm:h-72 overflow-hidden">
                <img 
                  src={room.image} 
                  alt={room.name} 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-4 right-4 bg-primary text-dark-base px-4 py-1 rounded-full font-bold text-sm">
                  ${room.price}/night
                </div>
                {room.status === 'booked' && (
                  <div className="absolute inset-0 bg-dark-base/60 flex items-center justify-center">
                    <span className="bg-red-500 text-white px-6 py-2 rounded-full font-bold tracking-widest uppercase text-xs">Booked</span>
                  </div>
                )}
              </div>
              <div className="p-5 sm:p-6 lg:p-8">
                <div className="flex items-center text-primary mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={14} fill={i < Math.floor(room.rating) ? "currentColor" : "none"} />
                  ))}
                  <span className="ml-2 text-xs font-bold text-gray-400">{room.rating} Rating</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-sans font-bold text-white mb-4 tracking-tight">{room.name}</h3>
                <div className="flex flex-wrap gap-4 text-gray-400 text-sm mb-8">
                  <span className="flex items-center"><Wifi size={14} className="mr-1" /> Wifi</span>
                  <span className="flex items-center"><Coffee size={14} className="mr-1" /> Breakfast</span>
                  <span className="flex items-center"><Wind size={14} className="mr-1" /> AC</span>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <Link to={`/rooms/${room.id}`} className="btn-outline-gold flex-grow text-center">
                    DETAILS
                  </Link>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {filteredRooms.length === 0 && (
          <div className="text-center py-16 sm:py-20">
            <p className="text-gray-400 text-xl">No rooms found matching your criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RoomList;
