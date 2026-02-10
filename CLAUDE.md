# CheerChoice - Claude Development Guide

## プロジェクト概要

**CheerChoice** は、食べ物の写真を撮影してカロリーを推定し、「食べる/食べない」を選択できるポジティブヘルスケアアプリです。

### コアコンセプト
- **100%ポジティブ**: どちらを選択しても肯定的なメッセージ
- **食べない → 節制カロリー記録**: "You did it, queen! 👑"
- **食べる → 運動提案**: 骨格判定で自動カウント（スクワット、腹筋、腕立て）

### ターゲットユーザー
- 米国在住の25-35歳女性（フィットネス志向）
- ペルソナ: Sarah（28歳、サンフランシスコ、マーケティングマネージャー）

---

## 技術スタック

### フロントエンド
- **React Native 0.73+** + **Expo SDK 54+** (managed workflow)
- **TypeScript** - 型安全性
- **React Navigation 6.x** - 画面遷移

### AI・画像処理
- **OpenAI API (gpt-4o-mini)** - カロリー推定（$0.003/画像）
- **expo-camera** - カメラ機能
- **expo-image-manipulator** - 画像リサイズ（512px、コスト削減）
- **expo-file-system/legacy** - Base64変換（重要: legacyパスを使用）

### 多言語対応
- **expo-localization** - デバイス言語検出
- **i18n-js** - 翻訳キー管理（英語/日本語）
- 詳細: `.steering/20260209-i18n-localization/`

### バックエンド（Phase 11〜）
- **Supabase** (`wzinimxikcihdqqdvppa`) - 認証＆データベース（PostgreSQL）
- **@supabase/supabase-js** - Supabaseクライアント
- **マルチアプリ統合**: 既存プロジェクトに `app_id = 'cheerchoice'` で統合
- **テーブル名**: `cc_` プレフィックス（例: `cc_meal_records`）

---

## プロジェクト構造

```
f:\App_dev\CheerChoice/
├── src/
│   ├── constants/         # デザインシステム
│   │   ├── Colors.ts      # カラーパレット（Coral, Mint, Lavender）
│   │   ├── Fonts.ts       # Typography（fontFamily無し - RN互換性）
│   │   └── Spacing.ts     # スペーシング、ボーダー、シャドウ
│   ├── i18n/              # 多言語対応（en/ja + locale判定）
│   │   ├── en.json
│   │   ├── ja.json
│   │   └── index.ts
│   ├── screens/           # 画面コンポーネント
│   │   ├── HomeScreen.tsx
│   │   ├── CameraScreen.tsx
│   │   ├── ResultScreen.tsx
│   │   ├── SkippedScreen.tsx
│   │   ├── ExerciseSelectScreen.tsx
│   │   ├── ExerciseScreen.tsx
│   │   ├── ManualEntryScreen.tsx
│   │   ├── LogScreen.tsx
│   │   └── index.ts       # エクスポート
│   ├── navigation/        # ナビゲーション設定
│   │   └── AppNavigator.tsx
│   ├── services/          # API/永続化サービス
│   │   ├── calorieEstimator.ts  # OpenAI API
│   │   ├── storageService.ts
│   │   ├── recordService.ts
│   │   └── usageService.ts
│   ├── utils/             # ユーティリティ関数
│   │   └── imageProcessor.ts    # 画像処理
│   └── types/             # TypeScript型定義
│       └── index.ts
├── docs/                  # ドキュメント
│   └── requirements.md    # 要件定義書 v2.0
├── .env                   # 環境変数（EXPO_PUBLIC_OPENAI_API_KEY）
├── App.tsx                # ルートコンポーネント
└── CLAUDE.md              # このファイル
```

---

## 作業単位のドキュメント管理（ステアリングファイル）

特定の開発作業における「**今回何をするか**」を定義する一時的なステアリングファイル。
作業完了後は参照用として保持されますが、新しい作業では新しいディレクトリを作成します。

### ディレクトリ構造
```
.steering/
└── [YYYYMMDD]-[開発タイトル]/
    ├── requirements.md  # 今回の作業の要求内容
    └── design.md        # 変更内容の設計
```

### `requirements.md` の内容
- **変更・追加する機能の説明** - 何を実装するか
- **ユーザーストーリー** - ユーザー視点での価値
- **受け入れ条件** - 完了の定義
- **制約事項** - 技術的制約、期限など

