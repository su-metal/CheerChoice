# Phase 4: 「食べない」選択フロー - 設計

## 実装アプローチ

### 1. 新規ファイル作成
- `src/screens/SkippedScreen.tsx` - 節制成功画面
- `src/utils/messages.ts` - ポジティブメッセージ配列
- `src/services/storageService.ts` - AsyncStorage操作（累計データ管理）

### 2. 既存ファイル更新
- `src/screens/index.ts` - SkippedScreenをエクスポート
- `src/navigation/AppNavigator.tsx` - Skipped画面をルーティングに追加
- `src/screens/ResultScreen.tsx` - 「Skip It」ボタンのナビゲーション実装
- `src/types/index.ts` - 累計データの型定義追加

---

## 変更するコンポーネント

### 新規作成

#### `src/screens/SkippedScreen.tsx`
```typescript
type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Skipped'>;
  route: RouteProp<RootStackParamList, 'Skipped'>;
};

// route.params: { calories: number, foodName: string }
```

**主要機能:**
- ランダムメッセージ表示（useEffect + useState）
- 節制カロリー表示
- 累計データ取得・更新（useEffect + AsyncStorage）
- アニメーション（Animated API、オプション）

#### `src/utils/messages.ts`
```typescript
export const skippedMessages = [
  "You did it, queen! 👑",
  "Crushing it! 💪",
  "Self-care = The best care 💕",
  "You're stronger than you think! 🌟",
  // ... 20+ messages
];

export function getRandomSkippedMessage(): string {
  return skippedMessages[Math.floor(Math.random() * skippedMessages.length)];
}
```

#### `src/services/storageService.ts`
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SkippedStats {
  today: number;
  thisWeek: number;
  thisMonth: number;
  lastUpdated: string; // ISO date
}

export async function getSkippedStats(): Promise<SkippedStats>;
export async function updateSkippedStats(calories: number): Promise<SkippedStats>;
```

**ロジック:**
- 日付チェック（今日/今週/今月の判定）
- 日跨ぎ時のリセット処理
- AsyncStorageへの保存

---

### 既存ファイル更新

#### `src/navigation/AppNavigator.tsx`
```typescript
export type RootStackParamList = {
  // ...
  Skipped: { calories: number; foodName: string };
};

// Stack.Screenに追加
<Stack.Screen
  name="Skipped"
  component={SkippedScreen}
  options={{
    title: 'Amazing!',
    headerBackTitle: 'Back',
  }}
