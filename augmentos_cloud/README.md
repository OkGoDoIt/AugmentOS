```markdown
# AugmentOS Cloud Service - README

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Code Style: Prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](https://prettier.io)
[![TypeScript](https://img.shields.io/badge/%3C/%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/)

Welcome to the AugmentOS Cloud Service, the central backend component of the AugmentOS platform for smart glasses. This service manages real-time communication between smart glasses, mobile devices, and Third-Party Applications (TPAs), enabling a rich ecosystem of augmented reality experiences.

This README provides comprehensive documentation for developers looking to **utilize** the AugmentOS Cloud service (typically via the SDK) and for developers looking to **contribute** to the cloud service codebase itself.

## Table of Contents

1.  [Overview](#overview)
2.  [Getting Started (Utilizing the Service)](#getting-started-utilizing-the-service)
    *   [Prerequisites](#prerequisites)
    *   [Using the SDK](#using-the-sdk)
3.  [API Documentation](#api-documentation)
    *   [WebSocket API](#websocket-api)
        *   [Connection Endpoints](#connection-endpoints)
        *   [Glasses <-> Cloud Messages](#glasses---cloud-messages)
        *   [TPA <-> Cloud Messages](#tpa---cloud-messages)
    *   [HTTP API](#http-api)
        *   [Authentication](#authentication)
        *   [App Management (Public)](#app-management-public)
        *   [Developer Portal API (`/api/dev`)](#developer-portal-api-apidev)
        *   [Admin API (`/api/admin`)](#admin-api-apiadmin)
        *   [TPA Server Registration API (`/api/tpa-server`)](#tpa-server-registration-api-apitpa-server)
        *   [Other Endpoints](#other-endpoints)
4.  [Examples](#examples)
    *   [TPA Connecting and Subscribing](#tpa-connecting-and-subscribing)
    *   [TPA Sending a Display Request](#tpa-sending-a-display-request)
    *   [TPA Handling Transcription](#tpa-handling-transcription)
5.  [Contribution Guide](#contribution-guide)
    *   [Prerequisites (Contributors)](#prerequisites-contributors)
    *   [Project Structure](#project-structure)
    *   [Setup & Installation](#setup--installation)
    *   [Building the Cloud Service](#building-the-cloud-service)
    *   [Running the Cloud Service](#running-the-cloud-service)
    *   [Testing](#testing)
    *   [Linting](#linting)
    *   [Code Style](#code-style)
    *   [Submitting Changes](#submitting-changes)
6.  [License](#license)

## Overview

AugmentOS Cloud acts as the central hub connecting smart glasses (via a mobile companion app) and TPAs. Its primary responsibilities include:

*   **Real-time Communication:** Managing WebSocket connections for low-latency data exchange.
*   **Session Management:** Handling user sessions, including connection state and active applications.
*   **Data Routing:** Distributing data streams (audio, sensor data, notifications) from glasses to subscribed TPAs.
*   **Display Coordination:** Managing display requests from TPAs to show content on the glasses.
*   **TPA Lifecycle:** Handling the startup and shutdown of TPAs based on user actions.
*   **Authentication & Authorization:** Securing communication and access.
*   **App Management:** Providing APIs for developers to register and manage their TPAs (via the Developer Portal).
*   **App Store Backend:** Serving app metadata for discovery and installation.

## Getting Started (Utilizing the Service)

Developers typically interact with AugmentOS Cloud by building TPAs using the `@augmentos/sdk`.

Please see the full [SDK Documentation](https://docs.augmentos.org/) for more details on using the SDK.

### Prerequisites

*   An AugmentOS Developer account (sign up at [console.augmentos.org](https://console.augmentos.org/)).
*   An API Key for your TPA, obtained from the Developer Portal.
*   Node.js and Bun installed for TPA development.

### Using the SDK

The recommended way to build TPAs is using the `@augmentos/sdk`. It abstracts away the complexities of WebSocket connections and message handling.

```typescript
import { TpaServer, TpaSession, StreamType } from '@augmentos/sdk';

