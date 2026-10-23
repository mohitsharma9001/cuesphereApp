import { Linking, Text } from 'react-native';

import { PressableScale, Row } from '@/components/ui';
import { radius } from '@/constants/theme';
import { youtubeVideoId } from '@/lib/stream';

/** Web build: react-native-webview isn't available, so link out to YouTube. */
export function YouTubeStream({ url }: { url: string }) {
  if (!youtubeVideoId(url)) return null;
  return (
    <PressableScale accessibilityRole="link" onPress={() => Linking.openURL(url)} style={{ backgroundColor: '#FF0000', borderRadius: radius.pill, height: 48, alignItems: 'center', justifyContent: 'center' }}>
      <Row style={{ gap: 8 }}>
        <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 16 }}>▶ Watch the live stream on YouTube</Text>
      </Row>
    </PressableScale>
  );
}
