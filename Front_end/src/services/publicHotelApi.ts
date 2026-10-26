import axiosClient from '../api/axiosClient';
import type { RoomTypeDto } from './adminApi';

export interface PublicRoomType extends RoomTypeDto {
  primaryImage: string;
  displayPrice: number;
  capacityLabel: string;
}

const FALLBACK_ROOM_IMAGE =
  'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&q=80&w=1600';

export const mapRoomTypeToPublicRoom = (roomType: RoomTypeDto): PublicRoomType => {
  const primaryImage =
    roomType.images?.find((image) => image.isPrimary)?.imageUrl ||
    roomType.images?.[0]?.imageUrl ||
    FALLBACK_ROOM_IMAGE;

  const adults = roomType.capacityAdults ?? 0;
  const children = roomType.capacityChildren ?? 0;
  const capacityLabel = [adults ? `${adults} adults` : '', children ? `${children} children` : '']
    .filter(Boolean)
    .join(', ');

  return {
    ...roomType,
    primaryImage,
    displayPrice: roomType.basePrice ?? 0,
    capacityLabel: capacityLabel || 'Contact hotel',
  };
};

export const publicHotelApi = {
  getRoomTypes: async (): Promise<PublicRoomType[]> => {
    const response = (await axiosClient.get('/api/RoomTypes')) as RoomTypeDto[];
    return response.filter((roomType) => roomType.isActive).map(mapRoomTypeToPublicRoom);
  },

  getRoomTypeById: async (id: number): Promise<PublicRoomType> => {
    const response = (await axiosClient.get(`/api/RoomTypes/${id}`)) as RoomTypeDto;
    return mapRoomTypeToPublicRoom(response);
  },

  sendContactMessage: async (data: { fullName: string, email: string, subject: string, message: string }) => {
    return await axiosClient.post('/api/Contact', data);
  }
};