// Configuration for your TPA server
const config = {
  packageName: 'com.example.myawesomeapp', // Your unique package name
  apiKey: 'YOUR_TPA_API_KEY',             // Your API key from the dev portal
  port: 8080,                             // Port your TPA server will run on
};

class MyAwesomeApp extends TpaServer {
  constructor() {
    super(config);
  }

  // This method is called when a user starts your app
  protected async onSession(session: TpaSession, sessionId: string, userId: string): Promise<void> {
    console.log(`New session started: ${sessionId} for user ${userId}`);

    // Show a welcome message
    session.layouts.showTextWall('Welcome to My Awesome App!', { durationMs: 5000 });

    // Subscribe to transcription events
    session.subscribe(StreamType.TRANSCRIPTION);

    // Handle transcription data
    session.events.onTranscription((data) => {
      if (data.isFinal) {
        console.log(`User said: ${data.text}`);
        // Respond based on transcription
        session.layouts.showReferenceCard('You Said', data.text);
      }
    });

    // Handle connection events
    session.events.onConnected(() => console.log('Connected to AugmentOS Cloud'));
    session.events.onDisconnected((reason) => console.log(`Disconnected: ${reason}`));
    session.events.onError((error) => console.error('Session Error:', error));
  }
}

// Create and start the server
const server = new MyAwesomeApp();
server.start().catch(console.error);
```

## API Documentation

Refer to the [SDK Documentation](https://docs.augmentos.org/) for more details on using the SDK.

While the SDK is the primary interface, this section documents the underlying WebSocket and HTTP APIs for advanced use cases or understanding the protocol.

### WebSocket API

#### Connection Endpoints

*   `/glasses-ws`: Endpoint for smart glasses clients (via mobile app).
*   `/tpa-ws`: Endpoint for Third-Party Applications (TPAs).

#### Glasses <-> Cloud Messages

These messages facilitate communication between the smart glasses client and the cloud.

**Glasses -> Cloud**

*   `connection_init` (`GlassesConnectionInitMessage`): Sent by glasses to initiate connection. Requires `coreToken` in Authorization header.
    ```json
    { "type": "connection_init" }
    ```
*   `start_app` (`StartApp`): Request to start a specific TPA.
    ```json
    { "type": "start_app", "packageName": "com.example.myapp", "sessionId": "..." }
    ```
*   `stop_app` (`StopApp`): Request to stop a specific TPA.
    ```json
    { "type": "stop_app", "packageName": "com.example.myapp", "sessionId": "..." }
    ```
*   *Event Messages* (e.g., `button_press`, `head_position`, `phone_notification`, `vad`): Send sensor data and events. See `packages/sdk/src/types/messages/glasses-to-cloud.ts` for structures.
    ```json
    { "type": "button_press", "buttonId": "...", "pressType": "short", "sessionId": "..." }
    ```
*   *Binary Audio Data*: Raw audio chunks (typically LC3 encoded) sent as binary frames.

**Cloud -> Glasses**

*   `connection_ack` (`ConnectionAck`): Confirms successful connection and provides initial session state.
    ```json
    {
      "type": "connection_ack",
      "sessionId": "...",
      "userSession": { /* UserSession data */ },
      "timestamp": "..."
    }
    ```
*   `connection_error` (`ConnectionError`): Indicates a connection failure.
    ```json
    { "type": "connection_error", "message": "...", "timestamp": "..." }
    ```
*   `auth_error` (`AuthError`): Indicates an authentication failure.
    ```json
    { "type": "auth_error", "message": "Invalid token", "timestamp": "..." }
    ```
*   `display_event` (`DisplayEvent`): Instructs the glasses to display a specific layout.
    ```json
    {
      "type": "display_event",
      "layout": { "layoutType": "text_wall", "text": "Hello" },
      "durationMs": 5000,
      "timestamp": "..."
    }
    ```
*   `app_state_change` (`AppStateChange`): Notifies the glasses about changes in running/installed apps.
    ```json
    {
      "type": "app_state_change",
      "sessionId": "...",
      "userSession": { /* Updated UserSession data */ },
      "timestamp": "..."
    }
    ```
*   `microphone_state_change` (`MicrophoneStateChange`): Tells the glasses whether to enable/disable the microphone based on TPA subscriptions.
    ```json
    {
      "type": "microphone_state_change",
      "sessionId": "...",
      "isMicrophoneEnabled": true,
      "timestamp": "..."
    }
    ```

#### TPA <-> Cloud Messages

These messages facilitate communication between TPAs and the cloud.

**TPA -> Cloud**

*   `tpa_connection_init` (`TpaConnectionInit`): Sent by TPA to initiate connection for a specific session.
    ```json
    {
      "type": "tpa_connection_init",
      "packageName": "com.example.myapp",
      "sessionId": "userSessionId-com.example.myapp",
      "apiKey": "YOUR_TPA_API_KEY",
      "timestamp": "..."
    }
    ```
*   `subscription_update` (`TpaSubscriptionUpdate`): Sent by TPA to subscribe/unsubscribe from data streams.
    ```json
    {
      "type": "subscription_update",
      "packageName": "com.example.myapp",
      "sessionId": "userSessionId-com.example.myapp",
      "subscriptions": ["transcription:en-US", "head_position"],
      "timestamp": "..."
    }
    ```
*   `display_event` (`DisplayRequest`): Sent by TPA to request content display on glasses.
    ```json
    {
      "type": "display_event",
      "packageName": "com.example.myapp",
      "sessionId": "userSessionId-com.example.myapp",
      "view": "main",
      "layout": { "layoutType": "text_wall", "text": "Update!" },
      "durationMs": 3000,
      "timestamp": "..."
    }
    ```

**Cloud -> TPA**

*   `tpa_connection_ack` (`TpaConnectionAck`): Confirms successful TPA connection and provides settings.
    ```json
    {
      "type": "tpa_connection_ack",
      "sessionId": "userSessionId-com.example.myapp",
      "settings": [ { "key": "...", "value": "..." } ],
      "timestamp": "..."
    }
    ```
*   `tpa_connection_error` (`TpaConnectionError`): Indicates a TPA connection failure.
    ```json
    { "type": "tpa_connection_error", "message": "Invalid API Key", "timestamp": "..." }
    ```
*   `app_stopped` (`AppStopped`): Notifies TPA that its session has been stopped.
    ```json
    { "type": "app_stopped", "reason": "user_disabled", "timestamp": "..." }
    ```
*   `settings_update` (`SettingsUpdate`): Sends updated user settings for the TPA.
    ```json
    {
      "type": "settings_update",
      "packageName": "com.example.myapp",
      "settings": [ { "key": "...", "value": "..." } ],
      "timestamp": "..."
    }
    ```
*   `data_stream` (`DataStream`): Delivers data for subscribed streams (e.g., transcription, head position).
    ```json
    {
      "type": "data_stream",
      "streamType": "transcription:en-US",
      "data": { "text": "Hello world", "isFinal": true, ... },
      "timestamp": "..."
    }
    ```
*   *Binary Audio Data*: Raw audio chunks sent as binary frames if subscribed to `audio_chunk`.

### HTTP API

The AugmentOS Cloud service exposes several HTTP endpoints for managing apps, retrieving data, and facilitating TPA operations.

**Base URL:** The base URL for the API depends on the environment. Default for local development is `http://localhost:8002`. Production/staging URLs will differ (e.g., `https://cloud.augmentos.org`).

