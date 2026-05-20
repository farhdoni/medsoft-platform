import * as ImagePicker from 'expo-image-picker';

export async function takePhoto(): Promise<string | null> {
  const { granted } = await ImagePicker.requestCameraPermissionsAsync();
  if (!granted) return null;

  const result = await ImagePicker.launchCameraAsync({
    quality: 0.8,
    base64: true,
  });

  if (result.canceled) return null;
  return result.assets[0]?.base64 ?? null;
}

export async function pickFromGallery(): Promise<string | null> {
  const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!granted) return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    quality: 0.8,
    base64: true,
  });

  if (result.canceled) return null;
  return result.assets[0]?.base64 ?? null;
}
