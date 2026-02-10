import OpenAI from 'openai';
import { CalorieEstimationResult } from '../types';
import { processImageForAI } from '../utils/imageProcessor';

// OpenAI クライアントの初期化
const openai = new OpenAI({
  apiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY,
});

/**
 * 食べ物の写真からカロリーを推定
 */
export async function estimateCalories(
  imageUri: string
): Promise<CalorieEstimationResult> {
  try {
    // 画像を処理（リサイズ + Base64変換）
    const base64Image = await processImageForAI(imageUri);

    // OpenAI API呼び出し
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `You are a nutritionist AI. Analyze this food photo and return ONLY a JSON object with the following structure (no other text):
{
  "foodName": "food name in English",
  "estimatedCalories": estimated_calorie_number,
  "calorieRange": {"min": minimum_estimate, "max": maximum_estimate},
  "confidence": confidence_0_to_100,
  "portionSize": "portion size description"
}

Important:
- estimatedCalories should be a realistic estimate
- confidence: 0-100, where 100 = very confident, 0 = not confident
- If you cannot identify food clearly, set confidence below 50
- Return ONLY valid JSON, no markdown, no explanation`,
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      max_tokens: 300,
      temperature: 0.3, // 低めに設定して一貫性を保つ
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    // JSONをパース
    const result = JSON.parse(content) as CalorieEstimationResult;

    // バリデーション
    if (
      !result.foodName ||
      typeof result.estimatedCalories !== 'number' ||
      typeof result.confidence !== 'number'
    ) {
      throw new Error('Invalid response format from OpenAI');
    }

    return result;
  } catch (error) {
    console.error('Error estimating calories:', error);

    // エラーの種類に応じたメッセージ
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        throw new Error('OpenAI API key is not configured correctly');
      } else if (error.message.includes('quota')) {
        throw new Error('OpenAI API quota exceeded. Please check your billing.');
      } else if (error.message.includes('JSON')) {
        throw new Error('Failed to parse AI response. Please try again.');
      }
    }

    throw new Error('Failed to estimate calories. Please try again.');
  }
}

/**
 * API接続テスト（デバッグ用）
 */
export async function testOpenAIConnection(): Promise<boolean> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: 'Hello' }],
      max_tokens: 5,
    });
    return response.choices.length > 0;
  } catch (error) {
    console.error('OpenAI connection test failed:', error);
    return false;
  }
}
