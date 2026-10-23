import { Stack } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Icon } from '@/components/icon';
import { BottomSheet, Button, Caption, Field, LoadState, PressableScale, RemoteImage, Screen, tapHaptic, useConfirm, useToast } from '@/components/ui';
import { radius, useTheme } from '@/constants/theme';
import { api } from '@/lib/api';
import { useClub } from '@/lib/club-context';
import { pickImageForm } from '@/lib/pick-image';
import { useApi } from '@/lib/use-api';

interface GalleryImage {
  id: string;
  imageUrl: string;
  caption: string;
}

/** Manage the club's photo gallery (#36): add with a caption, delete. */
export default function ManageGallery() {
  const { c } = useTheme();
  const { slug } = useClub();
  const toast = useToast();
  const confirm = useConfirm();
  const gallery = useApi<GalleryImage[]>(`/clubs/${slug}/gallery`);
  const [adding, setAdding] = useState(false);
  const [caption, setCaption] = useState('');
  const [busy, setBusy] = useState(false);

  async function upload(source: 'library' | 'camera') {
    try {
      const form = await pickImageForm({ source, extra: { caption: caption.trim() } });
      if (!form) return;
      setBusy(true);
      await api(`/clubs/${slug}/gallery`, { method: 'POST', body: form });
      tapHaptic('success');
      toast('Photo added');
      setAdding(false);
      setCaption('');
      gallery.reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not upload.', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function remove(img: GalleryImage) {
    if (!(await confirm({ title: 'Delete this photo?', message: 'It disappears from your club page.', confirmLabel: 'Delete', destructive: true }))) return;
    try {
      await api(`/clubs/${slug}/gallery/${img.id}`, { method: 'DELETE' });
      toast('Photo deleted');
      gallery.reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not delete.', 'error');
    }
  }

  return (
    <Screen refreshing={gallery.refreshing} onRefresh={gallery.refresh}>
      <Stack.Screen options={{ title: 'Photo gallery' }} />
      <Button title="Add photo" icon={['plus', 'add_a_photo']} onPress={() => setAdding(true)} />
      <LoadState loading={gallery.loading} error={gallery.error} onRetry={gallery.refresh} empty={gallery.data?.length === 0 && 'No photos yet. Add your tables, trophies and big nights.'} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {gallery.data?.map((img) => (
          <View key={img.id} style={{ width: '48%', gap: 4 }}>
            <RemoteImage uri={img.imageUrl} style={{ width: '100%', aspectRatio: 1, borderRadius: radius.md }} />
            <PressableScale onPress={() => remove(img)} style={{ position: 'absolute', top: 6, right: 6, backgroundColor: c.danger, borderRadius: 14, padding: 6 }} accessibilityLabel="Delete photo">
              <Icon ios="trash" android="delete" size={14} color="#FFF" />
            </PressableScale>
            {!!img.caption && <Caption numberOfLines={2}>{img.caption}</Caption>}
          </View>
        ))}
      </View>
      <BottomSheet visible={adding} onClose={() => setAdding(false)} title="Add a photo">
        <Field label="Caption (optional)" value={caption} onChangeText={setCaption} placeholder="Finals night 2026" />
        <Button title="Choose from library" icon={['photo', 'photo_library']} onPress={() => upload('library')} loading={busy} />
        <Button title="Take a photo" variant="secondary" icon={['camera', 'photo_camera']} onPress={() => upload('camera')} disabled={busy} />
      </BottomSheet>
    </Screen>
  );
}
