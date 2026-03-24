# CheerChoice - North Star Guide

## Purpose

`AGENTS.md` は CheerChoice の北極星ドキュメントです。
このファイルには、日々の実装判断で常に必要な情報だけを残します。

- 現在のプロダクトの目的
- 外してはいけない原則
- 実装上の重要制約
- ドキュメント運用ルール

詳細な要件、背景、受け入れ条件、長い仕様説明は `docs/requirements_definition.md` を参照します。

---

## Product Summary

**CheerChoice** は、食べ物の写真を撮影してカロリーを推定し、「食べる / 食べない」を前向きに選べるポジティブヘルスケアアプリです。

### Core Principles
- **100%ポジティブ**: どちらの選択も否定しない
- **罪悪感を作らない**: 制限、叱責、宿題感を強く出さない
- **継続しやすさ優先**: 完全相殺より、続けやすい提案を優先する
- **シンプルな意思決定**: 撮影、判断、記録、再開までを短い導線で完結させる

### Target User
- 米国在住の 25-35 歳女性、フィットネス志向
- ペルソナ: Sarah（28歳、サンフランシスコ、マーケティングマネージャー）

---

## Current Product Snapshot

- Expo / React Native の managed workflow アプリ
- 食事撮影、AIカロリー推定、結果修正、食べる / 食べない選択が実装済み
- 「食べない」は節制カロリー記録、「食べる」は運動提案と運動カウントへ接続
- 履歴、統計、設定、手動入力、週次リカバリー導線が実装済み
- データ保存は AsyncStorage + Supabase のデュアルライト
- OpenAI 呼び出しはクライアント直打ちではなく Supabase Edge Function 経由で扱う
- サブスクは RevenueCat 前提で進行中

---

## Architecture Facts

### Main Stack
- React Native 0.81.x + Expo SDK 54
- TypeScript
- React Navigation
- Supabase (`wzinimxikcihdqqdvppa`)
- `i18n-js` + `expo-localization`
- `react-native-webview` + MediaPipe ベースの運動カウント

### Important Project Areas
- `src/screens/`: 主要画面
- `src/services/`: データ保存、設定、利用回数、API 呼び出し
- `src/navigation/AppNavigator.tsx`: ナビゲーションの正本
- `src/types/index.ts`: 主要型
- `.steering/`: 作業ごとの差分要件と設計
- `docs/requirements_definition.md`: 要件・仕様確認の正本

---

## Hard Constraints

### React Native / Expo
- `fontFamily` を前提にしたタイポグラフィ設計は避ける。既存ルールどおり RN 互換の指定を優先する
- `expo-file-system` は `expo-file-system/legacy` を使う
- Base64 読み取り時の `encoding` は文字列 `'base64'` を使う

### AI / Security
- OpenAI API キーはクライアントに置かない
- カロリー推定は Supabase Edge Function 経由を前提に扱う
- ユーザー単位の利用制限と課金ゲートを壊さない

### Product / UX
- 文言はポジティブに保つ
- 大きなタップ領域を維持する
- 義務感の強い表現は避け、再開しやすい誘い方を優先する
- 英語 / 日本語の両方で破綻しないこと

---

## Documentation Rules

- `AGENTS.md` は北極星として短く保つ。詳細仕様を増やしすぎない
- 機能追加、仕様変更、運用方針変更が発生したら、必要に応じて `AGENTS.md` を更新する
- 要件整理、仕様確認、実装判断では `docs/requirements_definition.md` を参照する
- `AGENTS.md` と `docs/requirements_definition.md` に差分が出る変更は、同じ作業内で両方を更新して整合を保つ
- 作業固有の変更は `.steering/[task]/requirements.md` と `.steering/[task]/design.md` に整理する
- ステアリングファイルを新規作成または更新する場合は、`.codex/skills/steering-files` の運用に従う

### Role Split
- `AGENTS.md`: 現状、原則、制約、運用ルールの要約
- `docs/requirements_definition.md`: 要件、背景、受け入れ条件、詳細仕様の正本
- `.steering/*`: 今回の作業だけに必要な差分仕様

---

## Working Defaults

- ユーザーは非エンジニア前提。実装は Codex 主導で進める
- 破壊的操作は明示依頼なしで行わない
- 既存変更は勝手に巻き戻さない
- 詳細なフェーズ履歴、ロードマップ、参考リンク、長い障害事例は `docs/requirements_definition.md` 側で管理する

---

## Last Updated
2026-03-24 - AGENTS.md を北極星向けに簡潔化し、詳細仕様は requirements_definition.md を正本化
