# CheerChoice プロジェクト構造

## 推奨フォルダ構成

```
CheerChoice/
├── public/
│   ├── icons/                  # PWAアイコン
│   ├── manifest.json           # PWA manifest
│   └── sw.js                   # Service Worker
├── src/
│   ├── components/             # Reactコンポーネント
│   │   ├── common/            # 共通コンポーネント
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   └── Loading.tsx
│   │   ├── camera/            # カメラ関連
│   │   │   ├── CameraCapture.tsx
│   │   │   └── PhotoPreview.tsx
│   │   ├── exercise/          # 運動関連
│   │   │   ├── ExerciseSelector.tsx
│   │   │   ├── PoseDetector.tsx
│   │   │   ├── ExerciseCounter.tsx
│   │   │   └── exercises/
│   │   │       ├── SquatDetector.tsx
│   │   │       ├── PushUpDetector.tsx
│   │   │       ├── JumpingJackDetector.tsx
│   │   │       └── PlankDetector.tsx
│   │   ├── meal/              # 食事関連
│   │   │   ├── CalorieEstimate.tsx
│   │   │   ├── ChoiceButtons.tsx
│   │   │   └── MealCard.tsx
│   │   ├── log/               # ログ関連
│   │   │   ├── LogList.tsx
│   │   │   ├── LogCalendar.tsx
│   │   │   ├── Statistics.tsx
│   │   │   └── Charts.tsx
│   │   └── feedback/          # フィードバック・メッセージ
│   │       ├── PositiveMessage.tsx
│   │       └── Achievement.tsx
│   ├── pages/                 # Next.js ページ（or ルート）
│   │   ├── index.tsx          # ホーム
│   │   ├── capture.tsx        # 撮影
│   │   ├── result.tsx         # 結果・選択
│   │   ├── skipped.tsx        # 食べなかった
│   │   ├── exercise.tsx       # 運動実行
│   │   ├── log.tsx            # ログ
│   │   └── settings.tsx       # 設定
│   ├── services/              # ビジネスロジック
│   │   ├── ai/
│   │   │   ├── openai.ts      # OpenAI API呼び出し
│   │   │   └── calorieEstimator.ts
│   │   ├── pose/
│   │   │   ├── mediapipe.ts   # MediaPipe初期化
│   │   │   ├── angleCalculator.ts
│   │   │   └── exerciseDetectors/
│   │   │       ├── squatDetector.ts
│   │   │       ├── pushUpDetector.ts
│   │   │       └── ...
│   │   ├── storage/
│   │   │   ├── indexedDB.ts   # ローカルDB操作
│   │   │   └── firestore.ts   # Firestore操作（オプション）
│   │   └── statistics/
│   │       └── calculator.ts  # 統計計算
│   ├── hooks/                 # カスタムフック
│   │   ├── useCamera.ts
│   │   ├── usePoseDetection.ts
│   │   ├── useCalorieEstimation.ts
│   │   ├── useMealLog.ts
│   │   └── useStatistics.ts
│   ├── types/                 # TypeScript型定義
│   │   ├── meal.ts
│   │   ├── exercise.ts
│   │   ├── user.ts
│   │   └── statistics.ts
│   ├── utils/                 # ユーティリティ
│   │   ├── constants.ts       # 定数
│   │   ├── messages.ts        # メッセージテンプレート
│   │   └── helpers.ts
│   ├── styles/                # スタイル
│   │   ├── globals.css
│   │   └── themes.ts
│   └── config/                # 設定
│       ├── env.ts             # 環境変数
│       └── firebase.ts        # Firebase設定
├── tests/                     # テスト
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── .env.local                 # 環境変数（gitignore）
├── .gitignore
├── package.json
├── tsconfig.json
├── next.config.js
└── README.md
```

## 主要技術スタック詳細

### フロントエンド
- **Next.js 14+** (App Router)
- **React 18+**
- **TypeScript 5+**
- **TailwindCSS** or **Material-UI (MUI)**

### AI/ML
- **OpenAI API** (gpt-4-vision-preview)
- **MediaPipe Pose** (@mediapipe/pose)
- **TensorFlow.js** (補助的に使用可能)

### カメラ
- **MediaStream API** (navigator.mediaDevices.getUserMedia)
- **Canvas API** (画像処理)

### データ管理
- **IndexedDB** (Dexie.js推奨)
- **Firebase** (Authentication, Firestore, Storage)
  - または **Supabase**

### 状態管理
- **Zustand** (軽量でシンプル)
  - または **Redux Toolkit**, **Jotai**

### グラフ・可視化
- **Recharts** or **Chart.js**
- **date-fns** (日付処理)

### PWA
- **next-pwa** (Service Workerプラグイン)
- **Workbox** (キャッシング戦略)

