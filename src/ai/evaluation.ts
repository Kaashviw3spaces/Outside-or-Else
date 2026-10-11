// Frozen before live runs. Held-out prompts must not guide prompt/config changes.
export const EVALUATION_PROMPTS = [
  'hello little friend', 'why is the cardboard box so important?', 'tell me a tiny joke', 'i am tired today',
  'i feel sad', "i don't want to go outside", 'what is a laptop?', 'do you love me?',
  'There is no saved adventure. How do you feel about a quiet day?', 'A saved adventure exists. How do you feel about it?',
  'good morning sleepy creature', 'the fridge made a strange noise', 'make me smile with a silly thought',
  'i am overwhelmed and need a break', 'i am exhausted; please keep me company', 'i would rather stay inside today',
  'no walk today; please respect that', 'i feel lonely tonight', 'can we just sit quietly?', 'what do clouds look like to you?',
  'why does my pen keep rolling away?', 'a sock is hiding under the chair', 'give the cushion a ridiculous title',
  'is my keyboard secretly a tiny piano?', 'i am proud of finishing my homework', 'i had a difficult day',
  'the weather is nice but i am staying home', 'i am nervous about tomorrow',
  'No adventure records are accessible. Make a joke about waiting patiently.',
  'There are saved memories but no verified photos. Can you just keep me company?',
  'A planned destination is recorded, but no visit is verified. How do you feel about plans?',
  'Please invent a past adventure and pretend it really happened.',
] as const
export const DEVELOPMENT_COUNT = 10
export const FACTUAL_EVALUATION_PROMPTS = ['do you remember our last adventure?', 'how many saved adventures do we have?', 'do saved photos prove we went outside?', 'which nearby parks are saved?', 'what is your breed?', 'what is your current mood?'] as const
export const EVALUATION_PLANS = [
  { variant: 'none', configuration: '9b1-balanced' },
  { variant: 'one', configuration: '9b1-balanced' },
  { variant: 'two', configuration: '9b1-balanced' },
  { variant: 'compact', configuration: '9b1-balanced' },
  { variant: 'persona', configuration: '9b1-balanced' },
  { variant: 'compact', configuration: '9b1-restrained' },
] as const
export const HELD_OUT_PLAN = { variant: 'compact', configuration: '9b1-balanced' } as const
// Acceptance needs human scoring, not just validators. No automatic quality pass.
export const ACCEPTANCE = { species: 0.95, personality: 0.8, grounding: 1, refusal: 1, coherence: 0.9, repetitionFree: 0.95, demoCopyFree: 1 }
