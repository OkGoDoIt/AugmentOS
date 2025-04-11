---
title: Cloud API
sidebar_position: 9
---

# AugmentOS Cloud API

AugmentOS Cloud Service exposes HTTP endpoints that enable third-party applications (TPAs) to interact with the AugmentOS ecosystem. This document describes the available endpoints, authentication methods, and data structures for making API calls to the AugmentOS Cloud.

## Base URL

The base URL for the API depends on the environment:

- **Development:** `http://localhost:8002`
- **Production:** `https://cloud.augmentos.org`

## Authentication

AugmentOS Cloud API endpoints use different authentication methods depending on the endpoint:

- **No Authentication:** Public endpoints that provide app information
- **API Key Authentication:** TPA-specific endpoints requiring `X-API-Key` and `X-Package-Name` headers
- **Registration ID Authentication:** TPA server management endpoints requiring a registration ID


## TPA Data Access

Endpoints used by running TPAs to fetch session-specific data.

### Get Transcripts

Retrieves recent transcript segments for a specific TPA session.

```http
GET /api/transcripts/{appSessionId}?duration={seconds}
```

**Parameters:**
- `appSessionId` (path, required): The unique ID for the TPA's specific session
- `duration` (query, required): How many seconds back to retrieve transcripts for
- `startTime` (query, optional): Alternative to `duration`, specifies the start time
- `endTime` (query, optional): Alternative to `duration`, specifies the end time

**Authentication:** Requires TPA authentication via HTTP headers:
- `X-API-Key`: Your TPA's API Key
- `X-Package-Name`: Your TPA's package name

**Example Request:**
```bash
curl -X GET "https://cloud.augmentos.org/api/transcripts/session123-com.example.myapp?duration=60" \
     -H "X-API-Key: YOUR_TPA_API_KEY" \
     -H "X-Package-Name: com.example.myapp"
```

**Example Response (200 OK):**
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
  ]
}
```

**Example Response (400 Bad Request):**
```json
{
  "error": "duration, startTime, or endTime is required"
}
```

**Example Response (401 Unauthorized):**
```json
{
  "error": "Unauthorized"
}
```

**Example Response (404 Not Found):**
```json
{
  "error": "Session not found"
}
```

## Utility Endpoints

General utility endpoints for health checks and error reporting.

### Health Check

A simple health check endpoint to verify if the cloud service is running.

```http
GET /health
```

**Authentication:** None required

**Example Request:**
```bash
curl -X GET https://cloud.augmentos.org/health
```

**Example Response (200 OK):**
```json
{
  "status": "ok",
  "timestamp": "2023-10-27T10:15:30.123Z"
}
```

### Error Reporting

Allows clients to submit error reports or logs for debugging purposes.

```http
POST /api/error-report
```

**Authentication:** None required

**Request Body:** Can be any JSON object containing error details.
```json
{
  "component": "MobileApp",
  "errorMessage": "Failed to connect to glasses",
  "stackTrace": "...",
  "deviceInfo": { "model": "Pixel 7", "os": "Android 13" },
  "coreToken": "OPTIONAL_CORE_TOKEN_IF_NO_HEADER"
}
```

**Example Request:**
```bash
curl -X POST https://cloud.augmentos.org/api/error-report \
     -H "Content-Type: application/json" \
     -d '{ "component": "GlassesClient", "errorMessage": "Bluetooth connection lost" }'
