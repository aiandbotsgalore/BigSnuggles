# Phase 8 API Documentation

**Version**: 1.0  
**Last Updated**: October 28, 2025  
**Project**: Big Snuggles - Premium Tier Enhancement

## Overview

This document provides comprehensive API documentation for Phase 8 endpoints, covering Rooms, Voting, Clips, and Subscriptions functionality for the Big Snuggles premium tier system.

## Table of Contents

1. [Authentication](#authentication)
2. [Error Codes](#error-codes)
3. [Rooms API](#rooms-api)
4. [Voting API](#voting-api)
5. [Clips API](#clips-api)
6. [Subscriptions API](#subscriptions-api)

---

## Authentication

All API endpoints require authentication via JWT tokens in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

### Token Structure

JWT tokens contain:
- `user_id`: Unique user identifier
- `subscription_tier`: User's subscription level
- `permissions`: Array of allowed operations

### Authentication Example

```javascript
const headers = {
  'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  'Content-Type': 'application/json'
};
```

---

## Error Codes

| Code | Status | Description |
|------|--------|-------------|
| 400 | Bad Request | Invalid request parameters |
| 401 | Unauthorized | Invalid or missing authentication |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource does not exist |
| 409 | Conflict | Resource already exists or conflict |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error occurred |
| 503 | Service Unavailable | Service temporarily unavailable |

---

## Rooms API

### Base URL: `/api/phase8/rooms`

#### 1. Create Room

**Endpoint**: `POST /api/phase8/rooms`

**Description**: Create a new premium room with enhanced features.

**Request Body**:
```json
{
  "name": "VIP Gaming Room",
  "description": "Premium room for exclusive gaming sessions",
  "max_participants": 20,
  "room_type": "premium",
  "features": ["voice_chat", "video_streaming", "shared_whiteboard"],
  "settings": {
    "require_moderation": false,
    "auto_recording": true,
    "max_duration": 1440
  }
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "room_id": "room_123e4567-e89b-12d3-a456-426614174000",
    "name": "VIP Gaming Room",
    "description": "Premium room for exclusive gaming sessions",
    "max_participants": 20,
    "room_type": "premium",
    "features": ["voice_chat", "video_streaming", "shared_whiteboard"],
    "settings": {
      "require_moderation": false,
      "auto_recording": true,
      "max_duration": 1440
    },
    "creator_id": "user_98765432",
    "created_at": "2025-10-28T18:03:34Z",
    "invite_code": "ABC123XYZ",
    "join_url": "https://app.bigsnuggles.com/join/ABC123XYZ"
  }
}
```

#### 2. Get Room Details

**Endpoint**: `GET /api/phase8/rooms/{room_id}`

**Description**: Retrieve detailed information about a specific room.

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "room_id": "room_123e4567-e89b-12d3-a456-426614174000",
    "name": "VIP Gaming Room",
    "description": "Premium room for exclusive gaming sessions",
    "max_participants": 20,
    "current_participants": 12,
    "room_type": "premium",
    "features": ["voice_chat", "video_streaming", "shared_whiteboard"],
    "settings": {
      "require_moderation": false,
      "auto_recording": true,
      "max_duration": 1440
    },
    "creator_id": "user_98765432",
    "created_at": "2025-10-28T18:03:34Z",
    "status": "active",
    "participants": [
      {
        "user_id": "user_12345678",
        "username": "gamer_pro",
        "role": "moderator",
        "joined_at": "2025-10-28T17:30:00Z"
      }
    ]
  }
}
```

#### 3. Update Room

**Endpoint**: `PUT /api/phase8/rooms/{room_id}`

**Description**: Update room settings and properties.

**Request Body**:
```json
{
  "name": "VIP Gaming Room - Updated",
  "description": "Updated description",
  "max_participants": 25,
  "settings": {
    "require_moderation": true,
    "auto_recording": false
  }
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "room_id": "room_123e4567-e89b-12d3-a456-426614174000",
    "name": "VIP Gaming Room - Updated",
    "description": "Updated description",
    "max_participants": 25,
    "updated_at": "2025-10-28T18:05:00Z"
  }
}
```

#### 4. Delete Room

**Endpoint**: `DELETE /api/phase8/rooms/{room_id}`

**Description**: Delete a room and all associated data.

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Room deleted successfully"
}
```

#### 5. Join Room

**Endpoint**: `POST /api/phase8/rooms/{room_id}/join`

**Description**: Join a room using room ID or invite code.

**Request Body**:
```json
{
  "invite_code": "ABC123XYZ",
  "user_preferences": {
    "audio_enabled": true,
    "video_enabled": false,
    "chat_enabled": true
  }
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "join_token": "jwt_join_token_here",
    "room_session_id": "session_abcdef123456",
    "participant_id": "part_789xyz456",
    "assigned_role": "member",
    "permissions": ["chat", "voice", "screen_share"]
  }
}
```

#### 6. Leave Room

**Endpoint**: `POST /api/phase8/rooms/{room_id}/leave`

**Description**: Leave a room and cleanup session data.

**Request Body**:
```json
{
  "participant_id": "part_789xyz456"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Successfully left the room"
}
```

#### 7. List User Rooms

**Endpoint**: `GET /api/phase8/rooms/user/{user_id}`

**Description**: Get all rooms for a specific user.

**Query Parameters**:
- `status`: Filter by room status (active, inactive, archived)
- `role`: Filter by user role (creator, moderator, member)
- `limit`: Number of results per page (default: 20)
- `offset`: Pagination offset (default: 0)

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "rooms": [
      {
        "room_id": "room_123e4567-e89b-12d3-a456-426614174000",
        "name": "VIP Gaming Room",
        "role": "creator",
        "status": "active",
        "participant_count": 15,
        "created_at": "2025-10-28T18:03:34Z",
        "last_activity": "2025-10-28T18:00:00Z"
      }
    ],
    "pagination": {
      "total": 1,
      "limit": 20,
      "offset": 0,
      "has_more": false
    }
  }
}
```

#### 8. Room Moderation

**Endpoint**: `POST /api/phase8/rooms/{room_id}/moderate`

**Description**: Perform moderation actions on room participants.

**Request Body**:
```json
{
  "action": "mute",
  "participant_id": "part_789xyz456",
  "duration": 300,
  "reason": "Inappropriate behavior",
  "moderator_id": "user_98765432"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "moderation_id": "mod_123456789",
    "action": "mute",
    "participant_id": "part_789xyz456",
    "expires_at": "2025-10-28T18:08:34Z",
    "status": "active"
  }
}
```

---

## Voting API

### Base URL: `/api/phase8/voting`

#### 1. Create Poll

**Endpoint**: `POST /api/phase8/voting/polls`

**Description**: Create a new poll in a room.

**Request Body**:
```json
{
  "room_id": "room_123e4567-e89b-12d3-a456-426614174000",
  "question": "What game should we play next?",
  "description": "Vote for the next game to play",
  "options": [
    {
      "text": "Chess Championship",
      "image_url": "https://example.com/chess.jpg"
    },
    {
      "text": "Trivia Challenge",
      "image_url": "https://example.com/trivia.jpg"
    },
    {
      "text": "Strategy Battle",
      "image_url": "https://example.com/strategy.jpg"
    }
  ],
  "settings": {
    "allow_multiple_votes": false,
    "show_results_live": true,
    "require_authentication": true,
    "max_participants": 50,
    "duration": 300
  }
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "poll_id": "poll_123e4567-e89b-12d3-a456-426614174000",
    "room_id": "room_123e4567-e89b-12d3-a456-426614174000",
    "question": "What game should we play next?",
    "description": "Vote for the next game to play",
    "options": [
      {
        "option_id": "opt_001",
        "text": "Chess Championship",
        "image_url": "https://example.com/chess.jpg"
      },
      {
        "option_id": "opt_002",
        "text": "Trivia Challenge",
        "image_url": "https://example.com/trivia.jpg"
      },
      {
        "option_id": "opt_003",
        "text": "Strategy Battle",
        "image_url": "https://example.com/strategy.jpg"
      }
    ],
    "settings": {
      "allow_multiple_votes": false,
      "show_results_live": true,
      "require_authentication": true,
      "max_participants": 50,
      "duration": 300
    },
    "creator_id": "user_98765432",
    "created_at": "2025-10-28T18:03:34Z",
    "status": "active",
    "total_votes": 0
  }
}
```

#### 2. Get Poll Details

**Endpoint**: `GET /api/phase8/voting/polls/{poll_id}`

**Description**: Retrieve poll information and current results.

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "poll_id": "poll_123e4567-e89b-12d3-a456-426614174000",
    "room_id": "room_123e4567-e89b-12d3-a456-426614174000",
    "question": "What game should we play next?",
    "description": "Vote for the next game to play",
    "options": [
      {
        "option_id": "opt_001",
        "text": "Chess Championship",
        "image_url": "https://example.com/chess.jpg",
        "vote_count": 12
      },
      {
        "option_id": "opt_002",
        "text": "Trivia Challenge",
        "image_url": "https://example.com/trivia.jpg",
        "vote_count": 8
      },
      {
        "option_id": "opt_003",
        "text": "Strategy Battle",
        "image_url": "https://example.com/strategy.jpg",
        "vote_count": 5
      }
    ],
    "settings": {
      "allow_multiple_votes": false,
      "show_results_live": true,
      "require_authentication": true,
      "max_participants": 50,
      "duration": 300
    },
    "creator_id": "user_98765432",
    "created_at": "2025-10-28T18:03:34Z",
    "status": "active",
    "total_votes": 25,
    "time_remaining": 245,
    "has_user_voted": false
  }
}
```

