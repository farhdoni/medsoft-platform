import React, { forwardRef } from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { WebView, WebViewProps } from 'react-native-webview';
import { COLORS } from '../constants/config';

const WebViewContainer = forwardRef<WebView, WebViewProps>((props, ref) => {
  return (
    <View style={styles.container}>
      <WebView
        ref={ref}
        style={styles.webview}
        startInLoadingState
        renderLoading={() => (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color={COLORS.accentBlue} />
          </View>
        )}
        javaScriptEnabled
        domStorageEnabled
        {...props}
      />
    </View>
  );
});

WebViewContainer.displayName = 'WebViewContainer';

export default WebViewContainer;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
  loader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
});
