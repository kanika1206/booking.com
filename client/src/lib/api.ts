export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    credentials: 'same-origin',
    headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
    ...init,
  });
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const e = body?.error;
    throw new ApiError(res.status, e?.code ?? 'UNKNOWN', e?.message ?? 'Something went wrong', e?.details);
  }
  return body as T;
}

const qs = (params: Record<string, string | number | undefined>) => {
  const s = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') s.set(k, String(v));
  const out = s.toString();
  return out ? `?${out}` : '';
};

export interface User { id: string; email: string; firstName: string; lastName: string; phone: string | null; role: 'USER' | 'ADMIN' }
export interface Destination { id: string; slug: string; name: string; country: string; description: string; imageUrl: string; propertyCount: number }
export interface PageMeta { page: number; limit: number; total: number; totalPages: number }
export type HostStatus = 'NEW' | 'CONTACTED' | 'APPROVED' | 'DECLINED';
export type PropertyType = 'HOTEL' | 'APARTMENT' | 'RESORT' | 'VILLA' | 'HOSTEL' | 'GUESTHOUSE';
export interface HostApplicationInput { name: string; email: string; phone?: string; propertyName: string; city: string; propertyType: PropertyType; rooms: number; message?: string }
export interface HostApplication extends HostApplicationInput { id: string; phone?: string; message?: string; status: HostStatus; createdAt: string }
export interface Quote { nights: number; rooms: number; nightlyPrice: number; subtotal: number; taxes: number; total: number; taxRate: number; currency: string }
export interface PropertyCard {
  id: string; slug: string; name: string; type: string; stars: number; address: string;
  ratingAvg: number; reviewCount: number; imageUrl: string | null; imageAlt: string;
  destination: { slug: string; name: string; country: string };
  amenities: { slug: string; name: string }[];
  startingPrice: number | null;
}
export interface SearchResult extends PropertyCard {
  quote: Quote | null;
  latitude: number;
  longitude: number;
  room: { id: string; name: string; bedType: string; sizeSqm: number; refundable: boolean };
}
export interface Facet { key: string; label: string; count: number }
export interface SearchMeta { page: number; limit: number; total: number; totalPages: number; facets: { types: Facet[]; amenities: Facet[]; priceRange: { min: number; max: number } } }
export interface Room { id: string; propertyId: string; name: string; description: string; bedType: string; sizeSqm: number; maxGuests: number; pricePerNight: number; inventory: number; refundable: boolean; amenities: { slug: string; name: string }[] }
export interface RoomAvailability extends Room { availableUnits: number; fitsParty: boolean; available: boolean; quote: Quote }
export interface PropertyDetail extends PropertyCard { description: string; latitude: number; longitude: number; images: { url: string; alt: string }[]; rooms: Room[] }
export interface Review { id: string; rating: number; title: string; comment: string; createdAt: string; author: string }
export interface Booking {
  id: string; reference: string; status: 'CONFIRMED' | 'CANCELLED'; checkIn: string; checkOut: string;
  adults: number; children: number; rooms: number;
  guest: { firstName: string; lastName: string; email: string; phone: string | null };
  specialRequests: string | null;
  price: { nightlyPrice: number; subtotal: number; taxes: number; total: number; currency: string };
  canCancel: boolean; createdAt: string;
  room: { id: string; name: string; refundable: boolean };
  property: { id: string; slug: string; name: string; address: string; imageUrl: string | null; destination: string };
}
export interface CreateBookingInput {
  roomId: string; checkIn: string; checkOut: string; adults: number; children: number; rooms: number;
  guest: { firstName: string; lastName: string; email: string; phone?: string };
  specialRequests?: string;
}
export interface SearchQuery {
  destination?: string; checkIn?: string; checkOut?: string; adults?: number; children?: number; rooms?: number;
  minPrice?: number; maxPrice?: number; minRating?: number; types?: string; amenities?: string;
  sort?: string; page?: number; limit?: number;
}

