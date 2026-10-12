## 概要

このリポジトリ (midnight480/tools) の npm 依存パッケージのセキュリティ脆弱性を点検しました。
対象は root (`/package.json`, Bazel ラッパー) と `site/` (gulp ベースの静的サイトビルド) の 2 プロジェクトです。

## ⚠️ `npm audit` は実行できませんでした (ネットワーク制約)

このサンドボックスのネットワークモードは **INTEGRATIONS_ONLY (Repository access only)** で、
`registry.npmjs.org` に到達できません。そのため `npm audit` / `npm audit fix` /
レジストリ参照を伴う `npm install` は **実行不能** です。取得できた正確なエラーは以下のとおりです
(証跡: `.agents/tasks/task-npm-security-audit/{site-audit-before.txt, root-audit-before.txt, install-attempt.txt}`)。

- `npm audit` → **HTTP 403 Forbidden** on
  `POST https://registry.npmjs.org/-/npm/v1/security/advisories/bulk`
  (Squid プロキシ: `server: squid/6.13`, `x-squid-error: ERR_ACCESS_DENIED 0`, statusCode 403)。
- 直接疎通 `curl https://registry.npmjs.org/` → HTTP `000` (curl exit 7, 接続失敗)。
- root の `npm install` → **E403** on
  `GET https://registry.npmjs.org/@bazel/bazelisk/-/bazelisk-1.19.0.tgz`。
- `npm install --offline` → `ENOTCACHED` (キャッシュ無し)。
- `npm audit --offline` → `found 0 vulnerabilities` と表示されるが、
  **オフラインでは advisory DB が無いため常にゼロを返すだけで、有効な結果ではありません**。
  これを「脆弱性ゼロ」として報告することはしません。

## 修正前後の `npm audit` 件数

実レジストリにアクセスできないため、`npm audit` による **実測の修正前後件数は取得できませんでした**。
以下の表は「取得不能」であることを明示するものです (架空のゼロは記載しません)。

| Severity | Before (実測) | After (実測) |
|---|---|---|
| critical | 取得不能 (audit blocked: 403 Forbidden / registry unreachable) | 取得不能 (同上) |
| high | 取得不能 | 取得不能 |
| moderate | 取得不能 | 取得不能 |
| low | 取得不能 | 取得不能 |

> `npm audit` が `registry.npmjs.org` に到達できず (403 Forbidden / Squid プロキシ,
> INTEGRATIONS_ONLY ネットワークモード)、修正前後の実件数を算出できませんでした。

## オフライン静的解析のサマリ

実 audit の代わりに、コミット済み `site/package-lock.json` (lockfileVersion 3) の
ピン留めされた推移的バージョンを、公開済み脆弱性情報の静的知識と突き合わせて点検しました。
**これは機械検証された `npm audit` 結果ではなく、静的知識に基づく指標値** です。全件 `devDependencies`
(ビルド時ツール) であり、利用者に配信される成果物には含まれません。詳細は
`.agents/tasks/task-npm-security-audit/offline-analysis.md` を参照してください。

**High (静的評価):**
- `trim` 0.0.1 — ReDoS (GHSA-w5p7-h5w8-2hfq)
- `lodash` 3.10.1 (jscs / jsdoctypeparser / xmlbuilder 経由) — prototype pollution / ReDoS。`.snyk` に `npm:lodash:20180130` のレガシーパッチあり
- `lodash.template` 2.4.1 / 3.6.2 — prototype pollution (GHSA-35jh-r3h4-6jhm, 修正版なし)
- `minimist` 0.0.10 / 0.2.4 (optimist / gulp-webserver 経由) — prototype pollution (GHSA-xvch-5gv4-984h)
- `uglify-js` 2.6.0 (swig-templates 経由) — ReDoS (GHSA-34r7-q49f-h37c)
- `underscore` 1.6.0 — 任意コード実行 (GHSA-cf4h-3jhx-xvhq)

**Moderate (静的評価):**
- `braces` 1.8.5 / 2.3.2、`micromatch` 2.3.11 / 3.1.10 (gulp-watch 経由) — ReDoS
- `qs` 2.2.4 / 2.2.5 — prototype pollution / ReDoS
- `debug` 0.8.1 (tiny-lr 経由) — ReDoS (GHSA-gxpj-cx7g-858c)
- `postcss` 5.2.18 / 6.0.23 / 7.0.39 (postcss-less / sugarss / postcss-sass・scss 経由) — ReDoS (GHSA-7fh5-64p2-3v2j)
- `kind-of` 3.2.2 / 4.0.0 — type-confusion bypass (GHSA-6c8f-qphg-qjgp)

**Low / informational:** `deep-extend` 0.4.2 ほか。

> トップレベルの `lodash` 4.17.23 / `minimist` 1.2.8 / `braces` 3.0.3 / `micromatch` 4.0.8 /
> `postcss` 8.5.8 などは既に修正済みバージョンで、対応不要です。

## 未対応 (unaddressed) 一覧と理由

今回の PR では **依存関係ファイル (`package.json` / `package-lock.json`) を一切変更していません**。
上記の静的検出項目はすべて **未対応** として扱い、理由を以下に明記します。

| 項目 | 理由 (未対応) |
|---|---|
| `trim` 0.0.1 の ReDoS | 深い推移的依存。修正には親の再解決が必要で、新しい `resolved`/`integrity` をレジストリから取得できない (INTEGRATIONS_ONLY, 403)。 |
| `lodash` 3.10.1 (jscs 系) | jscs の古い系統に固定。`npm audit fix` もメジャー更新もレジストリ必須のため実行不能。 |
| `lodash.template` 2.4.1 / 3.6.2 | 上流に修正版が無く、かつレジストリ不通で更新・検証とも不可。 |
| `minimist` 0.0.10 / 0.2.4 (optimist / gulp-webserver 系) | 推移的。親の更新・再解決がレジストリ必須のため不可。 |
| `uglify-js` 2.6.0 (swig-templates 系) | 推移的。同上。 |
| `underscore` 1.6.0 | 推移的。同上。 |
| `braces` / `micromatch` 旧版 (gulp-watch 系) | 推移的。トップレベルは修正済みだが gulp-watch 系の旧版はレジストリ不通で更新不可。 |
| `qs` 2.2.x / `debug` 0.8.1 / `postcss` 旧版 / `kind-of` 旧版 / `deep-extend` 0.4.2 | いずれも推移的。`npm audit fix` 不可、整合した lockfile 更新がレジストリ必須のため未対応。 |

**未対応の根本原因 (全項目共通):** `package.json` のバージョンを手で上げても lockfile の
`resolved`/`integrity` は更新されず、新しい integrity ハッシュはオフラインで取得できません。
ユーザ指示 (「壊れる場合はその変更を戻し … 未対応として理由を書く」) に従い、install/build/test で
検証できない変更は適用せず、未対応として記載しています。integrity ハッシュの捏造や
`npm audit fix --force` は行いません。レジストリに到達できる環境で `npm audit fix` もしくは
該当パッケージのバージョン更新を行うことが、本質的な解決策です。

## 検証

- `git diff main --name-only` — 変更はタスク成果物のみ。ソース/整形/リファクタの変更なし、`node_modules` の混入なし。
- 依存関係ファイルの変更が無いため、JSON 妥当性の問題は発生しません。

## 補足

main 上の先行コミット `baa62fe` が lockfile integrity 不整合と Go `goldmark` の脆弱性
(GO-2026-5320) を既に修正済みです。これは本 PR (npm 依存のセキュリティ範囲) の対象外であり、再実施していません。
