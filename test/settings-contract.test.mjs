import test from 'node:test'
import assert from 'node:assert/strict'
import { defaultSettings, normalizeSettings, validateSettings } from '../src/shared/settings-contract.mjs'

test('defaults are valid', () => assert.deepEqual(validateSettings(defaultSettings), defaultSettings))
test('normalization clamps invalid values and drops unknown channels', () => {
  const value = normalizeSettings({ defaultChannels: ['unknown', 'ddg'], channels: { ddg: { maxResults: 999, timeoutMs: 1 }, unknown: { enabled: false } } })
  assert.deepEqual(value.defaultChannels, ['ddg'])
  assert.equal(value.channels.ddg.maxResults, 8)
  assert.equal(value.channels.ddg.timeoutMs, 30000)
  assert.equal(value.channels['exa-anon'].enabled, true)
})
test('validation rejects unusable defaults', () => {
  assert.throws(() => validateSettings({ defaultChannels: ['ddg'], channels: { ddg: { enabled: false } } }), /enabled default channel/)
})
test('validation rejects Grok with both search tools disabled', () => {
  assert.throws(() => validateSettings({ channels: { grok: { webSearch: false, xSearch: false } } }), /Grok must enable/)
})
test('defaults use cheap model and low reasoning', () => {
  assert.equal(defaultSettings.channels.grok.model, 'grok-4.3')
  assert.equal(defaultSettings.channels.grok.reasoningEffort, 'low')
})
test('normalization clamps invalid reasoning effort to low', () => {
  assert.equal(normalizeSettings({ channels: { grok: { reasoningEffort: 'extreme' } } }).channels.grok.reasoningEffort, 'low')
  assert.equal(normalizeSettings({ channels: { grok: { reasoningEffort: 'high' } } }).channels.grok.reasoningEffort, 'high')
})
