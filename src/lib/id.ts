/**
 * Generates a RFC4122-ish v4 UUID string for local model ids (the RN
 * counterpart to Swift's `UUID()`). Backend `serverId`s are assigned on sync,
 * which is deferred.
 */
export function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