#### 3. Submit Vote

**Endpoint**: `POST /api/phase8/voting/polls/{poll_id}/vote`

**Description**: Submit a vote for a poll.

**Request Body**:
```json
{
  "option_ids": ["opt_001"],
  "user_id": "user_12345678",
  "timestamp": "2025-10-28T18:04:00Z"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "vote_id": "vote_123456789",
    "poll_id": "poll_123e4567-e89b-12d3-a456-426614174000",
    "option_ids": ["opt_001"],
    "user_id": "user_12345678",
    "timestamp": "2025-10-28T18:04:00Z",
    "status": "recorded"
  }
}
```

#### 4. Close Poll

**Endpoint**: `POST /api/phase8/voting/polls/{poll_id}/close`

**Description**: Close a poll and finalize results.

**Request Body**:
```json
{
  "reason": "Time limit reached",
  "closed_by": "user_98765432"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "poll_id": "poll_123e4567-e89b-12d3-a456-426614174000",
    "status": "closed",
    "closed_at": "2025-10-28T18:05:00Z",
    "total_votes": 25,
    "final_results": [
      {
        "option_id": "opt_001",
        "text": "Chess Championship",
        "vote_count": 12,
        "percentage": 48.0
      },
      {
        "option_id": "opt_002",
        "text": "Trivia Challenge",
        "vote_count": 8,
        "percentage": 32.0
      },
      {
        "option_id": "opt_003",
        "text": "Strategy Battle",
        "vote_count": 5,
        "percentage": 20.0
      }
    ],
    "winning_option": "opt_001"
  }
}
```

