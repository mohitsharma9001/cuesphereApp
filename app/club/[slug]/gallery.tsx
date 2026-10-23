import { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';

import { LoadState, PressableScale, RemoteImage, Screen } from '@/components/ui';
import { radius } from '@/constants/theme';
import { useClub } from '@/lib/club-context';
import { useApi } from '@/lib/use-api';

interface GalleryImage {
  id: string;
  imageUrl: string;
  caption: string;
}

/** Club gallery: a photo grid; tap for full screen. */
export default function ClubGallery() {
  const { slug } = useClub();
  const images = useApi<GalleryImage[]>(`/clubs/${slug}/gallery`);
  const [open, setOpen] = useState<GalleryImage | null>(null);
  return (
    <Screen refreshing={images.refreshing} onRefresh={images.refresh}>
      <LoadState loading={images.loading} error={images.error} onRetry={images.refresh} empty={images.data?.length === 0 && 'No photos yet.'} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {images.data?.map((img) => (
          <PressableScale key={img.id} onPress={() => setOpen(img)} style={{ width: '48.6%' }}>
            <RemoteImage uri={img.imageUrl} style={{ width: '100%', aspectRatio: 1, borderRadius: radius.md }} />
          </PressableScale>
        ))}
      </View>
      <Modal visible={!!open} transparent animationType="fade" onRequestClose={() => setOpen(null)}>
        <Pressable accessibilityLabel="Close photo" onPress={() => setOpen(null)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', padding: 12 }}>
          {open && (
            <View style={{ gap: 12 }}>
              <RemoteImage uri={open.imageUrl} contentFit="contain" style={{ width: '100%', aspectRatio: 1, backgroundColor: 'transparent' }} />
              {!!open.caption && <Text style={{ color: '#FFFFFF', textAlign: 'center', fontSize: 15 }}>{open.caption}</Text>}
            </View>
          )}
        </Pressable>
      </Modal>
    </Screen>
  );
}
