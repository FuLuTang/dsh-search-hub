import { compact, curl, jsonPowerShell, parseJson } from '../runtime.mjs'

const URL = 'https://mcp.exa.ai/mcp'
export const id = 'exa-anon'

export async function search(ctx, exec, query, settings) {
  const body = { jsonrpc: '2.0', id: `dsh-${Date.now()}`, method: 'tools/call', params: { name: 'web_search_exa', arguments: { query, numResults: settings.maxResults } } }
  const raw = await curl(ctx, exec, `curl.exe -sS --max-time ${Math.ceil(settings.timeoutMs / 1000)} -N -H 'Accept: text/event-stream, application/json' -H 'Content-Type: application/json' --data-raw ${jsonPowerShell(body)} ${URL}`, settings.timeoutMs)
  const lines = raw.split(/\r?\n/).filter(line => line.startsWith('data:')).map(line => line.slice(5).trim()).filter(Boolean)
  const payload = parseJson(lines.at(-1) ?? raw, 'Exa anonymous MCP')
  if (payload.error) throw new Error(compact(payload.error.message || JSON.stringify(payload.error)))
  const content = payload?.result?.content ?? payload?.content
  const blocks = Array.isArray(content) ? content.map(part => part?.text ?? part?.content).filter(Boolean) : [content].filter(Boolean)
  return { text: compact(blocks.join('\n') || JSON.stringify(payload?.result ?? payload), 5000), usage: undefined }
}