**Authentication:** Endpoints accessible to TPAs or the public either require no authentication or use specific headers (`X-API-Key`, `X-Package-Name`). Endpoints requiring a `Bearer` token (Core Token derived from Supabase) are considered internal for the Developer Portal or App Store frontend and are **not detailed here** as they are not intended for direct TPA use.

---

#### Public App Information

These endpoints provide information about applications available in the AugmentOS ecosystem and do not require authentication.

1.  **`GET /api/apps/public`**
    *   **Description:** Retrieves a list of all publicly available applications (those marked as PUBLISHED).
    *   **Authentication:** None Required.
    *   **Example Request:**
        ```bash
        curl -X GET https://cloud.augmentos.org/api/apps/public
        ```
    *   **Example Response (Success 200 OK):**
        ```json
        {
          "success": true,
          "data": [
            {
              "packageName": "com.augmentos.livecaptions",
              "name": "Live Captions",
              "publicUrl": "http://live-captions",
              "isSystemApp": true,
              "webviewURL": null,
              "logoURL": "https://cloud.augmentos.org/com.augmentos.livecaptions.png",
              "tpaType": "standard",
              "developerId": null,
              "description": "Live closed captions.",
              "version": "1.0.6",
              "isPublic": true,
              "appStoreStatus": "PUBLISHED",
              "_id": "...",
              "createdAt": "...",
              "updatedAt": "..."
            },
            // ... more apps
          ]
        }
        ```

