// INACTIVE COPY ONLY. No notification scheduling, photo classification or rejection.
// Not exported as playable events; not imported by any screen or component.
export const REMINDER_TEMPLATES = {
  cat: {
    20: 'psst. 20 mins. leg bones maybe prepare? mrrp.',
    10: 'human. foot gloves maybe? door has suspicious handle.',
    5: 'jacket? water bottle? why book steals eyes. MEOW EMWOE.',
    0: 'outside time idea. feet may march. loaf accepts slow days.',
  },
  dog: {
    20: '20 minutes! Shoe thoughts! WOOF!',
    10: '10 minutes! Foot gloves! Is it walk soon? ARF?',
    5: '5 minutes! Jacket! Water! I bring imaginary stick! BORK!',
    0: 'WALK TIME IDEA! Human, we can go when ready! HEEK!',
  },
} as const
export const INACTIVE_VERIFICATION_TEMPLATES = {
  cat: { indoor: 'THIS IS CEILING. ceiling is not outside.', missingPerson: 'i see tree. where human-shaped creature?' },
  dog: { indoor: 'CEILING? Where outside? Confused woof.', missingPerson: 'Tree! Amazing! Where is human in picture?' },
} as const
export const FUTURE_TEMPLATE_STATUS = 'not-connected' as const
