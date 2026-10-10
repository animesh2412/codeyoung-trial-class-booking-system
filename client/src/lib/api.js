const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error?.message || 'We could not complete that request. Please try again.');
  return payload;
}
export const getSlots = (date, timezone) => request(`/slots?date=${encodeURIComponent(date)}&timezone=${encodeURIComponent(timezone)}`);
export const createBooking = (booking) => request('/bookings', { method: 'POST', body: JSON.stringify(booking) });