#### 5. Get Room Polls

**Endpoint**: `GET /api/phase8/voting/rooms/{room_id}/polls`

**Description**: Get all polls for a specific room.

**Query Parameters**:
- `status`: Filter by status (active, closed, draft)
- `limit`: Number of results per page
- `offset`: Pagination offset

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "polls": [
      {
        "poll_id": "poll_123e4567-e89b-12d3-a456-426614174000",
        "question": "What game should we play next?",
        "creator_id": "user_98765432",
        "created_at": "2025-10-28T18:03:34Z",
        "status": "active",
        "total_votes": 25,
        "options_count": 3
      }
    ],
    "pagination": {
      "total": 1,
      "limit": 20,
      "offset": 0,
      "has_more": false
    }
  }
}
```

#### 6. Delete Poll

**Endpoint**: `DELETE /api/phase8/voting/polls/{poll_id}`

**Description**: Delete a poll and all associated votes.

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Poll deleted successfully"
}
```

#### 7. Get User Vote History

**Endpoint**: `GET /api/phase8/voting/users/{user_id}/votes`

**Description**: Get voting history for a specific user.

**Query Parameters**:
- `limit`: Number of results per page
- `offset`: Pagination offset
- `date_from`: Filter from date (ISO 8601)
- `date_to`: Filter to date (ISO 8601)

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "votes": [
      {
        "vote_id": "vote_123456789",
        "poll_id": "poll_123e4567-e89b-12d3-a456-426614174000",
        "poll_question": "What game should we play next?",
        "selected_options": ["opt_001"],
        "timestamp": "2025-10-28T18:04:00Z",
        "room_id": "room_123e4567-e89b-12d3-a456-426614174000"
      }
    ],
    "statistics": {
      "total_votes": 15,
      "participation_rate": 85.7,
      "average_polls_per_room": 2.3
    },
    "pagination": {
      "total": 15,
      "limit": 20,
      "offset": 0,
      "has_more": false
    }
  }
}
```

---

## Clips API

### Base URL: `/api/phase8/clips`

#### 1. Create Clip

**Endpoint**: `POST /api/phase8/clips`

**Description**: Create a new video clip from room session.

**Request Body**:
```json
{
  "room_id": "room_123e4567-e89b-12d3-a456-426614174000",
  "session_id": "session_abcdef123456",
  "title": "Epic Win Moment",
  "description": "Amazing gaming victory celebration",
  "start_time": 1245.5,
  "end_time": 1278.3,
  "tags": ["gaming", "victory", "celebration"],
  "privacy": "public",
  "thumbnail_url": "https://example.com/thumbnail.jpg"
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "clip_id": "clip_123e4567-e89b-12d3-a456-426614174000",
    "title": "Epic Win Moment",
    "description": "Amazing gaming victory celebration",
    "duration": 32.8,
    "start_time": 1245.5,
    "end_time": 1278.3,
    "file_size": 15728640,
    "video_url": "https://cdn.bigsnuggles.com/clips/clip_123e4567.../video.mp4",
    "thumbnail_url": "https://cdn.bigsnuggles.com/clips/clip_123e4567.../thumb.jpg",
    "tags": ["gaming", "victory", "celebration"],
    "privacy": "public",
    "creator_id": "user_98765432",
    "room_id": "room_123e4567-e89b-12d3-a456-426614174000",
    "created_at": "2025-10-28T18:03:34Z",
    "status": "processing",
    "processing_progress": 0
  }
}
```

#### 2. Get Clip Details

**Endpoint**: `GET /api/phase8/clips/{clip_id}`

**Description**: Retrieve detailed information about a specific clip.

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "clip_id": "clip_123e4567-e89b-12d3-a456-426614174000",
    "title": "Epic Win Moment",
    "description": "Amazing gaming victory celebration",
    "duration": 32.8,
    "start_time": 1245.5,
    "end_time": 1278.3,
    "file_size": 15728640,
    "video_url": "https://cdn.bigsnuggles.com/clips/clip_123e4567.../video.mp4",
    "thumbnail_url": "https://cdn.bigsnuggles.com/clips/clip_123e4567.../thumb.jpg",
    "video_quality": {
      "480p": "https://cdn.bigsnuggles.com/clips/clip_123e4567.../480p.mp4",
      "720p": "https://cdn.bigsnuggles.com/clips/clip_123e4567.../720p.mp4",
      "1080p": "https://cdn.bigsnuggles.com/clips/clip_123e4567.../1080p.mp4"
    },
    "tags": ["gaming", "victory", "celebration"],
    "privacy": "public",
    "creator_id": "user_98765432",
    "room_id": "room_123e4567-e89b-12d3-a456-426614174000",
    "created_at": "2025-10-28T18:03:34Z",
    "status": "ready",
    "view_count": 45,
    "likes_count": 8,
    "shares_count": 3
  }
}
```