export const api = {
  me: () => request<{ data: User }>('/users/me').then((r) => r.data),
  login: (email: string, password: string) =>
    request<{ data: User }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }).then((r) => r.data),
  register: (input: { email: string; password: string; firstName: string; lastName: string }) =>
    request<{ data: User }>('/auth/register', { method: 'POST', body: JSON.stringify(input) }).then((r) => r.data),
  logout: () => request<void>('/auth/logout', { method: 'POST' }),
  updateMe: (input: { firstName?: string; lastName?: string; phone?: string | null }) =>
    request<{ data: User }>('/users/me', { method: 'PATCH', body: JSON.stringify(input) }).then((r) => r.data),

  destinations: (q: { q?: string; featured?: boolean; limit?: number } = {}) =>
    request<{ data: Destination[] }>(`/destinations${qs({ q: q.q, featured: q.featured === undefined ? undefined : String(q.featured), limit: q.limit })}`).then((r) => r.data),
  search: (q: SearchQuery) =>
    request<{ data: SearchResult[]; meta: SearchMeta }>(`/search${qs({ ...q })}`),
  featured: (limit = 4) => request<{ data: PropertyCard[] }>(`/properties/featured${qs({ limit })}`).then((r) => r.data),
  property: (slug: string) => request<{ data: PropertyDetail }>(`/properties/${encodeURIComponent(slug)}`).then((r) => r.data),
  reviews: (propertyId: string, limit = 6) =>
    request<{ data: Review[]; meta: { total: number } }>(`/properties/${propertyId}/reviews${qs({ limit })}`),
  room: (id: string) => request<{ data: Room }>(`/rooms/${id}`).then((r) => r.data),
  availability: (q: { propertyId: string; checkIn: string; checkOut: string; adults: number; children: number; rooms: number }) =>
    request<{ data: RoomAvailability[] }>(`/availability${qs({ ...q })}`).then((r) => r.data),

  createBooking: (input: CreateBookingInput) =>
    request<{ data: Booking }>('/bookings', { method: 'POST', body: JSON.stringify(input) }).then((r) => r.data),
  bookings: (scope: 'upcoming' | 'past' | 'cancelled' | 'all') =>
    request<{ data: Booking[]; meta: { total: number } }>(`/bookings${qs({ scope, limit: 50 })}`),
  booking: (id: string) => request<{ data: Booking }>(`/bookings/${id}`).then((r) => r.data),
  cancelBooking: (id: string, reason?: string) =>
    request<{ data: Booking }>(`/bookings/${id}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) }).then((r) => r.data),

  favorites: () => request<{ data: PropertyCard[] }>('/favorites').then((r) => r.data),
  addFavorite: (id: string) => request<void>(`/favorites/${id}`, { method: 'PUT' }),
  removeFavorite: (id: string) => request<void>(`/favorites/${id}`, { method: 'DELETE' }),

  destination: (slug: string) => request<{ data: Destination }>(`/destinations/${encodeURIComponent(slug)}`).then((r) => r.data),
  postReview: (propertyId: string, input: { rating: number; title: string; comment: string }) =>
    request<{ data: Review }>(`/properties/${propertyId}/reviews`, { method: 'POST', body: JSON.stringify(input) }).then((r) => r.data),

  applyToHost: (input: HostApplicationInput) =>
    request<{ data: { id: string; status: HostStatus } }>('/host-applications', { method: 'POST', body: JSON.stringify(input) }).then((r) => r.data),

  // Admin only. The server checks the role; these calls just 403 for anyone else.
  adminBookings: (page = 1) => request<{ data: Booking[]; meta: PageMeta }>(`/bookings/admin/all${qs({ page, limit: 20 })}`),
  hostApplications: (status?: HostStatus) => request<{ data: HostApplication[]; meta: PageMeta }>(`/host-applications${qs({ status, limit: 50 })}`),
  setHostStatus: (id: string, status: HostStatus) =>
    request<{ data: HostApplication }>(`/host-applications/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }).then((r) => r.data),
};
