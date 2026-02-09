# CheerChoice アプリ要件定義書 v2.0

---

## 📋 ドキュメント情報
- **作成日**: 2026-02-08
- **最終更新**: 2026-02-08
- **バージョン**: 2.0
- **ステータス**: 要件定義完了
- **次フェーズ**: 実装開始

---

## 1. エグゼクティブサマリー

### 1.1 プロダクトビジョン

#### 解決する問題（Problem Statement）
多くのダイエット・ヘルスケアアプリは「制限」「罪悪感」「義務感」を伴い、ユーザーの継続率が極めて低い。業界データによると：
- **7日後の継続率**: わずか25%
- **30日後の継続率**: 10%以下
- **ユーザーの主な離脱理由**:
  - 「厳しすぎてストレス」（68%）
  - 「食べたいものを食べた時の罪悪感」（55%）
  - 「カロリー計算が面倒」（49%）

特に米国の健康志向の女性層（25-35歳）は、**楽しく、ポジティブに、自己選択を尊重される**健康管理ツールを求めているが、市場には存在しない。

#### ソリューション
**CheerChoice**は、食べる/食べないどちらの選択も100%肯定し、罪悪感ゼロで健康管理を続けられる**世界初のポジティブヘルスケアアプリ**です。

**3つの革新**:
1. **AI写真判定**: 食べ物を撮るだけで即座にカロリー推定（手入力不要）
2. **選択の肯定**: 食べても、食べなくても、どちらもポジティブに応援
3. **楽しい運動**: 骨格判定で運動を自動カウント、ゲーム感覚で消費

#### 3年後のビジョン
- 🎯 **米国で最も継続率の高いヘルスケアアプリ TOP3入り**
- 🎯 **100万人のユーザー**が「罪悪感なく健康管理」を実現
- 🎯 **ポジティブヘルスケア市場のリーダー**として業界標準を作る

#### コアバリュー
1. **自己選択の尊重** - あなたの決断を否定しない
2. **100%ポジティブ** - 一切の否定語・罪悪感を排除
3. **楽しさ優先** - 継続は義務ではなく、楽しさから生まれる
4. **科学的根拠** - AIとデータで客観的なサポート

---

## 2. ターゲットユーザー

### 2.1 プライマリーペルソナ

#### 👩 Sarah（サラ） - "Balance Seeker"

**デモグラフィック**:
- **年齢**: 28歳
- **職業**: デジタルマーケティングマネージャー
- **居住地**: カリフォルニア州サンフランシスコ
- **年収**: $85,000
- **学歴**: 大卒（Business/Communications専攻）
- **家族構成**: 独身、ルームメイトと同居

**ライフスタイル**:
- 週3-4回ジム通い（F45 Training、SoulCycle）
- Instagram活発（フォロワー2,300人、#fitspiration投稿）
- Whole Foods、Trader Joe's で週1買い物
- 平日は忙しく、外食・テイクアウト多い
- 週末はブランチ、ヨガ、友人とのハイキング

**テック利用**:
- iPhone 15 Pro
- Apple Watch Series 9
- アプリ: Instagram、TikTok、Spotify、Headspace
- MyFitnessPal経験あり（3週間で離脱）

**課題・ペインポイント**:
- 💔 「MyFitnessPalは厳しすぎて、食べたい時に罪悪感しかない」
- 💔 「カロリー計算が面倒で続かない」
- 💔 「運動は好きだけど、義務になるとストレス」
- 💔 「深夜残業後のデザートを我慢できない自分が嫌」
- 💔 「ダイエットアプリを使うこと自体がプレッシャー」

**求めるもの**:
- ✨ 罪悪感のない健康管理
- ✨ 楽しく続けられるツール
- ✨ 自分の選択を肯定してくれる存在
- ✨ SNSシェアできるポジティブなコンテンツ
- ✨ 簡単・速い（3タップ以内で完了）

**CheerChoiceを使う理由**:
「食べたい時は食べて、ちょっと動けばOK」という柔軟さに共感。罪悪感ゼロで健康意識を保てる。

**1日の使用シーン**:
- **12:00 ランチ時**: 同僚とブリトーを食べる前に撮影 → 「食べる」選択 → 帰宅後15回スクワット
- **20:00 ディナー後**: デザートのアイスを見て撮影 → 「今回は見送る」→ 「You did it, queen! 👑」メッセージで満足感
- **22:00 就寝前**: ログを見て「今週1,500kcal節制できた！」と達成感

---

### 2.2 セカンダリーペルソナ

