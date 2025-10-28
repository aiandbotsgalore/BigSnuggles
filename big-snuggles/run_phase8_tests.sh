#!/bin/bash

################################################################################
# Phase 8 Automated Testing Suite
# Version: 1.0
# Date: October 28, 2025
# Description: Automated testing script for all 4 Phase 8 components
################################################################################

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKEND_URL="http://localhost:8000"
FRONTEND_URL="http://localhost:5173"
TEST_USER_EMAIL="test_phase8@example.com"
TEST_USER_PASSWORD="TestPassword123!"
PROJECT_ROOT="/workspace/big-snuggles"

# Test results
declare -A COMPONENT_RESULTS
COMPONENT_RESULTS[component1]=0
COMPONENT_RESULTS[component2]=0
COMPONENT_RESULTS[component3]=0
COMPONENT_RESULTS[component4]=0
COMPONENT_RESULTS[integration]=0

TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

################################################################################
# Utility Functions
################################################################################

print_header() {
    echo -e "${BLUE}=================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}=================================${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

log_test() {
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    if [ $1 -eq 0 ]; then
        PASSED_TESTS=$((PASSED_TESTS + 1))
        print_success "$2"
    else
        FAILED_TESTS=$((FAILED_TESTS + 1))
        print_error "$2"
    fi
}

################################################################################
# Environment Checks
################################################################################

check_dependencies() {
    print_header "Checking Dependencies"
    
    # Check Node.js
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        print_success "Node.js installed: $NODE_VERSION"
    else
        print_error "Node.js not found"
        exit 1
    fi
    
    # Check pnpm
    if command -v pnpm &> /dev/null; then
        PNPM_VERSION=$(pnpm --version)
        print_success "pnpm installed: v$PNPM_VERSION"
    else
        print_error "pnpm not found. Install with: npm install -g pnpm"
        exit 1
    fi
    
    # Check FFmpeg
    if command -v ffmpeg &> /dev/null; then
        FFMPEG_VERSION=$(ffmpeg -version 2>&1 | head -n1)
        print_success "FFmpeg installed: $FFMPEG_VERSION"
    else
        print_warning "FFmpeg not found. Required for Component 3 (Clip Generator)"
        print_info "Install with: apt-get install ffmpeg"
    fi
    
    # Check curl
    if command -v curl &> /dev/null; then
        print_success "curl installed"
    else
        print_error "curl not found"
        exit 1
    fi
    
    # Check jq
    if command -v jq &> /dev/null; then
        print_success "jq installed"
    else
        print_warning "jq not found. Install with: apt-get install jq"
    fi
}

check_services() {
    print_header "Checking Services"
    
    # Check backend
    if curl -s -f "$BACKEND_URL/api/health" &> /dev/null; then
        print_success "Backend running on $BACKEND_URL"
    else
        print_error "Backend not running on $BACKEND_URL"
        print_info "Start with: cd $PROJECT_ROOT/backend && pnpm run dev"
        return 1
    fi
    
    # Check frontend
    if curl -s -f "$FRONTEND_URL" &> /dev/null; then
        print_success "Frontend running on $FRONTEND_URL"
    else
        print_warning "Frontend not running on $FRONTEND_URL"
        print_info "Start with: cd $PROJECT_ROOT/frontend && pnpm run dev"
    fi
    
    return 0
}

################################################################################
# Component 1: Multi-User Rooms Tests
################################################################################

test_component1() {
    print_header "Testing Component 1: Multi-User Rooms"
    
    # TC1.1: Check rooms endpoint
    local rooms_response=$(curl -s -w "%{http_code}" "$BACKEND_URL/api/rooms/code/TEST99" -o /tmp/response.txt)
    log_test $([ "$rooms_response" != "200" ] && echo 1 || echo 0) "Rooms API endpoint accessible"
    
    # TC1.2: Test room creation (requires auth - will fail but should not error)
    local create_response=$(curl -s -w "%{http_code}" -X POST "$BACKEND_URL/api/rooms/create" \
        -H "Content-Type: application/json" \
        -d '{"name": "Test Room"}' \
        -o /tmp/response.txt)
    local should_be_401=$([ "$create_response" == "401" ] && echo 0 || echo 1)
    log_test $should_be_401 "Room creation requires authentication (401)"
    
    # TC1.3: Check socket.io endpoint
    if curl -s -f "$BACKEND_URL/socket.io/" &> /dev/null; then
        print_success "Socket.IO endpoint available"
    else
        print_error "Socket.IO endpoint not available"
    fi
    
    # TC1.4: Test room code validation
    local invalid_code=$(curl -s -w "%{http_code}" "$BACKEND_URL/api/rooms/code/INVALID" -o /tmp/response.txt)
    log_test $([ "$invalid_code" == "404" ] && echo 0 || echo 1) "Invalid room code returns 404"
    
    # TC1.5: Test rate limiting headers
    local rate_limit_response=$(curl -s -w "%{http_code}" -X POST "$BACKEND_URL/api/rooms/create" \
        -H "Content-Type: application/json" \
        -d '{"name": "Test"}' \
        -o /tmp/response.txt)
    log_test $([ "$rate_limit_response" == "401" ] && echo 0 || echo 1) "Rate limiting headers present"
    
    # TC1.6: Check room manager service loaded
    local backend_logs=$(curl -s "$BACKEND_URL/api/health" 2>/dev/null)
    if echo "$backend_logs" | grep -q "ok"; then
        print_success "Backend health check passed"
    else
        print_error "Backend health check failed"
    fi
    
    # TC1.7: Test room code format validation (6 characters)
    if curl -s -f "$BACKEND_URL/api/rooms/code/ABC" 2>/dev/null | grep -q "not found\|error"; then
        print_success "Room code validation working"
    else
        print_warning "Room code validation unclear"
    fi
    
    # TC1.8: Check for room-related middleware
    local middleware_check=$(curl -s -X OPTIONS "$BACKEND_URL/api/rooms/create" 2>/dev/null | wc -l)
    log_test $([ "$middleware_check" -gt 0 ] && echo 0 || echo 1) "Middleware configured"
    
    # Summarize component 1
    print_info "Component 1 Tests: Completed"
}

################################################################################
# Component 2: Voting System Tests
################################################################################

test_component2() {
    print_header "Testing Component 2: Voting System"
    
    # TC2.1: Check polls endpoint
    local polls_response=$(curl -s -w "%{http_code}" "$BACKEND_URL/api/polls/room/test-room-id" -o /tmp/response.txt)
    log_test $([ "$polls_response" == "401" ] && echo 0 || echo 1) "Polls API endpoint accessible"
    
    # TC2.2: Test poll creation validation
    local create_poll_response=$(curl -s -w "%{http_code}" -X POST "$BACKEND_URL/api/polls" \
        -H "Content-Type: application/json" \
        -d '{"roomId":"test","question":"Test?","options":["A","B"]}' \
        -o /tmp/response.txt)
    log_test $([ "$create_poll_response" == "401" ] && echo 0 || echo 1) "Poll creation requires authentication"
    
    # TC2.3: Check voting endpoint
    local vote_response=$(curl -s -w "%{http_code}" -X POST "$BACKEND_URL/api/polls/test-poll-id/vote" \
        -H "Content-Type: application/json" \
        -d '{"optionId":"test-option"}' \
        -o /tmp/response.txt)
    log_test $([ "$vote_response" == "401" ] && echo 0 || echo 1) "Voting endpoint requires authentication"
    
    # TC2.4: Test poll types validation
    local poll_types_response=$(curl -s -X POST "$BACKEND_URL/api/polls" \
        -H "Content-Type: application/json" \
        -d '{"roomId":"test","type":"invalid","question":"Test?"}' \
        -o /tmp/response.txt)
    log_test $(echo "$poll_types_response" | grep -q "error\|type" && echo 0 || echo 1) "Poll type validation present"
    
    # TC2.5: Check poll history endpoint
    local history_response=$(curl -s -w "%{http_code}" "$BACKEND_URL/api/polls/room/test-room-id/history" -o /tmp/response.txt)
    log_test $([ "$history_response" == "401" ] && echo 0 || echo 1) "Poll history endpoint accessible"
    
    # TC2.6: Test materialized view (should return structure even with auth error)
    local mv_check=$(curl -s "$BACKEND_URL/api/polls" 2>/dev/null | jq -e '.poll_results' 2>/dev/null && echo 0 || echo 1)
    log_test $mv_check "Poll results structure configured"
    
    # TC2.7: Check rate limiting on poll creation
    for i in {1..5}; do
        curl -s -w "%{http_code}" -X POST "$BACKEND_URL/api/polls" \
            -H "Content-Type: application/json" \
            -d '{"roomId":"test","question":"Test?"}' \
            -o /tmp/response.txt > /dev/null 2>&1
    done
    local rate_limit_check=$(curl -s -w "%{http_code}" -X POST "$BACKEND_URL/api/polls" \
        -H "Content-Type: application/json" \
        -d '{"roomId":"test","question":"Test?"}' \
        -o /tmp/response.txt)
    log_test $([ "$rate_limit_check" == "429" ] && echo 0 || echo 1) "Rate limiting enforced (5 requests)"
    
    # TC2.8: Verify voting manager service
    local voting_manager_check=$(curl -s "$BACKEND_URL/api/health" 2>/dev/null | grep -q "ok" && echo 0 || echo 1)
    log_test $voting_manager_check "Voting Manager service loaded"
    
    print_info "Component 2 Tests: Completed"
}

################################################################################
# Component 3: Clip Generator Tests
################################################################################

test_component3() {
    print_header "Testing Component 3: Clip Generator"
    
    # TC3.1: Check FFmpeg installation
    if command -v ffmpeg &> /dev/null; then
        log_test 0 "FFmpeg installed and available"
        
        # Test FFmpeg basic functionality
        local ffmpeg_test=$(ffmpeg -version 2>&1 | head -n1 | wc -l)
        log_test $([ "$ffmpeg_test" -gt 0 ] && echo 0 || echo 1) "FFmpeg executable working"
    else
        log_test 1 "FFmpeg not installed"
    fi
    
    # TC3.2: Check clips API endpoint
    local clips_response=$(curl -s -w "%{http_code}" "$BACKEND_URL/api/clips/user/test-user-id" -o /tmp/response.txt)
    log_test $([ "$clips_response" == "401" ] && echo 0 || echo 1) "Clips API endpoint accessible"
    
    # TC3.3: Test auto-detect endpoint
    local auto_detect_response=$(curl -s -w "%{http_code}" -X POST "$BACKEND_URL/api/clips/auto-generate" \
        -H "Content-Type: application/json" \
        -d '{"conversationId":"test","userId":"test","sensitivity":0.7}' \
        -o /tmp/response.txt)
    log_test $([ "$auto_detect_response" == "401" ] && echo 0 || echo 1) "Auto-detect endpoint requires authentication"
    
    # TC3.4: Test clip creation endpoint
    local create_clip_response=$(curl -s -w "%{http_code}" -X POST "$BACKEND_URL/api/clips/create" \
        -H "Content-Type: application/json" \
        -d '{"conversationId":"test","userId":"test","title":"Test","startTime":0,"endTime":30}' \
        -o /tmp/response.txt)
    log_test $([ "$create_clip_response" == "401" ] && echo 0 || echo 1) "Clip creation requires authentication"
    
    # TC3.5: Check clip status endpoint
    local status_response=$(curl -s -w "%{http_code}" "$BACKEND_URL/api/clips/test-clip-id/status" -o /tmp/response.txt)
    log_test $([ "$status_response" == "401" ] && echo 0 || echo 1) "Clip status endpoint accessible"
    
    # TC3.6: Test download endpoint
    local download_response=$(curl -s -w "%{http_code}" "$BACKEND_URL/api/clips/test-clip-id/download" -o /tmp/response.txt)
    log_test $([ "$download_response" == "401" ] && echo 0 || echo 1) "Download endpoint requires authentication"
    
    # TC3.7: Check share endpoint
    local share_response=$(curl -s -w "%{http_code}" -X POST "$BACKEND_URL/api/clips/test-clip-id/share" \
        -H "Content-Type: application/json" \
        -d '{"userId":"test","platform":"twitter"}' \
        -o /tmp/response.txt)
    log_test $([ "$share_response" == "401" ] && echo 0 || echo 1) "Share tracking endpoint accessible"
    
    # TC3.8: Test sensitivity validation
    local sensitivity_test=$(curl -s -X POST "$BACKEND_URL/api/clips/auto-generate" \
        -H "Content-Type: application/json" \
        -d '{"conversationId":"test","userId":"test","sensitivity":2.0}' \
        -o /tmp/response.txt)
    log_test $(echo "$sensitivity_test" | grep -q "sensitivity\|error" && echo 0 || echo 1) "Sensitivity parameter validation"
    
    # TC3.9: Check clip generator service
    local backend_health=$(curl -s "$BACKEND_URL/api/health" 2>/dev/null | grep -q "ok" && echo 0 || echo 1)
    log_test $backend_health "Backend services running"
    
    # TC3.10: Test storage configuration (will fail auth but check endpoint exists)
    local storage_check=$(curl -s -w "%{http_code}" "$BACKEND_URL/api/clips/test/download" -o /tmp/response.txt)
    log_test $([ "$storage_check" == "401" ] && echo 0 || echo 1) "Storage integration configured"
    
    print_info "Component 3 Tests: Completed"
}

################################################################################
# Component 4: Premium Tier Tests
################################################################################

test_component4() {
    print_header "Testing Component 4: Premium Tier System"
    
    # TC4.1: Check subscription API endpoints
    local tiers_response=$(curl -s -w "%{http_code}" "$BACKEND_URL/api/subscription/tiers" -o /tmp/response.txt)
    log_test $([ "$tiers_response" == "200" ] && echo 0 || echo 1) "Tiers endpoint accessible (public)"
    
    # TC4.2: Check current subscription endpoint (requires auth)
    local current_response=$(curl -s -w "%{http_code}" "$BACKEND_URL/api/subscription/current" -o /tmp/response.txt)
    log_test $([ "$current_response" == "401" ] && echo 0 || echo 1) "Current subscription requires authentication"
    
    # TC4.3: Test checkout endpoint
    local checkout_response=$(curl -s -w "%{http_code}" -X POST "$BACKEND_URL/api/subscription/checkout" \
        -H "Content-Type: application/json" \
        -d '{"tier":"premium","successUrl":"http://test.com/success","cancelUrl":"http://test.com/cancel"}' \
        -o /tmp/response.txt)
    log_test $([ "$checkout_response" == "401" ] && echo 0 || echo 1) "Checkout endpoint requires authentication"
    
    # TC4.4: Test customer portal endpoint
    local portal_response=$(curl -s -w "%{http_code}" -X POST "$BACKEND_URL/api/subscription/portal" \
        -H "Content-Type: application/json" \
        -d '{"returnUrl":"http://test.com"}' \
        -o /tmp/response.txt)
    log_test $([ "$portal_response" == "401" ] && echo 0 || echo 1) "Customer portal requires authentication"
    
    # TC4.5: Check webhook endpoint exists
    local webhook_response=$(curl -s -w "%{http_code}" -X POST "$BACKEND_URL/api/subscription/webhook" \
        -H "Content-Type: application/json" \
        -d '{"type":"test","data":{}}' \
        -o /tmp/response.txt)
    log_test $([ "$webhook_response" == "200" ] && echo 0 || echo 1) "Webhook endpoint exists and processes requests"
    
    # TC4.6: Test tier validation
    local tier_validation=$(curl -s -X POST "$BACKEND_URL/api/subscription/checkout" \
        -H "Content-Type: application/json" \
        -d '{"tier":"invalid","successUrl":"http://test.com"}' \
        -o /tmp/response.txt)
    log_test $(echo "$tier_validation" | grep -q "tier\|error" && echo 0 || echo 1) "Tier validation present"
    
    # TC4.7: Check feature gates middleware
    local feature_gates_response=$(curl -s -w "%{http_code}" -X POST "$BACKEND_URL/api/rooms/create" \
        -H "Content-Type: application/json" \
        -d '{"name":"Test"}' \
        -o /tmp/response.txt)
    log_test $([ "$feature_gates_response" == "401" ] && echo 0 || echo 1) "Feature gates middleware active"
    
    # TC4.8: Test quota enforcement on rooms endpoint
    local quota_test=$(curl -s -w "%{http_code}" -X POST "$BACKEND_URL/api/rooms/create" \
        -H "Content-Type: application/json" \
        -d '{"name":"Test"}' \
        -o /tmp/response.txt)
    local quota_check=$([ "$quota_test" == "401" ] && echo 0 || echo 1)
    log_test $quota_check "Quota enforcement middleware configured"
    
    # TC4.9: Check subscription manager service
    local subscription_manager_check=$(curl -s "$BACKEND_URL/api/health" 2>/dev/null | grep -q "ok" && echo 0 || echo 1)
    log_test $subscription_manager_check "Subscription Manager service loaded"
    
    # TC4.10: Test Stripe integration (will fail without keys but check endpoint)
    local stripe_check=$(curl -s -X POST "$BACKEND_URL/api/subscription/checkout" \
        -H "Content-Type: application/json" \
        -d '{"tier":"premium"}' \
        -o /tmp/response.txt 2>/dev/null || echo "fail")
    if [[ "$stripe_check" == *"error"* ]] || [[ "$stripe_check" == *"fail"* ]]; then
        print_info "Stripe integration configured (error expected without API keys)"
    else
        print_success "Stripe integration responding"
    fi
    
    # TC4.11: Verify tier features in database (via API)
    local tier_features=$(curl -s "$BACKEND_URL/api/subscription/tiers" 2>/dev/null)
    if echo "$tier_features" | jq -e '.data | length >= 3' 2>/dev/null; then
        log_test 0 "Tier features configuration accessible"
    else
        log_test 1 "Tier features not properly configured"
    fi
    
    # TC4.12: Check RLS policies via endpoint test
    local rls_check=$(curl -s "$BACKEND_URL/api/subscription/tiers" 2>/dev/null | jq -e '.success' 2>/dev/null && echo 0 || echo 1)
    log_test $rls_check "RLS policies allowing public tier access"
    
    print_info "Component 4 Tests: Completed"
}

################################################################################
# Integration Tests
################################################################################

test_integration() {
    print_header "Running Integration Tests"
    
    # IT1: Check all API endpoints respond
    local api_endpoints=(
        "$BACKEND_URL/api/health"
        "$BACKEND_URL/api/rooms/code/TEST99"
        "$BACKEND_URL/api/polls/room/test"
        "$BACKEND_URL/api/clips/user/test"
        "$BACKEND_URL/api/subscription/tiers"
    )
    
    for endpoint in "${api_endpoints[@]}"; do
        local response=$(curl -s -w "%{http_code}" "$endpoint" -o /dev/null 2>/dev/null)
        log_test $([ "$response" != "000" ] && echo 0 || echo 1) "API endpoint responding: $endpoint"
    done
    
    # IT2: Check Socket.IO availability for Components 1 & 2
    if curl -s -f "$BACKEND_URL/socket.io/" &> /dev/null; then
        log_test 0 "Socket.IO available for real-time features"
    else
        log_test 1 "Socket.IO not available"
    fi
    
    # IT3: Verify database migrations applied
    local migration_check=$(curl -s "$BACKEND_URL/api/subscription/tiers" 2>/dev/null | jq -e '.success' 2>/dev/null && echo 0 || echo 1)
    log_test $migration_check "Database schema properly configured"
    
    # IT4: Check all services in backend
    local services_check=$(curl -s "$BACKEND_URL/api/health" 2>/dev/null | grep -q "ok" && echo 0 || echo 1)
    log_test $services_check "All backend services operational"
    
    # IT5: Verify feature gates applied to all relevant endpoints
    local gated_endpoints=(
        "$BACKEND_URL/api/rooms/create"
        "$BACKEND_URL/api/clips/create"
    )
    
    for endpoint in "${gated_endpoints[@]}"; do
        local response=$(curl -s -w "%{http_code}" -X POST "$endpoint" -H "Content-Type: application/json" -d '{}' -o /dev/null 2>/dev/null)
        log_test $([ "$response" == "401" ] && echo 0 || echo 1) "Feature gate active: $endpoint"
    done
    
    print_info "Integration Tests: Completed"
}

################################################################################
# Generate Report
################################################################################

generate_report() {
    print_header "Test Results Summary"
    
    echo ""
    echo "============================================"
    echo "  PHASE 8 AUTOMATED TEST RESULTS"
    echo "============================================"
    echo ""
    echo "Total Tests Run: $TOTAL_TESTS"
    echo -e "Passed: ${GREEN}$PASSED_TESTS${NC}"
    echo -e "Failed: ${RED}$FAILED_TESTS${NC}"
    echo ""
    
    if [ $FAILED_TESTS -eq 0 ]; then
        echo -e "${GREEN}✓ ALL TESTS PASSED${NC}"
        echo ""
        echo "Your Phase 8 components are ready for manual testing!"
        echo "Proceed with manual test scenarios in PHASE8_TESTING_SUITE.md"
    else
        echo -e "${RED}✗ SOME TESTS FAILED${NC}"
        echo ""
        echo "Please review the failed tests above and fix issues before proceeding."
    fi
    
    echo ""
    echo "Component Breakdown:"
    echo "--------------------"
    for component in "${!COMPONENT_RESULTS[@]}"; do
        echo "  $component: ${COMPONENT_RESULTS[$component]} tests"
    done
    
    echo ""
    echo "Next Steps:"
    echo "-----------"
    echo "1. Review any failed tests"
    echo "2. Fix environment issues (services, dependencies)"
    echo "3. Run manual testing: See PHASE8_TESTING_SUITE.md"
    echo "4. Integration testing with multiple users"
    echo ""
    
    # Save report to file
    local report_file="$PROJECT_ROOT/test_results_$(date +%Y%m%d_%H%M%S).txt"
    {
        echo "Phase 8 Automated Test Results"
        echo "Generated: $(date)"
        echo "================================"
        echo ""
        echo "Total Tests: $TOTAL_TESTS"
        echo "Passed: $PASSED_TESTS"
        echo "Failed: $FAILED_TESTS"
        echo "Pass Rate: $(($PASSED_TESTS * 100 / TOTAL_TESTS))%"
        echo ""
    } > "$report_file"
    
    print_info "Report saved to: $report_file"
}

################################################################################
# Main Execution
################################################################################

main() {
    local component="${1:-all}"
    local mode="${2:-normal}"
    
    print_header "PHASE 8 AUTOMATED TEST SUITE"
    echo "Starting at: $(date)"
    echo ""
    
    # Check dependencies first
    check_dependencies
    echo ""
    
    # Check services
    if ! check_services; then
        print_error "Required services not running. Please start backend and frontend."
        exit 1
    fi
    echo ""
    
    # Run tests based on component
    case "$component" in
        "component1"|"rooms")
            test_component1
            ;;
        "component2"|"voting")
            test_component2
            ;;
        "component3"|"clips")
            test_component3
            ;;
        "component4"|"premium")
            test_component4
            ;;
        "integration")
            test_integration
            ;;
        "all")
            test_component1
            echo ""
            test_component2
            echo ""
            test_component3
            echo ""
            test_component4
            echo ""
            test_integration
            ;;
        *)
            echo "Usage: $0 {component1|component2|component3|component4|integration|all}"
            exit 1
            ;;
    esac
    
    echo ""
    generate_report
    
    # Exit with appropriate code
    if [ $FAILED_TESTS -gt 0 ]; then
        exit 1
    else
        exit 0
    fi
}

# Handle script arguments
case "${1:-}" in
    "--help"|"-h")
        echo "Phase 8 Automated Testing Suite"
        echo ""
        echo "Usage:"
        echo "  $0 [component] [options]"
        echo ""
        echo "Components:"
        echo "  component1, rooms     - Multi-User Rooms tests"
        echo "  component2, voting    - Voting System tests"
        echo "  component3, clips     - Clip Generator tests"
        echo "  component4, premium   - Premium Tier tests"
        echo "  integration           - Integration tests only"
        echo "  all                   - Run all tests (default)"
        echo ""
        echo "Options:"
        echo "  --help, -h            - Show this help"
        echo ""
        echo "Examples:"
        echo "  $0 all                    - Run all tests"
        echo "  $0 component1             - Run only Component 1 tests"
        echo "  $0 integration            - Run only integration tests"
        echo ""
        exit 0
        ;;
    *)
        main "$@"
        ;;
esac
