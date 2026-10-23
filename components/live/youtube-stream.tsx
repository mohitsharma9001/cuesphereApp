import { Linking, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { Caption, PressableScale, Row } from '@/components/ui';
import { radius, useTheme } from '@/constants/theme';
import { youtubeEmbedUrl } from '@/lib/stream';

/** The table's YouTube stream, playing inline (muted until the viewer unmutes). */
export function YouTubeStream({ url }: { url: string }) {
  const { c } = useTheme();
  const embed = youtubeEmbedUrl(url);
  if (!embed) return null;
  return (
    <View style={{ gap: 6 }}>
      <View style={{ width: '100%', aspectRatio: 16 / 9, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: '#000' }}>
        <WebView
          source={{ uri: embed }}
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          allowsFullscreenVideo
          javaScriptEnabled
          style={{ backgroundColor: '#000' }}
        />
      </View>
      <PressableScale onPress={() => Linking.openURL(url)} style={{ alignSelf: 'flex-end' }}>
        <Row style={{ gap: 4 }}>
          <Caption style={{ color: c.primary, fontWeight: '800' }}>▶ Open in YouTube</Caption>
        </Row>
      </PressableScale>
    </View>
  );
}
