// Root dsh.bundle entry: profile-scoped settings only.
// Agent-visible tools are intentionally exported at dsh-search-hub/agent and
// mounted through the opt-in agent preset template.
export { name, Config, apply } from './search-hub-settings-host.mjs'