2.  **`GET /api/apps/available`**
    *   **Description:** Similar to `/public`, but may include enhanced details like developer profiles in the future. Currently returns PUBLISHED apps.
    *   **Authentication:** None Required.
    *   **Example Request:**
        ```bash
        curl -X GET https://cloud.augmentos.org/api/apps/available
        ```
    *   **Example Response (Success 200 OK):**
        ```json
        {
          "success": true,
          "data": [
            {
              "packageName": "com.augmentos.livecaptions",
              "name": "Live Captions",
              // ... other app fields
              "developerProfile": { // Included if developer profile exists
                  "company": "AugmentOS Team",
                  "website": "https://augmentos.org",
                  "contactEmail": "team@augmentos.org"
              }
            },
            // ... more apps
          ]
        }
        ```

3.  **`GET /api/apps/search?q={query}`**
    *   **Description:** Searches publicly available apps based on a query string matching name or description.
    *   **Authentication:** None Required.
    *   **Query Parameters:**
        *   `q` (string, required): The search term.
    *   **Example Request:**
        ```bash
        curl -X GET "https://cloud.augmentos.org/api/apps/search?q=caption"
        ```
    *   **Example Response (Success 200 OK):**
        ```json
        {
          "success": true,
          "data": [
            // ... apps matching the query
          ]
        }
        ```
    *   **Example Response (Error 400 Bad Request):**
        ```json
        {
          "success": false,
          "message": "Search query is required"
        }
        ```

4.  **`GET /api/apps/{packageName}`**
    *   **Description:** Retrieves detailed information for a specific publicly available app, including its developer profile if available.
    *   **Authentication:** None Required.
    *   **Path Parameters:**
        *   `packageName` (string, required): The unique package name of the app.
    *   **Example Request:**
        ```bash
        curl -X GET https://cloud.augmentos.org/api/apps/com.augmentos.livecaptions
        ```
    *   **Example Response (Success 200 OK):**
        ```json
        {
          "success": true,
          "data": {
            "packageName": "com.augmentos.livecaptions",
            "name": "Live Captions",
            "publicUrl": "http://live-captions",
            "isSystemApp": true,
            "webviewURL": null,
            "logoURL": "https://cloud.augmentos.org/com.augmentos.livecaptions.png",
            "tpaType": "standard",
            "developerId": null,
            "description": "Live closed captions.",
            "version": "1.0.6",
            "isPublic": true,
            "appStoreStatus": "PUBLISHED",
            "_id": "...",
            "createdAt": "...",
            "updatedAt": "...",
            "developerProfile": null // Or profile object if available
          }
        }
        ```
    *   **Example Response (Error 404 Not Found):**
        ```json
        {
          "success": false,
          "message": "App with package name ... not found"
        }
        ```

---

#### TPA Server Management

These endpoints are intended for TPA servers to register themselves with the cloud, primarily to enable session recovery after TPA restarts.

