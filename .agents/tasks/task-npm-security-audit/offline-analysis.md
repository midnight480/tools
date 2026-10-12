# Offline static security analysis — site/ dependency tree

**Scope:** `site/package-lock.json` (lockfileVersion 3, 15391 lines) + `site/.snyk`.
Root project (`/package-lock.json`, `@bazel/bazelisk`) is a thin Bazel wrapper and is
covered briefly at the end.

## IMPORTANT CAVEAT — severities are from static knowledge, NOT a live `npm audit`

`npm audit` / `npm audit fix` **could not be run** in this sandbox. The network mode is
**INTEGRATIONS_ONLY (Repository access only)** and `registry.npmjs.org` is unreachable:

- `env -u NODE_OPTIONS npm audit [--json]` (site/ and root/) → **HTTP 403 Forbidden** on
  `POST https://registry.npmjs.org/-/npm/v1/security/advisories/bulk`, served by the
  Squid proxy (`server: squid/6.13`, `x-squid-error: ERR_ACCESS_DENIED 0`, statusCode 403).
- Direct reachability `curl https://registry.npmjs.org/` → HTTP `000`, curl exit 7 (connection failure).
- `npm install` → hangs (site/, SIGKILL after 75s) or `E403` on a tarball GET (root/,
  `GET https://registry.npmjs.org/@bazel/bazelisk/-/bazelisk-1.19.0.tgz`).
- `npm install --offline` → `ENOTCACHED` (no cached tarballs).
- `npm audit --offline` → prints `found 0 vulnerabilities`, which is **invalid** (there is no
  advisory database available offline, so it reports zero by default).

Therefore the findings below are derived from **static inspection of pinned versions in the
committed lockfile combined with publicly-known advisory knowledge**. They are NOT a
machine-verified `npm audit` result and the counts are **indicative, not authoritative**.
All of these dependencies are `devDependencies` (build-time tooling for the static site); none
ship in a runtime artifact served to users.

## Findings by severity (static assessment)

### High

| Package | Version(s) in lockfile | Path (example) | Known issue |
|---|---|---|---|
| `trim` | 0.0.1 | `node_modules/trim` (via remark/markdown chain) | ReDoS — GHSA-w5p7-h5w8-2hfq. Fixed in 0.0.3. |
| `lodash` | 3.10.1 | `jscs`, `jsdoctypeparser`, `xmlbuilder` → lodash | Prototype pollution / ReDoS in <4.17.21. `.snyk` carries a legacy patch for `npm:lodash:20180130` on the jscs chains. |
| `lodash.template` | 2.4.1, 3.6.2 | `gulp-webserver`, top-level | Prototype pollution — GHSA-35jh-r3h4-6jhm (all published versions affected; no fixed release). |
| `minimist` | 0.0.10, 0.2.4 | `optimist`→minimist, `gulp-webserver`→minimist | Prototype pollution — GHSA-xvch-5gv4-984h (<0.2.1 / <1.2.6). Top-level `minimist` 1.2.8 is already patched. |
| `uglify-js` | 2.6.0 | `swig-templates` → uglify-js | ReDoS / incorrect minification — GHSA-34r7-q49f-h37c (<2.6.0 … <3.x). |
| `underscore` | 1.6.0 | `node_modules/underscore` | Arbitrary code execution — GHSA-cf4h-3jhx-xvhq (>=1.3.2 <1.12.1). |

### Moderate

