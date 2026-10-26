export type RoomStatus = 'Available' | 'Occupied' | 'Cleaning' | 'Maintenance';
export type RoomType = 'Single' | 'Double' | 'Suite' | 'Deluxe' | 'Villa' | 'Apartment';

export interface Room {
  id: string;
  number: string;
  floor: string;
  type: RoomType;
  status: RoomStatus;
  images: string[];
  inventory: RoomInventoryItem[];
}

export interface InventoryItem {
  id: string;
  name: string;
  image: string;
  unit: string;
  totalQuantity: number;
  inStock: number;
  inUse: number;
  damaged: number;
  compensationPrice: number;
}

export interface RoomInventoryItem {
  inventoryId: string;
  name: string;
  quantity: number;
  status: 'Good' | 'Damaged' | 'Lost';
}

export interface Booking {
  id: string;
  roomNumber: string;
  guestName: string;
  checkIn: string;
  checkOut: string;
  status: 'Pending' | 'Confirmed' | 'CheckedIn' | 'CheckedOut' | 'Cancelled';
  totalAmount: number;
}

export interface CleaningTask {
  id: string;
  roomNumber: string;
  staffName: string;
  status: 'Pending' | 'In Progress' | 'Completed';
  startTime?: string;
  endTime?: string;
}

export interface Post {
  id: string;
  title: string;
  content: string;
  author: string;
  createdAt: string;
  status: 'Draft' | 'Published';
  seoTitle?: string;
  seoDescription?: string;
}