1.  **`POST /api/tpa-server/register`**
    *   **Description:** Allows a TPA server instance to register itself with the cloud upon startup. This is crucial for session recovery.
    *   **Authentication:** Requires a valid TPA `apiKey` in the request body. This key is obtained from the AugmentOS Developer Portal when registering the app.
    *   **Request Body:**
        ```json
        {
          "packageName": "com.example.myapp",
          "apiKey": "YOUR_TPA_API_KEY",
          "webhookUrl": "https://your-tpa-server.com/webhook", // Your TPA's webhook endpoint
          "serverUrls": "wss://cloud.augmentos.org/tpa-ws" // Comma-separated cloud WS URLs
        }
        ```
    *   **Example Request:**
        ```bash
        curl -X POST https://cloud.augmentos.org/api/tpa-server/register \
             -H "Content-Type: application/json" \
             -d '{
                   "packageName": "com.example.myapp",
                   "apiKey": "abc123xyz789",
                   "webhookUrl": "https://myapp.example.com/webhook",
                   "serverUrls": "wss://cloud.augmentos.org/tpa-ws"
                 }'
        ```
    *   **Example Response (Success 201 Created):**
        ```json
        {
          "success": true,
          "registrationId": "unique-registration-id-123"
        }
        ```
    *   **Example Response (Error 400 Bad Request):**
        ```json
        {
          "success": false,
          "error": "Missing required fields: packageName and webhookUrl are required"
        }
        ```
    *   **Example Response (Error 401 Unauthorized - Placeholder):**
        *(Note: Full API key validation is pending implementation, but this shows the intended error)*
        ```json
        {
          "success": false,
          "error": "Invalid API key"
        }
        ```

2.  **`POST /api/tpa-server/heartbeat`**
    *   **Description:** Allows a registered TPA server to send a periodic heartbeat to the cloud, indicating it is still alive and active.
    *   **Authentication:** Requires the `registrationId` obtained from the `/register` endpoint.
    *   **Request Body:**
        ```json
        {
          "registrationId": "unique-registration-id-123"
        }
        ```
    *   **Example Request:**
        ```bash
        curl -X POST https://cloud.augmentos.org/api/tpa-server/heartbeat \
             -H "Content-Type: application/json" \
             -d '{"registrationId": "unique-registration-id-123"}'
        ```
    *   **Example Response (Success 200 OK):**
        ```json
        {
          "success": true
        }
        ```
    *   **Example Response (Error 404 Not Found):**
        ```json
        {
          "success": false,
          "error": "Registration not found"
        }
        ```

3.  **`POST /api/tpa-server/restart`**
    *   **Description:** Allows a TPA server to notify the cloud that it has restarted. The cloud will then attempt to recover active sessions associated with this TPA instance by sending recovery webhooks.
    *   **Authentication:** Requires the `registrationId`.
    *   **Request Body:**
        ```json
        {
          "registrationId": "unique-registration-id-123"
        }
        ```
    *   **Example Request:**
        ```bash
        curl -X POST https://cloud.augmentos.org/api/tpa-server/restart \
             -H "Content-Type: application/json" \
             -d '{"registrationId": "unique-registration-id-123"}'
        ```
    *   **Example Response (Success 200 OK):**
        ```json
        {
          "success": true,
          "recoveredSessions": 5 // Number of sessions recovery was attempted for
        }
        ```

---

#### TPA Data Access

Endpoints used by running TPAs to fetch session-specific data.

