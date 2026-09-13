import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { AppVersionInfo } from '../services/versionCheck';
import { getDeviceLanguage, type AppLanguage } from '../utils/locale';

const STRINGS: Record<AppLanguage, { title: string; action: string; close: string }> = {
  ru: { title: 'Доступна новая версия приложения', action: 'Обновить', close: 'Закрыть' },
  uz: { title: 'Ilovaning yangi versiyasi mavjud', action: 'Yangilash', close: 'Yopish' },
  en: { title: 'A new app version is available', action: 'Update', close: 'Dismiss' },
};

type Props = {
  info: AppVersionInfo;
  onDismiss: () => void;
};

// Non-blocking by design (variant A): sits above the WebView content, never
// intercepts touches outside itself, and closing it just hides it for the
// rest of this session (see useAppVersionCheck) — no forced-update gate.
export function UpdateBanner({ info, onDismiss }: Props) {
  const insets = useSafeAreaInsets();
  const t = STRINGS[getDeviceLanguage()];

  return (
    <View style={[styles.wrapper, { top: insets.top + 8 }]} pointerEvents="box-none">
      <View style={styles.banner}>
        <View style={styles.textBlock}>
          <Text style={styles.title} numberOfLines={2}>{t.title}</Text>
          <Text style={styles.version}>{info.latestVersionName}</Text>
        </View>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => Linking.openURL(info.downloadUrl)}
        >
          <Text style={styles.actionText}>{t.action}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={onDismiss}
          accessibilityLabel={t.close}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.closeText}>×</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 1000,
    elevation: 10,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0c1a27',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  textBlock: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    color: '#faf9f7',
    fontSize: 13,
    fontWeight: '600',
  },
  version: {
    color: '#c87d8a',
    fontSize: 12,
    marginTop: 2,
  },
  actionButton: {
    backgroundColor: '#c87d8a',
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 12,
    marginRight: 4,
  },
  actionText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  closeButton: {
    paddingHorizontal: 4,
  },
  closeText: {
    color: '#faf9f7',
    fontSize: 20,
    lineHeight: 20,
    opacity: 0.7,
  },
});
