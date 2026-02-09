import { ExerciseDefinition } from '../constants/Exercises';

/**
 * 回数提案の基本方針
 * - 摂取カロリーを完全に相殺するのではなく、継続しやすい割合で提案する
 * - 低カロリー食品でも過剰な回数にならないよう下限/上限を設ける
 */
const BALANCE_RATIO = 0.25;
const MIN_RECOMMENDED_REPS = 8;
const MAX_REPS_MULTIPLIER = 5;
const TOO_MANY_REPS_THRESHOLD = 60;

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

  const adjustedCalories = calories * BALANCE_RATIO;
  const rawReps = Math.ceil(adjustedCalories / exercise.caloriesPerRep);
  const maxForExercise = exercise.defaultReps * MAX_REPS_MULTIPLIER;

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
