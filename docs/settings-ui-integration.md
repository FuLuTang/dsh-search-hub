# Search Hub Settings UI integration

Search Hub separates **Agent-facing tools** from the **DSH Settings UI**:

```text
Agent preset scope                         Web profile
------------------                         -----------
search-hub Host tools      <--- settings ---> Search Hub Settings card
channel adapter registry                    settings.plugins.tab/item slot
DSH credentials for xAI                    API proxy namespace exposure
```

## Why a profile integration is required

DSH rc.6 allows a Host plugin to register settings through `@deepseek-ai/dsh-settings`, and a Client plugin can bind the namespace with `ctx.settingsScope.bind({ namespace: 'search-hub' })`. However, `@deepseek-ai/dsh-host-apiproxy` has an explicit `WEB_SETTINGS_NAMESPACES` allowlist. A namespace not listed there returns `settings-not-exposed`, even if its Host schema exists.

Therefore a normal agent-preset package cannot independently add a built-in Settings card. The deployment must ship a small host/client/profile integration together with Search Hub.

## Target configuration

Namespace: `search-hub`

| Channel | User-editable fields | Secret handling |
| --- | --- | --- |
| Exa Anonymous | enabled, max results, timeout | no secret |
| DuckDuckGo | enabled, max results, timeout | no secret |
| xAI Grok | enabled, model, max results, timeout, Web Search toggle, X Search toggle | `XAI_API_KEY` remains in DSH Credentials |

The persisted user layer belongs in the existing DSH settings provider (`$DSH_HOME/settings.yaml`). Composition defaults are defined by `src/host/settings-defaults.mjs`; user values layer above them.

## Required DSH-profile changes

1. Add the `search-hub` namespace to the Web API proxy's exposed settings namespaces.
2. Compose a Host settings entry that uses `installSettingsSection()` from `@deepseek-ai/dsh-settings` and publishes resolved settings to the Search Hub adapter registry.
3. Compose a Client plugin built with the DSH Web profile that:
   - binds `ctx.settingsScope` to `search-hub`;
   - injects a card into `settings.plugin.item` (the existing Plugins > Configurable surface);
   - renders per-channel fields and writes only non-secret settings;
   - reads xAI configuration state through the credentials-safe API, never the key value.
4. Rebuild affected Web artifacts and restart DSH. A browser refresh alone cannot load the new static profile composition.

## UI contract

- The card is configuration only; search output remains model-visible formatted tool text.
- Show channel capability and price text beside each channel.
- Show “key configured / not configured” for Grok, not the secret.
- Do not offer proxy host/port fields. Connectivity stays user-managed in Clash / Clash Verge.
- A disabled channel is rejected by `multi_search` with an actionable message.

## References

- [DSH Settings service](https://github.com/deepseek-ai/deepseek-harness/tree/master/packages/settings/settings)
- [DSH client settings scope](https://github.com/deepseek-ai/deepseek-harness/tree/master/packages/client/ui-settings)
- [DSH plugin settings slots](https://github.com/deepseek-ai/deepseek-harness/tree/master/packages/client/ui-settings-plugins)
- [DSH host API proxy](https://github.com/deepseek-ai/deepseek-harness/tree/master/packages/host/apiproxy)
