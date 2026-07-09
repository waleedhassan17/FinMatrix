import { createAppSlice } from '@store/createAppSlice';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { CompanyMember } from '../../Auth/companySlice';
import {
  fetchUsers as apiFetchUsers,
  inviteUser as apiInviteUser,
  updateUserRole as apiUpdateRole,
  removeUser as apiRemoveUser,
} from '../../../networks/settings/settingsNetwork';

interface UserManagementState {
  users: CompanyMember[];
  isLoading: boolean;
  error: string | null;
  inviteModal: boolean;
  inviteEmail: string;
  inviteRole: 'admin' | 'delivery';
  isInviting: boolean;
}

const initialState: UserManagementState = {
  users: [],
  isLoading: false,
  error: null,
  inviteModal: false,
  inviteEmail: '',
  inviteRole: 'admin',
  isInviting: false,
};

export const userManagementSlice = createAppSlice({
  name: 'userManagement',
  initialState,
  reducers: create => ({
    openInviteModal: create.reducer(state => {
      state.inviteModal = true;
      state.inviteEmail = '';
      state.inviteRole = 'admin';
    }),
    closeInviteModal: create.reducer(state => {
      state.inviteModal = false;
    }),
    setInviteEmail: create.reducer((state, action: PayloadAction<string>) => {
      state.inviteEmail = action.payload;
    }),
    setInviteRole: create.reducer((state, action: PayloadAction<'admin' | 'delivery'>) => {
      state.inviteRole = action.payload;
    }),
    fetchUsers: create.asyncThunk(
      async () => apiFetchUsers(),
      {
        pending: state => { state.isLoading = true; state.error = null; },
        fulfilled: (state, action) => {
          state.isLoading = false;
          state.users = action.payload;
        },
        rejected: (state, action) => {
          state.isLoading = false;
          state.error = action.error?.message ?? 'Failed to load users';
        },
      },
    ),
    inviteUser: create.asyncThunk(
      async (_: void, { getState }) => {
        const state = getState() as { userManagement: UserManagementState };
        return apiInviteUser(state.userManagement.inviteEmail, state.userManagement.inviteRole);
      },
      {
        pending: state => { state.isInviting = true; },
        fulfilled: (state, action) => {
          state.isInviting = false;
          state.users.push(action.payload);
          state.inviteModal = false;
        },
        rejected: (state, action) => {
          state.isInviting = false;
          state.error = action.error?.message ?? 'Failed to invite user';
        },
      },
    ),
    changeUserRole: create.asyncThunk(
      async (params: { userId: string; role: 'admin' | 'delivery' }) =>
        apiUpdateRole(params.userId, params.role).then(() => params),
      {
        fulfilled: (state, action) => {
          const u = state.users.find(x => x.userId === action.payload.userId);
          if (u) u.role = action.payload.role;
        },
      },
    ),
    deleteUser: create.asyncThunk(
      async (userId: string) =>
        apiRemoveUser(userId).then(() => userId),
      {
        fulfilled: (state, action) => {
          state.users = state.users.filter(u => u.userId !== action.payload);
        },
      },
    ),
  }),
  selectors: {
    selectUsers: state => state.users,
    selectUserMgmtLoading: state => state.isLoading,
    selectInviteModal: state => state.inviteModal,
    selectInviteEmail: state => state.inviteEmail,
    selectInviteRole: state => state.inviteRole,
    selectIsInviting: state => state.isInviting,
  },
});

export const {
  openInviteModal, closeInviteModal, setInviteEmail, setInviteRole,
  fetchUsers, inviteUser, changeUserRole, deleteUser,
} = userManagementSlice.actions;

export const {
  selectUsers, selectUserMgmtLoading, selectInviteModal,
  selectInviteEmail, selectInviteRole, selectIsInviting,
} = userManagementSlice.selectors;