#### 👩 Jessica（ジェシカ） - "Busy Mom"

**デモグラフィック**:
- **年齢**: 34歳
- **職業**: フリーランスグラフィックデザイナー
- **居住地**: テキサス州オースティン
- **年収**: $65,000
- **家族構成**: 既婚、子供2人（5歳、3歳）

**課題**:
- 育児で運動時間がない
- 子供の残り物を食べて太った
- 「ママだから自分は後回し」で自己肯定感低下

**CheerChoiceを使う理由**:
- 子供が寝た後の10分で完結
- 「自分を大切にしている」実感が得られる
- 子供と一緒に運動（親子でスクワット）できる

---

### 2.3 非ターゲット

以下のユーザーは**ターゲット外**:
- ❌ **競技アスリート**: 厳密な栄養管理が必要（専用アプリが適切）
- ❌ **医師指導下の減量**: 医療アプリが必要（HIPAA準拠等）
- ❌ **テクノロジー非利用者**: スマホアプリに抵抗がある層
- ❌ **完璧主義者**: 数値の正確性を最重視する層（AI推定の誤差を許容できない）

---

## 3. 市場分析

### 3.1 競合分析

| アプリ | ユーザー数 | 強み | 弱み | CheerChoiceの差別化 |
|--------|------------|------|------|---------------------|
| **MyFitnessPal** | 200M+ | 食品データベース豊富 | 厳しい、罪悪感、手入力必須 | ✅ AI自動推定、ポジティブトーン |
| **Noom** | 50M+ | 心理学ベース | 有料$60/月、課金圧力 | ✅ 無料/低価格、選択の自由 |
| **Lose It!** | 40M+ | シンプルUI | 運動機能弱い、手入力 | ✅ AI骨格判定、自動カウント |
| **SnapCalorie** | 1M+ | AI写真判定 | 精度低い（74%）、UI古い | ✅ GPT-4o-mini高精度（90-95%） |
| **Fastic** | 10M+ | 断食特化 | 制限が厳しい | ✅ 制限なし、食べても肯定 |

### 3.2 市場機会

- **米国ヘルスケアアプリ市場**: $14B（2026年推定）
- **ターゲット層（25-35歳米国女性、健康志向）**: 約1,500万人
- **TAM（獲得可能市場）**: 300万人（20%が興味あり）
- **SAM（実際に狙う市場）**: 初年度10万人（3.3%）

### 3.3 差別化ポイント（USP）

1. **世界初の"罪悪感ゼロ"ヘルスケアアプリ**
2. **AI自動推定（手入力不要）+ 骨格判定運動カウント**
3. **ポジティブ心理学に基づく継続設計**
4. **SNS映えするデザイン（米国女性向け）**

---

## 4. プロダクト概要

### 4.1 アプリ名
**CheerChoice** (仮)

### 4.2 コンセプト
食べるか、運動するか、どちらを選んでもユーザーの選択を100%肯定し、前向きな行動を支援するポジティブヘルスケアアプリ

### 4.3 技術スタック

#### 4.3.1 プラットフォーム
- **React Native 0.73+** + **Expo SDK 50+** (managed workflow)
  - iOS 14.0+、Android 8.0+（API Level 26）対応
  - ネイティブアプリ（App Store、Google Play配布）
  - クロスプラットフォーム開発（1コードベースで両OS対応）
  - Expo Goによる開発中の実機テスト
  - EAS Buildによる本番ビルド

#### 4.3.2 フロントエンド
- TypeScript 5.x
- React Navigation 6.x（画面遷移）
- Zustand（軽量状態管理）
- React Native Paper / Native Base（UIコンポーネント）

#### 4.3.3 AI/ML機能
- **カロリー推定**: OpenAI API（**gpt-4o-mini**）
  - 精度: 90-95%推定
  - コスト: $0.003/画像
- **骨格判定**: MediaPipe Pose（WebView統合 or TensorFlow Lite）
  - リアルタイム処理（30fps）
  - 精度: 80%以上

#### 4.3.4 バックエンド・認証
- **Supabase**
  - Authentication（Google OAuth 2.0）
  - PostgreSQL Database（食事・運動ログ）
  - Row Level Security（RLS）でユーザーデータ保護
  - Storage（写真サムネイル、Phase 2）

#### 4.3.5 データ保存
- **ローカル**: AsyncStorage（設定）、FileSystem（写真）
- **クラウド**: Supabase Database（ログデータ）

#### 4.3.6 分析・監視
- Firebase Analytics（イベントトラッキング）
- Mixpanel（Cohort分析、ファネル分析）
- Sentry（クラッシュレポート）

