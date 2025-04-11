import React, { useRef, useState } from 'react';
import { View, StyleSheet, Text, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import Config from 'react-native-config';
import { useStatus } from '../providers/AugmentOSStatusProvider';
import NavigationBar from '../components/NavigationBar';
import LoadingComponent from '../components/LoadingComponent';
import InternetConnectionFallbackComponent from '../components/InternetConnectionFallbackComponent';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../AuthContext';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../components/types';

interface AppStoreWebProps {
  isDarkTheme: boolean;
  route?: RouteProp<RootStackParamList, 'AppStoreWeb'>;
}

const AppStoreWeb: React.FC<AppStoreWebProps> = ({ isDarkTheme, route }) => {
  const { status } = useStatus();
  const coreToken = status.core_info.core_token;
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const { user, session, loading } = useAuth();
  const packageName = route?.params?.packageName;

  // Theme colors
  const theme = {
    backgroundColor: isDarkTheme ? '#1c1c1c' : '#f9f9f9',
    headerBg: isDarkTheme ? '#333333' : '#fff',
    textColor: isDarkTheme ? '#FFFFFF' : '#333333',
    secondaryTextColor: isDarkTheme ? '#aaaaaa' : '#777777',
    borderColor: isDarkTheme ? '#444444' : '#e0e0e0',
    buttonBg: isDarkTheme ? '#444444' : '#eeeeee',
    buttonTextColor: isDarkTheme ? '#ffffff' : '#333333',
    primaryColor: '#0088FF'
  };

  // Get the app store URL from environment variable or use a fallback
  const baseUrl = Config.AUGMENTOS_APPSTORE_URL || 'https://store.augmentos.org/webview';
  // Add package name if provided
  const appStoreUrl = packageName ? `${baseUrl}/package/${packageName}` : baseUrl;
  const webViewRef = useRef(null);

  // Handle WebView loading events
  const handleLoadStart = () => setIsLoading(true);
  const handleLoadEnd = () => {
    const supabaseToken = session?.access_token;
      if (!supabaseToken) {
        console.log('No Supabase token found');
        return;
      }

    setIsLoading(false);
    webViewRef.current.injectJavaScript(`
      window.localStorage.setItem('supabase_token', '${supabaseToken}');
      if (window.setSupabaseToken) {
        window.setSupabaseToken('${supabaseToken}');
      }
      window.localStorage.setItem('core_token', '${coreToken}');
      if (window.setCoreToken) {
        window.setCoreToken('${coreToken}');
      }
      true;
    `);
  }
  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      {hasError ? (
        <InternetConnectionFallbackComponent 
          retry={() => setHasError(false)} isDarkTheme={false}         />
      ) : (
        <View style={styles.webViewContainer}>
          <WebView
            ref={webViewRef}
            source={{ 
              uri: appStoreUrl
            }}
            style={styles.webView}
            onLoadStart={handleLoadStart}
            onLoadEnd={handleLoadEnd}
            onError={handleError}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            renderLoading={() => (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color={theme.primaryColor} />
                <Text style={[styles.loadingText, { color: theme.textColor }]}>
                  Loading App Store...
                </Text>
              </View>
            )}
          />
        </View>
      )}
      <NavigationBar toggleTheme={() => {}} isDarkTheme={isDarkTheme} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webViewContainer: {
    flex: 1,
  },
  webView: {
    flex: 1,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    fontFamily: 'Montserrat-Regular',
  },
});

export default AppStoreWeb;