import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

/** Lets the user choose a photo (library or camera) and returns it as multipart
 * form data under "file", ready for the API's upload endpoints. Saved as JPEG
 * unless it's PNG/WebP — the API accepts only those three. Null if cancelled;
 * throws a friendly Error if permission is refused. */
export async function pickImageForm(options: { source?: 'library' | 'camera'; aspect?: [number, number]; extra?: Record<string, string> } = {}): Promise<FormData | null> {
  const source = options.source ?? 'library';
  const perm = source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) throw new Error(source === 'camera' ? 'Allow camera access in Settings.' : 'Allow photo access in Settings.');
  const pickerOptions: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], allowsEditing: !!options.aspect, aspect: options.aspect, quality: 0.8 };
  const result = source === 'camera' ? await ImagePicker.launchCameraAsync(pickerOptions) : await ImagePicker.launchImageLibraryAsync(pickerOptions);
  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];

  const form = new FormData();
  if (Platform.OS === 'web') {
    const blob = await (await fetch(asset.uri)).blob();
    form.append('file', blob, asset.fileName ?? 'image.jpg');
  } else {
    const known = asset.mimeType === 'image/png' || asset.mimeType === 'image/webp';
    form.append('file', { uri: asset.uri, name: known ? (asset.fileName ?? 'image') : 'image.jpg', type: known ? asset.mimeType : 'image/jpeg' } as unknown as Blob);
  }
  for (const [k, v] of Object.entries(options.extra ?? {})) form.append(k, v);
  return form;
}
