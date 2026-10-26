export const ROOM_TYPES = [
  { id: 'standard', name: 'Standard Room', price: 150, description: 'Comfortable room with essential amenities.' },
  { id: 'deluxe', name: 'Deluxe Room', price: 250, description: 'Spacious room with a city view and premium bedding.' },
  { id: 'suite', name: 'Executive Suite', price: 500, description: 'Luxury suite with separate living area and panoramic views.' },
  { id: 'presidential', name: 'Presidential Suite', price: 1200, description: 'The ultimate luxury experience with private butler and spa.' },
];

export const MOCK_ROOMS = [
  {
    id: '1',
    name: 'Standard Twin',
    type: 'standard',
    price: 150,
    status: 'available',
    image: 'https://picsum.photos/seed/room1/800/600',
    rating: 4.5,
    amenities: ['Wifi', 'TV', 'AC'],
    capacity: 2,
    size: '35m²',
  },
  {
    id: '2',
    name: 'Deluxe King',
    type: 'deluxe',
    price: 280,
    status: 'available',
    image: 'https://picsum.photos/seed/room2/800/600',
    rating: 4.8,
    amenities: ['Wifi', 'TV', 'AC', 'Mini Bar', 'Ocean View'],
    capacity: 2,
    size: '45m²',
  },
  {
    id: '3',
    name: 'Executive Suite',
    type: 'suite',
    price: 550,
    status: 'booked',
    image: 'https://picsum.photos/seed/room3/800/600',
    rating: 4.9,
    amenities: ['Wifi', 'TV', 'AC', 'Mini Bar', 'Ocean View', 'Kitchenette'],
    capacity: 4,
    size: '85m²',
  },
  {
    id: '4',
    name: 'Royal Suite',
    type: 'presidential',
    price: 1500,
    status: 'available',
    image: 'https://picsum.photos/seed/room4/800/600',
    rating: 5.0,
    amenities: ['Wifi', 'TV', 'AC', 'Mini Bar', 'Ocean View', 'Private Pool', 'Butler'],
    capacity: 6,
    size: '150m²',
  },
];

export const MOCK_USERS = [
  { id: '1', name: 'Admin User', email: 'admin@kant.com', role: 'ADMIN', status: 'active' },
  { id: '2', name: 'Staff Member', email: 'staff@kant.com', role: 'STAFF', status: 'active' },
  { id: '3', name: 'John Doe', email: 'john@example.com', role: 'USER', status: 'active' },
];

export const MOCK_BOOKINGS = [
  { id: 'BK001', userId: '3', roomId: '2', checkIn: '2026-04-01', checkOut: '2026-04-05', status: 'confirmed', total: 1120 },
  { id: 'BK002', userId: '3', roomId: '1', checkIn: '2026-03-20', checkOut: '2026-03-22', status: 'completed', total: 300 },
];
