// frontend/src/utils/micLock.js
// Global mic ownership lock — prevents multiple SpeechRecognition instances
// from fighting over the microphone simultaneously.
//
// OWNERS:
//   null        → mic is free
//   "wakeword"  → WakeWord listener owns it
//   "friday"    → FRIDAY command mic owns it
//   "meeting"   → MeetingRoom transcription owns it

let _owner = null;
const _listeners = new Set();

export const micLock = {
  /** Current owner or null */
  get owner() {
    return _owner;
  },

  /** Returns true if mic is free or already owned by requester */
  canAcquire(requester) {
    return _owner === null || _owner === requester;
  },

  /** Acquire the lock. Returns true on success, false if already locked by someone else. */
  acquire(requester) {
    if (_owner !== null && _owner !== requester) {
      console.warn(
        `[MicLock] ❌ ${requester} tried to acquire — locked by ${_owner}`,
      );
      return false;
    }
    if (_owner !== requester) {
      _owner = requester;
      console.log(`[MicLock] 🔒 ${requester} acquired`);
      _notify();
    }
    return true;
  },

  /** Release the lock. Only the current owner can release. */
  release(requester) {
    if (_owner !== requester) return;
    _owner = null;
    console.log(`[MicLock] 🔓 ${requester} released`);
    _notify();
  },

  /** Force-release regardless of owner (emergency stop only) */
  forceRelease() {
    const prev = _owner;
    _owner = null;
    if (prev) {
      console.log(`[MicLock] ⚡ Force released (was: ${prev})`);
      _notify();
    }
  },

  /** Subscribe to lock changes */
  subscribe(fn) {
    _listeners.add(fn);
    return () => _listeners.delete(fn);
  },
};

function _notify() {
  _listeners.forEach((fn) => fn(_owner));
}

export default micLock;
