import type { Reply } from './models'
export type FileProgress = { loaded: number; total: number; status: string }
export type FileMap = Record<string, FileProgress>
export function updateProgress(files: FileMap, reply: Extract<Reply, { type: 'progress' }>): FileMap {
  const old = files[reply.file]
  // Lifecycle callbacks omit bytes. A genuine byte report of zero is not omitted.
  const bytes = reply.status === 'progress'
  return { ...files, [reply.file]: {
    loaded: bytes ? Math.max(0, reply.loaded) : old?.loaded ?? 0,
    total: reply.total > 0 ? reply.total : old?.total ?? 0,
    status: reply.status,
  } }
}
export function aggregateProgress(files: FileMap) {
  const values = Object.values(files)
  const known = values.filter(p => p.total > 0)
  const total = known.reduce((sum, p) => sum + p.total, 0)
  const loaded = known.reduce((sum, p) => sum + Math.min(p.loaded, p.total), 0)
  // Only the reported files, never a forecast of files the library hasn't announced.
  return { loaded, total, unknown: values.length - known.length,
    percent: values.length && known.length === values.length && total > 0 ? Math.min(100, loaded / total * 100) : null }
}
