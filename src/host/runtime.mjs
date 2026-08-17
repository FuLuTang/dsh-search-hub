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
