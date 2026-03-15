import type { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '@store/createAppSlice';
import {
  inventoryUpdateRequests,
  type InventoryUpdateRequest,
  type InventoryUpdateRequestStatus,
} from '../../../../dummy-data/inventoryUpdateRequests';

export type InventoryApprovalFilter = 'pending' | 'approved' | 'rejected' | 'all';

export interface InventoryApprovalNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  createdAt: string;
}

export interface InventoryApprovalAuditEntry {
  id: string;
  requestId: string;
  action: 'approved' | 'rejected';
  reviewedBy: string;
  createdAt: string;
  details: string;
}

export interface InventoryApprovalSliceState {
  requests: InventoryUpdateRequest[];
  activeFilter: InventoryApprovalFilter;
  notifications: InventoryApprovalNotification[];
  auditTrail: InventoryApprovalAuditEntry[];
}

const initialState: InventoryApprovalSliceState = {
  requests: inventoryUpdateRequests,
  activeFilter: 'pending',
  notifications: [],
  auditTrail: [],
};

const summarizeChanges = (request: InventoryUpdateRequest): string => {
  return request.changes
    .map(c => `${c.itemName}: ${c.beforeQty} -> ${Math.max(0, c.beforeQty - c.deliveredQty + c.returnedQty)}`)
    .join(' | ');
};

export const inventoryApprovalSlice = createAppSlice({
  name: 'inventoryApproval',
  initialState,
  reducers: create => ({
    setInventoryApprovalFilter: create.reducer(
      (state, action: PayloadAction<InventoryApprovalFilter>) => {
        state.activeFilter = action.payload;
      },
    ),
    setRequestStatus: create.reducer(
      (
        state,
        action: PayloadAction<{
          requestId: string;
          status: InventoryUpdateRequestStatus;
          reviewedBy: string;
          reviewerComment?: string;
        }>,
      ) => {
        const request = state.requests.find(r => r.id === action.payload.requestId);
        if (!request) return;

        const now = new Date().toISOString();
        request.status = action.payload.status;
        request.reviewedAt = now;
        request.reviewedBy = action.payload.reviewedBy;
        request.reviewerComment = action.payload.reviewerComment?.trim() || request.reviewerComment;
        request.shadowStatus = action.payload.status === 'approved' ? 'synced' : action.payload.status;

        const actionLabel = action.payload.status === 'approved' ? 'approved' : 'rejected';
        state.notifications.unshift({
          id: `notif_${Date.now()}_${request.id}`,
          userId: request.personnelId,
          title: `Inventory request ${actionLabel}`,
          message:
            action.payload.status === 'approved'
              ? `${request.deliveryReference} inventory changes were approved and synced.`
              : `${request.deliveryReference} inventory changes were rejected. ${request.reviewerComment ?? ''}`.trim(),
          createdAt: now,
        });

        if (action.payload.status === 'approved' || action.payload.status === 'rejected') {
          state.auditTrail.unshift({
            id: `audit_${Date.now()}_${request.id}`,
            requestId: request.id,
            action: action.payload.status,
            reviewedBy: action.payload.reviewedBy,
            createdAt: now,
            details: `${request.deliveryReference} | ${summarizeChanges(request)}`,
          });
        }
      },
    ),
  }),
  selectors: {
    selectInventoryApprovalState: state => state,
    selectInventoryApprovalRequests: state => state.requests,
    selectInventoryApprovalFilter: state => state.activeFilter,
    selectInventoryApprovalNotifications: state => state.notifications,
    selectInventoryApprovalAuditTrail: state => state.auditTrail,
    selectPendingApprovalCount: state => state.requests.filter(r => r.status === 'pending').length,
  },
});

export const { setInventoryApprovalFilter, setRequestStatus } = inventoryApprovalSlice.actions;

export const {
  selectInventoryApprovalState,
  selectInventoryApprovalRequests,
  selectInventoryApprovalFilter,
  selectInventoryApprovalNotifications,
  selectInventoryApprovalAuditTrail,
  selectPendingApprovalCount,
} = inventoryApprovalSlice.selectors;
