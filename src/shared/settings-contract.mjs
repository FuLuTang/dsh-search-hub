export const SETTINGS_VERSION = 1
export const SEARCH_HUB_SETTINGS_NAMESPACE = 'search-hub'
export const CHANNEL_IDS = ['exa-anon', 'ddg', 'grok']

export const defaultSettings = Object.freeze({
  version: SETTINGS_VERSION,
  defaultChannels: ['exa-anon', 'ddg'],
  channels: {
    'exa-anon': { enabled: true, maxResults: 8, timeoutMs: 30000 },
    ddg: { enabled: true, maxResults: 8, timeoutMs: 30000 },
    grok: { enabled: true, model: 'grok-4.6', maxResults: 8, timeoutMs: 30000, webSearch: true, xSearch: true },
  },
})

function bool(value, fallback) { return typeof value === 'boolean' ? value : fallback }
function integer(value, fallback, min, max) {
  return Number.isInteger(value) && value >= min && value <= max ? value : fallback
}
function channelList(value, fallback) {
  if (!Array.isArray(value)) return [...fallback]
  const known = [...new Set(value.filter(id => CHANNEL_IDS.includes(id)))]
  return known.length ? known : [...fallback]
}

/** Normalize untrusted persisted settings without accepting unknown channels. */
export function normalizeSettings(value = {}) {
  const supplied = value && typeof value === 'object' && !Array.isArray(value) ? value : {}
  const input = supplied.channels && typeof supplied.channels === 'object' ? supplied.channels : {}
  const exa = input['exa-anon'] ?? {}
  const ddg = input.ddg ?? {}
  const grok = input.grok ?? {}
  return {
    version: SETTINGS_VERSION,
    defaultChannels: channelList(supplied.defaultChannels, defaultSettings.defaultChannels),
    channels: {
      'exa-anon': { enabled: bool(exa.enabled, true), maxResults: integer(exa.maxResults, 8, 1, 20), timeoutMs: integer(exa.timeoutMs, 30000, 1000, 120000) },
      ddg: { enabled: bool(ddg.enabled, true), maxResults: integer(ddg.maxResults, 8, 1, 20), timeoutMs: integer(ddg.timeoutMs, 30000, 1000, 120000) },
      grok: { enabled: bool(grok.enabled, true), model: typeof grok.model === 'string' && grok.model.trim() ? grok.model.trim() : 'grok-4.6', maxResults: integer(grok.maxResults, 8, 1, 20), timeoutMs: integer(grok.timeoutMs, 30000, 1000, 120000), webSearch: bool(grok.webSearch, true), xSearch: bool(grok.xSearch, true) },
    },
  }
}

/** Reject a configuration that has no usable default channel. */
export function validateSettings(value) {
  const normalized = normalizeSettings(value)
  const enabledDefaults = normalized.defaultChannels.filter(id => normalized.channels[id].enabled)
  if (!enabledDefaults.length) throw new Error('Search Hub settings must retain at least one enabled default channel')
  if (normalized.channels.grok.enabled && !normalized.channels.grok.webSearch && !normalized.channels.grok.xSearch) throw new Error('Grok must enable Web Search and/or X Search')
  return normalized
}