### `design.md` の内容
- **実装アプローチ** - どのように実装するか
- **変更するコンポーネント** - 影響を受けるファイル
- **データ構造の変更** - 型定義、API変更など
- **影響範囲の分析** - リスク、テスト計画

### 例
```
.steering/
├── 20260208-camera-openai-integration/
│   ├── requirements.md
│   └── design.md
└── 20260210-skipped-screen/
    ├── requirements.md
    └── design.md
```

---

## 重要な実装パターン

### 1. フォント設定（超重要！）
```typescript
// ❌ これはNG - React Nativeでは動作しない
export const Typography = {
  h2: {
    fontFamily: 'System',  // エラーの原因
    fontSize: 36,
  }
}

// ✅ これが正解 - fontFamilyは使わない
export const Typography = {
  h2: {
    fontSize: 36,
    fontWeight: '700',
    lineHeight: 43.2,
  }
}
```

### 2. expo-file-system（超重要！）
```typescript
// ❌ これはNG - 非推奨エラー
import * as FileSystem from 'expo-file-system';

// ✅ これが正解 - legacyパスを使用
import * as FileSystem from 'expo-file-system/legacy';

// エンコーディングは文字列で指定
const base64 = await FileSystem.readAsStringAsync(uri, {
  encoding: 'base64',  // ✅ 文字列として指定
});
```

### 3. ナビゲーション型定義
```typescript
// RootStackParamListで型安全性を確保
export type RootStackParamList = {
  Home: undefined;
  Camera: undefined;
  Result: { photoUri: string };  // パラメータを明示
};

// Propsで受け取る
type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Camera'>;
};
```

### 4. OpenAI API呼び出し
```typescript
// プロンプトはJSON形式を厳密に要求
const response = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [
    {
      role: 'user',
      content: [
        { type: 'text', text: 'Return ONLY valid JSON, no markdown' },
        { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}` } }
      ]
    }
  ],
  temperature: 0.3,  // 低めに設定して一貫性を保つ
});
```

### 5. 運動回数の計算ルール（Phase 5調整）
```typescript
// src/utils/exerciseCalculator.ts
// 摂取カロリーを完全相殺せず、継続しやすい回数を提案する
const BALANCE_RATIO = 0.25;        // カロリーの25%ぶんを目安に運動提案
const MIN_RECOMMENDED_REPS = 8;    // 低すぎる回数を防ぐ下限
const MAX_REPS_MULTIPLIER = 5;     // 種目ごとの defaultReps x 5 を上限
```
- 例: 20kcal の場合、スクワットは 40 回ではなく 10 回程度の提案になる。

---

## デザインシステム

### カラーパレット
```typescript
Colors = {
  primary: '#FF6B6B',      // Coral（メインアクション）
  secondary: '#6BCB77',    // Mint Green（成功、節制）
  accent: '#A28FDB',       // Lavender（運動）
  background: '#FFF8F0',   // Cream（背景）
  surface: '#FFFFFF',      // White（カード）
  text: '#2D3436',         // Dark Gray（本文）
  textLight: '#636E72',    // Gray（補助）
}
```

### 注意点
- **絵文字を多用** - UI親しみやすさのため
- **ポジティブな言葉遣い** - "fail", "error"よりも"let's try again"
- **大きなタップエリア** - ボタンは最低44x44px

---

## よくあるコマンド

### 開発サーバー
```bash
npx expo start              # 通常起動
npx expo start --clear      # キャッシュクリア（エラー時）
```

### パッケージ管理
```bash
npm install <package>       # 通常のパッケージ
npx expo install <package>  # Expo SDKと互換性のあるバージョン
```

### トラブルシューティング
```bash
npx expo start --clear      # メトロバンドラーのキャッシュクリア
npm install                 # 依存関係の再インストール
```

---

## 環境変数

`.env` ファイル（Gitにコミットしない）:
```
EXPO_PUBLIC_OPENAI_API_KEY=sk-proj-...
```

- `EXPO_PUBLIC_` プレフィックスは必須（Expoの仕様）
- コード内では `process.env.EXPO_PUBLIC_OPENAI_API_KEY` でアクセス

---

## 実装済み機能（Phase 0-9 主要完了）

### ✅ Phase 0: 環境セットアップ
- Node.js, Git, VSCode, Expo CLI
- プロジェクト作成（f:\App_dev\CheerChoice）
- Expo Goで動作確認

### ✅ Phase 1: 基本UI構築
- デザインシステム（Colors, Fonts, Spacing）
- ナビゲーション（React Navigation）
- HomeScreen, CameraScreen（初期版）

### ✅ Phase 2: （スキップ - Supabaseは後回し）

### ✅ Phase 3: カメラ＆OpenAI統合
- カメラ権限管理
- 写真撮影＆プレビュー
- 画像リサイズ（512px）
- OpenAI gpt-4o-miniでカロリー推定
- ResultScreen（カロリー表示、選択UI）

### ✅ Phase 4: 「食べない」選択フロー
- SkippedScreen.tsx
- ポジティブメッセージ表示
- 累計節制カロリー表示

### ✅ Phase 5: 「食べる」選択フロー
- ExerciseSelectScreen.tsx
- 運動メニュー提案（スクワット、腹筋、腕立て）

### ✅ Phase 6: 骨格判定＆運動カウント
- MediaPipe Pose（WebView統合）
- ExerciseScreen.tsx
- リアルタイム回数カウント
- 進捗表示（回数/達成率）
- 運動完了後、Home の `Today's Summary`（Exercises）へ即時反映

