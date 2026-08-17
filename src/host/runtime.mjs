export const CHANNEL_IDS = ['exa-anon', 'ddg', 'grok']

export function compact(value, max = 1600) {
  const source = String(value ?? '').replace(/\s+/g, ' ').trim()
  return source.length > max ? `${source.slice(0, max - 1)}…` : source
}

export function quotePowerShell(value) {
  return `'${String(value).replaceAll("'", "''")}'`
}

export function jsonPowerShell(value) {
  return quotePowerShell(JSON.stringify(value))
}

export function parseJson(raw, channel) {
  try { return JSON.parse(raw) } catch { throw new Error(`${channel} returned non-JSON output: ${compact(raw, 300)}`) }
}

export async function curl(ctx, exec, command, timeoutMs) {
  const result = await ctx.shell.run({
    command,
    timeoutMs,
    stdoutMaxBytes: 96 * 1024,
    signal: exec.signal,
    // This deployment's Windows workspace sandbox cannot make reliable HTTP calls.
    sandboxPolicy: ctx.sandboxPolicy.resolve({ mode: 'danger-full-access', session: exec.agent?.session }),
  })
  const stdout = result?.stdout?.text ?? ''
  const stderr = result?.stderr?.text ?? ''
  if (result?.exitCode !== 0) throw new Error(compact(stderr || stdout || `curl exited ${result?.exitCode}`))
  return stdout
}

/**
 * POST a JSON body via a UTF-8 temp file. On this host, inline JSON passed as a
 * PowerShell argument to curl.exe is corrupted (the sandboxed spawn mangles
 * quotes), while `--data-binary "@file"` is byte-exact. The body file is written
 * under $env:TEMP and removed in a finally block.
 * `headers` is a caller-built shell fragment (may reference $env: variables,
 * e.g. `-H "Authorization: Bearer $env:XAI_API_KEY"`), so secrets never appear
 * inline in command logs.
 */
export function curlPostJson(ctx, exec, { url, headers = '', body, timeoutMs, prefix = '', noBuffer = false }) {
  const command = `${prefix ? `${prefix}; ` : ''}$f=Join-Path $env:TEMP ('dsh-hub-'+[guid]::NewGuid().ToString('N')+'.json'); [System.IO.File]::WriteAllText($f, ${quotePowerShell(JSON.stringify(body))}, (New-Object System.Text.UTF8Encoding($false))); $code=1; try { curl.exe -sS --http1.1 ${noBuffer ? '-N ' : ''}--max-time ${Math.ceil(timeoutMs / 1000)} ${headers} --data-binary "@$f" ${quotePowerShell(url)}; $code=$LASTEXITCODE } finally { Remove-Item $f -ErrorAction SilentlyContinue }; exit $code`
  return curl(ctx, exec, command, timeoutMs)
}
