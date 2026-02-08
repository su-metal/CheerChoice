/**
 * ポジティブメッセージ集
 * 米国フィットネス女性向けの励ましメッセージ
 */

export const skippedMessages = [
  "You did it, queen! 👑",
  "Crushing it! 💪",
  "Self-care = The best care 💕",
  "You're stronger than you think! 🌟",
  "Winning at life! ✨",
  "That's my girl! 🎉",
  "Yasss queen! 💅",
  "Killing it! 🔥",
  "You're unstoppable! 🚀",
  "Own your power! ⚡",
  "Smart choice! 🧠",
  "Level up! 📈",
  "Proud of you! 💖",
  "You're glowing! ✨",
  "Boss babe energy! 👊",
  "That's self-love! 💝",
  "Slaying today! 💃",
  "Champion mindset! 🏆",
  "You're amazing! 🌈",
  "Keep shining! ⭐",
  "Strength looks good on you! 💪",
  "You're incredible! 🦄",
  "Making gains! 📊",
  "That willpower! 🔋",
  "You've got this! 🙌",
];

/**
 * ランダムなポジティブメッセージを取得
 */
export function getRandomSkippedMessage(): string {
  const randomIndex = Math.floor(Math.random() * skippedMessages.length);
  return skippedMessages[randomIndex];
}

/**
 * 「食べる」選択時のメッセージ
 */
export const ateMessages = [
  "Enjoy your meal! 🍽️",
  "Food is fuel! 💪",
  "Balance is key! ⚖️",
  "Nourish yourself! 🥗",
  "You deserve it! 💕",
  "Savor every bite! 😋",
  "Fuel your body! 🔋",
  "Bon appétit! 🌟",
  "Treat yourself! 🎉",
  "Life is delicious! 🍴",
];

export function getRandomAteMessage(): string {
  const randomIndex = Math.floor(Math.random() * ateMessages.length);
  return ateMessages[randomIndex];
}