#### 3. Update Clip

**Endpoint**: `PUT /api/phase8/clips/{clip_id}`

**Description**: Update clip metadata and settings.

**Request Body**:
```json
{
  "title": "Epic Victory Celebration",
  "description": "Updated description about the amazing win",
  "tags": ["gaming", "victory", "celebration", "highlight"],
  "privacy": "private"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "clip_id": "clip_123e4567-e89b-12d3-a456-426614174000",
    "title": "Epic Victory Celebration",
    "description": "Updated description about the amazing win",
    "tags": ["gaming", "victory", "celebration", "highlight"],
    "privacy": "private",
    "updated_at": "2025-10-28T18:05:00Z"
  }
}
```

#### 4. Delete Clip

**Endpoint**: `DELETE /api/phase8/clips/{clip_id}`

**Description**: Delete a clip and remove from all platforms.

**Request Body**:
```json
{
  "reason": "Content violation",
  "reported_by": "user_12345678"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Clip deleted successfully"
}
```

#### 5. List Clips

**Endpoint**: `GET /api/phase8/clips`

**Description**: List clips with filtering and pagination.

**Query Parameters**:
- `user_id`: Filter by creator
- `room_id`: Filter by room
- `tags`: Filter by tags (comma-separated)
- `privacy`: Filter by privacy (public, private, unlisted)
- `status`: Filter by status (processing, ready, deleted)
- `sort_by`: Sort field (created_at, views, likes)
- `sort_order`: Sort direction (asc, desc)
- `limit`: Number of results per page (default: 20)
- `offset`: Pagination offset

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "clips": [
      {
        "clip_id": "clip_123e4567-e89b-12d3-a456-426614174000",
        "title": "Epic Win Moment",
        "thumbnail_url": "https://cdn.bigsnuggles.com/clips/clip_123e4567.../thumb.jpg",
        "duration": 32.8,
        "privacy": "public",
        "creator_id": "user_98765432",
        "created_at": "2025-10-28T18:03:34Z",
        "status": "ready",
        "view_count": 45,
        "likes_count": 8
      }
    ],
    "pagination": {
      "total": 1,
      "limit": 20,
      "offset": 0,
      "has_more": false
    }
  }
}
```

#### 6. Like/Unlike Clip

**Endpoint**: `POST /api/phase8/clips/{clip_id}/like`

**Description**: Like or unlike a clip.

**Request Body**:
```json
{
  "user_id": "user_12345678",
  "action": "like"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "clip_id": "clip_123e4567-e89b-12d3-a456-426614174000",
    "user_id": "user_12345678",
    "action": "like",
    "likes_count": 9,
    "user_has_liked": true
  }
}
```

#### 7. Share Clip

**Endpoint**: `POST /api/phase8/clips/{clip_id}/share`

**Description**: Share a clip and track sharing metrics.

**Request Body**:
```json
{
  "user_id": "user_12345678",
  "platform": "social",
  "share_method": "link",
  "message": "Check out this epic gaming moment!"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "share_id": "share_123456789",
    "clip_id": "clip_123e4567-e89b-12d3-a456-426614174000",
    "share_url": "https://app.bigsnuggles.com/clip/clip_123e4567-e89b-12d3-a456-426614174000",
    "platform": "social",
    "shares_count": 4,
    "timestamp": "2025-10-28T18:04:00Z"
  }
}
```

---

## Subscriptions API

### Base URL: `/api/phase8/subscriptions`

#### 1. Create Subscription

**Endpoint**: `POST /api/phase8/subscriptions`

**Description**: Create a new subscription for a user.

**Request Body**:
```json
{
  "user_id": "user_12345678",
  "plan_type": "premium",
  "billing_cycle": "monthly",
  "payment_method_id": "pm_123456789",
  "auto_renewal": true,
  "coupon_code": "SAVE20",
  "metadata": {
    "source": "website",
    "campaign": "launch_special"
  }
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "subscription_id": "sub_123e4567-e89b-12d3-a456-426614174000",
    "user_id": "user_12345678",
    "plan_type": "premium",
    "billing_cycle": "monthly",
    "status": "active",
    "amount": 999,
    "currency": "USD",
    "current_period_start": "2025-10-28T18:03:34Z",
    "current_period_end": "2025-11-28T18:03:34Z",
    "trial_end": null,
    "auto_renewal": true,
    "discount_applied": {
      "coupon_code": "SAVE20",
      "discount_percent": 20,
      "discount_amount": 199
    },
    "created_at": "2025-10-28T18:03:34Z",
    "next_billing_date": "2025-11-28T18:03:34Z"
  }
}
```

#### 2. Get Subscription Details

**Endpoint**: `GET /api/phase8/subscriptions/{subscription_id}`

**Description**: Retrieve detailed subscription information.

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "subscription_id": "sub_123e4567-e89b-12d3-a456-426614174000",
    "user_id": "user_12345678",
    "plan_type": "premium",
    "billing_cycle": "monthly",
    "status": "active",
    "amount": 999,
    "currency": "USD",
    "amount_after_discount": 800,
    "current_period_start": "2025-10-28T18:03:34Z",
    "current_period_end": "2025-11-28T18:03:34Z",
    "trial_end": null,
    "auto_renewal": true,
    "cancelled_at": null,
    "cancel_at_period_end": false,
    "features": [
      "unlimited_rooms",
      "hd_video_recording",
      "advanced_moderation",
      "priority_support",
      "custom_branding"
    ],
    "usage": {
      "rooms_created": 15,
      "clips_generated": 32,
      "storage_used_gb": 25.6,
      "api_calls_this_month": 1250
    },
    "billing_address": {
      "name": "John Doe",
      "line1": "123 Main St",
      "line2": "Apt 4B",
      "city": "New York",
      "state": "NY",
      "postal_code": "10001",
      "country": "US"
    },
    "payment_method": {
      "id": "pm_123456789",
      "type": "card",
      "brand": "visa",
      "last4": "4242",
      "exp_month": 12,
      "exp_year": 2027
    }
  }
}
```

