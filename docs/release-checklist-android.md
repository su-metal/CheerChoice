# CheerChoice Android Release Checklist

最終更新日: 2026-02-10

## 1. 環境変数

`.env` を確認:

```env
EXPO_PUBLIC_SUPABASE_URL=https://wzinimxikcihdqqdvppa.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_qBIjjA5UN3H62B8dWdqo0w_PRTqVZCq
EXPO_PUBLIC_SENTRY_DSN=https://3751c35943c0a6ef2fec0f433ee3fc42@o4510860388859904.ingest.us.sentry.io/4510860392726528
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

### ビルド直前の最終チェック

- `EXPO_PUBLIC_SENTRY_TEST_EVENT=false` を確認（`true` のまま本番ビルドしない）
- `.env` の本番値を再確認（Supabase / Sentry DSN / Legal URL）
- 実機で法的リンク2本が開くことを再確認
- 主要導線（撮影 -> 判定 -> 運動/食べない -> 保存 -> 履歴）を再確認

```powershell
npm run prebuild:eas:win
eas build --platform android --profile development --clear-cache
```

## 6. ビルド失敗時

- `tar ... Permission denied`:
  - `npm run prebuild:eas:win` を再実行
- Freeプラン上限:
  - 月次リセットを待つ or 有料プランへ切替

## 7. 既知バグ一覧（リリース判定）

- High: 0件
- Medium: 0件（現時点）
- 備考: なし
