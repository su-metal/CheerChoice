/**
 * 運動完了・途中終了時のメッセージ
 */

export const completionMessages = [
  "You crushed it! 💪",
  "Beast mode activated! 🔥",
  "Look at you go, queen! 👑",
  "That's how it's done! ⭐",
  "Incredible work! 🎉",
  "You're unstoppable! 🚀",
  "Absolutely amazing! 💜",
  "Fitness goals achieved! ✨",
  "Killing it! 💥",
  "You're a superstar! 🌟",
  "Legendary performance! 🏆",
  "Pure excellence! 💎",
];

export const partialMessages = [
  "Every rep counts! 💕",
  "Progress over perfection! 🌟",
  "You showed up, that's what matters! 💪",
  "Listen to your body, you did great! 🌸",
  "Amazing effort! 💜",
  "You're doing awesome! ⭐",
  "That took courage! 🦋",
  "Self-care is the best care! 💝",
  "Proud of you for trying! 🌈",
  "Keep shining! ✨",
];

export function getRandomCompletionMessage(): string {
  return completionMessages[Math.floor(Math.random() * completionMessages.length)];
}

export function getRandomPartialMessage(): string {
  return partialMessages[Math.floor(Math.random() * partialMessages.length)];
}

export function getRandomAteMessage(): string {
  const ateMessages = [
    "Let's balance it out!",
    "Time to move!",
    "Enjoyed your meal?",
    "Now for the fun part!",
    "Ready to burn some calories?",
  ];
  return ateMessages[Math.floor(Math.random() * ateMessages.length)];
}
