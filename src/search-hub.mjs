/**
 * Persistent DSH Search Hub agent-preset plugin.
 *
 * No proxy settings deliberately exist here: curl follows the host's normal
 * network path, which the user manages through Clash / Clash Verge.
 */
export const name = 'dsh-search-hub'
export const inject = ['shell', 'sandboxPolicy', 'credentials']

const EXA_MCP_URL = 'https://mcp.exa.ai/mcp'
const XAI_URL = 'https://api.x.ai/v1/responses'
const CHANNELS = ['exa-anon', 'ddg', 'grok']
const DEFAULTS = { xaiCredentialRef: 'XAI_API_KEY', grokModel: 'grok-4.6', timeoutMs: 30000, maxResults: 8 }

function text(value, fallback = '') {
  return typeof value === 'string' ? value : fallback
}

function quotePowerShell(value) {
  return `'${String(value).replaceAll("'", "''")}'`
}

function compact(value, max = 1600) {
  const source = String(value ?? '').replace(/\s+/g, ' ').trim()
  return source.length > max ? `${source.slice(0, max - 1)}…` : source
}

function jsonText(value) {
  return quotePowerShell(JSON.stringify(value))
}

function resultText(result) {
  const stdout = result?.stdout?.text ?? ''
  const stderr = result?.stderr?.text ?? ''
  if (result?.exitCode !== 0) throw new Error(compact(stderr || stdout || `curl exited ${result?.exitCode}`))
  return stdout
}

function parseJson(raw, channel) {
  try {
    return JSON.parse(raw)
  } catch {
    throw new Error(`${channel} returned non-JSON output: ${compact(raw, 300)}`)
  }
}

function signalPolicy(ctx, exec) {
  // Explicitly resolve the host's HTTP-capable mode. This is necessary on this
  // Windows deployment, whose workspace runner cannot perform network I/O.
  return ctx.sandboxPolicy.resolve({ mode: 'danger-full-access', session: exec.agent?.session })
}

async function curl(ctx, exec, command, timeoutMs) {
  const run = await ctx.shell.run({
    command,
    timeoutMs,
    stdoutMaxBytes: 96 * 1024,
    signal: exec.signal,
    sandboxPolicy: signalPolicy(ctx, exec),
  })
  return resultText(run)
}

function exaText(payload) {
  const pieces = []
  const content = payload?.result?.content ?? payload?.content
  if (Array.isArray(content)) {
    for (const item of content) {
      if (typeof item?.text === 'string') pieces.push(item.text)
      else if (typeof item?.content === 'string') pieces.push(item.content)
    }
  }
  if (typeof content === 'string') pieces.push(content)
  if (pieces.length > 0) return compact(pieces.join('\n'), 5000)
  return compact(JSON.stringify(payload?.result ?? payload), 5000)
}

function grokText(payload) {
  if (typeof payload?.output_text === 'string' && payload.output_text.trim()) return compact(payload.output_text, 5000)
  const pieces = []
  for (const item of payload?.output ?? []) {
    for (const part of item?.content ?? []) {
      if (typeof part?.text === 'string') pieces.push(part.text)
    }
  }
  return compact(pieces.join('\n') || JSON.stringify(payload), 5000)
}

