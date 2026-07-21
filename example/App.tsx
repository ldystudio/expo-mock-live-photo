import { useAssets } from 'expo-asset';
import { MockLivePhoto } from 'expo-mock-live-photo';
import { useEffect, useState } from 'react';
import { SafeAreaView, StyleSheet, Switch, Text, View } from 'react-native';

type LastEvent = 'Loading' | 'Ready' | 'Started' | 'Ended' | 'Error';

const cover = require('./assets/cover.jpg');
const video = require('./assets/live-photo.mp4');

export default function App() {
  const [assets, assetError] = useAssets(video);
  const [muted, setMuted] = useState(true);
  const [lastEvent, setLastEvent] = useState<LastEvent>('Loading');

  useEffect(() => {
    if (assetError) setLastEvent('Error');
  }, [assetError]);

  const asset = assets?.[0];

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <View style={styles.heading}>
          <Text style={styles.eyebrow}>EXPO MODULE</Text>
          <Text style={styles.title}>expo-mock-live-photo</Text>
        </View>

        {asset ? (
          <MockLivePhoto
            source={cover}
            videoSource={{ uri: asset.localUri ?? asset.uri }}
            muted={muted}
            style={styles.media}
            accessibilityLabel="Toggle live photo playback"
            onLoad={() => setLastEvent('Ready')}
            onPlaybackStart={() => setLastEvent('Started')}
            onPlaybackEnd={() => setLastEvent('Ended')}
            onError={() => setLastEvent('Error')}
          />
        ) : (
          <View style={styles.media} />
        )}

        <View style={styles.controls}>
          <View>
            <Text style={styles.label}>Last event</Text>
            <Text style={styles.status}>{lastEvent}</Text>
          </View>
          <View style={styles.mutedControl}>
            <Text style={styles.label}>Muted</Text>
            <Switch
              accessibilityLabel="Mute video"
              value={muted}
              onValueChange={setMuted}
              trackColor={{ false: '#a8ada8', true: '#27745a' }}
              thumbColor="#ffffff"
            />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f3f5f2',
  },
  content: {
    flex: 1,
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    gap: 24,
  },
  heading: {
    gap: 6,
  },
  eyebrow: {
    color: '#27745a',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0,
  },
  title: {
    color: '#17201d',
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 0,
  },
  media: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#dfe4df',
  },
  controls: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mutedControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  label: {
    color: '#66706c',
    fontSize: 13,
    letterSpacing: 0,
  },
  status: {
    marginTop: 3,
    color: '#17201d',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0,
  },
});
