import { listChannelStatus, selectedChannels } from './host/channel-registry.mjs'
import { defaultSearchHubSettings, normalizeSettings, SEARCH_HUB_SETTINGS_NAMESPACE } from './host/settings-defaults.mjs'
import * as exa from './host/adapters/exa-anon.mjs'
import * as ddg from './host/adapters/ddg.mjs'
import * as grok from './host/adapters/grok.mjs'
import { compact } from './host/runtime.mjs'

export const name = 'dsh-search-hub'
export const inject = ['shell', 'sandboxPolicy', 'credentials']

const adapters = new Map([[exa.id, exa], [ddg.id, ddg], [grok.id, grok]])
const defaultConfig = { xaiCredentialRef: 'XAI_API_KEY', settings: defaultSearchHubSettings }

function params(properties = {}, required = []) {
  return { type: 'object', additionalProperties: false, properties, ...(required.length ? { required } : {}) }
}
function output() {
  return {
    schema: { type: 'object', additionalProperties: false, properties: { content: { type: 'string' } }, required: ['content'] },
    render: (_args, value) => [{ type: 'text', text: value.content }],
  }
}

export function apply(ctx, supplied = {}) {
  const config = { ...defaultConfig, ...supplied }
  // Settings integration is deliberately isolated: until the host profile exposes
  // the namespace to Web API proxy, the composition config remains the fallback.
  let activeSettings = () => normalizeSettings(config.settings)
  const usage = { grokRequests: 0, lastGrokUsage: undefined }

  ctx.systemPrompt.section({
    name: 'tool:search-hub', order: 112,
    text: 'Use search_channels to inspect Search Hub channel status. Use multi_search to select one or more enabled channels; selected channels run in parallel. Prefer free exa-anon and ddg first. Add grok for X/Twitter or valuable long-tail coverage only when its xAI key is configured. Results are human-readable text only; there is no search-results browser panel. Configure channels through Search Hub settings when the profile integration is installed.',
  })

  ctx.tools.register({
    name: 'search_channels', description: 'Show Search Hub channel availability, capabilities, price model, and key status.', parameters: params(), output: output(),
    async execute() {
      const key = await ctx.credentials.describe(config.xaiCredentialRef)
      const settings = activeSettings()
      return { content: [`Search Hub settings namespace: ${SEARCH_HUB_SETTINGS_NAMESPACE}`, ...listChannelStatus(settings, key.configured), 'Default policy: exa-anon + ddg first; add grok only where its coverage is worth paid usage.', 'Proxy: Search Hub does not override proxy routing; configure Clash / Clash Verge manually.'].join('\n') }
    },
  })

  ctx.tools.register({
    name: 'configure_key', description: 'Store an xAI/Grok API key securely for Search Hub. Never echoes the key.',
    parameters: params({ apiKey: { type: 'string', description: 'xAI API key to store securely.' } }, ['apiKey']), output: output(),
    async execute(args) {
      const apiKey = String(args?.apiKey ?? '').trim()
      if (!apiKey) throw new Error('apiKey must not be empty')
      await ctx.credentials.set(config.xaiCredentialRef, apiKey)
      return { content: `xAI key stored securely under ${config.xaiCredentialRef}. The value was not displayed.` }
    },
  })

  ctx.tools.register({
    name: 'check_balance', description: 'Show safe xAI key status and observed Grok usage. Does not expose secrets or invent an account balance.', parameters: params(), output: output(),
    async execute() {
      const key = await ctx.credentials.describe(config.xaiCredentialRef)
      const last = usage.lastGrokUsage ? `\nLast observed Grok API usage: ${compact(JSON.stringify(usage.lastGrokUsage), 800)}` : ''
      return { content: `xAI/Grok: ${key.configured ? `key configured (${key.source ?? 'credential store'})` : `key not configured (${config.xaiCredentialRef})`}\nObserved Grok requests since plugin start: ${usage.grokRequests}\nAccount balance: unavailable through a stable public xAI API; check the xAI console for authoritative billing.${last}` }
    },
  })

  ctx.tools.register({
    name: 'multi_search', description: 'Run selected enabled search channels concurrently. Defaults to free exa-anon and ddg; select grok for xAI Web and X/Twitter search.',
    parameters: params({ query: { type: 'string', description: 'Search query.' }, channels: { type: 'array', items: { type: 'string', enum: ['exa-anon', 'ddg', 'grok'] }, description: 'Channels to run concurrently. Default: exa-anon and ddg.' } }, ['query']),
    output: output(), isConcurrencySafe: () => true,
    async execute(args, exec) {
      const query = String(args?.query ?? '').trim()
      if (!query) throw new Error('query must not be empty')
      const settings = activeSettings()
      const channels = selectedChannels(args?.channels, settings)
      const tasks = channels.map(async id => {
        try {
          const adapter = adapters.get(id)
          const result = await adapter.search(ctx, exec, query, settings.channels[id], config.xaiCredentialRef)
          if (id === 'grok') { usage.grokRequests += 1; usage.lastGrokUsage = result.usage }
          return `## ${id}\n${result.text}`
        } catch (error) {
          return `## ${id} — unavailable\n${compact(error?.message || error, 900)}`
        }
      })
      return { content: [`Search Hub results for: ${query}`, ...(await Promise.all(tasks))].join('\n\n') }
    },
  })
}
