// ═══════════════════════════════════════════════════════
// FinMatrix — pick an item photo (camera or gallery)
// ═══════════════════════════════════════════════════════
// Returns `pickPhoto()`, which asks where the photo comes from, gets the
// permission it needs, and resolves to the chosen file — or null when the
// user backs out at any step.
//
// Three buttons at most: Android shows no more than three in an alert, and
// the web build's Alert shim turns any multi-button alert into a single
// window.confirm that can only run one action — so on the web this opens the
// file chooser straight away instead of asking.
//
// The photo is uploaded at quality 0.6. The server straightens, resizes and
// re-encodes it anyway, so this only keeps the upload small on mobile data.

import { useCallback } from 'react';
import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from '../utils/alert';

export type PickedPhoto = { uri: string; name: string; mimeType: string };

const QUALITY = 0.6;

const launch = async (fromCamera: boolean): Promise<PickedPhoto | null> => {
  const perm = fromCamera
    ? await ImagePicker.requestCameraPermissionsAsync()
    : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    Alert.alert(
      fromCamera ? 'Camera access needed' : 'Photo access needed',
      'Allow access in your phone’s settings to add a photo of this item.',
    );
    return null;
  }
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: QUALITY };
  const res = fromCamera
    ? await ImagePicker.launchCameraAsync(options)
    : await ImagePicker.launchImageLibraryAsync(options);
  if (res.canceled || !res.assets?.length) return null;
  const a = res.assets[0];
  const mimeType = a.mimeType ?? 'image/jpeg';
  return {
    uri: a.uri,
    name: a.fileName ?? `item-photo-${Date.now()}.${mimeType === 'image/png' ? 'png' : 'jpg'}`,
    mimeType,
  };
};

export const useItemPhotoPicker = () => {
  const pickPhoto = useCallback(
    (): Promise<PickedPhoto | null> =>
      Platform.OS === 'web'
        ? launch(false)
        : new Promise(resolve => {
            Alert.alert('Item photo', 'Take a new photo or choose one from your gallery.', [
              { text: 'Take photo', onPress: () => launch(true).then(resolve, () => resolve(null)) },
              { text: 'Choose from gallery', onPress: () => launch(false).then(resolve, () => resolve(null)) },
              { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
            ]);
          }),
    [],
  );
  return { pickPhoto };
};
