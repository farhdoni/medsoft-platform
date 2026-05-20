import React, { useCallback } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebViewNavigation } from 'react-native-webview';
import { DOCTOR_LOGIN } from '../constants/config';
import WebViewContainer from '../components/WebViewContainer';

interface Props {
  onLogin: () => void;
}

export default function LoginScreen({ onLogin }: Props) {
  const onNavigationStateChange = useCallback(
    (navState: WebViewNavigation) => {
      const url = navState.url ?? '';
      if (url.includes('/doctor-home')) {
        onLogin();
      }
    },
    [onLogin]
  );

  return (
    <SafeAreaView style={styles.container}>
      <WebViewContainer
        source={{ uri: DOCTOR_LOGIN }}
        onNavigationStateChange={onNavigationStateChange}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
});
