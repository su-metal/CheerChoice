# CheerChoice Android Release Checklist

最終更新日: 2026-02-10

## 1. 環境変数

`.env` を確認:

```env
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
EXPO_PUBLIC_SENTRY_DSN=...
EXPO_PUBLIC_SENTRY_TEST_EVENT=false
EXPO_PUBLIC_PRIVACY_POLICY_URL=https://su-metal.github.io/CheerChoice/legal/privacy-policy.ja.html
EXPO_PUBLIC_TERMS_URL=https://su-metal.github.io/CheerChoice/legal/terms-of-service.ja.html
```

## 2. 法的リンク確認

- `Settings > 法的情報` から下記が開く
  - Privacy Policy
  - Terms of Service

## 3. 主要導線の実機確認

- 撮影 -> 判定 -> 食べる/食べない -> 保存 -> 履歴表示
- 運動画面（モーション/タップ）でカウントと保存が動く
- アプリ再起動後に履歴が残る

## 4. クラッシュ監視

- Sentry DSN接続済み
- 本番前は `EXPO_PUBLIC_SENTRY_TEST_EVENT=false`

## 5. Androidビルド

```powershell
npm run prebuild:eas:win
eas build --platform android --profile development --clear-cache
```

## 6. ビルド失敗時

- `tar ... Permission denied`:
  - `npm run prebuild:eas:win` を再実行
- Freeプラン上限:
  - 月次リセットを待つ or 有料プランへ切替