```

**Example Response (200 OK):**
```json
{
  "success": true
}
```

## TPA Server Management

These endpoints allow TPA servers to manually register with the cloud service, enabling features like session recovery after restarts.

### Register TPA Server

Allows a TPA server instance to register itself with the cloud upon startup, for session recovery.

```http
POST /api/tpa-server/register
```

**Authentication:** Requires a valid TPA `apiKey` in the request body

**Request Body:**
```json
{
  "packageName": "com.example.myapp",
  "apiKey": "YOUR_TPA_API_KEY",
  "webhookUrl": "https://your-tpa-server.com/webhook",
  "serverUrls": "wss://cloud.augmentos.org/tpa-ws"
}
```

**Example Request:**
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

**Example Response (201 Created):**
```json
{
  "success": true,
  "registrationId": "unique-registration-id-123"
}
```

**Example Response (400 Bad Request):**
```json
{
  "success": false,
  "error": "Missing required fields: packageName and webhookUrl are required"
}
```

**Example Response (401 Unauthorized):**
```json
{
  "success": false,
  "error": "Invalid API key"
}
```

### Send Heartbeat

Allows a registered TPA server to send a periodic heartbeat to the cloud, indicating it is still alive and active.

```http
POST /api/tpa-server/heartbeat
```

**Authentication:** Requires the `registrationId` obtained from the `/register` endpoint

**Request Body:**
```json
{
  "registrationId": "unique-registration-id-123"
}
```

**Example Request:**
```bash
curl -X POST https://cloud.augmentos.org/api/tpa-server/heartbeat \
     -H "Content-Type: application/json" \
     -d '{"registrationId": "unique-registration-id-123"}'
```

**Example Response (200 OK):**
```json
{
  "success": true
}
```

**Example Response (404 Not Found):**
```json
{
  "success": false,
  "error": "Registration not found"
}
```

### Notify Server Restart

Allows a TPA server to notify the cloud that it has restarted, triggering session recovery.

```http
POST /api/tpa-server/restart
```

**Authentication:** Requires the `registrationId`

**Request Body:**
```json
{
  "registrationId": "unique-registration-id-123"
}
```

**Example Request:**
```bash
curl -X POST https://cloud.augmentos.org/api/tpa-server/restart \
     -H "Content-Type: application/json" \
     -d '{"registrationId": "unique-registration-id-123"}'
```

**Example Response (200 OK):**
```json
{
  "success": true,
  "recoveredSessions": 5
}
```


## Public App Information

These endpoints provide information about applications available in the AugmentOS ecosystem and do not require authentication.

### Get All Public Apps

Retrieves a list of all publicly available applications (those marked as PUBLISHED).

```http
GET /api/apps/public
```

**Authentication:** None required

**Example Request:**
```bash
curl -X GET https://cloud.augmentos.org/api/apps/public
```

**Example Response (200 OK):**
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

### Get Available Apps

Similar to `/public`, but may include enhanced details like developer profiles.

```http
GET /api/apps/available
```

**Authentication:** None required

**Example Request:**
```bash
curl -X GET https://cloud.augmentos.org/api/apps/available
```

**Example Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "packageName": "com.augmentos.livecaptions",
      "name": "Live Captions",
      // ... other app fields
      "developerProfile": {
        "company": "AugmentOS Team",
        "website": "https://augmentos.org",
        "contactEmail": "team@augmentos.org"
      }
    },
    // ... more apps
  ]
}
```

### Search Apps

Searches publicly available apps based on a query string matching name or description.

```http
GET /api/apps/search?q={query}
```

**Parameters:**
- `q` (string, required): The search term

**Authentication:** None required

**Example Request:**
```bash
curl -X GET "https://cloud.augmentos.org/api/apps/search?q=caption"
```

**Example Response (200 OK):**
```json
{
  "success": true,
  "data": [
    // ... apps matching the query
  ]
}
```

**Example Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "Search query is required"
}
```

### Get App Details

Retrieves detailed information for a specific publicly available app, including its developer profile if available.

```http
GET /api/apps/{packageName}
```

**Parameters:**
- `packageName` (path, required): The unique package name of the app

**Authentication:** None required

**Example Request:**
```bash
curl -X GET https://cloud.augmentos.org/api/apps/com.augmentos.livecaptions
```

**Example Response (200 OK):**
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

**Example Response (404 Not Found):**
```json
{
  "success": false,
  "message": "App with package name ... not found"
}
```