1.  **`GET /api/transcripts/{appSessionId}?duration={seconds}`**
    *   **Description:** Retrieves recent transcript segments for a specific *TPA session*.
    *   **Authentication:** Requires TPA authentication via HTTP headers:
        *   `X-API-Key`: Your TPA's API Key.
        *   `X-Package-Name`: Your TPA's package name.
    *   **Path Parameters:**
        *   `appSessionId` (string, required): The unique ID for the TPA's specific session, typically in the format `userSessionId-packageName`. This ID is provided in the initial webhook request to the TPA.
    *   **Query Parameters:**
        *   `duration` (number, required): How many seconds back from the current time to retrieve transcripts for.
        *   `startTime` (ISO timestamp, optional): Alternative to `duration`, specifies the start time.
        *   `endTime` (ISO timestamp, optional): Alternative to `duration`, specifies the end time. *(Note: Using `duration` is generally simpler)*.
    *   **Example Request:**
        ```bash
        # Get transcripts from the last 60 seconds for a specific TPA session
        curl -X GET "https://cloud.augmentos.org/api/transcripts/session123-com.example.myapp?duration=60" \
             -H "X-API-Key: YOUR_TPA_API_KEY" \
             -H "X-Package-Name: com.example.myapp"
        ```
    *   **Example Response (Success 200 OK):**
        ```json
        {
          "segments": [
            {
              "resultId": "...",
              "speakerId": "user1",
              "text": "Hello there",
              "timestamp": "2023-10-27T10:00:05.123Z",
              "isFinal": false
            },
            {
              "resultId": "...",
              "speakerId": "user1",
              "text": "Hello there, how are you?",
              "timestamp": "2023-10-27T10:00:06.456Z",
              "isFinal": true
            }
            // ... more segments within the duration
          ]
        }
        ```
    *   **Example Response (Error 400 Bad Request):**
        ```json
        { "error": "duration, startTime, or endTime is required" }
        ```
    *   **Example Response (Error 401 Unauthorized):**
        *(If API Key/Package Name headers are missing or invalid)*
        ```json
        { "error": "Unauthorized" } // Or similar auth error
        ```
    *   **Example Response (Error 404 Not Found):**
        ```json
        { "error": "Session not found" }
        ```

---

#### Utility Endpoints

General utility endpoints.

1.  **`GET /health`**
    *   **Description:** A simple health check endpoint to verify if the cloud service is running.
    *   **Authentication:** None Required.
    *   **Example Request:**
        ```bash
        curl -X GET https://cloud.augmentos.org/health
        ```
    *   **Example Response (Success 200 OK):**
        ```json
        {
          "status": "ok",
          "timestamp": "2023-10-27T10:15:30.123Z"
        }
        ```

2.  **`POST /api/error-report`** (also available at `/app/error-report`)
    *   **Description:** Allows clients (like the mobile app or TPAs) to submit error reports or logs for debugging purposes. The data is forwarded to a logging service (e.g., PostHog).
    *   **Authentication:** Optional. If an `Authorization: Bearer <coreToken>` header is provided, the user ID will be associated with the report. Otherwise, reports are logged as 'anonymous'.
    *   **Request Body:** Can be any JSON object containing error details.
        ```json
        {
          "component": "MobileApp",
          "errorMessage": "Failed to connect to glasses",
          "stackTrace": "...",
          "deviceInfo": { "model": "Pixel 7", "os": "Android 13" },
          "coreToken": "OPTIONAL_CORE_TOKEN_IF_NO_HEADER" // Optional if not using header
        }
        ```
    *   **Example Request (with header auth):**
        ```bash
        curl -X POST https://cloud.augmentos.org/api/error-report \
             -H "Content-Type: application/json" \
             -H "Authorization: Bearer YOUR_CORE_TOKEN" \
             -d '{ "component": "MyTPA", "errorMessage": "API call failed", "details": { "statusCode": 500 } }'
        ```
    *   **Example Request (anonymous):**
        ```bash
        curl -X POST https://cloud.augmentos.org/api/error-report \
             -H "Content-Type: application/json" \
             -d '{ "component": "GlassesClient", "errorMessage": "Bluetooth connection lost" }'
        ```
    *   **Example Response (Success 200 OK):**
        ```json
        {
          "success": true
        }
        ```
    *   **Example Response (Error 500 Internal Server Error):**
        ```json
        {
          "success": false,
          "message": "Error sending error report"
        }
        ```

*Note: Endpoints under `/api/dev` and `/api/admin` are considered internal and require specific authentication (Core Token) not available directly to TPAs. They are used by the AugmentOS Developer Portal and internal admin tools.*

## Examples

### TPA Connecting and Subscribing

