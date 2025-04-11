/**
 * 🔧 Settings Manager Module
 * 
 * Manages TPA settings with automatic synchronization and change notifications.
 * Provides type-safe access to settings with default values.
 */
import EventEmitter from 'events';
import { AppSetting, AppSettings } from '../../types';
import { ApiClient } from './api-client';

/**
 * Change information for a single setting
 */
export interface SettingChange {
  oldValue: any;
  newValue: any;
}

/**
 * Map of setting keys to their change information
 */
export type SettingsChangeMap = Record<string, SettingChange>;

/**
 * Callback for when any setting changes
 */
export type SettingsChangeHandler = (changes: SettingsChangeMap) => void;

/**
 * Callback for when a specific setting changes
 */
export type SettingValueChangeHandler<T = any> = (newValue: T, oldValue: T) => void;

/**
 * Internal event names
 */
enum SettingsEvents {
  CHANGE = 'settings:change',
  VALUE_CHANGE = 'settings:value:'
}

/**
 * 🔧 Settings Manager
 * 
 * Provides a type-safe interface for accessing and reacting to TPA settings.
 * Automatically synchronizes with AugmentOS Cloud.
 */
export class SettingsManager {
  // Current settings values
  private settings: AppSettings = [];
  
  // Event emitter for change notifications
  private emitter = new EventEmitter();
  
  // API client for fetching settings
  private apiClient?: ApiClient;
  
  /**
   * Create a new settings manager
   * 
   * @param initialSettings Initial settings values (if available)
   * @param packageName Package name for the TPA
   * @param wsUrl WebSocket URL (for deriving HTTP API URL)
   * @param userId User ID (for authenticated requests)
   */
  constructor(
    initialSettings: AppSettings = [],
    packageName?: string,
    wsUrl?: string,
    userId?: string
  ) {
    this.settings = [...initialSettings];
    
    // Create API client if we have enough information
    if (packageName) {
      this.apiClient = new ApiClient(packageName, wsUrl, userId);
    }
  }
  
  /**
   * Configure the API client
   * 
   * @param packageName Package name for the TPA
   * @param wsUrl WebSocket URL
   * @param userId User ID
   */
  configureApiClient(packageName: string, wsUrl: string, userId: string): void {
    if (!this.apiClient) {
      this.apiClient = new ApiClient(packageName, wsUrl, userId);
    } else {
      this.apiClient.setWebSocketUrl(wsUrl);
      this.apiClient.setUserId(userId);
    }
  }
  
  /**
   * Update the current settings
   * This is called internally when settings are loaded or changed
   * 
   * @param newSettings New settings values
   * @returns Map of changed settings
   */
  updateSettings(newSettings: AppSettings): SettingsChangeMap {
    const changes: SettingsChangeMap = {};
    
    // Copy the new settings
    const updatedSettings = [...newSettings];
    
    // Detect changes comparing old and new settings
    for (const newSetting of updatedSettings) {
      const oldSetting = this.settings.find(s => s.key === newSetting.key);
      
      // Skip if value hasn't changed
      if (oldSetting && this.areEqual(oldSetting.value, newSetting.value)) {
        continue;
      }
      
      // Record change
      changes[newSetting.key] = {
        oldValue: oldSetting?.value,
        newValue: newSetting.value
      };
    }
    
    // Check for removed settings
    for (const oldSetting of this.settings) {
      const stillExists = updatedSettings.some(s => s.key === oldSetting.key);
      
      if (!stillExists) {
        changes[oldSetting.key] = {
          oldValue: oldSetting.value,
          newValue: undefined
        };
      }
    }
    
    // If there are changes, update the settings and emit events
    if (Object.keys(changes).length > 0) {
      this.settings = updatedSettings;
      this.emitChanges(changes);
    }
    
    return changes;
  }
  
  /**
   * Check if two setting values are equal
   * 
   * @param a First value
   * @param b Second value
   * @returns True if the values are equal
   */
  private areEqual(a: any, b: any): boolean {
    // Simple equality check - for objects, this won't do a deep equality check
    // but for most setting values (strings, numbers, booleans) it works
    return a === b;
  }
  
  /**
   * Emit change events for updated settings
   * 
   * @param changes Map of changed settings
   */
  private emitChanges(changes: SettingsChangeMap): void {
    // Emit the general change event
    this.emitter.emit(SettingsEvents.CHANGE, changes);
    
    // Emit individual value change events
    for (const [key, change] of Object.entries(changes)) {
      this.emitter.emit(`${SettingsEvents.VALUE_CHANGE}${key}`, change.newValue, change.oldValue);
    }
  }
  
  /**
   * 🔄 Listen for changes to any setting
   * 
   * @param handler Function to call when settings change
   * @returns Function to remove the listener
   * 
   * @example
   * ```typescript
   * settings.onChange((changes) => {
   *   console.log('Settings changed:', changes);
   * });
   * ```
   */
  onChange(handler: SettingsChangeHandler): () => void {
    this.emitter.on(SettingsEvents.CHANGE, handler);
    return () => this.emitter.off(SettingsEvents.CHANGE, handler);
  }
  
  /**
   * 🔄 Listen for changes to a specific setting
   * 
   * @param key Setting key to monitor
   * @param handler Function to call when the setting changes
   * @returns Function to remove the listener
   * 
   * @example
   * ```typescript
   * settings.onValueChange('transcribe_language', (newValue, oldValue) => {
   *   console.log(`Language changed from ${oldValue} to ${newValue}`);
   * });
   * ```
   */
  onValueChange<T = any>(key: string, handler: SettingValueChangeHandler<T>): () => void {
    const eventName = `${SettingsEvents.VALUE_CHANGE}${key}`;
    this.emitter.on(eventName, handler);
    return () => this.emitter.off(eventName, handler);
  }
  
  /**
   * 🔍 Check if a setting exists
   * 
   * @param key Setting key to check
   * @returns True if the setting exists
   */
  has(key: string): boolean {
    return this.settings.some(s => s.key === key);
  }
  
  /**
   * 🔍 Get all settings
   * 
   * @returns Copy of all settings
   */
  getAll(): AppSettings {
    return [...this.settings];
  }
  
  /**
   * 🔍 Get a setting value with type safety
   * 
   * @param key Setting key to get
   * @param defaultValue Default value if setting doesn't exist or is undefined
   * @returns Setting value or default value
   * 
   * @example
   * ```typescript
   * const lineWidth = settings.get<number>('line_width', 30);
   * const language = settings.get<string>('transcribe_language', 'English');
   * ```
   */
  get<T = any>(key: string, defaultValue?: T): T {
    const setting = this.settings.find(s => s.key === key);
    
    if (setting && setting.value !== undefined) {
      return setting.value as T;
    }
    
    return defaultValue as T;
  }
  
  /**
   * 🔍 Find a setting by key
   * 
   * @param key Setting key to find
   * @returns Setting object or undefined
   */
  getSetting(key: string): AppSetting | undefined {
    return this.settings.find(s => s.key === key);
  }
  
  /**
   * 🔄 Fetch settings from the cloud
   * This is generally not needed since settings are automatically kept in sync,
   * but can be used to force a refresh if needed.
   * 
   * @returns Promise that resolves to the updated settings
   * @throws Error if the API client is not configured or the request fails
   */
  async fetch(): Promise<AppSettings> {
    if (!this.apiClient) {
      throw new Error('Settings API client is not configured');
    }
    
    try {
      const newSettings = await this.apiClient.fetchSettings();
      this.updateSettings(newSettings);
      return this.settings;
    } catch (error) {
      console.error('Error fetching settings:', error);
      throw error;
    }
  }
}