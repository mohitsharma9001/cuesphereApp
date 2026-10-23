import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { ActivityIndicator, Platform, Text, View } from 'react-native';

import { Avatar, BottomSheet, Button, Caption, PressableScale } from '@/components/ui';
import { useTheme } from '@/constants/theme';
import { api, ApiError } from '@/lib/api';
import type { PlayerProfile } from '@/lib/types';

/** Profile photo with "Change photo": library or camera, square crop, uploaded
 * straight away. Saved as JPEG — the API accepts JPEG/PNG/WebP, and iPhone
 * photos would otherwise arrive as HEIC. */
export function PhotoPicker({ name, uri, onUploaded }: { name: string; uri: string; onUploaded: (profile: PlayerProfile) => void }) {
  const { c } = useTheme();
  const [sheet, setSheet] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pick(source: 'library' | 'camera') {
    setSheet(false);
    setError(null);
    const perm = source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError(source === 'camera' ? 'Allow camera access in Settings to take a photo.' : 'Allow photo access in Settings to choose a photo.');
      return;
    }
    const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 };
    const result = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];

    setBusy(true);
    try {
      const form = new FormData();
      if (Platform.OS === 'web') {
        const blob = await (await fetch(asset.uri)).blob();
        form.append('file', blob, asset.fileName ?? 'photo.jpg');
      } else {
        const known = asset.mimeType === 'image/png' || asset.mimeType === 'image/webp';
        form.append('file', { uri: asset.uri, name: known ? (asset.fileName ?? 'photo') : 'photo.jpg', type: known ? asset.mimeType : 'image/jpeg' } as unknown as Blob);
      }
      onUploaded(await api<PlayerProfile>('/profiles/me/photo', { method: 'POST', body: form }));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not upload the photo.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ alignItems: 'center', gap: 8 }}>
      <PressableScale accessibilityRole="button" accessibilityLabel="Change photo" onPress={() => setSheet(true)} disabled={busy}>
        <View>
          <Avatar name={name || 'Player'} uri={uri || null} size={104} />
          <View style={{ position: 'absolute', right: 0, bottom: 0, width: 34, height: 34, borderRadius: 17, backgroundColor: c.primary, borderWidth: 3, borderColor: c.bg, alignItems: 'center', justifyContent: 'center' }}>
            {busy ? <ActivityIndicator color={c.onPrimary} size="small" /> : <Text style={{ color: c.onPrimary, fontSize: 16, fontWeight: '900' }}>+</Text>}
          </View>
        </View>
      </PressableScale>
      <PressableScale onPress={() => setSheet(true)} disabled={busy}>
        <Caption style={{ color: c.primary, fontWeight: '800' }}>{busy ? 'Uploading…' : uri ? 'Change photo' : 'Add a photo'}</Caption>
      </PressableScale>
      {error && <Caption style={{ color: c.danger, textAlign: 'center' }}>{error}</Caption>}

      <BottomSheet visible={sheet} onClose={() => setSheet(false)} title="Profile photo">
        <Button title="Choose from library" icon={['photo.on.rectangle', 'photo_library']} onPress={() => pick('library')} />
        {Platform.OS !== 'web' && <Button title="Take a photo" variant="secondary" icon={['camera.fill', 'photo_camera']} onPress={() => pick('camera')} />}
        <Button title="Cancel" variant="ghost" onPress={() => setSheet(false)} />
      </BottomSheet>
    </View>
  );
}
