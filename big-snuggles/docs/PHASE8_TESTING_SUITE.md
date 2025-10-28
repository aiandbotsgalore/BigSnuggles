# Phase 8 Testing Suite Documentation

**Version**: 1.0  
**Last Updated**: October 28, 2025  
**Components**: 4 (Multi-User Rooms, Voting System, Clip Generator, Premium Tier)  
**Status**: Production Ready - Testing Required

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Component 1: Multi-User Space Rooms](#component-1-multi-user-space-rooms)
4. [Component 2: Voting System](#component-2-voting-system)
5. [Component 3: Clip Generator](#component-3-clip-generator)
6. [Component 4: Premium Tier System](#component-4-premium-tier-system)
7. [Integration Testing](#integration-testing)
8. [Troubleshooting Guide](#troubleshooting-guide)
9. [Test Results Template](#test-results-template)

---

## Overview

This comprehensive testing suite validates all 4 Phase 8 components of the Big Snuggles application. Each component has been independently developed and requires both manual and automated testing to ensure proper functionality.

### Testing Scope

- **Component 1**: Multi-User Space Rooms Infrastructure
- **Component 2**: Real-time Voting & Audience Participation
- **Component 3**: FFmpeg-based Clip Generation System
- **Component 4**: Stripe Premium Subscription Tier

### Test Types

1. **Unit Tests**: Individual function testing (automated)
2. **Integration Tests**: Component interaction testing (automated + manual)
3. **End-to-End Tests**: Complete user workflow testing (manual)
4. **Load Tests**: Performance under concurrent users (manual)
5. **Security Tests**: Authentication and authorization (automated + manual)

---

## Prerequisites

### Required Software

```bash
# Node.js dependencies
cd /workspace/big-snuggles/backend && pnpm install
cd /workspace/big-snuggles/frontend && pnpm install

# System dependencies
apt-get update && apt-get install -y ffmpeg

# Supabase setup
# Ensure migrations 006, 007, 008 are applied
```

### Environment Setup

Create `.env` in backend directory:
```bash
# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_ANON_KEY=your_anon_key

# Stripe (Component 4 - Optional for Components 1-3)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Google AI (Component 3)
GOOGLE_AI_API_KEY=your_google_ai_key
```

### Storage Setup

**Required for Component 3 (Clip Generator):**
1. Create Supabase Storage bucket: `clips`
2. Public access: Yes
3. File size limit: 100MB
4. Allowed MIME types:
   - `video/mp4`
   - `video/webm`
   - `audio/mpeg`
   - `image/jpeg`

### Start Services

```bash
# Terminal 1: Backend
cd /workspace/big-snuggles/backend
pnpm run dev
# Server runs on: http://localhost:8000

# Terminal 2: Frontend
cd /workspace/big-snuggles/frontend
pnpm run dev
# Server runs on: http://localhost:5173
```

---

## Component 1: Multi-User Space Rooms

### Overview
Real-time multi-user room system with Socket.IO synchronization, supporting up to 50 users per room with unique codes and host controls.

### Test Scenarios

#### TC1.1: Room Creation
**Objective**: Validate room creation functionality

**Prerequisites**:
- User authenticated
- Backend running on port 8000
- Frontend running on port 5173

**Steps**:
1. Navigate to `/spaces`
2. Click "Create New Room"
3. Enter room name: "Test Room Alpha"
4. Set max participants: 5
5. Click "Create Room"
6. Observe room code generation (6-character code)

**Expected Results**:
- ✅ Room created successfully
- ✅ Unique 6-character code displayed (e.g., "XJ9K2M")
- ✅ Room details saved to database
- ✅ User redirected to active room page
- ✅ Host badge visible
- ✅ Room shows in "My Rooms" list

**Pass Criteria**: All expected results occur within 2 seconds

---

#### TC1.2: Join Room by Code
**Objective**: Test room joining functionality

**Steps**:
1. Copy room code from TC1.1
2. Open new browser/incognito window
3. Login as different user
4. Navigate to `/spaces`
5. Enter room code in "Join Room" field
6. Click "Join Room"

**Expected Results**:
- ✅ Room found by code
- ✅ User joins successfully
- ✅ Real-time participant list updates
- ✅ Join notification appears in room
- ✅ Can see room chat/history

**Pass Criteria**: Join completes within 3 seconds, real-time sync works

---

#### TC1.3: Real-time Synchronization
**Objective**: Verify Socket.IO real-time features

**Setup**: Two users in same room from TC1.2

**Steps**:
1. User A: Send message in chat
2. User B: Verify message appears instantly
3. User B: Send reply
4. User A: Verify reply appears instantly
5. User A: Close browser tab (simulate disconnect)
6. User B: Verify "User A left" notification appears

**Expected Results**:
- ✅ Messages appear instantly for all users (< 500ms)
- ✅ Typing indicators work
- ✅ Participant status updates in real-time
- ✅ Disconnect detection works (30s heartbeat)
- ✅ Rejoin functionality works

**Pass Criteria**: All real-time updates occur within 1 second

---

#### TC1.4: Host Controls
**Objective**: Validate host-exclusive functionality

**Steps**:
1. Ensure host status in room
2. Update room name to "Updated Test Room"
3. Change max participants to 10
4. Toggle room visibility (if applicable)
5. Attempt to delete room

**Expected Results**:
- ✅ Host can modify room settings
- ✅ Changes broadcast to all participants
- ✅ Non-hosts see updated info but can't modify
- ✅ Delete confirmation appears
- ✅ Room deletion removes from database

**Pass Criteria**: Host controls work correctly, non-host restrictions enforced

---

#### TC1.5: Room Capacity Limits
**Objective**: Test max participant enforcement

**Setup**: Room with max 5 participants

**Steps**:
1. Join 5 users to room
2. Attempt 6th user to join
3. Observe behavior

**Expected Results**:
- ✅ 6th user receives "Room Full" error
- ✅ Cannot join when at capacity
- ✅ Error message is clear and helpful

**Pass Criteria**: Capacity limits enforced, appropriate error messages

---

#### TC1.6: Rate Limiting
**Objective**: Verify rate limiting (5 rooms per user)

**Steps**:
1. Create 5 rooms as same user
2. Attempt to create 6th room
3. Observe error

**Expected Results**:
- ✅ 6th creation blocked with rate limit error
- ✅ Existing 5 rooms still accessible
- ✅ Limit resets after time period

**Pass Criteria**: Rate limiting active, appropriate messaging

---

#### TC1.7: Message Types
**Objective**: Test different message types in room

**Steps**:
1. Send text message
2. Send voice message (if voice system integrated)
3. Send AI response (trigger AI conversation)
4. Send system message (join/leave notifications)

**Expected Results**:
- ✅ All message types stored correctly
- ✅ Proper message type classification
- ✅ Metadata saved for each type
- ✅ UI displays appropriately for each type

**Pass Criteria**: Message types handled correctly

---

#### TC1.8: Inactive Room Cleanup
**Objective**: Verify automatic cleanup of old rooms

**Prerequisites**: Access to Supabase database

**Steps**:
1. Check current active rooms
2. Create room with no activity for 24+ hours
3. Verify cleanup function scheduled
4. Manual cleanup (for testing):
   ```sql
   SELECT cleanup_inactive_rooms();
   ```

**Expected Results**:
- ✅ Inactive rooms marked for cleanup
- ✅ Cleanup function removes old rooms
- ✅ No data corruption after cleanup

**Pass Criteria**: Cleanup works without errors

---

#### TC1.9: Error Handling
**Objective**: Test error scenarios

**Scenarios to Test**:
1. Invalid room code
2. Expired room code
3. Database connection failure
4. Socket.IO disconnection
5. Concurrent room deletion

**Expected Results**:
- ✅ Clear error messages for all scenarios
- ✅ Graceful degradation
- ✅ No client-side crashes
- ✅ Proper logging

**Pass Criteria**: Errors handled gracefully with clear messaging

---

#### TC1.10: Security & Authorization
**Objective**: Verify security measures

**Tests**:
1. JWT token validation
2. RLS policy enforcement
3. Unauthorized room access attempts
4. SQL injection attempts on room codes
5. Cross-user room access prevention

**Expected Results**:
- ✅ Authentication required for all operations
- ✅ Users can only access own data
- ✅ No unauthorized access possible
- ✅ All inputs sanitized

**Pass Criteria**: Security measures active and enforced

---

### Component 1 Test Summary

**Total Tests**: 10 test cases  
**Automated Tests**: Run with `./run_phase8_tests.sh component1`  
**Manual Tests**: All above scenarios  
**Estimated Time**: 30-45 minutes  
**Critical Tests**: TC1.2, TC1.3 (real-time sync)  
**Pass Rate Required**: 100%

---

## Component 2: Voting System

### Overview
Real-time polling system with 4 poll types, live vote updates, auto-expiration, and poll history with winner highlighting.

### Test Scenarios

#### TC2.1: Poll Creation (Topic Voting)
**Objective**: Create and validate topic voting polls

**Prerequisites**:
- User in active room (Component 1 required)
- Host privileges for poll creation

**Steps**:
1. Navigate to active room
2. Click "Polls" button
3. Click "Create Poll"
4. Select "Topic Voting" type
5. Enter question: "What should we talk about next?"
6. Add options:
   - "Sports and Games"
   - "Technology Trends"
   - "Life Advice"
   - "Funny Stories"
7. Set duration: 2 minutes
8. Click "Create Poll"

**Expected Results**:
- ✅ Poll created successfully
- ✅ Appears in room instantly for all participants
- ✅ Timer starts counting down
- ✅ All options visible to participants

**Pass Criteria**: Poll appears within 2 seconds for all users

---

#### TC2.2: Poll Creation (Personality Mode)
**Objective**: Test personality mode switching polls

**Steps**:
1. Click "Create Poll" again
2. Select "Personality Mode" type
3. Enter question: "How should I respond today?"
4. Select AI personality options:
   - "Gangster Style" (default)
   - "Wise Mentor"
   - "Comedy Roaster"
   - "Motivational Coach"
5. Set duration: 1 minute
6. Create poll

**Expected Results**:
- ✅ Personality mode poll created
- ✅ AI personality options displayed
- ✅ Votes tracked correctly
- ✅ Results determine mode switch

**Pass Criteria**: Poll reflects current AI personality options

---

#### TC2.3: Poll Creation (Audience Question)
**Objective**: Test audience question collection

**Steps**:
1. Create new poll: "Audience Question" type
2. Question: "What question do you have for me?"
3. Duration: 3 minutes
4. Create poll

**Expected Results**:
- ✅ Question collection poll created
- ✅ Open-ended format recognized
- ✅ Responses tracked as question submissions

**Pass Criteria**: Accepts and tracks text responses

---

#### TC2.4: Poll Creation (Quick Reaction)
**Objective**: Test quick reaction polls

**Steps**:
1. Create poll: "Quick Reaction" type
2. Question: "Should I tell a joke?"
3. Options: "Yes" / "No"
4. Duration: 30 seconds
5. Create poll

**Expected Results**:
- ✅ Quick reaction poll created
- ✅ Simple binary options displayed
- ✅ Fast voting UX

**Pass Criteria**: Supports emoji reactions and quick voting

---

#### TC2.5: Voting Process
**Objective**: Test actual voting functionality

**Setup**: Multiple users in room with active poll

**Steps**:
1. User A: Click on "Sports and Games" option
2. User B: Click on "Technology Trends" option
3. User C: Click on "Sports and Games" option
4. Observe real-time updates

**Expected Results**:
- ✅ Votes recorded instantly
- ✅ Vote counts update in real-time
- ✅ Percentage calculations correct
- ✅ UI reflects user's vote (highlighted selection)
- ✅ Can't vote twice (one vote per user)

**Pass Criteria**: Votes locked after submission, real-time sync < 500ms

---

#### TC2.6: Real-time Results
**Objective**: Verify live result updates

**Setup**: Active poll from TC2.5

**Steps**:
1. Monitor poll results from User A's screen
2. User B changes vote from "Technology Trends" to "Funny Stories"
3. User C votes for "Life Advice"
4. Observe result changes

**Expected Results**:
- ✅ All users see updated results instantly
- ✅ Vote tallies adjust correctly
- ✅ Percentages recalculated accurately
- ✅ Visual progress bars update smoothly

**Pass Criteria**: All users see identical real-time updates

---

#### TC2.7: Poll Expiration
**Objective**: Test auto-expiration functionality

**Setup**: Poll with short duration (30 seconds)

**Steps**:
1. Create poll with 30-second duration
2. Wait for expiration
3. Observe automatic poll closure

**Expected Results**:
- ✅ Poll closes at exact end time
- ✅ Final results displayed
- ✅ "Poll Closed" status shown
- ✅ Winner highlighted (if applicable)
- ✅ Participants notified of closure

**Pass Criteria**: Expiration accurate within ±2 seconds

---

#### TC2.8: Poll History
**Objective**: Verify poll history display

**Steps**:
1. Click "Poll History" tab/button
2. View list of previous polls
3. Verify details:
   - Question text
   - Options and results
   - Winner (highlighted)
   - Participant count
   - Duration
   - Timestamp

**Expected Results**:
- ✅ Past polls displayed with all metadata
- ✅ Winners clearly indicated
- ✅ Results data accurate
- ✅ History persists across sessions

**Pass Criteria**: History complete and accurate

---

#### TC2.9: Rate Limiting
**Objective**: Test poll creation rate limits

**Setup**: Host user in room

**Steps**:
1. Create 3 polls rapidly (within 1 minute)
2. Attempt 4th poll creation
3. Observe rate limit enforcement

**Expected Results**:
- ✅ 3 polls created successfully
- ✅ 4th creation blocked with rate limit error
- ✅ Clear error message about "3 polls per minute" limit

**Pass Criteria**: Rate limit active (3 polls/room/minute)

---

#### TC2.10: Vote Security
**Objective**: Verify vote integrity

**Tests**:
1. Attempt multiple votes from same browser
2. Refresh page and try voting again
3. Vote as unauthenticated user
4. SQL injection on poll ID
5. Vote in non-existent poll

**Expected Results**:
- ✅ One vote per user enforced
- ✅ Votes persist across page refreshes
- ✅ Authentication required for voting
- ✅ Invalid inputs sanitized
- ✅ Non-existent polls return error

**Pass Criteria**: Vote security measures enforced

---

#### TC2.11: Materialized Views
**Objective**: Verify optimized query performance

**Setup**: Active subscription to Supabase

**Steps**:
1. Create 20+ polls with votes
2. Query poll results frequently
3. Monitor query performance

**Expected Results**:
- ✅ Results queries fast (< 100ms)
- ✅ Materialized view updates automatically
- ✅ No N+1 query problems

**Pass Criteria**: Query performance optimal

---

#### TC2.12: Poll Deletion
**Objective**: Test poll cleanup

**Steps**:
1. Host creates poll
2. Delete poll before expiration
3. Verify removal from active polls
4. Check if appears in history

**Expected Results**:
- ✅ Poll removed from active list
- ✅ Database record deleted or archived
- ✅ Participants notified of deletion

**Pass Criteria**: Cleanup complete and consistent

---

### Component 2 Test Summary

**Total Tests**: 12 test cases  
**Automated Tests**: Run with `./run_phase8_tests.sh component2`  
**Manual Tests**: All above scenarios  
**Estimated Time**: 45-60 minutes  
**Critical Tests**: TC2.5, TC2.6 (real-time voting)  
**Pass Rate Required**: 100%

---

## Component 3: Clip Generator

### Overview
FFmpeg-based clip generation with automated highlight detection, manual clip creation, multi-format export, and social media sharing.

### Prerequisites

**Critical**: Before testing Component 3, ensure:
1. FFmpeg installed: `ffmpeg -version` (should show 5.1.7+)
2. Supabase Storage bucket `clips` created with public access
3. Google AI API key configured
4. Conversations/audio data available

### Test Scenarios

#### TC3.1: Auto-Detect Highlights
**Objective**: Test automated highlight detection algorithm

**Prerequisites**:
- Conversations with audio data in database
- Google AI API configured

**Steps**:
1. Navigate to `/clips`
2. Select conversation with rich conversation history
3. Click "Auto-Detect Highlights"
4. Set sensitivity: 0.7 (recommended)
5. Click "Find Highlights"
6. Wait for processing

**Expected Results**:
- ✅ Highlights detected using sentiment analysis
- ✅ Score assigned to each highlight (0.0-1.0)
- ✅ Type classified (humor, surprise, emotional, celebration)
- ✅ Highlight list displayed with previews
- ✅ Processing completes within 60 seconds

**Pass Criteria**: Multiple meaningful highlights detected with reasonable scores

---

#### TC3.2: Create Manual Clip
**Objective**: Test timeline-based clip creation

**Setup**: Conversation with audio available

**Steps**:
1. Click "Create Manual Clip"
2. Timeline scrubber appears with waveform
3. Drag start handle to desired start time
4. Drag end handle to desired end time
5. Ensure clip duration is 5-300 seconds
6. Enter title: "Funny Moment Highlight"
7. Enter description: "Best joke of the conversation"
8. Click "Generate Clip"

**Expected Results**:
- ✅ Timeline displays with waveform visualization
- ✅ Drag handles work smoothly
- ✅ Duration calculated and displayed
- ✅ Visual feedback for valid/invalid selections
- ✅ Clip queued for processing

**Pass Criteria**: Timeline controls work, clip queued successfully

---

#### TC3.3: Clip Processing Status
**Objective**: Track clip generation progress

**Setup**: Manual clip from TC3.2

**Steps**:
1. Return to ClipsPage
2. Locate newly created clip
3. Observe status badge
4. Wait for processing to complete

**Expected Status Progression**:
- `pending` → Job queued
- `processing` → FFmpeg running (0-100%)
- `completed` → Ready for download
- `failed` → Error occurred

**Expected Results**:
- ✅ Status updates in real-time
- ✅ Progress bar shows percentage
- ✅ Processing time reasonable (depends on duration)
- ✅ Success/error states clear

**Pass Criteria**: Status accurate, progress smooth

---

#### TC3.4: Multi-Format Download
**Objective**: Test clip export in different formats

**Setup**: Completed clip from TC3.3

**Steps**:
1. Click on completed clip card
2. Click "Download" dropdown
3. Select "MP4" format
4. Wait for download
5. Repeat for "WebM" format
6. Repeat for "MP3" format
7. Verify file sizes and quality

**Expected Results**:
- ✅ MP4 video download (with waveform visualization)
- ✅ WebM alternative format
- ✅ MP3 audio-only option
- ✅ Reasonable file sizes
- ✅ Quality acceptable (720p video)

**Pass Criteria**: All formats generate and download successfully

---

#### TC3.5: Thumbnail Generation
**Objective**: Verify thumbnail creation

**Setup**: Video clip in processing/completed

**Steps**:
1. Check clip details after completion
2. Verify thumbnail URL exists
3. View thumbnail image
4. Verify thumbnail represents clip content

**Expected Results**:
- ✅ Thumbnail generated at start of clip
- ✅ Thumbnail saved to storage bucket
- ✅ Image displays correctly
- ✅ Thumbnail appears in clip card

**Pass Criteria**: Thumbnail generated and viewable

---

#### TC3.6: Social Media Sharing
**Objective**: Test sharing functionality

**Setup**: Completed clip with thumbnail

**Steps**:
1. Click "Share" button on clip
2. Share modal opens
3. Test "Copy URL" button
4. Test "Share on Twitter" button
5. Test "Share on Facebook" button
6. Test native share (mobile/Chromium)

**Expected Results**:
- ✅ Share modal displays with preview
- ✅ Clip URL copied to clipboard
- ✅ Twitter share opens correct URL
- ✅ Facebook share configured properly
- ✅ Native share API triggered (if supported)
- ✅ Share tracking increments count

**Pass Criteria**: All sharing methods work, URLs correct

---

#### TC3.7: View Count & Analytics
**Objective**: Verify tracking functionality

**Setup**: Clip with sharing enabled

**Steps**:
1. Note initial view count (likely 0)
2. Access clip via shared URL
3. Return to clips page
4. Check view count increment
5. Repeat access to verify counter

**Expected Results**:
- ✅ View count increments on access
- ✅ Unique views tracked properly
- ✅ Count persists across sessions
- ✅ Share count tracks successful shares

**Pass Criteria**: Analytics tracking accurate

---

#### TC3.8: Highlight Sensitivity Tuning
**Objective**: Test sensitivity parameter

**Setup**: Conversation with varied content

**Steps**:
1. Run auto-detect with sensitivity 0.5 (inclusive)
2. Note number of highlights found
3. Run auto-detect with sensitivity 0.9 (exclusive)
4. Note number of highlights found
5. Compare results

**Expected Results**:
- ✅ Lower sensitivity finds more highlights
- ✅ Higher sensitivity finds fewer, more selective highlights
- ✅ Score thresholds adjust appropriately
- ✅ Results difference clearly visible

**Pass Criteria**: Sensitivity parameter affects detection

---

#### TC3.9: Error Handling
**Objective**: Test failure scenarios

**Scenarios to Test**:
1. Insufficient disk space
2. FFmpeg not installed
3. Invalid audio file
4. Network timeout during processing
5. Storage bucket permission denied
6. Invalid sensitivity value

**Expected Results**:
- ✅ Clear error messages for each scenario
- ✅ Graceful degradation
- ✅ Failed clips marked with error status
- ✅ Error details logged for debugging

**Pass Criteria**: Errors handled with clear messaging

---

#### TC3.10: Background Job Queue
**Objective**: Verify asynchronous processing

**Setup**: Multiple clips queued

**Steps**:
1. Queue 3-5 clips simultaneously
2. Monitor processing queue
3. Observe multiple jobs processing
4. Verify server doesn't freeze
5. Check database for job records

**Expected Results**:
- ✅ Multiple clips process concurrently
- ✅ Server remains responsive
- ✅ Queue status accurate
- ✅ Jobs tracked individually

**Pass Criteria**: Queue handles multiple jobs without issues

---

#### TC3.11: Storage Integration
**Objective**: Verify file storage

**Setup**: Completed clips

**Steps**:
1. Check Supabase Storage bucket `clips`
2. Verify uploaded files present
3. Verify file naming convention
4. Test public URL access

**Expected Results**:
- ✅ Files uploaded to correct bucket
- ✅ Naming: `{clipId}.mp4`, `{clipId}.webm`, etc.
- ✅ Public URLs accessible
- ✅ File sizes match expected

**Pass Criteria**: Storage integration complete

---

#### TC3.12: Cleanup Automation
**Objective**: Test automatic cleanup

**Setup**: Access to Supabase

**Steps**:
1. Manually run cleanup function:
   ```sql
   SELECT cleanup_old_clips();
   ```
2. Verify clips older than 30 days removed
3. Check storage files cleaned up

**Expected Results**:
- ✅ Old clips removed from database
- ✅ Associated files deleted from storage
- ✅ No orphaned records

**Pass Criteria**: Cleanup works correctly

---

### Component 3 Test Summary

**Total Tests**: 12 test cases  
**Automated Tests**: Run with `./run_phase8_tests.sh component3`  
**Manual Tests**: All above scenarios  
**Estimated Time**: 60-90 minutes (includes processing time)  
**Critical Tests**: TC3.1, TC3.3, TC3.4 (core functionality)  
**Pass Rate Required**: 95%+ (processing-dependent)

---

## Component 4: Premium Tier System

### Overview
Stripe-powered subscription system with 3 tiers (Free, Premium, Pro), feature gates, quota enforcement, and payment processing.

### Prerequisites

**Required for Component 4**:
1. Stripe account (test mode)
2. API keys configured:
   - `STRIPE_SECRET_KEY`
   - `STRIPE_PUBLISHABLE_KEY`
   - `STRIPE_WEBHOOK_SECRET`
3. Stripe CLI for webhook testing:
   ```bash
   stripe listen --forward-to localhost:8000/api/subscription/webhook
   ```

### Test Scenarios

#### TC4.1: View Pricing Page
**Objective**: Verify pricing display

**Steps**:
1. Navigate to `/pricing`
2. Verify three tiers displayed:
   - Free ($0/month)
   - Premium ($9.99/month)
   - Pro ($19.99/month)
3. Check feature comparison table
4. Verify "Most Popular" badge on Premium

**Expected Results**:
- ✅ All three tiers displayed clearly
- ✅ Prices shown correctly
- ✅ Feature lists complete
- ✅ "Most Popular" badge visible
- ✅ CTA buttons present for each tier

**Pass Criteria**: Pricing page renders correctly

---

#### TC4.2: Start Trial Checkout
**Objective**: Test Stripe checkout flow

**Setup**: User authenticated, Stripe CLI running

**Steps**:
1. Click "Start 7-Day Trial" on Premium tier
2. Verify redirect to Stripe checkout
3. Use test card: 4242 4242 4242 4242
4. Expiry: 12/34, CVC: 123, ZIP: 12345
5. Fill billing info with test data
6. Complete checkout
7. Verify redirect to `/subscription/success`

**Expected Results**:
- ✅ Checkout session created
- ✅ Stripe payment page loads
- ✅ Payment succeeds with test card
- ✅ Redirected to success page
- ✅ 2-second verification delay

**Pass Criteria**: Complete checkout flow works

---

#### TC4.3: Subscription Verification
**Objective**: Verify subscription activation

**Setup**: From TC4.2 after successful payment

**Steps**:
1. Wait on success page (automatic verification)
2. Observe status changes:
   - "Verifying payment..." (2 seconds)
   - "Success!" or "Error"
3. Check subscription details if successful

**Expected Results**:
- ✅ Webhook processes payment
- ✅ Subscription record created in database
- ✅ Success status displayed
- ✅ Redirect to subscription dashboard

**Pass Criteria**: Subscription activated, database updated

---

#### TC4.4: Subscription Dashboard
**Objective**: Test subscription management page

**Setup**: Active subscription from TC4.3

**Steps**:
1. Navigate to `/subscription`
2. Verify current plan display
3. Check billing information
4. Review usage statistics
5. Test "Manage Billing" button

**Expected Results**:
- ✅ Current tier badge visible
- ✅ Billing cycle dates shown
- ✅ Usage bars for conversations, clips, memories
- ✅ "Manage Billing" opens Stripe Customer Portal
- ✅ Upgrade/downgrade options present

**Pass Criteria**: Dashboard complete and accurate

---

#### TC4.5: Feature Gate Enforcement
**Objective**: Test tier-based access control

**Setup**: Free tier user account

**Steps**:
1. Login as free tier user
2. Attempt to create room: `POST /api/rooms/create`
3. Observe 403 error response
4. Verify error message mentions premium requirement
5. Check error includes required tier

**Expected Results**:
- ✅ 403 Forbidden status
- ✅ Clear error message
- ✅ Indicates premium tier needed
- ✅ Error code: `TIER_REQUIRED`

**Pass Criteria**: Feature gates block free users correctly

---

#### TC4.6: Quota Enforcement
**Objective**: Test usage limits

**Setup**: Premium user (50 clips/month limit)

**Steps**:
1. Generate 50 clips (reach limit)
2. Attempt 51st clip creation
3. Observe quota exceeded error

**Expected Results**:
- ✅ 403 Forbidden status
- ✅ Error: "Monthly quota exceeded"
- ✅ Shows current usage (50/50)
- ✅ Reset date displayed
- ✅ Error code: `QUOTA_EXCEEDED`

**Pass Criteria**: Quotas enforced accurately

---

#### TC4.7: Quota Tracking
**Objective**: Verify usage counters

**Setup**: Premium user, fresh billing period

**Steps**:
1. Check initial quota status
2. Perform feature action (create clip)
3. Return to subscription page
4. Verify usage increased by 1
5. Repeat for other features

**Expected Results**:
- ✅ Usage counters increment correctly
- ✅ Progress bars update
- ✅ Data persists across page refreshes
- ✅ Accurate percentage calculations

**Pass Criteria**: Tracking accurate and real-time

---

#### TC4.8: Webhook Processing
**Objective**: Test Stripe webhook handling

**Setup**: Stripe CLI with event logging

**Steps**:
1. Complete checkout (TC4.2)
2. Check Stripe CLI output for webhook events
3. Verify events:
   - `checkout.session.completed`
   - `customer.subscription.created`
4. Check webhook signature verification
5. Test other events:
   ```bash
   stripe trigger customer.subscription.updated
   stripe trigger invoice.payment_succeeded
   ```

**Expected Results**:
- ✅ Webhooks received and processed
- ✅ Signature verification passes
- ✅ Database updated for each event
- ✅ No webhook errors in logs

**Pass Criteria**: Webhooks handled correctly

---

#### TC4.9: Customer Portal
**Objective**: Test Stripe Customer Portal

**Setup**: Active subscription

**Steps**:
1. Click "Manage Billing" in subscription page
2. Verify redirect to Stripe Customer Portal
3. Test portal features:
   - View invoices
   - Update payment method
   - Change subscription
4. Cancel subscription in portal
5. Return to app

**Expected Results**:
- ✅ Customer Portal loads
- ✅ Subscription details accurate
- ✅ Can modify subscription
- ✅ Changes reflect in app after webhook

**Pass Criteria**: Customer Portal functional

---

#### TC4.10: Tier Comparison
**Objective**: Verify tier feature differences

**Setup**: Access to tier_features table

**Steps**:
1. Query tier features:
   ```sql
   SELECT * FROM tier_features;
   ```
2. Compare limits across tiers:
   - Free: 50 conv, 5 clips, no rooms
   - Premium: 500 conv, 50 clips, rooms enabled
   - Pro: Unlimited conv, 100 clips, rooms + analytics
3. Test actual limits match database

**Expected Results**:
- ✅ All three tiers configured
- ✅ Feature limits correct
- ✅ Limits enforced in feature gates
- ✅ API returns correct limits

**Pass Criteria**: Tier configuration accurate

---

#### TC4.11: Payment History
**Objective**: Verify transaction tracking

**Setup**: Subscription with successful payment

**Steps**:
1. Check payment_history table:
   ```sql
   SELECT * FROM payment_history WHERE user_id = '<uuid>';
   ```
2. Verify record includes:
   - Amount paid (in cents)
   - Currency (USD)
   - Status (paid)
   - Payment date
   - Stripe invoice ID

**Expected Results**:
- ✅ Payment recorded accurately
- ✅ All fields populated
- ✅ Status correct
- ✅ Timestamp accurate

**Pass Criteria**: Payment tracking complete

---

#### TC4.12: Subscription Cancellation
**Objective**: Test cancellation flow

**Setup**: Active subscription

**Steps**:
1. Navigate to `/subscription`
2. Click "Cancel Subscription"
3. Confirm cancellation in dialog
4. Verify `cancel_at_period_end = true`
5. Check status remains "active" until period end
6. Simulate period end or manually update:
   ```sql
   UPDATE subscriptions 
   SET status = 'canceled', 
       updated_at = NOW()
   WHERE id = '<subscription_id>';
   ```

**Expected Results**:
- ✅ Cancellation processed
- ✅ Period end date set correctly
- ✅ Access continues until period end
- ✅ Downgrade to free after cancellation

**Pass Criteria**: Cancellation flow complete

---

#### TC4.13: Error Handling
**Objective**: Test payment failures

**Test Cards**:
- 4000 0000 0000 0002 (declined)
- 4000 0027 6000 3184 (authentication required)

**Steps**:
1. Attempt checkout with declined card
2. Observe error handling
3. Test authentication required card
4. Verify appropriate error messages

**Expected Results**:
- ✅ Clear error messages
- ✅ User can retry
- ✅ No broken checkout flow
- ✅ Errors logged appropriately

**Pass Criteria**: Error handling graceful

---

#### TC4.14: Security Validation
**Objective**: Verify security measures

**Tests**:
1. Webhook signature verification
2. RLS policies on subscription tables
3. SQL injection attempts on user_id
4. Tier escalation attempts
5. Direct API access without auth

**Expected Results**:
- ✅ Invalid webhooks rejected
- ✅ Users can only access own data
- ✅ Inputs sanitized
- ✅ Unauthorized access blocked
- ✅ All actions require authentication

**Pass Criteria**: Security measures effective

---

### Component 4 Test Summary

**Total Tests**: 14 test cases  
**Automated Tests**: Run with `./run_phase8_tests.sh component4`  
**Manual Tests**: All above scenarios  
**Estimated Time**: 60-75 minutes (includes payment processing)  
**Critical Tests**: TC4.2, TC4.3, TC4.5 (checkout and enforcement)  
**Pass Rate Required**: 100%

---

## Integration Testing

### Overview
End-to-end testing across all 4 components working together.

### IT1: Complete User Journey
**Objective**: Test complete workflow from free user to premium subscriber

**Scenario**: New user → Free tier → Creates room → Upgrades to premium → Uses all features

**Steps**:
1. **Registration**: Create free account
2. **Free Tier**: 
   - Create 1 room (should fail - premium feature)
   - Generate 5 clips (free limit)
   - View pricing page
3. **Upgrade**:
   - Upgrade to Premium via checkout
   - Verify subscription activation
4. **Premium Features**:
   - Create unlimited rooms
   - Create 50 clips
   - Test voting in rooms
   - Generate clips from room conversations
5. **Premium Benefits**:
   - View analytics
   - Manage subscription

**Expected Results**: ✅ Complete workflow functional  
**Pass Criteria**: All steps succeed, proper tier enforcement

---

### IT2: Multi-User Premium Experience
**Objective**: Test multiple users with different tiers in same room

**Setup**: 
- Host: Premium tier
- Participant 1: Pro tier  
- Participant 2: Free tier

**Steps**:
1. Host creates room (premium feature)
2. All users join room
3. Create poll (host feature)
4. All users vote
5. Host generates clip from conversation
6. Test feature access for each tier

**Expected Results**: ✅ Tier differences enforced, all features work  
**Pass Criteria**: Mixed-tier room functional

---

### IT3: Cross-Component Data Flow
**Objective**: Verify data flows between components

**Flow**: Room conversation → Clip generation → Sharing → Analytics

**Steps**:
1. Multi-user conversation in room
2. Generate clip from highlight
3. Share clip on social media
4. Check view counts in clip analytics
5. Verify subscription usage tracked

**Expected Results**: ✅ Data flows correctly between systems  
**Pass Criteria**: End-to-end data integrity

---

### IT4: Concurrent Users Load Test
**Objective**: Test performance under load

**Setup**: 10+ users, multiple rooms

**Steps**:
1. Create 5 rooms
2. Have 10 users join rooms (mix of tiers)
3. Run polls simultaneously
4. Generate clips concurrently
5. Monitor system performance

**Expected Results**: ✅ No degradation, all features responsive  
**Pass Criteria**: Handles concurrent load

---

### IT5: System Resilience
**Objective**: Test system under adverse conditions

**Scenarios**:
1. Network interruption during checkout
2. Database connection issues
3. Webhook delivery failure
4. Storage bucket unavailable
5. Partial system failures

**Expected Results**: ✅ Graceful degradation, error recovery  
**Pass Criteria**: System remains stable

---

## Troubleshooting Guide

### Common Issues

#### Issue: "Socket.IO connection failed"
**Component**: 1 (Rooms)  
**Symptoms**: Real-time features not working

**Solutions**:
1. Check backend running: `curl http://localhost:8000/api/health`
2. Verify Socket.IO path: `/socket.io`
3. Check CORS configuration in server.js
4. Restart both frontend and backend

---

#### Issue: "Polls not appearing in real-time"
**Component**: 2 (Voting)  
**Symptoms**: Polls don't sync between users

**Solutions**:
1. Verify both users in same room
2. Check Socket.IO connection status
3. Check for console errors
4. Ensure same Socket.IO version
5. Verify roomSocketHandlers.js loaded

---

#### Issue: "FFmpeg not found"
**Component**: 3 (Clips)  
**Symptoms**: Clip processing fails immediately

**Solutions**:
1. Install FFmpeg: `apt-get install ffmpeg`
2. Verify installation: `ffmpeg -version`
3. Check PATH environment
4. Ensure version 5.1.7+

---

#### Issue: "Stripe checkout fails"
**Component**: 4 (Premium)  
**Symptoms**: Payment flow errors

**Solutions**:
1. Verify Stripe API keys (test mode: sk_test_...)
2. Check webhook endpoint active
3. Verify products created in Stripe Dashboard
4. Run: `subscriptionManager.ensureStripeProducts()`
5. Check backend logs for Stripe errors

---

#### Issue: "Database connection error"
**All Components**  
**Symptoms**: API calls fail with database errors

**Solutions**:
1. Check Supabase URL and keys
2. Verify network connectivity
3. Check RLS policies
4. Test with service role key
5. Verify migrations applied:
   ```sql
   SELECT * FROM information_schema.tables 
   WHERE table_name IN ('rooms', 'polls', 'clips', 'subscriptions');
   ```

---

#### Issue: "Storage bucket not found"
**Component**: 3 (Clips)  
**Symptoms**: Clip upload failures

**Solutions**:
1. Create bucket named `clips` in Supabase Storage
2. Set bucket to public access
3. Verify bucket permissions
4. Check file size limits (100MB)
5. Allowed MIME types configured

---

#### Issue: "Webhook signature verification failed"
**Component**: 4 (Premium)  
**Symptoms**: Payments not activating subscriptions

**Solutions**:
1. Check webhook secret: `echo $STRIPE_WEBHOOK_SECRET`
2. Verify Stripe CLI running
3. Check timestamp in webhook (not too old)
4. Ensure raw body passed to verify function
5. Reconfigure webhook endpoint

---

#### Issue: "Rate limit exceeded"
**All Components**  
**Symptoms**: API returns 429 Too Many Requests

**Solutions**:
1. Wait for rate limit reset
2. Check rate limit configuration
3. Review API call frequency
4. Implement exponential backoff
5. Check for infinite loops in code

---

#### Issue: "Feature gate not enforcing"
**Component**: 4 (Premium)  
**Symptoms**: Free users accessing premium features

**Solutions**:
1. Verify middleware order in routes:
   ```
   auth → checkQuota → trackUsage → handler
   ```
2. Check user tier in database
3. Verify tier_features table populated
4. Check middleware exported correctly
5. Restart backend

---

#### Issue: "Real-time updates delayed"
**Components**: 1, 2  
**Symptoms**: > 1 second delay in sync

**Solutions**:
1. Check network latency
2. Verify WebSocket connection
3. Monitor server load
4. Check Socket.IO heartbeat settings
5. Review event broadcasting logic

---

### Debug Mode

Enable debug logging:
```bash
# Backend
DEBUG=socket.io:* pnpm run dev

# Frontend
REACT_APP_DEBUG=true pnpm run dev
```

### Log Locations

- Backend: Console output, check for errors
- Frontend: Browser console (F12)
- Database: Supabase Dashboard → Logs
- Webhooks: Stripe Dashboard → Webhooks
- Storage: Supabase Dashboard → Storage

---

## Test Results Template

### Testing Session Report

**Date**: ________________  
**Tester**: ________________  
**Environment**: 
- Backend URL: ________________
- Frontend URL: ________________
- Database: ________________
- Stripe Mode: ________________

### Component 1: Multi-User Rooms

| Test Case | Status (Pass/Fail) | Notes |
|-----------|-------------------|-------|
| TC1.1: Room Creation | | |
| TC1.2: Join by Code | | |
| TC1.3: Real-time Sync | | |
| TC1.4: Host Controls | | |
| TC1.5: Capacity Limits | | |
| TC1.6: Rate Limiting | | |
| TC1.7: Message Types | | |
| TC1.8: Cleanup | | |
| TC1.9: Error Handling | | |
| TC1.10: Security | | |

**Pass Rate**: _____ / 10 (_____%)  
**Critical Failures**: ________________

---

### Component 2: Voting System

| Test Case | Status (Pass/Fail) | Notes |
|-----------|-------------------|-------|
| TC2.1: Topic Voting | | |
| TC2.2: Personality Mode | | |
| TC2.3: Audience Question | | |
| TC2.4: Quick Reaction | | |
| TC2.5: Voting Process | | |
| TC2.6: Real-time Results | | |
| TC2.7: Poll Expiration | | |
| TC2.8: Poll History | | |
| TC2.9: Rate Limiting | | |
| TC2.10: Vote Security | | |
| TC2.11: Materialized Views | | |
| TC2.12: Poll Deletion | | |

**Pass Rate**: _____ / 12 (_____%)  
**Critical Failures**: ________________

---

### Component 3: Clip Generator

| Test Case | Status (Pass/Fail) | Notes |
|-----------|-------------------|-------|
| TC3.1: Auto-Detect | | |
| TC3.2: Manual Clip | | |
| TC3.3: Processing | | |
| TC3.4: Multi-Format | | |
| TC3.5: Thumbnail | | |
| TC3.6: Social Sharing | | |
| TC3.7: Analytics | | |
| TC3.8: Sensitivity | | |
| TC3.9: Error Handling | | |
| TC3.10: Job Queue | | |
| TC3.11: Storage | | |
| TC3.12: Cleanup | | |

**Pass Rate**: _____ / 12 (_____%)  
**Critical Failures**: ________________

---

### Component 4: Premium Tier

| Test Case | Status (Pass/Fail) | Notes |
|-----------|-------------------|-------|
| TC4.1: Pricing Page | | |
| TC4.2: Checkout Flow | | |
| TC4.3: Verification | | |
| TC4.4: Dashboard | | |
| TC4.5: Feature Gates | | |
| TC4.6: Quota Enforcement | | |
| TC4.7: Quota Tracking | | |
| TC4.8: Webhooks | | |
| TC4.9: Customer Portal | | |
| TC4.10: Tier Comparison | | |
| TC4.11: Payment History | | |
| TC4.12: Cancellation | | |
| TC4.13: Error Handling | | |
| TC4.14: Security | | |

**Pass Rate**: _____ / 14 (_____%)  
**Critical Failures**: ________________

---

### Integration Tests

| Test | Status (Pass/Fail) | Notes |
|------|-------------------|-------|
| IT1: Complete User Journey | | |
| IT2: Multi-User Premium | | |
| IT3: Data Flow | | |
| IT4: Load Test | | |
| IT5: Resilience | | |

**Pass Rate**: _____ / 5 (_____%)

---

### Overall Summary

**Total Tests**: _____  
**Passed**: _____  
**Failed**: _____  
**Pass Rate**: _____%  

**Overall Status**: 
- [ ] Ready for Production
- [ ] Minor Issues - Ready with Fixes
- [ ] Major Issues - Requires Development

**Critical Issues to Fix**: ________________

**Recommendations**: ________________

**Testing Completed By**: ________________  
**Signature**: ________________  
**Date**: ________________

---

## Quick Reference

### Test Execution Commands

```bash
# Run all tests
./run_phase8_tests.sh all

# Run specific component
./run_phase8_tests.sh component1
./run_phase8_tests.sh component2
./run_phase8_tests.sh component3
./run_phase8_tests.sh component4

# Run integration tests only
./run_phase8_tests.sh integration

# Run with verbose output
./run_phase8_tests.sh all --verbose

# Generate report
./run_phase8_tests.sh all --report
```

### Success Criteria

| Component | Min Pass Rate | Critical Tests |
|-----------|---------------|----------------|
| Rooms | 100% | TC1.2, TC1.3 |
| Voting | 100% | TC2.5, TC2.6 |
| Clips | 95%+ | TC3.1, TC3.3, TC3.4 |
| Premium | 100% | TC4.2, TC4.3, TC4.5 |
| Integration | 100% | IT1, IT2 |

### Emergency Contacts

- **Backend Issues**: Check backend logs, restart services
- **Database Issues**: Supabase Dashboard → Logs
- **Payment Issues**: Stripe Dashboard → Events
- **Storage Issues**: Supabase Dashboard → Storage

---

## Conclusion

This testing suite provides comprehensive validation for all Phase 8 components. Follow the procedures sequentially, document results in the template, and address any critical failures before production deployment.

**Estimated Total Testing Time**: 3-4 hours for full manual test suite

**For questions or issues**: Refer to troubleshooting guide or component-specific documentation.

---

**Document Version**: 1.0  
**Last Updated**: October 28, 2025  
**Next Review**: After any component updates