```typescript
import { TpaSession, StreamType } from '@augmentos/sdk';

const session = new TpaSession({
  packageName: 'com.example.myapp',
  apiKey: 'YOUR_API_KEY',
});

async function run() {
  try {
    await session.connect('some-session-id'); // Provided by webhook
    console.log('Connected!');

    // Subscribe to transcriptions and head position
    session.subscribe(StreamType.TRANSCRIPTION);
    session.subscribe(StreamType.HEAD_POSITION);

  } catch (error) {
    console.error('Connection failed:', error);
  }
}

run();
```

### TPA Sending a Display Request

```typescript
// Inside your onSession handler or event callback
session.layouts.showReferenceCard(
  'Weather Update',
  'Currently 72°F and Sunny',
  { durationMs: 10000 } // Show for 10 seconds
);
```

### TPA Handling Transcription

```typescript
// Inside your onSession handler
session.events.onTranscription((data) => {
  console.log(`Transcription (${data.isFinal ? 'Final' : 'Interim'}): ${data.text}`);

  // Only show final transcriptions to the user
  if (data.isFinal) {
    session.layouts.showTextWall(data.text);
  }
});
```

## Contribution Guide

This section is for developers who want to contribute to the `packages/cloud` codebase.

### Prerequisites (Contributors)