---

## 5. 主要機能要件

### 5.1 ユーザーフロー図

```
[アプリ起動]
    ↓
[ログイン/サインアップ（初回のみ）]
  - Google OAuth
    ↓
[ホーム画面]
  - 撮影ボタン（中央大きく）
  - 今日の統計
  - 最近の記録3件
    ↓
[撮影ボタン押下]
    ↓
[カメラ画面]
  - カメラ権限リクエスト
  - シャッター撮影
    ↓
[写真プレビュー]
  - OK / 再撮影
    ↓ OK
[AI推定中...（3-5秒）]
  - ローディングアニメーション
    ↓
[カロリー推定結果画面]
  - 450kcal（推定）
  - 食品名「カリフォルニアロール」
  - 手動修正可能
    ↓
  ┌─────────┴─────────┐
  ↓                     ↓
[食べない]              [食べる]
  ↓                     ↓
[ポジティブメッセージ]   [励ましメッセージ]
"You did it, queen! 👑" "美味しく食べて、楽しく動こう！"
  ↓                     ↓
[節制カロリー表示]      [運動提案画面]
  - 今回: 450kcal       - スクワット 90回
  - 累計: 1,200kcal     - 腹筋 150回
  - グラフ              - 腕立て 112回
  ↓                     ↓ [運動選択]
[ホームへ]              [運動実行画面]
                        - カメラON
                        - 骨格判定
                        - カウント表示
                        ↓
                        [運動完了]
                        "Great job! 💪"
                        - 消費カロリー表示
                        ↓
                        [ホームへ]
```

---

### 5.2 食事撮影・カロリー推定機能

#### 5.2.1 基本フロー
1. ホーム画面から「撮影」ボタンタップ
2. カメラ権限リクエスト（初回のみ）
3. カメラで食べ物を撮影
4. 写真プレビュー表示 → OK/再撮影
5. AI（OpenAI gpt-4o-mini）が画像を解析（3-5秒）
6. 推定カロリー、食品名、確信度を表示
7. ユーザーが手動修正可能
8. 「食べる」「食べない」選択へ

#### 5.2.2 詳細要件
- **カメラアクセス**:
  - フロント/リアカメラ切替可能
  - フラッシュON/OFF
  - ピンチズーム（2倍まで）

- **撮影**:
  - シャッターボタン（大きく中央配置）
  - 音声シャッター（オプション）

- **プレビュー**:
  - 撮影した写真の全画面表示
  - OKボタン / 再撮影ボタン

- **AI推定**:
  - ローディングアニメーション（3-5秒）
  - プログレスバー表示

- **結果表示**:
  - カロリー（例: 450kcal）大きく表示
  - 範囲表示（例: 400-500kcal）
  - 食品名（例: カリフォルニアロール）
  - AI確信度（例: 85%）
  - 手動修正ボタン（カロリー、食品名を編集可能）

#### 5.2.3 API仕様

