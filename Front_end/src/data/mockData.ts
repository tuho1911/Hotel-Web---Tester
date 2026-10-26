import { Room, InventoryItem, Booking, CleaningTask, Post } from '../types';

export const mockRooms: Room[] = [
  {
    id: '1',
    number: '101',
    floor: '1',
    type: 'Single',
    status: 'Available',
    images: ['https://picsum.photos/seed/room101/400/300'],
    inventory: [
      { inventoryId: 'inv1', name: 'Towel', quantity: 2, status: 'Good' },
      { inventoryId: 'inv2', name: 'Pillow', quantity: 2, status: 'Good' },
    ],
  },
  {
    id: '2',
    number: '102',
    floor: '1',
    type: 'Double',
    status: 'Occupied',
    images: ['https://picsum.photos/seed/room102/400/300'],
    inventory: [
      { inventoryId: 'inv1', name: 'Towel', quantity: 4, status: 'Good' },
      { inventoryId: 'inv2', name: 'Pillow', quantity: 4, status: 'Good' },
    ],
  },
  {
    id: '3',
    number: '201',
    floor: '2',
    type: 'Suite',
    status: 'Cleaning',
    images: ['https://picsum.photos/seed/room201/400/300'],
    inventory: [
      { inventoryId: 'inv1', name: 'Towel', quantity: 4, status: 'Good' },
      { inventoryId: 'inv2', name: 'Pillow', quantity: 4, status: 'Good' },
      { inventoryId: 'inv3', name: 'Bathrobe', quantity: 2, status: 'Good' },
    ],
  },
  {
    id: '4',
    number: '202',
    floor: '2',
    type: 'Deluxe',
    status: 'Maintenance',
    images: ['https://picsum.photos/seed/room202/400/300'],
    inventory: [
      { inventoryId: 'inv1', name: 'Towel', quantity: 2, status: 'Good' },
      { inventoryId: 'inv2', name: 'Pillow', quantity: 2, status: 'Good' },
    ],
  },
  {
    id: '5',
    number: '301',
    floor: '3',
    type: 'Villa',
    status: 'Available',
    images: ['https://picsum.photos/seed/room301/400/300'],
    inventory: [
      { inventoryId: 'inv1', name: 'Towel', quantity: 6, status: 'Good' },
      { inventoryId: 'inv2', name: 'Pillow', quantity: 6, status: 'Good' },
      { inventoryId: 'inv3', name: 'Bathrobe', quantity: 4, status: 'Good' },
    ],
  },
];

export const mockInventory: InventoryItem[] = [
  {
    id: 'inv1',
    name: 'Towel',
    image: 'https://picsum.photos/seed/towel/100/100',
    unit: 'pcs',
    totalQuantity: 500,
    inStock: 300,
    inUse: 180,
    damaged: 20,
    compensationPrice: 15,
  },
  {
    id: 'inv2',
    name: 'Pillow',
    image: 'https://picsum.photos/seed/pillow/100/100',
    unit: 'pcs',
    totalQuantity: 200,
    inStock: 100,
    inUse: 95,
    damaged: 5,
    compensationPrice: 25,
  },
  {
    id: 'inv3',
    name: 'Bathrobe',
    image: 'https://picsum.photos/seed/bathrobe/100/100',
    unit: 'pcs',
    totalQuantity: 100,
    inStock: 40,
    inUse: 55,
    damaged: 5,
    compensationPrice: 45,
  },
];

export const mockBookings: Booking[] = [
  {
    id: 'b1',
    roomNumber: '102',
    guestName: 'John Doe',
    checkIn: '2026-03-30',
    checkOut: '2026-04-02',
    status: 'CheckedIn',
    totalAmount: 450,
  },
  {
    id: 'b2',
    roomNumber: '301',
    guestName: 'Jane Smith',
    checkIn: '2026-04-05',
    checkOut: '2026-04-10',
    status: 'Confirmed',
    totalAmount: 2500,
  },
];

export const mockCleaningTasks: CleaningTask[] = [
  {
    id: 'c1',
    roomNumber: '201',
    staffName: 'Alice Johnson',
    status: 'In Progress',
    startTime: '2026-03-31T08:00:00Z',
  },
  {
    id: 'c2',
    roomNumber: '101',
    staffName: 'Bob Wilson',
    status: 'Pending',
  },
];

export const mockPosts: Post[] = [
  {
    id: 'p1',
    title: 'Top 10 Places to Visit Near GrandView',
    content: 'Discover the best local attractions...',
    author: 'Admin',
    createdAt: '2026-03-25',
    status: 'Published',
    seoTitle: 'Top 10 Local Attractions',
    seoDescription: 'A guide to the best places to visit near GrandView Hotel.',
  },
];

export const mockLossAndDamages = [
  {
    id: '1',
    description: 'Broken lamp',
    room: '101',
    status: 'Pending',
  },
  {
    id: '2',
    description: 'Stained carpet',
    room: '102',
    status: 'Resolved',
  },
  {
    id: '3',
    description: 'Cracked window',
    room: '201',
    status: 'Unresolved',
  },
];
