export interface StaffingRequirement {
  totalBartenders: number;

  openingBartenders: number;

  midBartenders: number;

  closingBartenders: number;

  /**
   * Overlaps openingBartenders and closingBartenders rather than adding to
   * them: each double is one person covering both ends of the day, so it
   * replaces one opening and one closing slot. See toShiftSlots.
   */
  doubleShifts: number;

  earlyFinishes: number;
}
