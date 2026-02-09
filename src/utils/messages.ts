import { t } from '../i18n';

const skippedMessageKeys = [
  'messages.skipped.1',
  'messages.skipped.2',
  'messages.skipped.3',
  'messages.skipped.4',
  'messages.skipped.5',
];

const ateMessageKeys = [
  'messages.ate.1',
  'messages.ate.2',
  'messages.ate.3',
  'messages.ate.4',
  'messages.ate.5',
];

function pickRandomMessage(keys: string[]): string {
  const randomIndex = Math.floor(Math.random() * keys.length);
  return t(keys[randomIndex]);
}

export function getRandomSkippedMessage(): string {
  return pickRandomMessage(skippedMessageKeys);
}

export function getRandomAteMessage(): string {
  return pickRandomMessage(ateMessageKeys);
}
