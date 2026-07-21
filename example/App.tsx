import { ExpoMockLivePhotoView } from 'expo-mock-live-photo';
import { SafeAreaView } from 'react-native';

export default function App() {
  return (
    <SafeAreaView style={styles.container}>
      <ExpoMockLivePhotoView style={styles.view} />
    </SafeAreaView>
  );
}

const styles = {
  container: { flex: 1 },
  view: { flex: 1 },
};
