# CheerChoice

## Environment Variables

`.env` に以下を設定してください:

```env
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
EXPO_PUBLIC_SENTRY_DSN=...
EXPO_PUBLIC_PRIVACY_POLICY_URL=...
EXPO_PUBLIC_TERMS_URL=...
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
