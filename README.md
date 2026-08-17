# DSH Search Hub

Persistent, agent-visible multi-channel search for DeepSeek Harness (DSH). It deliberately returns formatted text/tool results only — **no browser panel**.

## Channels

| Channel | Role | Cost / key |
| --- | --- | --- |
| `exa-anon` | Free semantic, long-tail, and Japanese fallback via Exa's anonymous MCP endpoint | Free, no key |
| `ddg` | Free basic fallback via DuckDuckGo Lite | Free, no key |
| `grok` | xAI web plus X/Twitter coverage | xAI API key; usage-priced |

`multi_search` accepts one or more channels and runs the selected channels concurrently. It defaults to the free channels (`exa-anon`, `ddg`); select `grok` when X/Twitter or long-tail coverage makes paid usage worthwhile.

## Tools

- `search_channels` — human-readable availability, price model, and current configuration.
- `multi_search` — run selected channels concurrently.
- `check_balance` — safe key/configuration status plus in-process observed Grok request usage. xAI does not expose a stable public balance endpoint here, so it never fabricates an account balance.
- `configure_key` — stores an xAI key through DSH credentials under `XAI_API_KEY`; it never echoes the value.

## Proxy/network policy

This plugin has **no proxy UI and no proxy override**. Network routing follows the machine's normal `curl.exe` connectivity. Configure Clash / Clash Verge manually (for example TUN/system proxy rules) when a channel cannot be reached locally.

## Installation design

DSH rc.6 dynamic Cordis tools are not reliably model-visible in the defining agent's scope. This project therefore uses a persistent agent-preset composition.

1. Copy `preset/` to `${DSH_HOME:-$HOME/.dsh}/.agent-presets/search-hub/`.
2. Copy `src/search-hub.mjs` to that same directory.
3. Select **Search Hub** as the agent preset in DSH.
4. Restart DSH after installation, then use `search_channels` to verify the model-visible tool catalog.
5. Set the xAI key only through `configure_key` or DSH credentials settings. Do not place a key in YAML, Git, or chat.

The final installation step needs a user-approved DSH restart.

## Development

```powershell
pnpm run check
```

The implementation has no package dependency: it uses DSH's injected `shell`, `sandboxPolicy`, and `credentials` services. The shell requests deliberately use `curl.exe` and the explicit DSH `danger-full-access` policy because this host's Windows workspace sandbox cannot perform outgoing HTTP reliably.
