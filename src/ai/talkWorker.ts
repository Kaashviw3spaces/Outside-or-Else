// Reached only after explicit wake and support checks, never on room render.
export function createTalkWorker() { return new Worker(new URL('./inference.worker.ts',import.meta.url),{type:'module'}) }