```typescript
// OpenAI API呼び出し
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY,
});

async function estimateCalories(imageBase64: string) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `あなたは栄養士です。この食べ物の写真を分析し、以下のJSON形式で返してください：
{
  "foodName": "食品名（英語）",
  "estimatedCalories": 推定カロリー数値,
  "calorieRange": {"min": 最小値, "max": 最大値},
  "confidence": 確信度0-100,
  "portionSize": "量の目安（例: medium, 1 serving）",
  "mainIngredients": ["主な食材1", "主な食材2"]
}
推定は一般的な分量を前提とし、合理的な範囲で行ってください。`
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:image/jpeg;base64,${imageBase64}`
            }
          }
        ]
      }
    ],
    max_tokens: 300
  });

  return JSON.parse(response.choices[0].message.content);
}
```

#### 5.2.4 エラーハンドリング 🆕

##### 1. ネットワークエラー
- **シーン**: オフライン、接続不安定
- **ユーザーメッセージ**: 「インターネット接続を確認してください」
- **対応**:
  - リトライボタン表示
  - 写真をローカル保存
  - オンライン復帰時に自動再試行（バックグラウンドキュー）

##### 2. API制限到達（429 Too Many Requests）
- **シーン**: 1日の推定回数上限（10回）到達
- **ユーザーメッセージ**: 「今日の撮影上限に達しました😅 明日また楽しみましょう！手動入力もできます」
- **対応**:
  - 手動カロリー入力画面へ誘導
  - 翌日0時（UTC）に自動リセット
  - 残り回数を常に表示（設定画面）

##### 3. 食べ物が認識できない
- **シーン**: AI確信度 < 30%
- **ユーザーメッセージ**: 「この写真では判定が難しいです🤔 別の角度で撮影してみてください」
- **対応**:
  - 撮影のコツ表示（真上から、明るい場所等）
  - 再撮影ボタン
  - 手動入力ボタン

##### 4. 写真品質が低い
- **シーン**: 暗すぎる、ぼやけている
- **検出方法**: 画像解析（明度、鮮明度チェック）
- **ユーザーメッセージ**: 「もう少し明るい場所で撮影してみてください💡」
- **対応**:
  - フラッシュON推奨
  - 理想的な写真例を表示

##### 5. API応答タイムアウト
- **シーン**: 10秒以上応答なし
- **ユーザーメッセージ**: 「時間がかかっています...少々お待ちください」
- **対応**:
  - 15秒でタイムアウト
  - リトライ 2回まで
  - 失敗後は手動入力へ誘導

---

### 5.3 選択機能（食べる / 食べない）

#### 5.3.1 基本フロー
1. カロリー推定結果表示後、選択画面を表示
2. 「食べる」「食べない」の大きなボタンを配置
3. ボタンタップ時、フィードバックアニメーション（バウンス）
4. 選択後、それぞれの画面へ遷移

#### 5.3.2 UI要件
- **ボタンデザイン**:
  - 大きく（高さ80px以上）
  - 丸みのある角（border-radius: 24px）
  - グラデーション背景

- **言葉遣い**:
  - 「食べない」→ 「今回は見送る」or「Save it for later」
  - ポジティブな表現のみ

- **アニメーション**:
  - タップ時: スケールアニメーション（1.0 → 1.05 → 1.0）
  - 選択後: フェードアウト

---

### 5.4 食べない選択時の機能

#### 5.4.1 基本フロー
1. ポジティブメッセージ表示（ランダム選択）
2. 今回節制したカロリーをアニメーション表示
3. 累計節制カロリー表示（今日/今週/今月）
4. 簡易グラフ表示
5. Supabaseにログ保存
6. ホームに戻るボタン

#### 5.4.2 表示内容
- **メッセージ** (20種類からランダム):
  - "You did it, queen! 👑"
  - "Crushing it! 💪"
  - "Self-care = The best care 💕"
  - "You're investing in yourself! 🌟"
  - "That's the power of choice! ✨"

- **カロリー表示**:
  - 今回: 450kcal（大きくアニメーション）
  - 累計（今日）: 450kcal
  - 累計（今週）: 1,200kcal
  - 累計（今月）: 3,800kcal

- **グラフ**:
  - 折れ線グラフ（過去7日の節制カロリー推移）
  - 簡易版（詳細はログ画面へ）

#### 5.4.3 データ保存
```typescript
await supabase.from('meal_records').insert({
  user_id: userId,
  timestamp: new Date(),
  photo_local_uri: localPhotoPath,
  estimated_calories: 450,
  food_name: 'California Roll',
  ai_confidence: 85,
  choice: 'skipped'
});
```

---

### 5.5 食べる選択時の機能

#### 5.5.1 基本フロー
1. 励ましメッセージ表示
2. 運動提案画面へ遷移
3. カロリーに見合った運動メニュー3種を提案
4. ユーザーが運動を選択 or スキップ
5. 運動実施画面へ or ログ保存してホームへ

#### 5.5.2 運動メニュー提案

**運動データ**:
```typescript
export const EXERCISES = {
  squat: {
    name: 'Squats',
    nameJa: 'スクワット',
    caloriesPerRep: 0.5, // 1回あたり0.5kcal
    icon: '🏋️',
    difficulty: 'Medium',
    defaultReps: 20
  },
  situp: {
    name: 'Sit-ups',
    nameJa: '腹筋',
    caloriesPerRep: 0.3,
    icon: '🤸',
    difficulty: 'Easy',
    defaultReps: 30
  },
  pushup: {
    name: 'Push-ups',
    nameJa: '腕立て伏せ',
    caloriesPerRep: 0.4,
    icon: '💪',
    difficulty: 'Hard',
    defaultReps: 15
  }
};
```

**計算ロジック**:
```typescript
function calculateExerciseReps(calories: number, exercise: Exercise) {
  return Math.ceil(calories / exercise.caloriesPerRep);
}