#### 3. Update Subscription

**Endpoint**: `PUT /api/phase8/subscriptions/{subscription_id}`

**Description**: Update subscription plan or settings.

**Request Body**:
```json
{
  "plan_type": "pro",
  "billing_cycle": "yearly",
  "auto_renewal": true,
  "payment_method_id": "pm_987654321"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "subscription_id": "sub_123e4567-e89b-12d3-a456-426614174000",
    "plan_type": "pro",
    "billing_cycle": "yearly",
    "amount": 9999,
    "currency": "USD",
    "current_period_start": "2025-10-28T18:05:00Z",
    "current_period_end": "2026-10-28T18:05:00Z",
    "prorated_amount": 1234,
    "next_billing_date": "2026-10-28T18:05:00Z",
    "updated_at": "2025-10-28T18:05:00Z"
  }
}
```

#### 4. Cancel Subscription

**Endpoint**: `POST /api/phase8/subscriptions/{subscription_id}/cancel`

**Description**: Cancel a subscription with optional immediate effect.

**Request Body**:
```json
{
  "reason": "Too expensive",
  "feedback": "Looking for a cheaper alternative",
  "cancel_at_period_end": false
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "subscription_id": "sub_123e4567-e89b-12d3-a456-426614174000",
    "status": "canceled",
    "canceled_at": "2025-10-28T18:05:00Z",
    "current_period_end": "2025-11-28T18:03:34Z",
    "end_access_at": "2025-11-28T18:03:34Z",
    "cancel_reason": "Too expensive",
    "refund_amount": 0
  }
}
```

