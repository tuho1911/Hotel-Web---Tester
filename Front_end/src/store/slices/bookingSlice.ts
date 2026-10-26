import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { MOCK_BOOKINGS } from '../../constants/mockData';

interface Booking {
  id: string;
  userId: string;
  roomId: string;
  checkIn: string;
  checkOut: string;
  status: string;
  total: number;
}

interface BookingState {
  bookings: Booking[];
  loading: boolean;
}

const initialState: BookingState = {
  bookings: MOCK_BOOKINGS,
  loading: false,
};

const bookingSlice = createSlice({
  name: 'booking',
  initialState,
  reducers: {
    setBookings: (state, action: PayloadAction<Booking[]>) => {
      state.bookings = action.payload;
    },
    updateBookingStatus: (state, action: PayloadAction<{ id: string; status: string }>) => {
      const booking = state.bookings.find(b => b.id === action.payload.id);
      if (booking) {
        booking.status = action.payload.status;
      }
    },
  },
});

export const { setBookings, updateBookingStatus } = bookingSlice.actions;
export default bookingSlice.reducer;
