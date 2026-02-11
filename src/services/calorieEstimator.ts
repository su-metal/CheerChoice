import { CalorieEstimationResult } from '../types';
import { processImageForAI } from '../utils/imageProcessor';
import { ensureSupabaseAnonymousAuth } from './authService';
import { getSupabaseClient } from './supabaseClient';

const CALORIE_ESTIMATION_FUNCTION = 'calorie-estimation-ocr';

type EdgeFunctionResponse = {
  result: CalorieEstimationResult;
};

export type EstimationMode = 'basic' | 'detailed';
export type EstimationLocale = 'en' | 'ja';

type EstimateCaloriesOptions = {
  mode?: EstimationMode;
  locale?: EstimationLocale;
};

function getEnv(name: 'EXPO_PUBLIC_SUPABASE_URL' | 'EXPO_PUBLIC_SUPABASE_ANON_KEY'): string {
  const value = process.env[name];
  return typeof value === 'string' ? value.trim() : '';
}

function getLegacyAnonJwt(): string {
  const value = process.env.EXPO_PUBLIC_SUPABASE_LEGACY_ANON_JWT;
  return typeof value === 'string' ? value.trim() : '';
}

function getFunctionEndpoint(): string {
  const baseUrl = getEnv('EXPO_PUBLIC_SUPABASE_URL');
  if (!baseUrl) {
    throw new Error('Supabase URL is missing');
  }
  return `${baseUrl}/functions/v1/${CALORIE_ESTIMATION_FUNCTION}`;
}

async function invokeCalorieEstimationFunction(
  accessToken: string,
  imageBase64: string,
  mode: EstimationMode,
  locale: EstimationLocale
): Promise<CalorieEstimationResult> {
  const apikey = getEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY');
  if (!apikey) {
    throw new Error('Supabase key is missing');
  }

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const response = await fetch(getFunctionEndpoint(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        apikey,
      },
      body: JSON.stringify({ imageBase64, mode, locale }),
    });

    const bodyText = await response.text();
    if (!response.ok) {
      const isRetriableJsonError =
        response.status === 502 && bodyText.includes('AI response is not valid JSON');
      if (isRetriableJsonError && attempt < 2) {
        continue;
      }
      throw new Error(`Edge Function HTTP ${response.status}: ${bodyText}`);
    }

    let parsed: EdgeFunctionResponse | null = null;
    try {
      parsed = JSON.parse(bodyText) as EdgeFunctionResponse;
    } catch {
      if (attempt < 2) {
        continue;
      }
      throw new Error('Edge Function returned invalid JSON');
    }

    const result = parsed?.result;
    if (
      !result ||
      !result.foodName ||
      typeof result.estimatedCalories !== 'number' ||
      typeof result.confidence !== 'number'
    ) {
      if (attempt < 2) {
        continue;
      }
      throw new Error('Invalid response format from Edge Function');
    }

    return result;
  }

  throw new Error('Edge Function returned invalid response');
}

async function getAccessTokenForEstimation(
  supabase: NonNullable<ReturnType<typeof getSupabaseClient>>
): Promise<string> {
  const legacyAnonJwt = getLegacyAnonJwt();
  if (legacyAnonJwt) {
    return legacyAnonJwt;
  }

  const readAndValidateToken = async (): Promise<string | null> => {
    const userId = await ensureSupabaseAnonymousAuth();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!userId || !session?.access_token) {
      return null;
    }

    const { data, error } = await supabase.auth.getUser(session.access_token);
    if (error || !data?.user?.id) {
      return null;
    }
    return session.access_token;
  };

  const firstToken = await readAndValidateToken();
  if (firstToken) {
    return firstToken;
  }

  // Recover from stale/invalid cached auth by rebuilding session once.
  await supabase.auth.signOut();
  const secondToken = await readAndValidateToken();
  if (secondToken) {
    return secondToken;
  }

  throw new Error('Authentication is required for calorie estimation');
}

/**
 * 食べ物の写真からカロリーを推定
 */
export async function estimateCalories(
  imageUri: string,
  options: EstimateCaloriesOptions = {}
): Promise<CalorieEstimationResult> {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error('Supabase is not configured');
    }

    let accessToken = await getAccessTokenForEstimation(supabase);
    const mode = options.mode ?? 'basic';
    const locale = options.locale ?? 'en';

    // 画像を処理（リサイズ + Base64変換）
    const base64Image = await processImageForAI(imageUri);
    try {
      return await invokeCalorieEstimationFunction(accessToken, base64Image, mode, locale);
    } catch (invokeError) {
      if (invokeError instanceof Error && invokeError.message.includes('HTTP 401')) {
        await supabase.auth.signOut();
        accessToken = await getAccessTokenForEstimation(supabase);
        return await invokeCalorieEstimationFunction(accessToken, base64Image, mode, locale);
      }
      throw invokeError;
    }
  } catch (error) {
    console.error('Error estimating calories:', error);

    if (error instanceof Error) {
      if (error.message.includes('Authentication')) {
        throw new Error('Supabase認証が必要です。Anonymous Sign-insを有効化してください。');
      }
      if (error.message.includes('not configured')) {
        throw new Error('Supabase is not configured correctly.');
      }
      if (error.message.includes('Failed to send a request')) {
        throw new Error('Network error while calling AI service.');
      }
      if (error.message.includes('HTTP 401') || error.message.includes('401')) {
        throw new Error('認証エラーです。SupabaseのAnonymous Sign-ins設定を確認してください。');
      }
      if (error.message.includes('HTTP 500') || error.message.includes('OPENAI_API_KEY')) {
        throw new Error('サーバー設定エラーです。OPENAI_API_KEYの設定を確認してください。');
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
    const supabase = getSupabaseClient();
    if (!supabase) {
      return false;
    }

    const accessToken = await getAccessTokenForEstimation(supabase);

    const tinyBase64Png =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AApMBgQpD6UQAAAAASUVORK5CYII=';

    const result = await invokeCalorieEstimationFunction(accessToken, tinyBase64Png, 'basic', 'en');
    return Boolean(result.estimatedCalories);
  } catch (error) {
    console.error('OpenAI connection test failed:', error);
    return false;
  }
}
