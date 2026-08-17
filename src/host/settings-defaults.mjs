export const SEARCH_HUB_SETTINGS_NAMESPACE = 'search-hub'

// Kept as plain JSON so adapters are testable outside DSH. The profile-facing
// host entry will register the equivalent Schemastery schema through DSH Settings.
export const defaultSearchHubSettings = Object.freeze({
  defaultChannels: ['exa-anon', 'ddg'],
  channels: {
    'exa-anon': { enabled: true, maxResults: 8, timeoutMs: 30000 },
    ddg: { enabled: true, maxResults: 8, timeoutMs: 30000 },
    grok: { enabled: true, model: 'grok-4.6', maxResults: 8, timeoutMs: 30000, webSearch: true, xSearch: true },
  },
})

export function normalizeSettings(value = {}) {
  const supplied = value && typeof value === 'object' ? value : {}
  const channels = {}
  for (const [id, fallback] of Object.entries(defaultSearchHubSettings.channels)) {
    const candidate = supplied.channels?.[id] ?? {}
    channels[id] = { ...fallback, ...candidate }
  }
  return { ...defaultSearchHubSettings, ...supplied, channels }
}
