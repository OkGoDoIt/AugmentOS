/**
 * MockUserSession.ts
 * 
 * Provides a mock implementation of UserSession for testing DisplayManager.
 */

import { UserSession } from '@augmentos/sdk';
import { WebSocket } from 'ws';
import { TimeMachine } from './TimeMachine';
import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';

export class MockWebSocket extends EventEmitter {
  // WebSocket readyState values
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;
  
  readyState: number = MockWebSocket.OPEN;
  sentMessages: any[] = [];
  
  constructor() {
    super();
  }
  
  send(data: string | Buffer): void {
    try {
      this.sentMessages.push(JSON.parse(data.toString()));
      this.emit('message-sent', data);
    } catch (error) {
      console.error('Error parsing message in MockWebSocket:', error);
      console.error('Raw message:', data.toString());
    }
  }
  
  close(code?: number, reason?: string): void {
    this.readyState = MockWebSocket.CLOSING;
    this.emit('close', code, reason);
    this.readyState = MockWebSocket.CLOSED;
  }
  
  // Clear history of sent messages
  clearMessages(): void {
    this.sentMessages = [];
  }
}

export class MockUserSession implements Partial<UserSession> {
  // Implementing only the properties we need for testing
  sessionId: string;
  userId: string;
  startTime: Date;
  disconnectedAt: Date | null = null;
  activeAppSessions: string[] = [];
  websocket: any; // Using 'any' to bypass type checking
  loadingApps: Set<string> = new Set();
  logger: any = {
    info: console.log,
    error: console.error,
    warn: console.warn,
    debug: console.log
  };
  appConnections: Map<string, any> = new Map(); // Using 'any' to bypass type checking
  isTranscribing: boolean = false;
  
  // Mock properties required by UserSession interface
  installedApps: any[] = [];
  appSubscriptions: Map<string, any[]> = new Map();
  displayManager: any = null;
  transcript: any = {};
  bufferedAudio: ArrayBufferLike[] = [];
  whatToStream: any[] = [];
  OSSettings: any = {};
  
  constructor(userId: string = 'test-user', timeMachine?: TimeMachine) {
    this.sessionId = uuidv4();
    this.userId = userId;
    this.startTime = new Date();
    this.websocket = new MockWebSocket();
  }
  
  addLoadingApp(packageName: string): void {
    this.loadingApps.add(packageName);
  }
  
  removeLoadingApp(packageName: string): void {
    this.loadingApps.delete(packageName);
  }
  
  addActiveApp(packageName: string): void {
    if (!this.activeAppSessions.includes(packageName)) {
      this.activeAppSessions.push(packageName);
    }
  }
  
  removeActiveApp(packageName: string): void {
    this.activeAppSessions = this.activeAppSessions.filter(app => app !== packageName);
  }
  
  addAppConnection(packageName: string): MockWebSocket {
    const ws = new MockWebSocket();
    this.appConnections.set(packageName, ws);
    return ws;
  }
  
  getLastSentMessage(): any | null {
    if (this.websocket.sentMessages.length === 0) {
      return null;
    }
    
    return this.websocket.sentMessages[this.websocket.sentMessages.length - 1];
  }
  
  getSentMessages(): any[] {
    return [...this.websocket.sentMessages];
  }
  
  clearMessages(): void {
    this.websocket.clearMessages();
  }
}