# DSH Search Hub

Persistent, agent-visible multi-channel search for DeepSeek Harness (DSH). Search results remain formatted tool text — **no separate browser results panel** — while channel configuration belongs in the DSH Settings UI integration.

## Channels

| Channel | Role | Cost / key |
| --- | --- | --- |
| `exa-anon` | Free semantic, long-tail, and Japanese fallback via Exa's anonymous MCP endpoint | Free, no key |
| `ddg` | Free basic fallback via DuckDuckGo Lite | Free, no key |
| `grok` | xAI web plus X/Twitter coverage | xAI API key; usage-priced (~$0.01–0.03/query) |

`multi_search` accepts one or more channels and runs the selected channels concurrently. It defaults to the free channels (`exa-anon`, `ddg`); select `grok` when X/Twitter or long-tail coverage makes paid usage worthwhile.

Grok runs on `grok-4.3` (input $1.25 / output $2.50 per 1M tokens) with `low` reasoning effort and `web_search`/`x_search` built-in tools (each search call $5 per 1k). Web search sources are pulled back directly via `include: ["web_search_call.action.sources"]`, so results are structured URLs plus a short cited summary — no standalone xAI search endpoint exists (verified against the current xAI docs).

## Tools

- `search_channels` — human-readable availability, price model, and current configuration.
- `multi_search` — run selected channels concurrently.
- `check_balance` — safe key/configuration status plus in-process observed Grok request usage. xAI does not expose a stable public balance endpoint here, so it never fabricates an account balance.
- `configure_key` — stores an xAI key through DSH credentials under `XAI_API_KEY`; it never echoes the value.

## Architecture

Each channel is a separate adapter with its own transport, authentication, result parser, settings, capability tags, and cost model. `src/host/channel-registry.mjs` is the one catalog exposed to tools and the future Settings page; `multi_search` normalizes the selected adapters behind one concurrent interface.

This intentionally does **not** copy modsearch's fixed failover chain. The Agent selects the channels it wants, with free `exa-anon` + `ddg` as the default and paid `grok` as an explicit coverage upgrade.

## Proxy/network policy

This plugin has **no proxy UI and no proxy override**. Network routing follows the machine's normal `curl.exe` connectivity. Configure Clash / Clash Verge manually (for example TUN/system proxy rules) when a channel cannot be reached locally.

## Installation design

This repository is an installable DSH bundle package: it declares `dsh.bundle.patch` in `package.json`, and `cordis.patch.yml` mounts the profile-scoped Search Hub settings service when installed with `dsh plugin add`. It is intentionally a **Host-only** bundle today; it does not claim to ship a Web Settings card before that client integration exists.

DSH rc.6 dynamic Cordis tools are not reliably model-visible in the defining agent's scope. The actual search tools therefore remain a persistent **agent-preset** composition:

1. Install the package (after npm publication): `dsh plugin add dsh-search-hub`.
2. Copy the shipped `preset/` template into `${DSH_HOME:-$HOME/.dsh}/.agent-presets/search-hub/`, then select **Search Hub** in a new DSH agent session. Its composition resolves the installed `dsh-search-hub/agent` export.
3. Restart DSH after installation, then use `search_channels` to verify the model-visible tool catalog.
4. Set the xAI key only through `configure_key` or DSH credentials settings. Do not place a key in YAML, Git, or chat.

The agent-preset portion provides model-visible tools, while the installed bundle owns the profile settings seam. A full channel Settings page additionally needs the Web profile integration described in [`docs/settings-ui-integration.md`](docs/settings-ui-integration.md), because DSH's API proxy must explicitly expose the `search-hub` namespace. The final installation step needs a user-approved DSH restart.

## Development

```powershell
pnpm run check
```

The implementation has no package dependency: it uses DSH's injected `shell`, `sandboxPolicy`, and `credentials` services. The shell requests deliberately use `curl.exe` and the explicit DSH `danger-full-access` policy because this host's Windows workspace sandbox cannot perform outgoing HTTP reliably.
