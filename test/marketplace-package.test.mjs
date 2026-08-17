import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
const patch = await readFile(new URL('../cordis.patch.yml', import.meta.url), 'utf8')
const preset = await readFile(new URL('../preset/agent.cordis.yml', import.meta.url), 'utf8')

test('package declares an installable DSH bundle', () => {
  assert.equal(packageJson.private, undefined)
  assert.equal(packageJson.dsh?.bundle?.patch, './cordis.patch.yml')
  assert.equal(packageJson.repository?.url, 'git+https://github.com/FuLuTang/dsh-search-hub.git')
  assert.equal(packageJson.main, './src/profile/index.mjs')
  assert.equal(packageJson.exports['.'], './src/profile/index.mjs')
  assert.equal(packageJson.exports['./agent'], './src/search-hub.mjs')
  assert.ok(packageJson.files.includes('preset'))
  assert.ok(packageJson.files.includes('src'))
  assert.match(patch, /id: search-hub-settings/)
  assert.match(patch, /name: 'dsh-search-hub'/)
  assert.match(preset, /name: dsh-search-hub\/agent/)
})

test('package peers support current DSH prereleases', () => {
  assert.match(packageJson.peerDependencies['@deepseek-ai/dsh-settings'], /\|\| >=0\.1\.0-rc\.1 <0\.2\.0-0/)
  assert.equal(packageJson.peerDependencies['@deepseek-ai/cordis'], '^4.0.1')
})
