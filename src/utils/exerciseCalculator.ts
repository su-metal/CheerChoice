import { ExerciseDefinition } from '../constants/Exercises';

/**
 * 回数提案の基本方針
 * - 摂取カロリーを完全に相殺するのではなく、継続しやすい割合で提案する
 * - 種目ごとに係数を調整し、体感負荷を揃える
 * - ハイカロリーでも回数が過剰にならないよう絶対上限を設ける
 */
const MIN_RECOMMENDED_REPS = 8;
const TOO_MANY_REPS_THRESHOLD = 60;
const BALANCE_RATIO_BY_EXERCISE: Record<string, number> = {
  squat: 0.18,
  situp: 0.16,
  pushup: 0.17,
};
const MAX_RECOMMENDED_REPS_BY_EXERCISE: Record<string, number> = {
  squat: 40,
  situp: 45,
  pushup: 35,
};

/**
 * カロリーに基づいて推奨運動回数を計算
 *
 * @param calories 摂取カロリー
 * @param exercise 運動定義
 * @returns 推奨回数（継続しやすい範囲に補正）
 */
export function calculateRecommendedReps(
  calories: number,
  exercise: ExerciseDefinition
): number {
  if (calories <= 0) {
    return exercise.defaultReps;
  }

  const balanceRatio = BALANCE_RATIO_BY_EXERCISE[exercise.id] ?? 0.17;
  const adjustedCalories = calories * balanceRatio;
  const rawReps = Math.ceil(adjustedCalories / exercise.caloriesPerRep);
  const maxForExercise = MAX_RECOMMENDED_REPS_BY_EXERCISE[exercise.id] ?? exercise.defaultReps * 3;

  return Math.min(
    Math.max(rawReps, MIN_RECOMMENDED_REPS),
    maxForExercise
  );
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
  return reps >= TOO_MANY_REPS_THRESHOLD;
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