// 例: 450kcal → スクワット 900回は非現実的
// → 現実的な回数（20-100回）に調整
function getRealisticReps(calculatedReps: number, exercise: Exercise) {
  const max = exercise.difficulty === 'Easy' ? 100 :
              exercise.difficulty === 'Medium' ? 80 : 50;
  return Math.min(calculatedReps, max);
}
```

**提案UI**:
- 3つの運動カード（横スクロール）
- 各カード: アイコン、名前、推奨回数、消費カロリー
- 「スキップして記録」ボタン（罪悪感なし）

#### 5.5.3 メッセージ例
- "Enjoy your meal and let's have fun moving! 🍽️✨"
- "食べる喜びを、運動の楽しさでバランス！"
- "You chose to eat, and that's perfectly fine! Let's celebrate with some fun movement 💃"

---

### 5.6 運動カウント機能（骨格判定）

#### 5.6.1 対応運動（MVP）

1. **スクワット**
   - **検出**: 膝角度（<90度でしゃがむ、>160度で立つ）
   - **判定ポイント**: 左右膝の平均角度
   - **フォーム**: 背筋が伸びているか（腰-肩の角度）

2. **腹筋（クランチ）**
   - **検出**: 上体角度（腰-肩-頭の角度変化）
   - **判定ポイント**: 起き上がり（>30度）、戻る（<15度）

3. **腕立て伏せ**
   - **検出**: 肘角度（<90度で下げる、>160度で上げる）
   - **判定ポイント**: 左右肘の平均角度
   - **フォーム**: 体が水平か（肩-腰-足首の直線）

#### 5.6.2 MediaPipe実装

**技術選択**: WebView + MediaPipe Pose（Web版）

```html
<!-- assets/mediapipe/pose-detector.html -->
<!DOCTYPE html>
<html>
<head>
  <script src="https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js"></script>
</head>
<body>
  <video id="video" style="display:none;"></video>
  <canvas id="canvas"></canvas>
  <script>
    // Pose初期化
    const pose = new Pose({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
    });

    pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    // スクワット検出ロジック
    let squatCount = 0;
    let isSquatting = false;

    function detectSquat(landmarks) {
      const leftKneeAngle = calculateAngle(
        landmarks[23], // 左腰
        landmarks[25], // 左膝
        landmarks[27]  // 左足首
      );
      const rightKneeAngle = calculateAngle(
        landmarks[24], landmarks[26], landmarks[28]
      );
      const avgAngle = (leftKneeAngle + rightKneeAngle) / 2;

      if (avgAngle < 90 && !isSquatting) {
        isSquatting = true;
      } else if (avgAngle > 160 && isSquatting) {
        isSquatting = false;
        squatCount++;
        // React Nativeへ通知
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'count',
          exercise: 'squat',
          count: squatCount
        }));
      }
    }

    // 角度計算
    function calculateAngle(a, b, c) {
      const radians = Math.atan2(c.y - b.y, c.x - b.x) -
                      Math.atan2(a.y - b.y, a.x - b.x);
      let angle = Math.abs(radians * 180.0 / Math.PI);
      if (angle > 180.0) angle = 360 - angle;
      return angle;
    }

    pose.onResults(onResults);

    function onResults(results) {
      if (results.poseLandmarks) {
        detectSquat(results.poseLandmarks);
        drawLandmarks(results.poseLandmarks); // 骨格描画
      }
    }
  </script>
</body>
</html>
```

**React Native側**:
```typescript
// src/screens/ExerciseScreen.tsx
import { WebView } from 'react-native-webview';

<WebView
  source={{ uri: Asset.fromModule(require('../assets/mediapipe/pose-detector.html')).uri }}
  onMessage={(event) => {
    const data = JSON.parse(event.nativeEvent.data);
    if (data.type === 'count') {
      setCount(data.count);
      playSound(); // カウント音
    }
  }}
  style={{ flex: 1 }}
