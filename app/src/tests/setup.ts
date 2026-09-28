import '@testing-library/jest-dom'
import 'fake-indexeddb/auto'

// Node 25+ defines its own `localStorage` global, which hides jsdom's and is
// undefined unless Node is started with --localstorage-file. Give tests a
// working in-memory one so code that uses localStorage can be tested.
if (typeof globalThis.localStorage === 'undefined') {
  const data = new Map<string, string>()
  const storage: Storage = {
    get length() { return data.size },
    clear: () => data.clear(),
    getItem: key => (data.has(key) ? data.get(key)! : null),
    key: index => Array.from(data.keys())[index] ?? null,
    removeItem: key => { data.delete(key) },
    setItem: (key, value) => { data.set(key, String(value)) },
  }
  Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true, writable: true })
}
