import { compact, curl, jsonPowerShell, parseJson, quotePowerShell } from '../runtime.mjs'

const URL = 'https://api.x.ai/v1/responses'
export const id = 'grok'

export async function search(ctx, exec, query, settings, credentialRef) {
  const secret = await ctx.credentials.resolve(credentialRef)
  if (!secret?.value) throw new Error(`xAI key is not configured (${credentialRef}); use configure_key first`)
  const tools = [settings.webSearch && { type: 'web_search' }, settings.xSearch && { type: 'x_search' }].filter(Boolean)
  if (!tools.length) throw new Error('Grok requires Web Search and/or X Search to be enabled in Search Hub settings')
  const body = { model: settings.model, input: query, tools }
  const command = `$env:XAI_API_KEY=${quotePowerShell(secret.value)}; curl.exe -sS --max-time ${Math.ceil(settings.timeoutMs / 1000)} -H 'Content-Type: application/json' -H \"Authorization: Bearer $env:XAI_API_KEY\" --data-raw ${jsonPowerShell(body)} ${URL}`
  const payload = parseJson(await curl(ctx, exec, command, settings.timeoutMs), 'xAI Grok')
  if (payload.error) throw new Error(compact(payload.error.message || JSON.stringify(payload.error)))
  const content = typeof payload.output_text === 'string' ? payload.output_text : (payload.output ?? []).flatMap(item => item.content ?? []).map(part => part?.text).filter(Boolean).join('\n')
  return { text: compact(content || JSON.stringify(payload), 5000), usage: payload.usage }
}