/>
```

#### 5.6.3 エラーハンドリング（骨格判定） 🆕

##### 1. 体全体が映っていない
- **検出**: ランドマーク検出数 < 50%
- **メッセージ**: 「全身が映るように調整してください」
- **ガイド**: 理想的な姿勢のシルエット表示

##### 2. 照明が暗い
- **検出**: 検出信頼度 < 0.5が3秒継続
- **メッセージ**: 「明るい場所に移動してください💡」

##### 3. 動きが速すぎる
- **検出**: フレーム間の角度変化 > 50度/frame
- **メッセージ**: 「もう少しゆっくり動いてみてください」

##### 4. カメラ権限拒否
- **メッセージ**: 「運動カウントにはカメラが必要です。設定から許可してください」
- **対応**: 設定アプリへのディープリンク

#### 5.6.4 UI要件
- **カメラプレビュー**: 全画面（骨格オーバーレイ）
- **カウント表示**: 大きく（フォントサイズ 72px）、中央上部
- **目標達成率**: プログレスバー（例: 15/90回、17%）
- **終了ボタン**: 右上、いつでも終了可能
- **音声フィードバック**: カウント音（オプション）

---

### 5.7 ログ・履歴機能

#### 5.7.1 記録内容
```typescript
interface LogEntry {
  id: string;
  timestamp: Date;
  photoThumbnail: string;
  calories: number;
  foodName: string;
  choice: 'ate' | 'skipped';
  exerciseType?: 'squat' | 'situp' | 'pushup';
  exerciseCount?: number;
  caloriesBurned?: number;
}
```

#### 5.7.2 表示機能
- **リストビュー**: 日付降順、無限スクロール
- **カレンダービュー**: 月間カレンダー、日付タップで詳細
- **フィルタ**: 食べた/食べなかった、日付範囲
- **統計サマリー**:
  - 累計節制カロリー（今日/今週/今月）
  - 食べた vs 食べなかった比率（円グラフ）
  - 運動実施回数（棒グラフ）

#### 5.7.3 データ削除
- スワイプで削除
- 確認ダイアログ表示
- Supabase + ローカルから削除

---

## 6. 非機能要件

### 6.1 パフォーマンス
- **アプリ起動時間**: 2秒以内（コールドスタート）
- **カメラプレビュー遅延**: 100ms以内
- **AI推定レスポンス**: 5秒以内（90%タイル）
- **骨格判定フレームレート**: 30fps以上
- **画面遷移**: 200ms以内
- **写真アップロード**: 3秒以内（500KB想定）

### 6.2 セキュリティ
- **認証**: OAuth 2.0（Google）
- **トークン管理**:
  - JWT有効期限: 24時間
  - リフレッシュトークン: 30日
  - 自動更新
- **通信**: HTTPS必須
- **写真データ**: 送信時TLS暗号化
- **ローカルデータ**: 端末暗号化ストレージ使用
- **APIキー**: 環境変数で管理、コードにハードコード禁止

### 6.3 アクセシビリティ
- **カラーコントラスト**: WCAG AA準拠（4.5:1以上）
- **音声読み上げ**: VoiceOver、TalkBack対応
- **タップ領域**: 最小44x44px
- **代替テキスト**: 画像に適切なalt属性

### 6.4 互換性
- **iOS**: 14.0以上
- **Android**: 8.0（API Level 26）以上
- **React Native**: 0.73+
- **Expo SDK**: 50+

### 6.5 可用性（新規） 🆕
- **目標稼働率**: 99.5%（月間ダウンタイム3.6時間以内）
- **メンテナンス**: 月1回、日曜深夜2-4時（UTC）
- **障害対応**: 重大障害は4時間以内に復旧

### 6.6 スケーラビリティ（新規） 🆕
- **同時接続**: 1,000ユーザー（初期）
- **Supabase Free Tier**: 50,000 MAU
- **超過時**: Pro Tier移行（$25/月）
- **写真ストレージ**: 1GB（初期、ローカル保存優先）

### 6.7 データバックアップ（新規） 🆕
- **Supabase自動バックアップ**: 毎日
- **ユーザーエクスポート**: JSON/CSV形式
- **復旧目標時間（RTO）**: 24時間
- **復旧目標時点（RPO）**: 24時間

### 6.8 多言語対応（新規） 🆕
- **MVP**: 英語のみ
- **Phase 3**: 日本語追加
- **実装**: react-i18next

### 6.9 コンプライアンス（新規） 🆕

#### GDPR準拠（EU展開時）
- データ削除リクエスト対応（30日以内）
- データポータビリティ（エクスポート機能）
- Cookie同意バナー（Web版時）

#### CCPA準拠（カリフォルニア州）
- データ販売しない旨を明記
- オプトアウト機能

#### HIPAA
- **非準拠**（医療目的ではない）
- 利用規約に「医師の診断に代わるものではない」免責事項

---

## 7. データモデル

### 7.1 ユーザー
```typescript
interface User {
  id: string; // UUID
  email: string;
  displayName: string;
  avatarUrl?: string;
  createdAt: Date;
  settings: UserSettings;
}

