// Web-profile host entry. This is intentionally separate from the agent-preset
// tool entry: Settings live at profile scope while tools are agent-scoped.
import z from '@deepseek-ai/schemastery'
import { defaultSettings, normalizeSettings, validateSettings, SEARCH_HUB_SETTINGS_NAMESPACE } from '../shared/settings-contract.mjs'

export const name = 'dsh-search-hub-settings-host'

const common = {
  enabled: z.boolean().default(true),
  maxResults: z.number().step(1).min(1).max(20).default(8),
  timeoutMs: z.number().step(1).min(1000).max(120000).default(30000),
}

export const Config = z.object({
  version: z.number().step(1).default(1),
  defaultChannels: z.array(z.string()).default(['exa-anon', 'ddg']),
  channels: z.object({
    'exa-anon': z.object(common),
    ddg: z.object(common),
    grok: z.object({ ...common, model: z.string().default('grok-4.3'), reasoningEffort: z.string().default('low'), webSearch: z.boolean().default(true), xSearch: z.boolean().default(true) }),
  }),
})

/**
 * Publish one read-only resolved-settings seam for the agent-scoped tool plugin.
 * Use the stable SettingsProvider service API so this works across DSH settings
 * package generations (where the convenience helpers differ or are absent).
 */
export function apply(ctx, entry = defaultSettings) {
  let current = () => normalizeSettings(entry)
  ctx.provide('searchHubSettings', { get: () => current() })
  ctx.inject(['settings'], sctx => {
    const scope = sctx.settings.register(SEARCH_HUB_SETTINGS_NAMESPACE, Config, {
      base: entry,
      validate: value => { validateSettings(value) },
    })
    current = () => normalizeSettings(scope.get())
    sctx.effect(() => () => { current = () => normalizeSettings(entry) })
  })
}
