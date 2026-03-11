export const STAGES: Record<string, { label: string; color: string }> = {
  pending_review: { label: 'Pending Review', color: '#FFBB44' },
  price_suggested: { label: 'Price Suggested', color: '#88BBFF' },
  price_accepted: { label: 'Price Accepted', color: '#44DD66' },
  price_rejected: { label: 'Price Rejected', color: '#FF4444' },
  pickup_proposed: { label: 'Pickup Proposed', color: '#FFBB44' },
  pickup_confirmed: { label: 'Pickup Confirmed', color: '#44DD66' },
  pickup_counter: { label: 'Time Suggested', color: '#FF8844' },
  pickup_cancelled: { label: 'Pickup Cancelled', color: '#FF4444' },
  pickup_scheduled: { label: 'Pickup Scheduled', color: '#FF8844' },
  driver_dispatched: { label: 'Driver Dispatched', color: '#AA88FF' },
  arrived_at_office: { label: 'At Office', color: '#88BBFF' },
  auth_passed: { label: 'Authenticated', color: '#44DD66' },
  auth_failed: { label: 'Auth Failed', color: '#FF4444' },
  photoshoot_done: { label: 'Photoshoot Done', color: '#AA88FF' },
  listed: { label: 'Listed', color: '#44DD66' },
  rejected: { label: 'Rejected', color: '#FF4444' },
};

/** Major stages shown in the seller progress bar */
export const PROGRESS_STEPS = [
  { key: 'pending_review', label: 'Submitted' },
  { key: 'price_suggested', label: 'Price Review' },
  { key: 'price_accepted', label: 'Pickup' },
  { key: 'arrived_at_office', label: 'Authentication' },
  { key: 'photoshoot_done', label: 'Photoshoot' },
  { key: 'listed', label: 'Listed' },
] as const;

/** Returns the step index for a given stage (for progress bar) */
export function getStepIndex(stage: string): number {
  const stageToStep: Record<string, number> = {
    pending_review: 0,
    price_suggested: 1,
    price_accepted: 2,
    price_rejected: -1,
    pickup_proposed: 2,
    pickup_confirmed: 2,
    pickup_counter: 2,
    pickup_cancelled: -1,
    pickup_scheduled: 2,
    driver_dispatched: 2,
    arrived_at_office: 3,
    auth_passed: 3,
    auth_failed: -1,
    photoshoot_done: 4,
    listed: 5,
    rejected: -1,
  };
  return stageToStep[stage] ?? -1;
}
