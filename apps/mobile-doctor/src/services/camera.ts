import * as ImagePicker from 'expo-image-picker';
import { WebView } from 'react-native-webview';

type CameraMessage = {
  type: 'camera';
  payload?: {
    source?: 'camera' | 'library';
    requestId?: string;
  };
};

export async function handleCameraMessage(
  message: CameraMessage,
  webView: WebView | null
): Promise<void> {
  try {
    const source = message.payload?.source ?? 'library';
    const requestId = message.payload?.requestId ?? '';

    let result: ImagePicker.ImagePickerResult;

    if (source === 'camera') {
      const { granted } = await ImagePicker.requestCameraPermissionsAsync();
      if (!granted) return;
      result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        base64: true,
      });
    } else {
      const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!granted) return;
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        base64: true,
      });
    }

    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      webView?.postMessage(
        JSON.stringify({
          type: 'camera-result',
          payload: {
            requestId,
            uri: asset.uri,
            base64: asset.base64 ?? null,
            mimeType: asset.mimeType ?? 'image/jpeg',
          },
        })
      );
    }
  } catch {}
}
