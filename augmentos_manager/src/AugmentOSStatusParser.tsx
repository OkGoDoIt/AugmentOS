import { MOCK_CONNECTION } from './consts';

interface Glasses {
  model_name: string;
  battery_life: number;
  is_searching: boolean;
  brightness: string;
  auto_brightness: boolean;
  headUp_angle: number | null; // 0-60
  dashboard_height: number | null; // 0-8
  dashboard_distance: number | null; // ???
  dashboard_x_offset: number | null; // 0-1
}

interface WifiConnection {
  is_connected: boolean;
  ssid: string;
  signal_strength: number; // 0-100
}

interface GSMConnection {
  is_connected: boolean;
  carrier: string;
  signal_strength: number; // 0-100
}

export interface AppInfo {
  name: string;
  description: string;
  instructions: string | null;
  is_running: boolean;
  is_foreground: boolean;
  version: string;
  packageName: string;
  icon: string;
  type: string;
}

export interface CoreAuthInfo {
  core_token_owner: string;
  core_token_status: string;
  last_verification_timestamp: number;
}

export interface CoreInfo {
  augmentos_core_version: string | null;
  core_token: string | null;
  cloud_connection_status: string;
  puck_connected: boolean;
  puck_battery_life: number | null;
  puck_charging_status: boolean;
  default_wearable: string | null,
  sensing_enabled: boolean;
  force_core_onboard_mic: boolean;
  is_mic_enabled_for_frontend: boolean;
  contextual_dashboard_enabled: boolean;
  bypass_vad_for_debugging: boolean;
  bypass_audio_encoding_for_debugging: boolean;
  always_on_status_bar_enabled: boolean;
}

export interface AugmentOSMainStatus {
  core_info: CoreInfo;
  glasses_info: Glasses | null;
  wifi: WifiConnection | null;
  gsm: GSMConnection | null;
  apps: AppInfo[];
  auth: CoreAuthInfo;
}

export class AugmentOSParser {
  static defaultStatus: AugmentOSMainStatus = {
    core_info: {
      augmentos_core_version: null,
      cloud_connection_status: 'DISCONNECTED',
      core_token: null,
      puck_connected: false,
      puck_battery_life: null,
      puck_charging_status: false,
      sensing_enabled: false,
      force_core_onboard_mic: false,
      is_mic_enabled_for_frontend: false,
      contextual_dashboard_enabled: false,
      bypass_vad_for_debugging: false,
      bypass_audio_encoding_for_debugging: false,
      default_wearable: null,
      always_on_status_bar_enabled: false,
    },
    glasses_info: null,
    wifi: { is_connected: false, ssid: '', signal_strength: 0 },
    gsm: { is_connected: false, carrier: '', signal_strength: 0 },
    apps: [],
    auth: {
      core_token_owner: '',
      core_token_status: '',
      last_verification_timestamp: 0
    }
  };

  static mockStatus: AugmentOSMainStatus = {
    core_info: {
      augmentos_core_version: '1.0.0',
      cloud_connection_status: 'CONNECTED',
      core_token: '1234567890',
      puck_connected: true,
      puck_battery_life: 88,
      puck_charging_status: true,
      sensing_enabled: true,
      force_core_onboard_mic: false,
      is_mic_enabled_for_frontend: false,
      contextual_dashboard_enabled: true,
      bypass_vad_for_debugging: false,
      bypass_audio_encoding_for_debugging: false,
      default_wearable: 'evenrealities_g1',
      always_on_status_bar_enabled: false,
    },
    glasses_info: {
      model_name: 'Even Realities G1',
      battery_life: 60,
      is_searching: false,
      brightness: 87,
      auto_brightness: false,
      headUp_angle: 20,
    },
    wifi: { is_connected: true, ssid: 'TP-LINK69', signal_strength: 100 },
    gsm: { is_connected: false, carrier: '', signal_strength: 0 },
    apps: [
      {
        name: 'Mentra Merge',
        packageName: 'com.mentra.merge',
        icon: '/assets/app-icons/mentra-merge.png',
        description: 'AI executive functioning aid',
        instructions: "",
        version: "1.0.0",
        is_running: true,
        is_foreground: true,
        type: 'APP'
      },
      {
        name: 'Live Translation',
        packageName: 'com.mentra.livetranslation',
        icon: '/assets/app-icons/translation.png',
        description: 'Movie and TV streaming',
        instructions: "",
        version: "1.0.0",
        is_running: false,
        is_foreground: false,
        type: 'APP'
      },
      {
        name: 'Navigation',
        packageName: 'com.mentra.navigation',
        icon: '/assets/app-icons/navigation.png',
        description: 'Navigation app',
        instructions: "",
        version: "1.0.0",
        is_running: false,
        is_foreground: false,
        type: 'APP'
      },
      {
        name: 'Mira AI',
        packageName: 'com.mentra.miraai',
        icon: '/assets/app-icons/mira-ai.png',
        description: 'AI assistant',
        instructions: "",
        version: "1.0.0",
        is_running: false,
        is_foreground: false,
        type: 'APP'
      },
      {
        name: 'Screen Mirror',
        packageName: 'com.mentra.screenmirror',
        icon: '/assets/app-icons/screen-mirror.png',
        description: 'Screen mirroring app',
        instructions: "",
        version: "1.0.0",
        is_running: false,
        is_foreground: false,
        type: 'APP'
      },
      {
        name: 'Captions',
        packageName: 'com.mentra.live-captions',
        icon: '/assets/app-icons/captions.png',
        description: 'Live captioning app',
        instructions: "",
        version: "1.0.0",
        is_running: false,
        is_foreground: false,
        type: 'APP'
      },
      {
        name: 'ADHD Aid',
        packageName: 'com.mentra.adhdaid',
        icon: '/assets/app-icons/adhd-aid.png',
        description: 'ADHD aid app',
        instructions: "",
        version: "1.0.0",
        is_running: false,
        is_foreground: false,
        type: 'APP'
      },
      {
        name: 'Mentra Link',
        packageName: 'com.mentra.link',
        icon: '/assets/app-icons/mentra-link.png',
        description: 'Language learning app',
        instructions: "",
        version: "1.0.0",
        is_running: false,
        is_foreground: false,
        type: 'APP'
      },
    ],
    auth: {
      core_token_owner: '',
      core_token_status: '',
      last_verification_timestamp: 0,
    },
  };