### ✅ Phase 7: ログ・履歴機能（主要）
- i18n セットアップ完了（`expo-localization` + `i18n-js`、英語/日本語）
- `recordService.ts` 追加（Meal/Exercise の保存・取得・削除）
- `usageService.ts` 追加（AI利用回数・残回数管理）
- `LogScreen.tsx` 追加（履歴一覧、日付セクション表示）
- `ManualEntryScreen.tsx` 追加（手動入力フロー）
- `CameraScreen` に AI残回数表示・手動入力導線
- `ResultScreen` で MealRecord 保存、`ExerciseScreen` で ExerciseRecord 保存
- `HomeScreen` の `Recent Activity` に直近3件表示 + `See All`

### ✅ Phase 8: 統計・可視化 + リカバリー導線（主要）
- `StatsScreen.tsx` 実装（週次バー + 月次カレンダーヒートマップ）
- 食べた/食べない比率、運動種目別サマリー、週次リカバリー指標を表示
- `HomeScreen` の Summary カードから `StatsScreen` へ遷移
- `HomeScreen` に「今日のムーブ」カードを追加（残回数・件数表示）
- ムーブ複数時は選択モーダルで対象メニューを選んで再開
- `ExerciseScreen` に中断/再開UIを追加し、`pause/resume` をイベント保存
- アプリ再起動後のセッション復元（カウントスナップショット復元）を実装
- `ResultScreen` に解析結果の手動修正（食品名/カロリー）を実装

### ✅ Phase 9: 設定・UX改善（主要）
- `SettingsScreen.tsx` 実装（目標 / 設定 / データ管理 / サブスク表示 / アプリ情報）
- 日別カロリー目標の保存・即時反映（Home の目標進捗カード）
- 音声フィードバック ON/OFF 設定を永続化し、Exercise に反映
- 言語設定（自動 / 英語 / 日本語）を追加し、即時反映
- データエクスポート（JSON + Share）と全データ削除（確認ダイアログ）を実装
- Home ヘッダーに設定導線（⚙️）を追加

---

## 課金モデル設計

### フリートライアル + サブスクリプション方式
- **無料**: AI撮影15回（lifetime上限）+ 手動入力は無制限 + 基本統計 + 広告あり
- **プレミアム ($4.99/月)**: AI撮影20回/日 + 全統計 + 広告なし
- **原則**: API コストはトライアル消化後、課金ユーザーのみに発生
- 詳細: `.steering/20260209-monetization-model/requirements.md`

### アーキテクチャへの影響
- `UsageData` (aiPhotosUsed) でAI使用回数を追跡
- `isPremium` フラグで機能ゲート（実際の課金処理は後で実装）
- AI制限到達後は `ManualEntryScreen` で手動入力
- StatsScreen のグラフ類はプレミアム限定

---

## 次の実装予定

