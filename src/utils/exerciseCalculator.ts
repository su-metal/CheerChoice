import { ExerciseDefinition } from '../constants/Exercises';

/**
 * 最大推奨回数（現実的な範囲）
 */
const MAX_RECOMMENDED_REPS = 200;

/**
 * カロリーに基づいて推奨運動回数を計算
 *
 * @param calories 摂取カロリー
 * @param exercise 運動定義
 * @returns 推奨回数（最大200回に制限）
 */
export function calculateRecommendedReps(
  calories: number,
  exercise: ExerciseDefinition
): number {
  if (calories <= 0) {
    return exercise.defaultReps;
  }

  const rawReps = Math.ceil(calories / exercise.caloriesPerRep);
  return Math.min(rawReps, MAX_RECOMMENDED_REPS);
}

/**
 * 運動回数から消費カロリーを計算
 *
 * @param reps 運動回数
 * @param exercise 運動定義
 * @returns 消費カロリー
 */
export function calculateBurnedCalories(
  reps: number,
  exercise: ExerciseDefinition
): number {
  return Math.round(reps * exercise.caloriesPerRep);
}

/**
 * 推奨回数が多すぎる場合の判定
 *
 * @param reps 推奨回数
 * @returns 多すぎる場合true
 */
export function isTooManyReps(reps: number): boolean {
  return reps >= MAX_RECOMMENDED_REPS;
}

/**
 * セット数に分割する提案
 *
 * @param totalReps 合計回数
 * @param repsPerSet 1セットあたりの回数
 * @returns セット数
 */
export function calculateSets(totalReps: number, repsPerSet: number = 20): number {
  return Math.ceil(totalReps / repsPerSet);
}
