import type { Middleware } from '@reduxjs/toolkit';
import { addRealtimeNotification } from '../screens/Notifications/notificationCenterSlice';

type InventoryApprovalStateShape = {
  requests?: Array<{
    id: string;
    personnelId: string;
    deliveryReference?: string;
  }>;
};

type RootStateShape = {
  inventoryApproval?: InventoryApprovalStateShape;
};

export const realtimeMiddleware: Middleware = storeApi => next => action => {
  const result = next(action);

  if (typeof action !== 'object' || action === null || !('type' in action)) {
    return result;
  }

  const typedAction = action as { type: string; payload?: any };

  switch (typedAction.type) {
    case 'delivery/updateStatus':
    case 'delivery/updateDeliveryStatus': {
      const deliveryId = typedAction.payload?.deliveryId;
      storeApi.dispatch(
        addRealtimeNotification({
          targetRole: 'admin',
          category: 'delivery_updates',
          title: 'Delivery Status Updated',
          message: `Delivery ${deliveryId ?? ''} status changed by field staff.`.trim(),
          routeName: deliveryId ? 'AdminDeliveryDetail' : 'DeliveryMonitor',
          routeParams: deliveryId ? { deliveryId } : undefined,
        }),
      );
      break;
    }

    case 'delivery/submitInventoryUpdate':
    case 'delivery/submitShadowInventoryUpdateForDelivery': {
      const deliveryId = typedAction.payload?.deliveryId;
      storeApi.dispatch(
        addRealtimeNotification({
          targetRole: 'admin',
          category: 'inventory_approvals',
          title: 'Inventory Update Submitted',
          message: `Delivery ${deliveryId ?? ''} submitted inventory changes for approval.`.trim(),
          routeName: 'InventoryApproval',
        }),
      );
      break;
    }

    case 'delivery/assignDelivery':
    case 'delivery/assignSelectedDeliveries': {
      const personnelId = typedAction.payload?.personnelId;
      const count = typedAction.payload?.deliveryIds?.length ?? 1;
      storeApi.dispatch(
        addRealtimeNotification({
          targetRole: 'delivery',
          targetUserId: personnelId,
          category: 'new_assignments',
          title: 'New Delivery Assignment',
          message: `${count} delivery ${count > 1 ? 'jobs were' : 'job was'} assigned to you.`,
          routeName: 'DPDeliveries',
        }),
      );
      break;
    }

    case 'approvals/approve':
    case 'approvals/reject': {
      const approved = typedAction.type === 'approvals/approve';
      const personnelId = typedAction.payload?.personnelId;
      const deliveryRef = typedAction.payload?.deliveryReference;
      storeApi.dispatch(
        addRealtimeNotification({
          targetRole: 'delivery',
          targetUserId: personnelId,
          category: 'approval_results',
          title: approved ? 'Inventory Update Approved' : 'Inventory Update Rejected',
          message: `${deliveryRef ?? 'Your'} inventory update was ${approved ? 'approved' : 'rejected'}.`,
          routeName: 'DPShadowInventory',
        }),
      );
      break;
    }

    case 'inventoryApproval/setRequestStatus': {
      const status = typedAction.payload?.status;
      if (status !== 'approved' && status !== 'rejected') break;

      const state = storeApi.getState() as RootStateShape;
      const request = state.inventoryApproval?.requests?.find(
        r => r.id === typedAction.payload?.requestId,
      );

      storeApi.dispatch(
        addRealtimeNotification({
          targetRole: 'delivery',
          targetUserId: request?.personnelId,
          category: 'approval_results',
          title: status === 'approved' ? 'Inventory Update Approved' : 'Inventory Update Rejected',
          message: `${request?.deliveryReference ?? 'Your'} inventory request was ${status}.`,
          routeName: 'DPShadowInventory',
        }),
      );
      break;
    }

    default:
      break;
  }

  return result;
};
