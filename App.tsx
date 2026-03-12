import 'react-native-gesture-handler';
import React from 'react';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { store, persistor } from './src/store/store';
import { colors } from './src/theme';
import AppContainer from './src/components/app-container/AppContainer';

// ⚠️ DEV ONLY: Purge persisted state so the app always starts from Onboarding.
// Remove this line once done testing.
persistor.purge();

const LoadingFallback = () => (
  <View style={styles.loading}>
    <ActivityIndicator size="large" color={colors.primary} />
  </View>
);

const App = () => (
  <GestureHandlerRootView style={styles.root}>
    <Provider store={store}>
      <PersistGate loading={<LoadingFallback />} persistor={persistor}>
        <AppContainer />
      </PersistGate>
    </Provider>
  </GestureHandlerRootView>
);

const styles = StyleSheet.create({
  root: { flex: 1 },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});

export default App;
