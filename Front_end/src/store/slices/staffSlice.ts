import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type RoomStatus = 'VACANT' | 'OCCUPIED' | 'CLEANING';

export interface Room {
  id: string;
  number: string;
  type: 'Deluxe' | 'Suite' | 'Royal';
  status: RoomStatus;
}

export interface Arrival {
  id: string;
  guestName: string;
  roomNumber: string;
  bookingId: string;
  checkInTime: string;
}

interface StaffState {
  rooms: Room[];
  arrivals: Arrival[];
}

const initialState: StaffState = {
  rooms: [
    { id: '1', number: '101', type: 'Deluxe', status: 'VACANT' },
    { id: '2', number: '102', type: 'Deluxe', status: 'OCCUPIED' },
    { id: '3', number: '103', type: 'Suite', status: 'CLEANING' },
    { id: '4', number: '104', type: 'Royal', status: 'VACANT' },
    { id: '5', number: '201', type: 'Deluxe', status: 'OCCUPIED' },
    { id: '6', number: '202', type: 'Suite', status: 'VACANT' },
    { id: '7', number: '203', type: 'Royal', status: 'CLEANING' },
    { id: '8', number: '204', type: 'Suite', status: 'VACANT' },
  ],
  arrivals: [
    { id: '1', guestName: 'Alice Johnson', roomNumber: '101', bookingId: 'BK-9921', checkInTime: '14:00' },
    { id: '2', guestName: 'Bob Smith', roomNumber: '202', bookingId: 'BK-9922', checkInTime: '15:30' },
    { id: '3', guestName: 'Charlie Brown', roomNumber: '204', bookingId: 'BK-9923', checkInTime: '16:00' },
  ],
};

const staffSlice = createSlice({
  name: 'staff',
  initialState,
  reducers: {
    updateRoomStatus: (state, action: PayloadAction<{ roomId: string; status: RoomStatus }>) => {
      const room = state.rooms.find(r => r.id === action.payload.roomId);
      if (room) {
        room.status = action.payload.status;
      }
    },
    confirmCheckIn: (state, action: PayloadAction<string>) => {
      state.arrivals = state.arrivals.filter(a => a.id !== action.payload);
    },
  },
});

export const { updateRoomStatus, confirmCheckIn } = staffSlice.actions;
export default staffSlice.reducer;