#### 5. Reactivate Subscription

**Endpoint**: `POST /api/phase8/subscriptions/{subscription_id}/reactivate`

**Description**: Reactivate a canceled subscription.

**Request Body**:
```json
{
  "reason": "Changed mind",
  "auto_renewal": true
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "subscription_id": "sub_123e4567-e89b-12d3-a456-426614174000",
    "status": "active",
    "reactivated_at": "2025-10-28T18:06:00Z",
    "current_period_end": "2025-11-28T18:03:34Z",
    "next_billing_date": "2025-11-28T18:03:34Z",
    "auto_renewal": true
  }
}
```

#### 6. Get User Subscriptions

**Endpoint**: `GET /api/phase8/subscriptions/user/{user_id}`

**Description**: Get all subscriptions for a specific user.

**Query Parameters**:
- `status`: Filter by status (active, canceled, past_due)
- `plan_type`: Filter by plan type
- `limit`: Number of results per page
- `offset`: Pagination offset

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "subscriptions": [
      {
        "subscription_id": "sub_123e4567-e89b-12d3-a456-426614174000",
        "plan_type": "premium",
        "billing_cycle": "monthly",
        "status": "active",
        "amount": 999,
        "currency": "USD",
        "current_period_end": "2025-11-28T18:03:34Z",
        "auto_renewal": true,
        "created_at": "2025-10-28T18:03:34Z"
      }
    ],
    "active_subscription": {
      "subscription_id": "sub_123e4567-e89b-12d3-a456-426614174000",
      "plan_type": "premium"
    },
    "pagination": {
      "total": 1,
      "limit": 20,
      "offset": 0,
      "has_more": false
    }
  }
}
```

#### 7. Get Subscription Plans

**Endpoint**: `GET /api/phase8/subscriptions/plans`

**Description**: Get available subscription plans and pricing.

**Query Parameters**:
- `currency`: Filter by currency (USD, EUR, GBP)
- `billing_cycle`: Filter by billing cycle (monthly, yearly)

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "plans": [
      {
        "plan_id": "plan_basic_monthly",
        "name": "Basic",
        "description": "Perfect for casual users",
        "billing_cycle": "monthly",
        "amount": 499,
        "currency": "USD",
        "features": [
          "5 rooms per month",
          "Basic video recording",
          "Standard support"
        ],
        "limits": {
          "rooms_per_month": 5,
          "storage_gb": 5,
          "api_calls_per_day": 100
        },
        "trial_days": 14,
        "is_popular": false
      },
      {
        "plan_id": "plan_premium_monthly",
        "name": "Premium",
        "description": "Most popular for power users",
        "billing_cycle": "monthly",
        "amount": 999,
        "currency": "USD",
        "features": [
          "Unlimited rooms",
          "HD video recording",
          "Advanced moderation",
          "Priority support",
          "Custom branding"
        ],
        "limits": {
          "rooms_per_month": -1,
          "storage_gb": 50,
          "api_calls_per_day": 1000
        },
        "trial_days": 14,
        "is_popular": true
      }
    ],
    "currency": "USD"
  }
}
```

