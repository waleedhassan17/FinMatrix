import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Global slices ──
import authReducer from './authSlice';
import companyReducer from './companySlice';

// ── App-level slices ──
import { appContainerSlice } from '../components/app-container/appContainerSlice';

// ── Per-screen slices ──
import { signInSlice } from '../screens/Auth/SignIn/signInSlice';
import { signUpSlice } from '../screens/Auth/SignUp/signUpSlice';
import { forgotPasswordSlice } from '../screens/Auth/ForgotPassword/forgotPasswordSlice';
import { emailVerificationSlice } from '../screens/Auth/EmailVerification/emailVerificationSlice';
import { onboardingSlice } from '../screens/Onboarding/onboardingSlice';
import { roleSelectionSlice } from '../screens/RoleSelection/roleSelectionSlice';

const rootReducer = combineReducers({
  auth: authReducer,
  company: companyReducer,
  appContainer: appContainerSlice.reducer,
  signIn: signInSlice.reducer,
  signUp: signUpSlice.reducer,
  forgotPassword: forgotPasswordSlice.reducer,
  emailVerification: emailVerificationSlice.reducer,
  onboarding: onboardingSlice.reducer,
  roleSelection: roleSelectionSlice.reducer,
});

const persistConfig = {
  key: 'finmatrix-root',
  storage: AsyncStorage,
  whitelist: ['auth', 'company'],
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
});

export const persistor = persistStore(store);
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
