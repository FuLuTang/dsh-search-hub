// Backward-compatible Host import surface. The contract is shared with the
// future Web Settings card so tools and UI normalize the same values.
export {
  SEARCH_HUB_SETTINGS_NAMESPACE,
  defaultSettings as defaultSearchHubSettings,
  normalizeSettings,
  validateSettings,
} from '../shared/settings-contract.mjs'