## 環境変数設定

```env
# .env.local
NEXT_PUBLIC_OPENAI_API_KEY=your_openai_api_key
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# デバッグモード
NEXT_PUBLIC_DEBUG_MODE=false

# API制限
NEXT_PUBLIC_MAX_API_CALLS_PER_DAY=50
```

## package.json 依存関係（想定）

```json
{
  "name": "cheer-choice",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "jest",
    "test:e2e": "playwright test"
  },
  "dependencies": {
    "next": "^14.1.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "typescript": "^5.3.0",

    "@mediapipe/pose": "^0.5.1635989137",
    "@mediapipe/camera_utils": "^0.3.1632432234",
    "@mediapipe/drawing_utils": "^0.3.1620248257",

    "openai": "^4.28.0",

    "firebase": "^10.8.0",

    "dexie": "^3.2.4",
    "dexie-react-hooks": "^1.1.7",

    "zustand": "^4.5.0",

    "recharts": "^2.10.4",
    "date-fns": "^3.3.1",

    "@mui/material": "^5.15.10",
    "@mui/icons-material": "^5.15.10",
    "@emotion/react": "^11.11.3",
    "@emotion/styled": "^11.11.0",

    "next-pwa": "^5.6.0",
    "framer-motion": "^11.0.5"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "eslint": "^8",
    "eslint-config-next": "14.1.0",
    "jest": "^29.7.0",
    "@testing-library/react": "^14.1.2",
    "@playwright/test": "^1.41.2",
    "autoprefixer": "^10.0.1",
    "postcss": "^8",
    "tailwindcss": "^3.3.0"
  }
}
```

## 開発環境セットアップ手順

### 1. プロジェクト初期化
```bash
# Next.jsプロジェクト作成
npx create-next-app@latest cheer-choice --typescript --tailwind --app

cd cheer-choice

# 依存関係インストール
npm install @mediapipe/pose @mediapipe/camera_utils @mediapipe/drawing_utils
npm install openai firebase dexie dexie-react-hooks zustand
npm install recharts date-fns
npm install @mui/material @mui/icons-material @emotion/react @emotion/styled
npm install next-pwa framer-motion
```

### 2. Firebase設定
- Firebase Console でプロジェクト作成
- Authentication 有効化（Google, Email/Password等）
- Firestore Database 作成
- Storage 有効化
- Web アプリ登録して設定情報取得

### 3. OpenAI API設定
- https://platform.openai.com/ でAPIキー取得
- 利用制限を設定（コスト管理）

### 4. PWA設定
```javascript
// next.config.js
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development'
});

module.exports = withPWA({
  // Next.js設定
});
```

## セキュリティ設定

### HTTPS必須
- 本番環境ではHTTPS必須（カメラアクセスに必要）
- 開発環境: localhost は HTTP でも動作

### CORS設定
- OpenAI API: サーバーサイドで呼び出し推奨（APIキー保護）
- Next.js API Routes を使用

### 環境変数保護
- `.env.local` は `.gitignore` に追加
- クライアント公開する変数のみ `NEXT_PUBLIC_` プレフィックス

## 開発Tips

### カメラのテスト
- モバイルデバッキング: Chrome DevTools の Remote Debugging
- iOS: Safari の Web Inspector
- 実機テストが推奨（特に骨格判定）

### MediaPipe パフォーマンス
- `modelComplexity: 1` で開始（0=軽量, 2=高精度）
- フレームレート調整（30fps推奨）
- Web Worker 使用で UI スレッド分離（高度）

### OpenAI API コスト管理
- キャッシング戦略（同じ画像の再推定防止）
- 画像圧縮（max 4MB推奨）
- ユーザー制限（1日の呼び出し回数）

### PWA インストール促進
- 初回訪問時にインストールプロンプト
- "ホーム画面に追加" ガイド

## テスト戦略

### ユニットテスト (Jest)
- 角度計算ロジック
- 統計計算
- ユーティリティ関数

### インテグレーションテスト
- カメラキャプチャフロー
- API呼び出しモック
- データ保存・取得

### E2Eテスト (Playwright)
- 撮影 → 推定 → 選択フロー
- 運動カウントフロー
- ログ表示

### 実機テスト
- iOS Safari
- Android Chrome
- カメラ動作確認
- 骨格判定精度確認

## 次のステップ

1. **環境構築**: Node.js, 依存関係インストール
2. **Firebase セットアップ**: プロジェクト作成、設定
3. **OpenAI API キー取得**: アカウント作成、キー発行
4. **Phase 1 開発開始**:
   - カメラキャプチャ機能
   - OpenAI Vision統合
   - 基本UI実装
   - スクワット検出実装
5. **デプロイ**: Vercel / Netlify 推奨（Next.js最適化）
