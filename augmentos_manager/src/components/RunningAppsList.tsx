import React, {useMemo, useState, useEffect} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {useStatus} from '../providers/AugmentOSStatusProvider';
import AppIcon from './AppIcon';
import {BluetoothService} from '../BluetoothService';
import BackendServerComms from '../backend_comms/BackendServerComms';
import GlobalEventEmitter from '../logic/GlobalEventEmitter';
import {AppInfo} from '../AugmentOSStatusParser';

interface RunningAppsListProps {
  isDarkTheme: boolean;
}

const RunningAppsList: React.FC<RunningAppsListProps> = ({isDarkTheme}) => {
  const {status} = useStatus();
  const [_isLoading, setIsLoading] = useState(false);
  const [optimisticStoppedApps, setOptimisticStoppedApps] = useState<string[]>([]);
  const [optimisticStartedApps, setOptimisticStartedApps] = useState<AppInfo[]>([]);
  const bluetoothService = BluetoothService.getInstance();
  const textColor = isDarkTheme ? '#FFFFFF' : '#000000';
  const gradientColors = isDarkTheme
    ? ['#4a3cb5', '#7856FE', '#9a7dff']
    : ['#56CCFE', '#FF8DF6', '#FFD04E'];
    
  // Listen for global app start/stop events
  useEffect(() => {
    const handleAppStarted = (app: AppInfo) => {
      setOptimisticStartedApps(prev => {
        // Don't add duplicates
        if (prev.some(a => a.packageName === app.packageName)) {
          return prev;
        }
        return [...prev, app];
      });
    };
    
    const handleAppStopped = (packageName: string) => {
      // Remove from optimistically started apps if present
      setOptimisticStartedApps(prev => 
        prev.filter(app => app.packageName !== packageName)
      );
    };
    
    GlobalEventEmitter.on('APP_STARTED', handleAppStarted);
    GlobalEventEmitter.on('APP_STOPPED', handleAppStopped);
    
    return () => {
      GlobalEventEmitter.removeListener('APP_STARTED', handleAppStarted);
      GlobalEventEmitter.removeListener('APP_STOPPED', handleAppStopped);
    };
  }, []);

  const stopApp = (packageName: string) => {
    console.log('STOP APP');
    setIsLoading(true);
    
    // Optimistically update UI to show app as stopped
    setOptimisticStoppedApps(prev => [...prev, packageName]);
    
    // Emit global event for app stopped
    GlobalEventEmitter.emit('APP_STOPPED', packageName);
    
    // Fire and forget - don't wait for the response
    BackendServerComms.getInstance().stopApp(packageName)
      .catch(error => {
        console.error('Stop app error:', error);
        // Revert optimistic update on error
        setOptimisticStoppedApps(prev => prev.filter(name => name !== packageName));
        
        // Emit app started again on error - find the app in status
        const appToRestart = status.apps.find(app => app.packageName === packageName);
        if (appToRestart && appToRestart.is_running) {
          GlobalEventEmitter.emit('APP_STARTED', appToRestart);
        }
      })
      .finally(() => {
        setIsLoading(false);
      });
    
    // Cleanup optimistic state after timeout (in case status update is delayed)
    setTimeout(() => {
      setOptimisticStoppedApps(prev => prev.filter(name => name !== packageName));
    }, 5000);
  };

  const runningApps = useMemo(
    () => {
      // Get apps that are running in status and not optimistically stopped
      const statusRunningApps = status.apps
        .filter(app => app.is_running && !optimisticStoppedApps.includes(app.packageName));
      
      // Add optimistically started apps that aren't already included
      const combinedApps = [...statusRunningApps];
      
      optimisticStartedApps.forEach(startedApp => {
        // Only add if not already in the list
        if (!combinedApps.some(app => app.packageName === startedApp.packageName)) {
          combinedApps.push(startedApp);
        }
      });
      
      return combinedApps;
    },
    [status.apps, optimisticStoppedApps, optimisticStartedApps],
  );

  return (
    <View style={styles.appsContainer}>
      <Text style={[styles.sectionTitle, {color: textColor}]}>
        Running Apps
      </Text>
      <LinearGradient
        colors={gradientColors}
        style={styles.gradientBackground}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}>
        {runningApps.length > 0 ? (
          <View style={styles.appIconsContainer}>
            {runningApps.map((app, index) => (
              <View key={index} style={styles.iconWrapper}>
                <AppIcon
                  app={app}
                  onClick={() => stopApp(app.packageName)}
                  isForegroundApp={app.is_foreground}
                  isDarkTheme={isDarkTheme}
                />
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.noAppsContainer}>
            <Text style={[styles.noAppsText, {color: textColor}]}>
              No apps, start apps below.
            </Text>
          </View>
        )}
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  appsContainer: {
    justifyContent: 'flex-start',
    marginTop: 10,
    marginBottom: 10,
    height: 160,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Montserrat-Bold',
    lineHeight: 22,
    letterSpacing: 0.38,
    marginBottom: 10,
  },
  gradientBackground: {
    height: 120,
    paddingHorizontal: 15,
    borderRadius: 20,
    paddingVertical: 15,
  },
  appIconsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-around',
    width: '100%',
    flexWrap: 'wrap',
  },
  iconWrapper: {
    alignItems: 'center',
  },
  noAppsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noAppsText: {
    textAlign: 'center',
  },
});

export default RunningAppsList;
