import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { MOCK_ROOMS } from '../../constants/mockData';

interface Room {
  id: string;
  name: string;
  type: string;
  price: number;
  status: string;
  image: string;
  rating: number;
  amenities: string[];
}

interface RoomState {
  rooms: Room[];
  loading: boolean;
}

const initialState: RoomState = {
  rooms: MOCK_ROOMS,
  loading: false,
};

const roomSlice = createSlice({
  name: 'room',
  initialState,
  reducers: {
    setRooms: (state, action: PayloadAction<Room[]>) => {
      state.rooms = action.payload;
    },
    addRoom: (state, action: PayloadAction<Room>) => {
      state.rooms.push(action.payload);
    },
    updateRoom: (state, action: PayloadAction<Room>) => {
      const index = state.rooms.findIndex(r => r.id === action.payload.id);
      if (index !== -1) {
        state.rooms[index] = action.payload;
      }
    },
    deleteRoom: (state, action: PayloadAction<string>) => {
      state.rooms = state.rooms.filter(r => r.id !== action.payload);
    },
  },
});

export const { setRooms, addRoom, updateRoom, deleteRoom } = roomSlice.actions;
export default roomSlice.reducer;
