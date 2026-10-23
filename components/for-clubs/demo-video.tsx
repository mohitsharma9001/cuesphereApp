import { useVideoPlayer, VideoView } from 'expo-video';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { PressableScale, RemoteImage } from '@/components/ui';
import { radius } from '@/constants/theme';
import { WEBSITE_URL } from '@/lib/config';

const VIDEO = `${WEBSITE_URL}/media/cuesphere-demo.mp4`;
const POSTER = `${WEBSITE_URL}/media/cuesphere-demo-poster.jpg`;

/** The 2-minute demo (portrait). Shows the poster until tapped, so nothing
 * downloads unless the viewer wants to watch; streamed from the website. */
export function DemoVideo() {
  const [playing, setPlaying] = useState(false);
  return (
    <View style={{ alignSelf: 'center', width: '78%', maxWidth: 320, aspectRatio: 9 / 16, borderRadius: radius.lg + 6, overflow: 'hidden', backgroundColor: '#000' }}>
      {playing ? (
        <Player />
      ) : (
        <PressableScale accessibilityRole="button" accessibilityLabel="Play the 2-minute demo video" onPress={() => setPlaying(true)} style={{ flex: 1 }}>
          <RemoteImage uri={POSTER} style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }} />
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.25)' }}>
            <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center' }}>
              <Icon ios="play.fill" android="play_arrow" color="#08573F" size={34} />
            </View>
            <Text style={{ color: '#FFFFFF', fontWeight: '800', marginTop: 12 }}>2-minute demo · sound on</Text>
          </View>
        </PressableScale>
      )}
    </View>
  );
}

function Player() {
  const player = useVideoPlayer(VIDEO, (p) => p.play());
  return <VideoView player={player} style={{ flex: 1 }} contentFit="cover" nativeControls fullscreenOptions={{ enable: true }} />;
}
