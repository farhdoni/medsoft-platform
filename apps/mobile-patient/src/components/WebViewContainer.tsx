import React, { forwardRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView, WebViewProps } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';

type Props = WebViewProps & {
  showSafeArea?: boolean;
};

export const WebViewContainer = forwardRef<WebView, Props>(
  ({ showSafeArea = true, style, ...props }, ref) => {
    const Wrapper = showSafeArea ? SafeAreaView : View;
    return (
      <Wrapper style={styles.container}>
        <WebView
          ref={ref}
          style={[styles.webview, style]}
          sharedCookiesEnabled
          thirdPartyCookiesEnabled
          allowsBackForwardNavigationGestures
          domStorageEnabled
          javaScriptEnabled
          {...props}
        />
      </Wrapper>
    );
  }
);

WebViewContainer.displayName = 'WebViewContainer';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  webview: { flex: 1 },
});
