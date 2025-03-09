// YourAppsList.tsx
import React from 'react';
import {
    View,
    Text,
    StyleSheet,
} from 'react-native';
import { useStatus } from '../providers/AugmentOSStatusProvider';
import AppIcon from './AppIcon';
import { BluetoothService } from '../BluetoothService';
import BackendServerComms from '../backend_comms/BackendServerComms';
import { AppInfo } from '../AugmentOSStatusParser';
import GlobalEventEmitter from '../logic/GlobalEventEmitter';

interface YourAppsListProps {
    isDarkTheme: boolean;
}

const YourAppsList: React.FC<YourAppsListProps> = ({ isDarkTheme }) => {
    const { status } = useStatus();
    const [_isLoading, setIsLoading] = React.useState(false);
    const [optimisticRunningApps, setOptimisticRunningApps] = React.useState<string[]>([]);
    const bluetoothService = BluetoothService.getInstance();

    const [containerWidth, setContainerWidth] = React.useState(0);

    // Constants for grid item sizing
    const GRID_MARGIN = 6; // Total horizontal margin per item (left + right)
    const numColumns = 4; // Desired number of columns

    // Calculate the item width based on container width and margins
    const itemWidth = containerWidth > 0 ? (containerWidth - (GRID_MARGIN * numColumns)) / numColumns : 0;

    const startApp = (packageName: string) => {
        setIsLoading(true);
        
        // Optimistically update UI to show app as running
        setOptimisticRunningApps(prev => [...prev, packageName]);
        
        // Emit global event for app started
        const appToEmit = status.apps.find(app => app.packageName === packageName);
        if (appToEmit) {
            GlobalEventEmitter.emit('APP_STARTED', {...appToEmit, is_running: true});
        }
        
        // Fire and forget - don't await the result
        BackendServerComms.getInstance().startApp(packageName)
            .catch(error => {
                console.error('start app error:', error);
                // Revert optimistic update on error
                setOptimisticRunningApps(prev => prev.filter(name => name !== packageName));
                // Emit app stopped on error
                if (appToEmit) {
                    GlobalEventEmitter.emit('APP_STOPPED', packageName);
                }
            })
            .finally(() => {
                setIsLoading(false);
            });
        
        // Cleanup optimistic state after timeout (in case status update is delayed)
        setTimeout(() => {
            setOptimisticRunningApps(prev => prev.filter(name => name !== packageName));
        }, 5000);
    };

    const textColor = isDarkTheme ? '#FFFFFF' : '#000000';
    const backgroundColor = isDarkTheme ? '#1E1E1E' : '#F5F5F5';

    // Optional: Filter out duplicate apps and apply optimistic updates
    const uniqueApps = React.useMemo(() => {
        const seen = new Set();
        return status.apps.map(app => {
            // Apply optimistic updates - mark app as running if in optimisticRunningApps
            if (optimisticRunningApps.includes(app.packageName)) {
                return {...app, is_running: true};
            }
            return app;
        }).filter(app => {
            if (seen.has(app.packageName)) {
                return false;
            }
            seen.add(app.packageName);
            return true;
        });
    }, [status.apps, optimisticRunningApps]);

    return (
        <View
            style={[styles.appsContainer]}
            onLayout={(event) => {
                const { width } = event.nativeEvent.layout;
                setContainerWidth(width);
            }}
        >
            <View style={styles.titleContainer}>
                <Text
                    style={[
                        styles.sectionTitle,
                        { color: textColor },
                        styles.adjustableText,
                    ]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                >
                    Your Apps
                </Text>
            </View>

            <View style={styles.gridContainer}>
                {uniqueApps.map((app) => (
                    <View
                        key={app.packageName}
                        style={[
                            styles.itemContainer,
                            {
                                width: itemWidth,
                                margin: GRID_MARGIN / 2,
                            },
                        ]}
                    >
                        <AppIcon
                            app={app}
                            isDarkTheme={isDarkTheme}
                            onClick={() => startApp(app.packageName)}
                            // size={itemWidth * 0.8} // Adjust size relative to itemWidth
                        />
                    </View>
                ))}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    appsContainer: {
        marginTop: -10,
        marginBottom: 0,
        width: '100%',
        paddingHorizontal: 0,
        paddingVertical: 10,
    },
    titleContainer: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginLeft: 0,
        paddingLeft: 0,
        
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      fontFamily: 'Montserrat-Bold',
      lineHeight: 22,
      letterSpacing: 0.38,
      marginBottom: 10,
    },
    adjustableText: {
        minHeight: 0,
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-start',
    },
    itemContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
});

export default YourAppsList;