### Phase 11: Supabase移行（DB設計完了、実装進行中）
- **Supabaseプロジェクト**: `wzinimxikcihdqqdvppa`（MisePo等と共用）
- **統合方式**: 既存マルチアプリ環境に `app_id = 'cheerchoice'` で統合
- **テーブル**: 7テーブル（`cc_` プレフィックス）
  - `cc_meal_records`, `cc_exercise_records`, `cc_exercise_obligations`
  - `cc_exercise_session_events`, `cc_recovery_ledger`
  - `cc_user_settings`, `cc_usage_tracking`
- **課金管理**: 既存 `entitlements` テーブルを再利用（`is_premium` は usage_tracking に持たない）
- **RLS**: `app_id = 'cheerchoice' AND user_id = auth.uid()` で行アクセス制御
- **インデックス**: `(app_id, user_id, ...)` の複合インデックス
- **移行戦略**: AsyncStorage → Supabase の段階的移行（読み取り優先）
- **MCP接続**: `~/.claude/config.json` に Supabase MCP サーバー設定済み
- 詳細: `.steering/20260210-phase11-supabase-migration/`

---

## 重要な制約・注意事項

### 開発者スキル
- **ユーザーはコーディング未経験**
- Claudeが全コードを作成、ユーザーは実行・テスト
- エラーメッセージはそのまま共有してもらう

### APIコスト管理
- OpenAI: 1回$0.003（0.3円）
- 画像は512pxにリサイズ（コスト削減）
- 将来的に1日10回制限を実装予定

### パフォーマンス
- Expo Goでテスト（実機ビルドは後期）
- Android端末で動作確認
- カメラ・AI処理は非同期、ローディング表示必須

---

## 過去のエラーと解決策

### エラー1: フォントが表示されない
**原因**: `fontFamily: 'System'` がReact Nativeで動作しない
**解決**: Typography定義からfontFamilyを削除

### エラー2: `FileSystem.EncodingType.Base64` is undefined
**原因**: expo-file-systemのAPIが変更された
**解決**: `import * as FileSystem from 'expo-file-system/legacy'` に変更

### エラー3: readAsStringAsync is deprecated
**原因**: 新しいAPIへの移行推奨
**解決**: legacyパスからインポート（上記と同じ）

### エラー4: EAS Buildで `tar ... Permission denied`
**原因**: Windowsで `assets` / `src` / `docs` などに `ReadOnly` 属性 (`R`) が付いた状態でアップロードされ、EAS側の `project.tar.gz` 展開時に書き込み失敗
**解決**: `attrib -R assets /S /D`、`attrib -R src /S /D`、`attrib -R docs /S /D` 実行後に `eas build --clear-cache` で再実行
**詳細**: `README.md` の `Troubleshooting` と `docs/requirements.md` の「12. 開発環境トラブルシューティング（運用メモ）」を参照

### エラー5: `Cannot find native module 'ExpoLocalization'`
**原因**: `expo-localization` を追加後、古い Development Build を使っていた（ネイティブモジュール未同梱）
**解決**: `eas build --platform android --profile development --clear-cache` でDev Buildを再作成し、端末の旧アプリを入れ替える

### エラー6: `No apps connected`（`r` でリロード不可）
**原因**: Metro起動中だが、端末アプリが未接続（またはポート不一致）
**解決**: 端末でDev Client/Expo Goからプロジェクトに接続してから `r`。必要なら `--port 8081` で再起動

### エラー7: 手動入力ルートで `NotReadableError: Could not start video source`
**原因**: `CameraScreen` がバックスタックで生きたまま `CameraView` を保持し、手動入力→運動モードで WebView カメラと競合していた（前面カメラの排他競合）。
**解決**: `CameraScreen` で `useIsFocused()` を使い、フォーカス外では `CameraView` を描画しないように変更。これにより遷移時にカメラセッションが解放され、手動入力ルートでも運動モードが起動するようになった。

---

## コミット・プルリクエストの方針

（現在はGit未使用、将来的に実装予定）

---

## 参考リンク

- [Expo Documentation](https://docs.expo.dev/)
- [React Navigation](https://reactnavigation.org/)
- [OpenAI API Reference](https://platform.openai.com/docs/api-reference)
- [MediaPipe Pose](https://developers.google.com/mediapipe/solutions/vision/pose_landmarker)

---

## 最終更新日
2026-02-10 - Phase 11 DB設計完了（Supabase統合版: cc_プレフィックス + app_id）
