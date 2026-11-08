import type { Amenity, Room } from '@prisma/client';

type RoomWithAmenities = Room & { amenities: { amenity: Amenity }[] };

export const toRoomDto = (room: RoomWithAmenities) => ({
  id: room.id,
  propertyId: room.propertyId,
  name: room.name,
  description: room.description,
  bedType: room.bedType,
  sizeSqm: room.sizeSqm,
  maxGuests: room.maxGuests,
  pricePerNight: room.pricePerNight,
  inventory: room.inventory,
  refundable: room.refundable,
  amenities: room.amenities.map(({ amenity }) => ({ slug: amenity.slug, name: amenity.name })),
});
