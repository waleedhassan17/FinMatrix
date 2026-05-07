import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { store, persistor } from './src/store/store';
import { colors } from './src/theme';
import AppContainer from './src/components/app-container/AppContainer';
import ErrorBoundary from './src/components/ErrorBoundary';
import { useAppDispatch } from './src/hooks/useReduxHooks';
import { signOut } from './src/screens/Auth/authSlice';

const LoadingFallback = () => (
  <View style={styles.loading}>
    <ActivityIndicator size="large" color={colors.primary} />
  </View>
);

const FreshLoginGate = () => {
  const dispatch = useAppDispatch();
  const [sessionResetComplete, setSessionResetComplete] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const resetSession = async () => {
      try {
        await persistor.purge();
      } finally {
        store.dispatch(signOut());
        dispatch(signOut());
        if (isMounted) {
          setSessionResetComplete(true);
        }
      }
    };

    resetSession();

    return () => {
      isMounted = false;
    };
  }, [dispatch]);

  if (!sessionResetComplete) {
    return <LoadingFallback />;
  }

  return <AppContainer />;
};

const App = () => (
  <ErrorBoundary>
    <GestureHandlerRootView style={styles.root}>
      <Provider store={store}>
        <PersistGate loading={<LoadingFallback />} persistor={persistor}>
          <FreshLoginGate />
        </PersistGate>
      </Provider>
    </GestureHandlerRootView>
  </ErrorBoundary>
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
