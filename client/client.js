window.__ModuleLoader__.load({
  id: 'dsh-search-hub',
  factory: require => {
    const module = { exports: {} }
    const React = require('react')
    const NS = 'search-hub'
    const h = React.createElement

    const en = {
      title: 'Search Hub', description: 'Configure multi-channel agent search. API keys stay in DSH Credentials.',
      loading: 'Loading settings…', unavailable: 'Settings are unavailable in this profile.',
      readOnly: 'Settings are read-only in this connection.', free: 'Free', paid: 'Usage-priced',
      exa: 'Exa Anonymous', ddg: 'DuckDuckGo Lite', grok: 'xAI Grok',
      enabled: 'Enabled', maxResults: 'Maximum results', timeout: 'Timeout (ms)',
      model: 'Model', reasoning: 'Reasoning effort', webSearch: 'Web Search', xSearch: 'X / Twitter Search',
      defaults: 'Default channels', defaultsHint: 'At least one enabled channel must remain selected.',
      grokHint: 'Set XAI_API_KEY in DSH Credentials or use the configure_key tool. The key is never shown here.',
      exaHint: 'Free anonymous semantic search.', ddgHint: 'Free web-search fallback.',
      saving: 'Saving…', saved: 'Saved', error: 'Could not save this setting.',
      none: 'None', low: 'Low', medium: 'Medium', high: 'High'
    }
    const zh = {
      title: 'Search Hub 搜索', description: '配置多渠道智能体搜索。API 密钥始终保存在 DSH 凭据中。',
      loading: '正在加载设置…', unavailable: '此 profile 中未开放该设置。',
      readOnly: '当前连接中的设置为只读。', free: '免费', paid: '按量计费',
      exa: 'Exa 匿名搜索', ddg: 'DuckDuckGo Lite', grok: 'xAI Grok',
      enabled: '启用', maxResults: '最大结果数', timeout: '超时（毫秒）',
      model: '模型', reasoning: '推理强度', webSearch: '网页搜索', xSearch: 'X / Twitter 搜索',
      defaults: '默认渠道', defaultsHint: '至少保留一个已启用的默认渠道。',
      grokHint: '请在 DSH 凭据中设置 XAI_API_KEY，或使用 configure_key 工具；密钥不会在这里显示。',
      exaHint: '免费的匿名语义搜索。', ddgHint: '免费的网页搜索兜底。',
      saving: '正在保存…', saved: '已保存', error: '保存设置失败。',
      none: '无', low: '低', medium: '中', high: '高'
    }

    const styles = {
      card: { border: '1px solid var(--dsw-alias-border-l2)', background: 'var(--dsw-alias-bg-layer-3)', borderRadius: 12, padding: 16, marginBottom: 12 },
      title: { margin: '0 0 4px', fontSize: 16 }, hint: { margin: '4px 0 12px', color: 'var(--dsw-alias-label-tertiary)', fontSize: 12, lineHeight: 1.5 },
      section: { borderTop: '1px solid var(--dsw-alias-border-l2)', paddingTop: 12, marginTop: 12 },
      row: { display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', margin: '8px 0' },
      label: { fontSize: 13, color: 'var(--dsw-alias-label-primary)' },
      input: { width: 110, padding: '5px 8px', borderRadius: 6, border: '1px solid var(--dsw-alias-border-l2)', background: 'var(--dsw-alias-bg-layer-2)', color: 'inherit' },
      select: { padding: '5px 8px', borderRadius: 6, border: '1px solid var(--dsw-alias-border-l2)', background: 'var(--dsw-alias-bg-layer-2)', color: 'inherit' },
      badge: { fontSize: 11, color: 'var(--dsw-alias-label-tertiary)' }, error: { color: 'var(--dsw-alias-label-error)', fontSize: 12 }
    }

    function useSnapshot(scope) {
      return React.useSyncExternalStore(listener => scope.subscribe(listener), () => scope.getSnapshot(), () => scope.getSnapshot())
    }
    function clampNumber(value, fallback, min, max) {
      const number = Number(value)
      return Number.isInteger(number) && number >= min && number <= max ? number : fallback
    }
    function Checkbox({ checked, label, disabled, onChange }) {
      return h('label', { style: styles.row }, h('input', { type: 'checkbox', checked: !!checked, disabled, onChange: event => onChange(event.target.checked) }), h('span', { style: styles.label }, label))
    }
    function Channel({ id, channel, label, hint, cost, t, writable, update }) {
      const input = (key, value, min, max) => h('label', { style: styles.row, key }, h('span', { style: styles.label }, t(key)), h('input', { style: styles.input, type: 'number', min, max, value, disabled: !writable, onChange: event => update({ [key === 'maxResults' ? 'maxResults' : 'timeoutMs']: clampNumber(event.target.value, value, min, max) }) }))
      const children = [
        h('div', { style: styles.row, key: 'head' }, h('strong', null, label), h('span', { style: styles.badge }, cost)),
        h('p', { style: styles.hint, key: 'hint' }, hint),
        h(Checkbox, { key: 'enabled', checked: channel.enabled, label: t('enabled'), disabled: !writable, onChange: enabled => update({ enabled }) }),
        input('maxResults', channel.maxResults, 1, 20), input('timeout', channel.timeoutMs, 1000, 120000)
      ]
      if (id === 'grok') children.push(
        h('label', { style: styles.row, key: 'model' }, h('span', { style: styles.label }, t('model')), h('select', { style: styles.select, value: channel.model, disabled: !writable, onChange: event => update({ model: event.target.value }) }, h('option', { value: 'grok-4.3' }, 'grok-4.3'))),
        h('label', { style: styles.row, key: 'reasoning' }, h('span', { style: styles.label }, t('reasoning')), h('select', { style: styles.select, value: channel.reasoningEffort, disabled: !writable, onChange: event => update({ reasoningEffort: event.target.value }) }, ['none', 'low', 'medium', 'high'].map(value => h('option', { key: value, value }, t(value))))),
        h(Checkbox, { key: 'web', checked: channel.webSearch, label: t('webSearch'), disabled: !writable, onChange: webSearch => update({ webSearch }) }),
        h(Checkbox, { key: 'x', checked: channel.xSearch, label: t('xSearch'), disabled: !writable, onChange: xSearch => update({ xSearch }) })
      )
      return h('section', { style: styles.section }, children)
    }
    function SearchHubCard({ scope, t }) {
      const snapshot = useSnapshot(scope)
      const [saveError, setSaveError] = React.useState(false)
      if (snapshot.status === 'loading') return h('div', { style: styles.card }, t('loading'))
      if (snapshot.status !== 'ready' || !snapshot.value) return h('div', { style: styles.card }, t('unavailable'))
      const settings = snapshot.value
      const writable = snapshot.writable
      const write = (field, value) => Promise.resolve(scope.set(field, value)).then(() => setSaveError(false), () => setSaveError(true))
      const updateChannel = (id, patch) => write('channels', { ...settings.channels, [id]: { ...settings.channels[id], ...patch } })
      const toggleDefault = (id, checked) => {
        const next = checked ? [...new Set([...settings.defaultChannels, id])] : settings.defaultChannels.filter(candidate => candidate !== id)
        if (next.length) write('defaultChannels', next)
      }
      return h('div', { style: styles.card },
        h('h3', { style: styles.title }, t('title')),
        h('p', { style: styles.hint }, t('description')),
        !writable ? h('p', { style: styles.error }, t('readOnly')) : null,
        h('section', { style: styles.section }, h('strong', null, t('defaults')), h('p', { style: styles.hint }, t('defaultsHint')), ['exa-anon', 'ddg', 'grok'].map(id => h(Checkbox, { key: id, checked: settings.defaultChannels.includes(id), disabled: !writable || (!settings.defaultChannels.includes(id) && !settings.channels[id].enabled), label: t(id === 'exa-anon' ? 'exa' : id), onChange: checked => toggleDefault(id, checked) }))),
        h(Channel, { id: 'exa-anon', channel: settings.channels['exa-anon'], label: t('exa'), hint: t('exaHint'), cost: t('free'), t, writable, update: patch => updateChannel('exa-anon', patch) }),
        h(Channel, { id: 'ddg', channel: settings.channels.ddg, label: t('ddg'), hint: t('ddgHint'), cost: t('free'), t, writable, update: patch => updateChannel('ddg', patch) }),
        h(Channel, { id: 'grok', channel: settings.channels.grok, label: t('grok'), hint: t('grokHint'), cost: t('paid'), t, writable, update: patch => updateChannel('grok', patch) }),
        saveError ? h('p', { style: styles.error }, t('error')) : null
      )
    }

    const inject = ['slots', 'locale', 'connection', 'remote', 'settingsScope']
    function apply(ctx) {
      const t = ctx.locale.bind(NS)
      ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'search-hub: locale dictionaries')
      const scope = ctx.settingsScope.bind({ namespace: NS, decode: value => value })
      ctx.slots.inject('settings.plugin.item', () => ctx.slots.register({ name: 'settings.plugin.item', id: 'search-hub', key: NS, order: 30, locale: NS }, () => h(SearchHubCard, { scope, t })))
    }
    module.exports.apply = apply
    module.exports.inject = inject
    return module.exports
  }
})
