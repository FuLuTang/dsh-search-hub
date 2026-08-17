export const channelCatalog = Object.freeze({
  'exa-anon': {
    id: 'exa-anon', label: 'Exa Anonymous', free: true, credentialRef: undefined,
    capabilities: ['semantic', 'long-tail', 'japanese'], defaultEnabled: true,
    settings: ['enabled', 'maxResults', 'timeoutMs'],
    description: 'Anonymous Exa MCP semantic search; free fallback for long-tail and Japanese queries.',
  },
  ddg: {
    id: 'ddg', label: 'DuckDuckGo', free: true, credentialRef: undefined,
    capabilities: ['web', 'basic'], defaultEnabled: true,
    settings: ['enabled', 'maxResults', 'timeoutMs'],
    description: 'Free DuckDuckGo Lite fallback. Availability depends on local network and anti-bot behavior.',
  },
  grok: {
    id: 'grok', label: 'xAI Grok', free: false, credentialRef: 'XAI_API_KEY',
    capabilities: ['web', 'x-twitter', 'long-tail'], defaultEnabled: false,
    settings: ['enabled', 'model', 'maxResults', 'timeoutMs', 'webSearch', 'xSearch'],
    description: 'xAI Responses API with Web and X/Twitter search. Requires an xAI API key and incurs API usage.',
  },
})

export function listChannelStatus(config, keyConfigured) {
  return Object.values(channelCatalog).map(channel => {
    const options = config.channels[channel.id]
    const ready = channel.credentialRef && !keyConfigured ? 'key required' : options.enabled ? 'ready' : 'disabled'
    return `- ${channel.id}: ${ready} | ${channel.free ? 'free' : 'xAI usage-priced'} | ${channel.description}`
  })
}

export function selectedChannels(input, config) {
  const requested = Array.isArray(input) && input.length ? [...new Set(input)] : ['exa-anon', 'ddg']
  const selected = requested.filter(id => Object.hasOwn(channelCatalog, id))
  if (!selected.length) throw new Error(`channels must include at least one of: ${Object.keys(channelCatalog).join(', ')}`)
  for (const id of selected) if (!config.channels[id].enabled) throw new Error(`channel ${id} is disabled in Search Hub settings`)
  return selected
}
