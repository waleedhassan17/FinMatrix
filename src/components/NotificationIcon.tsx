import React from 'react';
import { Feather } from '@expo/vector-icons';
import { colors } from '../theme';

export const NOTIFICATION_ICON_NAME: React.ComponentProps<typeof Feather>['name'] = 'bell';

type NotificationIconProps = Omit<React.ComponentProps<typeof Feather>, 'name'>;

const NotificationIcon: React.FC<NotificationIconProps> = ({
  size = 20,
  color = colors.textPrimary,
  ...rest
}) => {
  return <Feather name={NOTIFICATION_ICON_NAME} size={size} color={color} {...rest} />;
};

export default NotificationIcon;
