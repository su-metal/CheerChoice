# CheerChoice

## Environment Variables

`.env` に以下を設定してください:

```env
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
EXPO_PUBLIC_SUPABASE_LEGACY_ANON_JWT=...
EXPO_PUBLIC_SENTRY_DSN=...
EXPO_PUBLIC_SENTRY_TEST_EVENT=false
EXPO_PUBLIC_PRIVACY_POLICY_URL=...
EXPO_PUBLIC_TERMS_URL=...
```

`EXPO_PUBLIC_SENTRY_TEST_EVENT` は開発時のみ `true` にし、本番ビルド前は `false` にしてください。
`EXPO_PUBLIC_SUPABASE_LEGACY_ANON_JWT` は Edge Function が `Invalid JWT` を返す環境向けの暫定回避値です（未使用なら空で可）。

## Phase 13 (Edge Function)

AI推定は `supabase/functions/calorie-estimation` を経由します。  
OpenAIキーはクライアント `.env` ではなく、Supabase Edge Function Secret に設定してください:

```bash
supabase secrets set OPENAI_API_KEY=sk-... --project-ref wzinimxikcihdqqdvppa
```

`EXPO_PUBLIC_PRIVACY_POLICY_URL` / `EXPO_PUBLIC_TERMS_URL` は「公開済みの法的ページURL」です。
このリポジトリには公開用HTMLを用意済みです:

- `docs/legal/privacy-policy.ja.html`
- `docs/legal/terms-of-service.ja.html`
- `docs/legal/privacy-policy.en.html`
- `docs/legal/terms-of-service.en.html`

GitHub Pages を使う場合:

1. GitHub リポジトリ `Settings` > `Pages` を開く
2. `Build and deployment` の `Source` を `Deploy from a branch` にする
3. Branch を `main` / folder を `/docs` にして保存
4. 公開後、URLを `.env` に設定する

例:
```env
EXPO_PUBLIC_PRIVACY_POLICY_URL=https://<github-username>.github.io/<repo-name>/legal/privacy-policy.ja.html
EXPO_PUBLIC_TERMS_URL=https://<github-username>.github.io/<repo-name>/legal/terms-of-service.ja.html
```

## Android Release Notes

詳細チェックリスト: `docs/release-checklist-android.md`

### Build前チェック（Phase 12）

1. `.env` の本番値を確認（`SENTRY_TEST_EVENT=false`）
2. 法的リンク2本が実機で開くことを確認
3. 主要導線を実機で確認
   - 撮影 -> 判定 -> 運動 -> 保存 -> 履歴表示
4. 既知バグの棚卸し（High=0、Mediumは回避策付き）

### EAS Build（Windows）

```powershell
npm run prebuild:eas:win
eas build --platform android --profile development --clear-cache
```

### Freeプラン上限に当たった場合

- EAS FreeのAndroidビルド上限に達すると、クラウドビルドは月次リセットまで停止します。
- 代替:
  - リセット日までローカル検証を進める
  - 有料プランへアップグレード

## Troubleshooting

### EAS Build: `tar ... Permission denied` で失敗する場合

症状:
- `tar: assets/...: Cannot open: Permission denied`
- `tar: src/...: Cannot mkdir: Permission denied`
- `tar -C /home/expo/workingdir/build ... exited with non-zero code: 2`

原因:
- Windows で `assets` / `src` / `docs` などのディレクトリに `ReadOnly` 属性 (`R`) が付いたまま EAS に送られ、展開先で書き込み失敗することがある。

対処:
```powershell
attrib -R assets /S /D
attrib -R src /S /D
attrib -R docs /S /D
eas build --profile development --platform android --clear-cache
```

確認:
```powershell
attrib assets
attrib src
attrib docs
```
`R` が表示されなければOK。
