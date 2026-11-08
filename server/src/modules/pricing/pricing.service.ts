import { config } from '../../config.js';
import { nightsBetween } from '../../lib/dates.js';

export interface QuoteInput {
  pricePerNight: number;
  checkIn: Date;
  checkOut: Date;
  rooms: number;
}

/** All amounts are integer minor units. */
export function calculateQuote({ pricePerNight, checkIn, checkOut, rooms }: QuoteInput) {
  const nights = nightsBetween(checkIn, checkOut);
  const subtotal = pricePerNight * nights * rooms;
  const taxes = Math.round(subtotal * config.pricing.taxRate);
  return {
    nights,
    rooms,
    nightlyPrice: pricePerNight,
    subtotal,
    taxes,
    total: subtotal + taxes,
    taxRate: config.pricing.taxRate,
    currency: config.pricing.currency,
  };
}
