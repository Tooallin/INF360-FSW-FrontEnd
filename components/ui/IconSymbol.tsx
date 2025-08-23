// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolViewProps, SymbolWeight } from 'expo-symbols';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

type IconMapping = Record<SymbolViewProps['name'], ComponentProps<typeof MaterialIcons>['name']>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING = {
  'house.fill': 'home',
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
  'account.fill': 'person',
  'lock.fill': 'lock',
  'eye.fill': 'visibility',
  'eye.slash.fill': 'visibility-off',
  'bell.fill': 'notifications',
  'star.fill': 'star',
  'heart.fill': 'favorite',
  'trash.fill': 'delete',
  'plus.circle.fill': 'add-circle',
  'minus.circle.fill': 'remove-circle',
  'checkmark.circle.fill': 'check-circle',
  'xmark.circle.fill': 'cancel',
  'calendar': 'calendar-today',
  'camera.fill': 'photo-camera',
  'search': 'search',
  'settings': 'settings',
  'edit': 'edit',
  'info.circle.fill': 'info',
  'warning.fill': 'warning',
  'location.fill': 'location-on',
  'phone.fill': 'phone',
  'mail.fill': 'mail',
  'cart.fill': 'shopping-cart',
  'bookmark.fill': 'bookmark',
  'chat.fill': 'chat',
  'upload': 'file-upload',
  'download': 'file-download',
  'password': 'password',
  'at': 'alternate-email',
  'lock.contour': 'lock-outline',
} as const;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
  className,
  weight,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
  className?: string;
}) {
  return <MaterialIcons
      color={color}
      size={size}
      name={MAPPING[name]}
      style={style}
      className={className}
    />;
}