*   [Bun](https://bun.sh/) (v1.1.0 or later recommended)
*   [Node.js](https://nodejs.org/) (v18 or later)
*   [Docker](https://www.docker.com/get-started/) & Docker Compose
*   MongoDB instance (can be run via Docker or externally)
*   Environment variables set up (copy `.env.example` to `.env` and fill in values). Key variables:
    *   `MONGO_URL`
    *   `AZURE_SPEECH_REGION`, `AZURE_SPEECH_KEY`
    *   `SUPABASE_JWT_SECRET`
    *   `AUGMENTOS_AUTH_JWT_SECRET`
    *   LLM provider keys (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, etc.)
    *   `ADMIN_EMAILS` (comma-separated list for admin access)

### Project Structure

```
packages/cloud/
├── dist/             # Compiled JavaScript output
├── src/
│   ├── connections/  # Database connections (MongoDB)
│   ├── middleware/   # Express middleware (auth, validation)
│   ├── models/       # Mongoose data models (App, User)
│   ├── public/       # Static assets
│   ├── routes/       # Express route definitions
│   ├── services/     # Core business logic
│   │   ├── core/     # Essential services (session, websocket, app, subscription)
│   │   ├── layout/   # Display management
│   │   ├── logging/  # Logging services (PostHog)
│   │   └── processing/ # Data processing (transcription)
│   ├── tests/        # Test files
│   ├── utils/        # Utility functions
│   ├── index.ts      # Main application entry point
│   └── sentry.ts     # Sentry initialization
├── .env.example      # Example environment variables
├── .eslintrc.js      # ESLint configuration
├── .gitignore
├── .npmrc
├── .prettierrc.js    # Prettier configuration
├── Dockerfile        # Production Docker build
├── Dockerfile.dev    # Development Docker build
├── package.json
└── tsconfig.json     # TypeScript configuration
```

### Setup & Installation

1.  **Clone the Monorepo:** Ensure you have cloned the main AugmentOS repository.
2.  **Navigate to Cloud Package:** `cd packages/cloud`
3.  **Install Dependencies:** From the *root* of the monorepo (`AugmentOS/augmentos_cloud`), run:
    ```bash
    bun install --no-link
    # or if you encounter linking issues:
    # bun run setup-deps
    ```
4.  **Environment Variables:** Copy `packages/cloud/.env.example` to `packages/cloud/.env` and fill in the necessary values (MongoDB URL, API keys, secrets).

### Building the Cloud Service

To build the TypeScript code into JavaScript for production:

```bash
# Navigate to the cloud package directory
cd packages/cloud

# Run the build script
bun run build
```

This compiles the `src` directory into the `dist` directory.

### Running the Cloud Service

#### Development (Recommended)

Uses Docker Compose for a multi-container environment (cloud service + TPAs).

1.  **Setup Docker Network (first time only):**
    ```bash
    # From the monorepo root (AugmentOS/augmentos_cloud)
    bun run dev:setup-network
    ```
2.  **Start Services:**
    ```bash
    # From the monorepo root
    bun run dev
    # Or run detached:
    # bun run dev:detached
    ```
    This uses `docker-compose.dev.yml` and `Dockerfile.dev`. It mounts your local code into the containers for hot-reloading (via `tsx`). Shared packages (`sdk`, `utils`) are built first.

3.  **Viewing Logs:**
    ```bash
    # From the monorepo root
    bun run logs          # View all logs
    bun run logs:cloud    # View only cloud service logs
    bun run logs:service <service-name> # e.g., bun run logs:service live-captions
    ```

4.  **Stopping Services:**
    ```bash
    # From the monorepo root
    bun run dev:stop
    ```

5.  **Rebuilding Containers (after changing dependencies or Docker config):**
    ```bash
    # From the monorepo root
    bun run dev:rebuild
    ```

6.  **Cleaning Environment (removes containers, volumes, network):**
    ```bash
    # From the monorepo root
    bun run dev:clean
    ```

#### Staging / Production

Uses Docker Compose with production builds.

1.  **Setup Network (first time only):**
    ```bash
    # Staging
    bun run staging:setup-network
    # Production
    # bun run prod:setup-network
    ```
2.  **Deploy:**
    ```bash
    # Staging
    bun run staging:deploy
    # Production
    # bun run prod:deploy
    ```
    This uses `docker-compose.staging.yml` (or `docker-compose.yml` for prod) and `Dockerfile`. It builds production images and starts the services.

### Testing

Run the test suite (currently minimal):

```bash
# From the monorepo root
bun run test
```

### Linting

Check code for style and potential errors:

```bash
# Navigate to the cloud package directory
cd packages/cloud

# Run lint
bun run lint
```

### Code Style

*   **Formatting:** Code is automatically formatted using Prettier on commit (via husky/pretty-quick, though setup isn't explicitly shown in provided files). Use `packages/cloud/.prettierrc.js`.
*   **Linting:** ESLint is used for code quality checks. Use `packages/cloud/.eslintrc.js`.
*   **TypeScript:** Follow standard TypeScript best practices (strong typing, interfaces, etc.).

### Submitting Changes

1.  Create a new branch for your feature or bug fix.
2.  Make your changes, ensuring code is linted and formatted.
3.  Add relevant tests for your changes.
4.  Ensure all tests pass (`bun run test`).
5.  Commit your changes with clear, descriptive messages.
6.  Push your branch to the repository.
7.  Create a Pull Request against the `main` or appropriate development branch.
8.  Address any feedback during the code review process.

## Development Workflow

1. **Work on shared packages (SDK, utils, etc.):**
   - Make changes to files in `packages/` directory
   - Run `bun run build` to rebuild

2. **Create/modify a TPA:**
   - Navigate to TPA directory: `cd packages/apps/<app-name>`
   - Start development: `bun run dev`

3. **Deploy to staging:**
   ```bash
   bun run staging:deploy
   ```

## Docker Setup

For a comprehensive guide on running AugmentOS Cloud and TPAs in Docker, see [DOCKER_GUIDE.md](./DOCKER_GUIDE.md).

### Docker Tips

- Each service uses a shared node_modules volume to prevent duplicate installations
- The shared-packages service builds all dependencies first
- Use Dockerfile.dev for development (more optimized for local development)
- Use `dev:rebuild` when changing dependencies or Docker configuration

## Documentation

For detailed documentation, see the `/docs` directory:

- **System Overview**: `docs/0. OVERVIEW.md`
- **Architecture**: `docs/1. SYSTEM-ARCHITECTURE.md`
- **TPA Session Management**: `docs/2. TPA-SESSION-MANAGEMENT.md`
- **Developer Guidelines**: `docs/tpa/DISPLAY-GUIDELINES.md`

## Troubleshooting

- **"Failed to link" errors**: Run `bun run dev:clean` to clean up Docker volumes and restart with `bun run dev:rebuild`
- **Connection issues**: Check network settings with `docker network ls` to verify `augmentos-network-dev` exists
- **Performance issues**: Adjust resource limits in docker-compose.yml if needed

