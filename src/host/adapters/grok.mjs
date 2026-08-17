import { compact, curlPostJson, parseJson, quotePowerShell } from '../runtime.mjs'

const URL = 'https://api.x.ai/v1/responses'
const REASONING_EFFORTS = new Set(['none', 'low', 'medium', 'high'])
export const id = 'grok'

function instructionFor(query, settings) {
  const scopes = [settings.webSearch && 'the web', settings.xSearch && 'X (Twitter)'].filter(Boolean)
  return `Search ${scopes.join(' and ')} for: ${query}. Perform exactly one search per enabled tool, then summarize the top results with citations.`
}

function sourcesFrom(payload) {
  const output = Array.isArray(payload.output) ? payload.output : []
  const urls = []
  for (const item of output) {
    if (item?.type === 'web_search_call') {
      for (const source of item?.action?.sources ?? []) if (source?.url) urls.push(source.url)
    }
  }
  const message = output.find(item => item?.type === 'message')
  const citations = (message?.content ?? []).flatMap(part => part?.annotations ?? []).filter(a => a?.type === 'url_citation' && a?.url)
  for (const cite of citations) urls.push(cite.url)
  return { urls: [...new Set(urls)], text: (message?.content ?? []).map(part => part?.text).filter(Boolean).join('\n').trim() }
}

export function format(payload, query, settings) {
  const output = Array.isArray(payload.output) ? payload.output : []
  const { urls, text } = sourcesFrom(payload)
  const mode = [settings.webSearch && 'web', settings.xSearch && 'x'].filter(Boolean).join('+')
  const lines = []
  lines.push(`Query: ${query}`)
  lines.push(`Mode: ${mode} | model ${settings.model} | reasoning ${settings.reasoningEffort}`)
  if (urls.length) {
    lines.push(`Results (${urls.length} unique):`)
    for (const url of urls.slice(0, settings.maxResults || 8)) lines.push(`- ${url}`)
  } else {
    lines.push('Results: (no citation URLs returned)')
  }
  if (text) lines.push(`\n${text}`)
  const usage = payload.usage
  if (usage) {
    const inputTokens = usage.input_tokens ?? 0
    const outputTokens = usage.output_tokens ?? 0
    const calls = output.filter(item => item?.type === 'web_search_call' || (item?.type === 'custom_tool_call' && item?.name === 'x_keyword_search')).length
    const estimate = (inputTokens * 1.25 + outputTokens * 2.5) / 1e6 + calls * 0.005
    lines.push(`\nUsage: ${inputTokens} in / ${outputTokens} out tokens, ${calls} search call(s); ~$${estimate.toFixed(4)}`)
  }
  return { text: lines.join('\n'), usage: payload.usage }
}

export async function search(ctx, exec, query, settings, credentialRef) {
  const secret = await ctx.credentials.resolve(credentialRef)
  if (!secret?.value) throw new Error(`xAI key is not configured (${credentialRef}); use configure_key first`)
  const tools = [settings.webSearch && { type: 'web_search' }, settings.xSearch && { type: 'x_search' }].filter(Boolean)
  if (!tools.length) throw new Error('Grok requires Web Search and/or X Search to be enabled in Search Hub settings')
  const body = {
    model: settings.model,
    input: instructionFor(query, settings),
    tools,
    reasoning: { effort: REASONING_EFFORTS.has(settings.reasoningEffort) ? settings.reasoningEffort : 'low' },
    max_output_tokens: 600,
    store: false,
  }
  // x_search does not support include sources; only web_search_call does.
  if (settings.webSearch) body.include = ['web_search_call.action.sources']
  const prefix = `$env:XAI_API_KEY=${quotePowerShell(secret.value)}`
  const headers = `-H 'Content-Type: application/json' -H "Authorization: Bearer $env:XAI_API_KEY"`
  const payload = parseJson(await curlPostJson(ctx, exec, { url: URL, headers, body, timeoutMs: settings.timeoutMs, prefix }), 'xAI Grok')
  if (payload.error) throw new Error(compact(typeof payload.error === 'string' ? payload.error : payload.error.message || JSON.stringify(payload.error)))
  return format(payload, query, settings)
}