| Package | Version(s) | Path (example) | Known issue |
|---|---|---|---|
| `braces` | 1.8.5, 2.3.2 | `gulp-watch` → micromatch → braces | ReDoS / resource exhaustion — GHSA-grv7-fg5c-xmjg (<3.0.3). Top-level `braces` 3.0.3 is already patched. |
| `micromatch` | 2.3.11, 3.1.10 | `gulp-watch` chains | ReDoS — GHSA-952p-6rrq-rcjv (<4.0.8). Top-level `micromatch` 4.0.8 is already patched. |
| `qs` | 2.2.4, 2.2.5 | `body-parser`→qs, top-level `qs` | Prototype pollution / ReDoS in old 2.x — GHSA-hrpp-h998-j3pp etc. (fixed in 6.2.4+). |
| `debug` | 0.8.1, 2.6.9 | `tiny-lr`→debug, top-level `debug` | ReDoS — GHSA-gxpj-cx7g-858c (<2.6.9 / <3.1.0). 2.6.9 is the patched 2.x line; 0.8.1 is affected. |
| `postcss` | 5.2.18, 6.0.23, 7.0.39 | `postcss-less`, `sugarss`, `postcss-sass/scss` | Line-return parsing / ReDoS — GHSA-7fh5-64p2-3v2j (<8.4.31). Top-level `postcss` 8.5.8 is already patched. |
| `kind-of` | 3.2.2, 4.0.0 | multiple `gulp-watch`/`align-text`/`has-values` chains | Type-confusion bypass — GHSA-6c8f-qphg-qjgp (<6.0.3). 6.0.3 instances already patched. |
| `semver` | 5.7.2 (and 6.3.1) | `normalize-package-data`→semver | ReDoS — GHSA-c2qf-rxjj-qqgw (<5.7.2/<6.3.1/<7.5.2). The two pinned versions are at the patched boundary; flagged for completeness. |

### Low / informational

| Package | Version(s) | Note |
|---|---|---|
| `deep-extend` | 0.4.2 | Prototype pollution — GHSA-hq6p-j32g-fgpg (<0.5.1). |
| `set-value` / `mixin-deep` | 2.0.1 / 1.3.2 | Prototype pollution advisories exist for older ranges; pinned versions are at/above the patched boundary — flagged for completeness. |
| `ini` 1.3.8, `word-wrap` 1.2.5, `nth-check` 2.1.1, `nanoid` 3.3.11, `cross-spawn` 7.0.6, `minimatch` 3.1.5/10.2.4, `normalize-url` 6.1.0 | These are already at or above their respective fixed versions in the lockfile; listed only to show they were checked and are not currently flagged. |

### Packages checked and found already patched (no action)

`lodash` 4.17.23 (top-level), `minimist` 1.2.8, `braces` 3.0.3, `micromatch` 4.0.8,
`hosted-git-info` 2.8.9, `glob-parent` 5.1.2, `y18n` 4.0.3, `ansi-regex` 2.1.1 (dev-only path),
`clean-css` 4.2.4, `css-what` 6.2.2, `svgo` 2.8.2, `extend` 3.0.2, `@snyk/protect` 1.1303.2.

## Why no fix can be applied/verified offline

Every item above lives in a **deeply nested transitive position** owned by an old build tool
(`jscs`, `jshint`, `gulp-watch`, `swig-templates`, `vulcanize`, `bower`, `gulp-webserver`).
Remediating them requires one of:

1. `npm audit fix` — **blocked** (needs the advisory DB + registry; 403 as above).
2. Bumping the direct parent and re-resolving the tree — **blocked** (new `resolved`/`integrity`
   entries for the sub-dependencies must be fetched from the registry; unreachable).
3. Hand-editing `package.json` versions — a manifest bump **does not** update the lockfile's
   `resolved`/`integrity` entries, and fresh integrity hashes **cannot** be fetched offline, so a
   bumped dependency cannot be installed, built, or tested here.

Per the user instruction (「壊れる場合はその変更を戻し … 未対応として理由を書く」), any change that
cannot be verified to install/build/test must be reverted and listed as **未対応 (unaddressed)**.
Fabricating integrity hashes or running `npm audit fix --force` is explicitly out of bounds.

**Conclusion:** no dependency file is modified in this PR. Every finding above is carried as
**未対応**, with the inability to apply/verify attributed to the INTEGRATIONS_ONLY network mode.

## Root project (`/package-lock.json`)

Single devDependency `@bazel/bazelisk ^1.19.0`. `npm install` fails fast with **E403** on
`GET https://registry.npmjs.org/@bazel/bazelisk/-/bazelisk-1.19.0.tgz`. No npm advisories are
statically identified for bazelisk at the pinned version. A previous commit on `main`
(`baa62fe`) already fixed a lockfile integrity mismatch and a Go `goldmark` advisory
(GO-2026-5320); that work is out of scope for this npm-focused PR and is not redone here.
