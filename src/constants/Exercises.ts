/**
 * CheerChoice Exercise Definitions
 *
 * 各運動の1回あたりの消費カロリーは平均値
 * 将来的にユーザーの体重・年齢で調整可能
 */

export interface ExerciseDefinition {
  id: string;
  name: string;           // 日本語名
  nameEn: string;         // 英語名
  caloriesPerRep: number; // 1回あたりの消費カロリー
  icon: string;           // 絵文字アイコン
  defaultReps: number;    // デフォルト回数
  description: string;    // 説明
}

export const EXERCISES: Record<string, ExerciseDefinition> = {
  squat: {
    id: 'squat',
    name: 'スクワット',
    nameEn: 'Squats',
    caloriesPerRep: 0.5,
    icon: '🏋️',
    defaultReps: 20,
    description: 'Lower body strength',
  },
  situp: {
    id: 'situp',
    name: '腹筋',
    nameEn: 'Sit-ups',
    caloriesPerRep: 0.3,
    icon: '🤸',
    defaultReps: 30,
    description: 'Core strength',
  },
  pushup: {
    id: 'pushup',
    name: '腕立て伏せ',
    nameEn: 'Push-ups',
    caloriesPerRep: 0.4,
    icon: '💪',
    defaultReps: 15,
    description: 'Upper body strength',
  },
};

/**
 * 運動リスト（配列形式）
 */
export const EXERCISE_LIST = Object.values(EXERCISES);

/**
 * 運動タイプ（型定義）
 */
export type ExerciseType = keyof typeof EXERCISES;