#### 8. Apply Coupon

**Endpoint**: `POST /api/phase8/subscriptions/validate-coupon`

**Description**: Validate and apply a coupon code.

**Request Body**:
```json
{
  "coupon_code": "SAVE20",
  "plan_id": "plan_premium_monthly",
  "user_id": "user_12345678"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "coupon_code": "SAVE20",
    "valid": true,
    "discount_type": "percentage",
    "discount_value": 20,
    "discount_amount": 199,
    "amount_after_discount": 800,
    "currency": "USD",
    "expires_at": "2025-12-31T23:59:59Z",
    "usage_limit": 1000,
    "usage_count": 234,
    "remaining_uses": 766
  }
}
```

#### 9. Get Payment Methods

**Endpoint**: `GET /api/phase8/subscriptions/users/{user_id}/payment-methods`

**Description**: Get saved payment methods for a user.

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "payment_methods": [
      {
        "id": "pm_123456789",
        "type": "card",
        "brand": "visa",
        "last4": "4242",
        "exp_month": 12,
        "exp_year": 2027,
        "is_default": true,
        "billing_address": {
          "name": "John Doe",
          "line1": "123 Main St",
          "line2": "Apt 4B",
          "city": "New York",
          "state": "NY",
          "postal_code": "10001",
          "country": "US"
        },
        "created_at": "2025-09-15T10:30:00Z"
      }
    ]
  }
}
```

#### 10. Add Payment Method

**Endpoint**: `POST /api/phase8/subscriptions/payment-methods`

**Description**: Add a new payment method for a user.

**Request Body**:
```json
{
  "user_id": "user_12345678",
  "payment_method_token": "pm_token_from_stripe",
  "set_as_default": true,
  "billing_address": {
    "name": "John Doe",
    "line1": "123 Main St",
    "line2": "Apt 4B",
    "city": "New York",
    "state": "NY",
    "postal_code": "10001",
    "country": "US"
  }
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "payment_method_id": "pm_987654321",
    "type": "card",
    "brand": "mastercard",
    "last4": "5555",
    "exp_month": 6,
    "exp_year": 2028,
    "is_default": true,
    "billing_address": {
      "name": "John Doe",
      "line1": "123 Main St",
      "line2": "Apt 4B",
      "city": "New York",
      "state": "NY",
      "postal_code": "10001",
      "country": "US"
    },
    "created_at": "2025-10-28T18:07:00Z"
  }
}
```

---

## Rate Limiting

### Limits by Endpoint Category

| Category | Requests per Minute | Requests per Hour |
|----------|---------------------|-------------------|
| Rooms | 60 | 1000 |
| Voting | 120 | 5000 |
| Clips | 30 | 500 |
| Subscriptions | 20 | 200 |

### Rate Limit Headers

All responses include rate limit information:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1635432000
X-RateLimit-Retry-After: 60
```

