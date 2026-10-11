// Shared seats-left math for anything rendering an event's capacity
// (EventCard's list row, EventDetails' full card) — previously duplicated
// with inconsistent clamping between the two.
export function eventCapacityStatus(capacity: number, attendeeCount: number) {
  const spotsLeft = Math.max(0, capacity - attendeeCount);
  return {
    spotsLeft,
    isFull: spotsLeft <= 0,
    fillPercent: Math.min(100, (attendeeCount / capacity) * 100),
  };
}
