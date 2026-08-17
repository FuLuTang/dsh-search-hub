import { compact, curl, quotePowerShell } from '../runtime.mjs'

export const id = 'ddg'

export async function search(ctx, exec, query, settings) {
  const url = `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(query)}`
  const html = await curl(ctx, exec, `curl.exe -sS -L --max-time ${Math.ceil(settings.timeoutMs / 1000)} ${quotePowerShell(url)}`, settings.timeoutMs)
  const results = []
  const regex = /<a[^>]*class="result-link"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<td[^>]*class="result-snippet"[^>]*>([\s\S]*?)<\/td>/g
  let match
  while ((match = regex.exec(html)) !== null && results.length < settings.maxResults) {
    const clean = value => compact(value.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#x27;/g, "'"), 500)
    results.push(`${results.length + 1}. ${clean(match[2])}\n   ${clean(match[3])}\n   ${match[1]}`)
  }
  if (!results.length) throw new Error('DuckDuckGo returned no parsable results (it may be locally blocked)')
  return { text: results.join('\n'), usage: undefined }
}