/>
```

#### `src/screens/ResultScreen.tsx`
```typescript
// 「Skip It」ボタンのonPress
onPress={() => {
  navigation.navigate('Skipped', {
    calories: result.estimatedCalories,
    foodName: result.foodName,
  });
}}
```

#### `src/types/index.ts`
```typescript
// 累計データの型定義
export interface SkippedStats {
  today: number;
  thisWeek: number;
  thisMonth: number;
  lastUpdated: string;
}
```

---

## データ構造の変更

### AsyncStorage キー
- `@CheerChoice:skippedStats` - 累計節制カロリーデータ

### データフォーマット
```json
{
  "today": 450,
  "thisWeek": 1200,
  "thisMonth": 3500,
  "lastUpdated": "2026-02-08T10:30:00.000Z"
}
```

### 日付リセットロジック
- **今日**: lastUpdatedと現在日付を比較（日が異なればリセット）
- **今週**: lastUpdatedの週番号と比較（週が異なればリセット）
- **今月**: lastUpdatedの月を比較（月が異なればリセット）

---

## 影響範囲の分析

### 影響を受けるファイル
| ファイル | 変更内容 | リスク |
|---------|---------|--------|
| `AppNavigator.tsx` | ルート追加 | 低 |
| `ResultScreen.tsx` | ナビゲーション追加 | 低 |
| `screens/index.ts` | エクスポート追加 | 低 |
| `types/index.ts` | 型定義追加 | 低 |

### 新規依存パッケージ
- `@react-native-async-storage/async-storage` - ローカルストレージ
  - インストール: `npx expo install @react-native-async-storage/async-storage`

### テスト計画
1. **機能テスト**
   - 「Skip It」ボタンからの遷移
   - メッセージのランダム表示
   - 累計データの保存・取得
   - ホームへの戻り

2. **エッジケーステスト**
   - 初回起動時（データが存在しない）
   - 日跨ぎ後の動作
   - 週跨ぎ後の動作
   - 月跨ぎ後の動作

3. **UIテスト**
   - 米国女性向けデザインの確認
   - レスポンシブ対応
   - 絵文字の表示確認

---

## 実装順序

### ステップ1: 依存パッケージインストール
```bash
npx expo install @react-native-async-storage/async-storage
```

### ステップ2: ユーティリティ作成
1. `src/utils/messages.ts` - メッセージ配列
2. `src/services/storageService.ts` - AsyncStorage操作

### ステップ3: 型定義追加
- `src/types/index.ts` にSkippedStats追加

### ステップ4: 画面作成
- `src/screens/SkippedScreen.tsx` 実装

### ステップ5: ナビゲーション統合
1. `src/screens/index.ts` - エクスポート
2. `src/navigation/AppNavigator.tsx` - ルート追加
3. `src/screens/ResultScreen.tsx` - ナビゲーション実装

### ステップ6: テスト
- Android端末で動作確認

---

## 技術的考慮事項

### AsyncStorageの選択理由
- **メリット**:
  - Expo標準サポート
  - シンプルなAPI
  - 追加コストなし
- **デメリット**:
  - デバイス間同期なし（Phase 7でSupabaseに移行予定）

### 日付計算ライブラリ
- **選択肢1**: `date-fns`（軽量、関数型）
- **選択肢2**: ネイティブ Date API（依存なし）
- **推奨**: まずはネイティブ Date APIで実装、必要に応じて date-fns追加

### パフォーマンス最適化
- AsyncStorage読み込みは非同期（useEffect内で実行）
- ローディング状態の表示（データ取得中）
- エラーハンドリング（データ取得失敗時のフォールバック）

---

## デザインモックアップ（テキスト版）

```
┌─────────────────────────────────┐
│         Amazing! (Header)        │
├─────────────────────────────────┤
│                                  │
│          🌟 (Big Icon)           │
│                                  │
│   "You did it, queen! 👑"        │
│   (Large, Bold Text)             │
│                                  │
│  ┌────────────────────────────┐ │
│  │ You saved                   │ │
│  │   350 kcal                  │ │
│  │ (Huge, Mint Green)          │ │
│  └────────────────────────────┘ │
│                                  │
│  ┌────────────────────────────┐ │
│  │ Today's Total: 850 kcal     │ │
│  │ This Week: 2,400 kcal       │ │
│  │ This Month: 7,100 kcal      │ │
│  └────────────────────────────┘ │
│                                  │
│  [   Back to Home   ]           │
│  (Mint Green Button)            │
│                                  │
└─────────────────────────────────┘
```

---

## リスク管理

### 高リスク
- なし

### 中リスク
1. **AsyncStorageのデータ消失**
   - 緩和策: エラーハンドリング、デフォルト値設定

2. **日付計算の誤り**
   - 緩和策: 十分なテスト、date-fns導入検討

### 低リスク
1. **メッセージの文化的適合性**
   - 緩和策: ネイティブスピーカーのレビュー（将来的）

---

## 完了の定義

- [ ] AsyncStorageインストール完了
- [ ] messages.ts作成完了
- [ ] storageService.ts作成完了
- [ ] SkippedScreen.tsx作成完了
- [ ] ナビゲーション統合完了
- [ ] Android端末でテスト完了
- [ ] 受け入れ条件（Must Have）全て満たす
- [ ] ステアリングファイル更新（実装結果の記録）
