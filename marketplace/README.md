# dshmarket submission materials

`awesome-dsh-plugin-entry.yml` is the proposed source record for the community catalog. When this repository meets the catalog's age and commit-count checks and installation has been verified, copy it to:

```text
data/plugins/FuLuTang__dsh-search-hub.yml
```

in [`awesome-dsh-plugin/awesome-dsh-plugin`](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin), then run that repository's documented README generator. Do not edit its generated README files by hand.

## Preconditions

- `package.json` declares `dsh.bundle.patch` and the package includes `cordis.patch.yml`.
- The GitHub repository has the `dsh-plugin` topic.
- The repository is at least one day old and has at least ten meaningful commits.
- `dsh plugin add` installation has been verified from the publication source.
- The package is published to npm or has a prebuilt GitHub Release tarball for the best installation experience.

The catalog entry is deliberately factual: it describes the current Exa, DuckDuckGo, and optional xAI Grok/X agent-preset search channels without promising a browser results panel or an unimplemented Settings UI.