function ddgText(html, maxResults) {
  const rows = []
  const regex = /<a[^>]*class="result-link"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<td[^>]*class="result-snippet"[^>]*>([\s\S]*?)<\/td>/g
  let match
  while ((match = regex.exec(html)) !== null && rows.length < maxResults) {
    const clean = value => compact(value.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#x27;/g, "'"), 500)
    rows.push(`${rows.length + 1}. ${clean(match[2])}\n   ${clean(match[3])}\n   ${match[1]}`)
  }
  if (rows.length > 0) return rows.join('\n')
  throw new Error('DuckDuckGo returned no parsable results (it may be locally blocked)')
}

async function searchExa(ctx, exec, query, config) {
  const body = { jsonrpc: '2.0', id: `dsh-${Date.now()}`, method: 'tools/call', params: { name: 'web_search_exa', arguments: { query, numResults: config.maxResults } } }
  const raw = await curl(ctx, exec, `curl.exe -sS --max-time ${Math.ceil(config.timeoutMs / 1000)} -N -H 'Accept: text/event-stream, application/json' -H 'Content-Type: application/json' --data-raw ${jsonText(body)} ${EXA_MCP_URL}`, config.timeoutMs)
  const dataLines = raw.split(/\r?\n/).filter(line => line.startsWith('data:')).map(line => line.slice(5).trim()).filter(Boolean)
  const payload = parseJson(dataLines.at(-1) ?? raw, 'Exa anonymous MCP')
  if (payload.error) throw new Error(compact(payload.error.message || JSON.stringify(payload.error)))
  return exaText(payload)
}

async function searchDdg(ctx, exec, query, config) {
  const url = `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(query)}`
  const raw = await curl(ctx, exec, `curl.exe -sS -L --max-time ${Math.ceil(config.timeoutMs / 1000)} ${quotePowerShell(url)}`, config.timeoutMs)
  return ddgText(raw, config.maxResults)
}

async function searchGrok(ctx, exec, query, config, usage) {
  const secret = await ctx.credentials.resolve(config.xaiCredentialRef)
  if (!secret?.value) throw new Error(`xAI key is not configured (${config.xaiCredentialRef}); use configure_key first`)
  const body = { model: config.grokModel, input: query, tools: [{ type: 'web_search' }, { type: 'x_search' }] }
  const command = `$env:XAI_API_KEY=${quotePowerShell(secret.value)}; curl.exe -sS --max-time ${Math.ceil(config.timeoutMs / 1000)} -H 'Content-Type: application/json' -H \"Authorization: Bearer $env:XAI_API_KEY\" --data-raw ${jsonText(body)} ${XAI_URL}`
  const payload = parseJson(await curl(ctx, exec, command, config.timeoutMs), 'xAI Grok')
  if (payload.error) throw new Error(compact(payload.error.message || JSON.stringify(payload.error)))
  usage.grokRequests += 1
  if (payload.usage && typeof payload.usage === 'object') usage.lastGrokUsage = payload.usage
  return grokText(payload)
}

function formatChannels(grokConfigured) {
  return [
    'Search Hub channels',
    `- exa-anon: ready | free | semantic / long-tail / Japanese fallback`,
    `- ddg: ready (network may be locally blocked) | free | basic fallback`,
    `- grok: ${grokConfigured ? 'ready' : 'key required'} | xAI usage-priced | web + X/Twitter coverage`,
    'Default policy: select exa-anon + ddg first; add grok when its coverage is worth the paid request.',
    'Proxy: not configured by this plugin; manage connectivity in Clash / Clash Verge.',
  ].join('\n')
}

function outputSchema() {
  return { type: 'object', additionalProperties: false, properties: { content: { type: 'string' } }, required: ['content'] }
}

function params(properties = {}, required = []) {
  return { type: 'object', additionalProperties: false, properties, ...(required.length ? { required } : {}) }
}

function output() {
  return { schema: outputSchema(), render: (_args, value) => [{ type: 'text', text: value.content }] }
}

export function apply(ctx, supplied = {}) {
  const config = { ...DEFAULTS, ...supplied }
  const usage = { grokRequests: 0, lastGrokUsage: undefined }

  ctx.systemPrompt.section({
    name: 'tool:search-hub', order: 112,
    text: 'Use search_channels to inspect Search Hub channel status. Use multi_search to select one or more channels; selected channels run in parallel. Prefer the free exa-anon and ddg channels first. Add grok for X/Twitter or valuable long-tail coverage only when an xAI key is configured. Results are human-readable text only; there is no browser panel. Network/proxy routing is user-managed in Clash / Clash Verge.',
  })

  ctx.tools.register({
    name: 'search_channels', description: 'Show human-readable Search Hub channel availability, price model, and key status.', parameters: params(), output: output(),
    async execute(_args, exec) {
      const configured = Boolean((await ctx.credentials.describe(config.xaiCredentialRef)).configured)
      return { content: formatChannels(configured) }
    },
  })

  ctx.tools.register({
    name: 'configure_key', description: 'Store an xAI/Grok API key securely for Search Hub. Never echoes the key.',
    parameters: params({ apiKey: { type: 'string', description: 'xAI API key to store securely.' } }, ['apiKey']), output: output(),
    async execute(args) {
      const apiKey = text(args?.apiKey).trim()
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
    name: 'multi_search', description: 'Run one or more selected search channels concurrently. Defaults to free exa-anon and ddg; select grok for xAI web and X/Twitter search.',
    parameters: params({
      query: { type: 'string', description: 'Search query.' },
      channels: { type: 'array', items: { type: 'string', enum: CHANNELS }, description: 'Channels to run concurrently. Default: exa-anon and ddg.' },
    }, ['query']), output: output(), isConcurrencySafe: () => true,
    async execute(args, exec) {
      const query = text(args?.query).trim()
      if (!query) throw new Error('query must not be empty')
      const requested = Array.isArray(args?.channels) && args.channels.length ? [...new Set(args.channels)] : ['exa-anon', 'ddg']
      const channels = requested.filter(channel => CHANNELS.includes(channel))
      if (!channels.length) throw new Error(`channels must include at least one of: ${CHANNELS.join(', ')}`)
      const tasks = channels.map(async channel => {
        try {
          const body = channel === 'exa-anon' ? await searchExa(ctx, exec, query, config)
            : channel === 'ddg' ? await searchDdg(ctx, exec, query, config)
            : await searchGrok(ctx, exec, query, config, usage)
          return `## ${channel}\n${body}`
        } catch (error) {
          return `## ${channel} — unavailable\n${compact(error?.message || error, 900)}`
        }
      })
      return { content: [`Search Hub results for: ${query}`, ...(await Promise.all(tasks))].join('\n\n') }
    },
  })
}