interface UserSettings {
  targetCalorieReduction: number; // 目標節制カロリー（日）
  favoriteExercises: string[];
  notificationEnabled: boolean;
  voiceFeedbackEnabled: boolean;
  language: 'en' | 'ja';
}
```

### 7.2 食事記録
```typescript
interface MealRecord {
  id: string;
  userId: string;
  timestamp: Date;
  photoLocalUri: string; // ローカルパス
  photoThumbnailUrl?: string; // クラウド（Phase 2）
  estimatedCalories: number;
  calorieRangeMin: number;
  calorieRangeMax: number;
  foodName: string;
  aiConfidence: number; // 0-100
  choice: 'ate' | 'skipped';
  exerciseId?: string; // 食べた場合の運動記録ID
  manuallyEdited: boolean; // ユーザーが手動修正したか
}
```

### 7.3 運動記録
```typescript
interface ExerciseRecord {
  id: string;
  userId: string;
  mealRecordId?: string;
  timestamp: Date;
  exerciseType: 'squat' | 'situp' | 'pushup';
  count: number;
  targetCount: number; // 目標回数
  caloriesBurned: number;
  duration: number; // 秒
  completionRate: number; // 0-100（達成率）
}
```

### 7.4 統計データ（計算フィールド）
```typescript
interface Statistics {
  userId: string;
  period: 'day' | 'week' | 'month';
  startDate: Date;
  totalSkippedCalories: number;
  totalConsumedCalories: number;
  totalBurnedCalories: number;
  netCalories: number; // consumed - burned
  mealCount: number;
  skippedCount: number;
  ateCount: number;
  exerciseCount: number;
  averageDailySkipped: number;
}
```

---

## 8. 成功指標（KPI） 🆕

### 8.1 MVP後3ヶ月目標

| 指標 | 目標値 | 測定方法 | 業界ベンチマーク | 測定ツール |
|------|--------|----------|------------------|------------|
| **DAU** | 500人 | アプリ起動数 | 競合平均300人 | Firebase Analytics |
| **7日継続率** | 40% | Cohort分析 | 業界平均25% | Mixpanel |
| **30日継続率** | 20% | Cohort分析 | 業界平均10% | Mixpanel |
| **週平均撮影回数** | 5回/人 | カスタムイベント | - | Firebase |
| **運動実施率** | 50% | 「食べる」選択後の完了率 | - | Supabase |
| **NPS** | 40+ | 月1アンケート | Excellent: 50+ | Typeform |

### 8.2 6ヶ月目標
- **DAU**: 2,000人
- **7日継続率**: 50%
- **MAU**: 8,000人
- **MRR**（課金開始時）: $5,000

### 8.3 ノーススター指標
**週間アクティブユーザー数（WAU）**
- **理由**: 継続的な使用がプロダクトの価値を示す
- **目標**:
  - 3ヶ月: 1,500人
  - 6ヶ月: 5,000人
  - 12ヶ月: 20,000人

### 8.4 測定ツール
- **Firebase Analytics**: イベントトラッキング、ファネル
- **Mixpanel**: Cohort分析、リテンション、ユーザープロフィール
- **Sentry**: クラッシュ率、エラー追跡
- **Supabase**: データ集計、SQL分析

---

## 9. 開発フェーズ

### Phase 1: MVP（最小実用版）- 6-8週間
- ✅ 環境セットアップ
- ✅ 基本UI・ナビゲーション
- ✅ Supabase認証（Google OAuth）
- ✅ 撮影機能
- ✅ カロリー推定（OpenAI gpt-4o-mini）
- ✅ 選択機能（食べる/食べない）
- ✅ 簡易ログ機能
- ✅ 3種類の運動（スクワット、腹筋、腕立て）骨格判定

### Phase 2: 運動機能拡張 - 3-4週間
- フォーム判定精度向上
- 音声フィードバック
- 運動提案アルゴリズム改善
- バッジ・マイルストーン機能

### Phase 3: データ分析・可視化 - 2-3週間
- グラフ機能充実（Recharts）
- 統計データ詳細表示
- 目標設定機能
- SNSシェア機能

### Phase 4: UX改善・最適化 - 2-3週間
- アニメーション強化
- パフォーマンス最適化
- ユーザーテストフィードバック反映
- 多言語対応（日本語）

---

## 10. リスク管理

### 10.1 技術的リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| **カロリー推定精度不足** | 高 | 中 | ユーザー手動修正機能、複数AI比較検証 |
| **骨格判定の環境依存** | 中 | 高 | 推奨環境ガイダンス、閾値調整機能 |
| **OpenAI APIコスト超過** | 高 | 中 | 1日10回制限、画像圧縮、キャッシング |
| **MediaPipe精度低下** | 中 | 中 | 手動カウント修正機能、フォームガイド |
| **Supabase無料枠超過** | 中 | 低 | ローカル保存優先、Pro移行計画 |

### 10.2 ビジネスリスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| **ユーザー獲得難航** | 高 | 中 | SNSマーケティング、インフルエンサー協力 |
| **継続率が目標未達** | 高 | 中 | A/Bテスト、ユーザーインタビュー、改善 |
| **競合の模倣** | 中 | 高 | 特許出願、ブランド確立、先行者利益 |
| **収益化の遅延** | 中 | 低 | フリーミアムモデル、広告オプション |

### 10.3 コンプライアンスリスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| **プライバシー法規制違反** | 高 | 低 | GDPR/CCPA準拠設計、法務相談 |
| **App Store審査却下** | 中 | 低 | ガイドライン遵守、事前確認 |
| **健康アプリとしての誤認** | 中 | 中 | 免責事項明記、医療目的でない旨明示 |

---

## 11. 今後の拡張可能性

### 11.1 機能追加案（Phase 5以降）
- SNSシェア機能（Instagram Stories、TikTok）
- 友達チャレンジ機能（競争・協力）
- 栄養素分析（カロリー以外: タンパク質、脂質等）
- レシピ提案（節制カロリーでできる健康レシピ）
- パーソナルトレーナーAI（個別アドバイス）
- Apple Health / Google Fit連携
- ウェアラブル連携（Apple Watch、Fitbit）

### 11.2 収益化オプション
- **フリーミアムモデル**:
  - 無料: 1日10回撮影、基本統計
  - プレミアム（$4.99/月）: 無制限、高度統計、広告なし
- **広告**: バナー広告（無料版のみ）
- **企業向けB2B**: 福利厚生プログラム（$10/社員/月）

---

## 付録: 技術仕様詳細

### A. OpenAI Vision APIプロンプト設計

```
System: You are a professional nutritionist specializing in calorie estimation from food photos.

