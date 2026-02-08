import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';

/**
 * 画像をリサイズしてBase64に変換
 * OpenAI APIのコスト削減のため、画像を512x512にリサイズ
 */
export async function processImageForAI(imageUri: string): Promise<string> {
  try {
    // 画像をリサイズ（縦横比を維持しながら最大512px）
    const manipulatedImage = await ImageManipulator.manipulateAsync(
      imageUri,
      [{ resize: { width: 512 } }], // 幅を512pxに、高さは自動調整
      { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
    );

    // Base64に変換
    const base64 = await FileSystem.readAsStringAsync(manipulatedImage.uri, {
      encoding: 'base64',
    });

    return base64;
  } catch (error) {
    console.error('Error processing image:', error);
    throw new Error('Failed to process image');
  }
}

/**
 * 画像ファイルサイズを取得（デバッグ用）
 */
export async function getImageSize(imageUri: string): Promise<number> {
  try {
    const fileInfo = await FileSystem.getInfoAsync(imageUri);
    if (fileInfo.exists && 'size' in fileInfo) {
      return fileInfo.size;
    }
    return 0;
  } catch (error) {
    console.error('Error getting image size:', error);
    return 0;
  }
}