  static parseStatus(data: any): AugmentOSMainStatus {
    if (MOCK_CONNECTION) {return AugmentOSParser.mockStatus;}
    if (data && 'status' in data) {
      let status = data.status;
      let coreInfo = status.core_info ?? {};
      let glassesInfo = status.connected_glasses ?? {};
      let authInfo = status.auth ?? {};
      
      // First determine if we have connected glasses in the status
      const hasConnectedGlasses = status.connected_glasses && status.connected_glasses.model_name;
      
      return {
        core_info: {
          augmentos_core_version: coreInfo.augmentos_core_version ?? null,
          core_token: coreInfo.core_token ?? null,
          cloud_connection_status: coreInfo.cloud_connection_status ?? 'DISCONNECTED',
          puck_connected: true,
          puck_battery_life: status.core_info.puck_battery_life ?? null,
          puck_charging_status: status.core_info.charging_status ?? false,
          sensing_enabled: status.core_info.sensing_enabled ?? false,
          force_core_onboard_mic: status.core_info.force_core_onboard_mic ?? false,
          contextual_dashboard_enabled: status.core_info.contextual_dashboard_enabled ?? true,
          bypass_vad_for_debugging: status.core_info.bypass_vad_for_debugging ?? false,
          bypass_audio_encoding_for_debugging: status.core_info.bypass_audio_encoding_for_debugging ?? false,
          // If we have connected glasses but default_wearable is missing, use the model_name
          default_wearable: hasConnectedGlasses && !status.core_info.default_wearable 
            ? status.connected_glasses.model_name 
            : (status.core_info.default_wearable ?? null),
          is_mic_enabled_for_frontend: status.core_info.is_mic_enabled_for_frontend ?? false,
          always_on_status_bar_enabled: status.core_info.always_on_status_bar_enabled ?? false,
        },
        glasses_info: status.connected_glasses
          ? {
            model_name: glassesInfo.model_name,
            battery_life: glassesInfo.battery_life,
            is_searching: glassesInfo.is_searching ?? false,
            brightness: glassesInfo.brightness,
            auto_brightness: glassesInfo.auto_brightness ?? false,
            headUp_angle: glassesInfo.headUp_angle,
            dashboard_height: glassesInfo.dashboard_height,
            dashboard_distance: glassesInfo.dashboard_distance,
            dashboard_x_offset: glassesInfo.dashboard_x_offset,
          }
          : null,
        wifi: status.wifi ?? AugmentOSParser.defaultStatus.wifi,
        gsm: status.gsm ?? AugmentOSParser.defaultStatus.gsm,
        apps: status.apps?.map((app: any) => ({
          name: app.name || 'Unknown App',
          description: app.description || 'No description available',
          is_running: !!app.is_running,
          is_foreground: !!app.is_foreground,
          packageName: app.packageName || 'unknown.package',
          version: app.version || '1.0.0',
          icon: app.iconUrl || '/assets/icons/default-app.png',
          type: app.type || 'APP',
        })) || [],
        auth: {
          core_token_owner: authInfo.core_token_owner,
          core_token_status: authInfo.core_token_status,
          last_verification_timestamp: authInfo.last_verification_timestamp,
        },
      };
    }
    return AugmentOSParser.defaultStatus;
  }
}

export default AugmentOSParser;