User: Analyze this food photo and return ONLY a JSON object (no markdown, no explanation) with the following structure:

{
  "foodName": "food name in English",
  "estimatedCalories": estimated calorie number,
  "calorieRange": {"min": minimum estimate, "max": maximum estimate},
  "confidence": confidence level 0-100,
  "portionSize": "portion description (e.g., medium, 1 serving)",
  "mainIngredients": ["ingredient 1", "ingredient 2", ...]
}

Estimate based on typical portion sizes. Be reasonable and conservative.
```

### B. Supabase RLS（Row Level Security）ポリシー

```sql
-- profiles テーブル
create policy "Users can view own profile"
  on profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update
  using (auth.uid() = id);

-- meal_records テーブル
create policy "Users can insert own meals"
  on meal_records for insert
  with check (auth.uid() = user_id);

create policy "Users can view own meals"
  on meal_records for select
  using (auth.uid() = user_id);

create policy "Users can delete own meals"
  on meal_records for delete
  using (auth.uid() = user_id);

-- exercise_records テーブル（同様）
create policy "Users can insert own exercises"
  on exercise_records for insert
  with check (auth.uid() = user_id);

create policy "Users can view own exercises"
  on exercise_records for select
  using (auth.uid() = user_id);
```

---

**ドキュメント承認**:
- [ ] プロダクトオーナー承認
- [ ] 技術リード承認
- [ ] 開発チーム承認

**次のステップ**: Phase 0（環境セットアップ）開始

---

## 12. 開発環境トラブルシューティング（運用メモ）

### 12.1 EAS Build で `tar ... Permission denied` が出るケース

#### 症状
- `tar: assets/...: Cannot open: Permission denied`
- `tar: src/...: Cannot mkdir: Permission denied`
- `tar -C /home/expo/workingdir/build --strip-components 1 -zxf ... exited with non-zero code: 2`

#### 主原因
- Windows 環境でディレクトリに `ReadOnly` 属性 (`R`) が付与された状態で EAS Build に送信され、ビルド環境で `project.tar.gz` 展開時に書き込み不可となる。

#### 対処手順
```powershell
attrib -R assets /S /D
attrib -R src /S /D
attrib -R docs /S /D
eas build --profile development --platform android --clear-cache
```

#### 事前確認
```powershell
attrib assets
attrib src
attrib docs
```
- `R` が表示されないことを確認する。

#### 補足
- `attrib -R .\* /S /D` 実行時に `.git` へ「隠しファイルは再設定できません」と表示されるのは通常挙動。
- 必要な対象ディレクトリへ `R` が残っていなければ問題ない。
