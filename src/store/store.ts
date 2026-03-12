import { configureStore, combineReducers } from '@reduxjs/toolkit';
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist';
import autoMergeLevel2 from 'redux-persist/lib/stateReconciler/autoMergeLevel2';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Global slices ──
import authReducer from '../screens/Auth/authSlice';
import companyReducer from '../screens/Auth/companySlice';

// ── App-level slices ──
import { appContainerSlice } from '../components/app-container/appContainerSlice';

// ── Per-screen slices ──
import { signInSlice } from '../screens/Auth/SignIn/signInSlice';
import { signUpSlice } from '../screens/Auth/SignUp/signUpSlice';
import { forgotPasswordSlice } from '../screens/Auth/ForgotPassword/forgotPasswordSlice';
import { emailVerificationSlice } from '../screens/Auth/EmailVerification/emailVerificationSlice';
import { onboardingSlice } from '../screens/Onboarding/onboardingSlice';
import { roleSelectionSlice } from '../screens/RoleSelection/roleSelectionSlice';
import { companySetupSlice } from '../screens/Auth/CompanySetup/companySetupSlice';
import { createCompanySlice } from '../screens/Auth/CreateCompany/createCompanySlice';
import { joinCompanySlice } from '../screens/Auth/JoinCompany/joinCompanySlice';
import { deliveryOnboardingSlice } from '../screens/Auth/DeliveryOnboarding/deliveryOnboardingSlice';
import { deliveryPersonnelListSlice } from '../screens/Delivery/Admin/DeliveryPersonnelList/deliveryPersonnelListSlice';
import { addDeliveryPersonnelSlice } from '../screens/Delivery/Admin/AddDeliveryPersonnel/addDeliveryPersonnelSlice';
import { deliveryPersonnelDetailSlice } from '../screens/Delivery/Admin/DeliveryPersonnelDetail/deliveryPersonnelDetailSlice';
import { adminDashboardSlice } from '../screens/HomeScreen/adminDashboardSlice';
import { coaListSlice } from '../screens/ChartOfAccounts/COAList/coaListSlice';
import { coaFormSlice } from '../screens/ChartOfAccounts/COAForm/coaFormSlice';
import { coaDetailSlice } from '../screens/ChartOfAccounts/COADetail/coaDetailSlice';
import { glSlice } from '../screens/GeneralLedger/glSlice';
import { jeListSlice } from '../screens/JournalEntries/JEList/jeListSlice';
import { jeFormSlice } from '../screens/JournalEntries/JEForm/jeFormSlice';
import { jeDetailSlice } from '../screens/JournalEntries/JEDetail/jeDetailSlice';

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
  companySetup: companySetupSlice.reducer,
  createCompany: createCompanySlice.reducer,
  joinCompany: joinCompanySlice.reducer,
  deliveryOnboarding: deliveryOnboardingSlice.reducer,
  deliveryPersonnelList: deliveryPersonnelListSlice.reducer,
  addDeliveryPersonnel: addDeliveryPersonnelSlice.reducer,
  deliveryPersonnelDetail: deliveryPersonnelDetailSlice.reducer,
  adminDashboard: adminDashboardSlice.reducer,
  coaList: coaListSlice.reducer,
  coaForm: coaFormSlice.reducer,
  coaDetail: coaDetailSlice.reducer,
  gl: glSlice.reducer,
  jeList: jeListSlice.reducer,
  jeForm: jeFormSlice.reducer,
  jeDetail: jeDetailSlice.reducer,
});

const persistConfig = {
  key: 'finmatrix-root',
  storage: AsyncStorage,
  whitelist: ['auth', 'company'],
  stateReconciler: autoMergeLevel2 as any,
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
