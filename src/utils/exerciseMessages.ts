import { t } from '../i18n';

const completionMessageKeys = [
  'messages.exerciseCompletion.1',
  'messages.exerciseCompletion.2',
  'messages.exerciseCompletion.3',
  'messages.exerciseCompletion.4',
  'messages.exerciseCompletion.5',
];

const partialMessageKeys = [
  'messages.exercisePartial.1',
  'messages.exercisePartial.2',
  'messages.exercisePartial.3',
  'messages.exercisePartial.4',
  'messages.exercisePartial.5',
];

function pickRandomMessage(keys: string[]): string {
  const randomIndex = Math.floor(Math.random() * keys.length);
  return t(keys[randomIndex]);
}

export function getRandomCompletionMessage(): string {
  return pickRandomMessage(completionMessageKeys);
}

export function getRandomPartialMessage(): string {
  return pickRandomMessage(partialMessageKeys);
}