---

## Webhook Events

### Supported Events

#### Rooms
- `room.created`
- `room.updated`
- `room.deleted`
- `room.participant_joined`
- `room.participant_left`

#### Voting
- `poll.created`
- `poll.voted`
- `poll.closed`

#### Clips
- `clip.created`
- `clip.processed`
- `clip.viewed`
- `clip.liked`
- `clip.shared`

#### Subscriptions
- `subscription.created`
- `subscription.updated`
- `subscription.canceled`
- `subscription.payment_succeeded`
- `subscription.payment_failed`
- `subscription.trial_will_end`

### Webhook Payload Example

```json
{
  "id": "evt_123456789",
  "type": "poll.created",
  "created": 1635432000,
  "data": {
    "poll_id": "poll_123e4567-e89b-12d3-a456-426614174000",
    "room_id": "room_123e4567-e89b-12d3-a456-426614174000",
    "creator_id": "user_98765432"
  }
}
```

---

## SDK Examples

### JavaScript/Node.js

```javascript
const BigSnugglesAPI = require('@bigsnuggles/api');

const client = new BigSnugglesAPI({
  apiKey: 'your_api_key',
  baseURL: 'https://api.bigsnuggles.com'
});

// Create a room
const room = await client.rooms.create({
  name: 'Gaming Session',
  max_participants: 10,
  features: ['voice_chat', 'video_streaming']
});

// Create a poll
const poll = await client.voting.createPoll({
  room_id: room.id,
  question: 'What game should we play?',
  options: ['Chess', 'Poker', 'Trivia']
});
```

### Python

```python
from bigsnuggles import BigSnugglesClient

client = BigSnugglesClient(
    api_key='your_api_key',
    base_url='https://api.bigsnuggles.com'
)

# Create a clip
clip = client.clips.create(
    room_id='room_123...',
    title='Epic Moment',
    start_time=120.5,
    end_time=150.2
)
```

---

## Changelog

### Version 1.0 (October 28, 2025)
- Initial API release
- Rooms API (8 endpoints)
- Voting API (7 endpoints)
- Clips API (7 endpoints)
- Subscriptions API (10 endpoints)
- Full authentication and rate limiting
- Webhook support

---

## Support

For API support, contact:
- Email: api-support@bigsnuggles.com
- Documentation: https://docs.bigsnuggles.com
- Status Page: https://status.bigsnuggles.com

---

**© 2025 Big Snuggles. All rights reserved.**