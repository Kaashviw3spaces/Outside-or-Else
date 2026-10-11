// Settings supported by the installed Transformers.js 4.3.1 generation path.
// top_p is omitted: its processor is unimplemented in this version.
export const GENERATION_SETTINGS = {
  'checkpoint-9a': { max_new_tokens: 80, do_sample: true, temperature: 0.7, top_k: 20, repetition_penalty: 1.1 },
  'checkpoint-9b': { max_new_tokens: 80, do_sample: true, temperature: 0.75, top_k: 20, repetition_penalty: 1.05 },
  '9b1-balanced': { max_new_tokens: 72, do_sample: true, temperature: 0.65, top_k: 20, repetition_penalty: 1.05 },
  '9b1-restrained': { max_new_tokens: 64, do_sample: true, temperature: 0.5, top_k: 10, repetition_penalty: 1.08 },
} as const
export type GenerationConfiguration = keyof typeof GENERATION_SETTINGS
