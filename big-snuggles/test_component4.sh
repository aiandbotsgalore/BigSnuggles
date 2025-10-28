#!/bin/bash
# Component 4: Premium Tier System - Quick Test Script
# Tests subscription endpoints and feature gates

echo "========================================"
echo "Component 4: Premium Tier Testing"
echo "========================================"
echo ""

BASE_URL="http://localhost:8000"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

test_passed=0
test_failed=0

# Test 1: Get Subscription Tiers
echo -e "${YELLOW}Test 1: GET /api/subscription/tiers${NC}"
response=$(curl -s "$BASE_URL/api/subscription/tiers")
if echo "$response" | grep -q "\"tier\":\"premium\""; then
    echo -e "${GREEN}✓ PASS${NC} - Tiers endpoint working"
    test_passed=$((test_passed + 1))
else
    echo -e "${RED}✗ FAIL${NC} - Tiers endpoint failed"
    test_failed=$((test_failed + 1))
fi
echo ""

# Test 2: Check tier features
echo -e "${YELLOW}Test 2: Verify Free Tier Features${NC}"
free_tier=$(echo "$response" | jq '.tiers[] | select(.tier=="free")')
if echo "$free_tier" | grep -q "\"monthly_limit\":20"; then
    echo -e "${GREEN}✓ PASS${NC} - Free tier has correct conversation limit (20/month)"
    test_passed=$((test_passed + 1))
else
    echo -e "${RED}✗ FAIL${NC} - Free tier conversation limit incorrect"
    test_failed=$((test_failed + 1))
fi
echo ""

# Test 3: Check Premium tier pricing
echo -e "${YELLOW}Test 3: Verify Premium Tier Pricing${NC}"
premium_tier=$(echo "$response" | jq '.tiers[] | select(.tier=="premium")')
if echo "$premium_tier" | grep -q "\"price_monthly\":999"; then
    echo -e "${GREEN}✓ PASS${NC} - Premium tier priced at $9.99/month"
    test_passed=$((test_passed + 1))
else
    echo -e "${RED}✗ FAIL${NC} - Premium tier pricing incorrect"
    test_failed=$((test_failed + 1))
fi
echo ""

# Test 4: Check Pro tier features
echo -e "${YELLOW}Test 4: Verify Pro Tier Features${NC}"
pro_tier=$(echo "$response" | jq '.tiers[] | select(.tier=="pro")')
if echo "$pro_tier" | grep -q "\"custom_creation\":true"; then
    echo -e "${GREEN}✓ PASS${NC} - Pro tier allows custom personality creation"
    test_passed=$((test_passed + 1))
else
    echo -e "${RED}✗ FAIL${NC} - Pro tier features incorrect"
    test_failed=$((test_failed + 1))
fi
echo ""

# Test 5: Check trial days
echo -e "${YELLOW}Test 5: Verify Premium Trial Period${NC}"
if echo "$premium_tier" | grep -q "\"trial_days\":7"; then
    echo -e "${GREEN}✓ PASS${NC} - Premium tier has 7-day trial"
    test_passed=$((test_passed + 1))
else
    echo -e "${RED}✗ FAIL${NC} - Premium trial period incorrect"
    test_failed=$((test_failed + 1))
fi
echo ""

# Test 6: Check Stripe configuration
echo -e "${YELLOW}Test 6: Check Stripe Configuration${NC}"
if grep -q "STRIPE_SECRET_KEY=" ../backend/.env; then
    if grep -q "STRIPE_SECRET_KEY=$" ../backend/.env; then
        echo -e "${YELLOW}⚠ WARNING${NC} - STRIPE_SECRET_KEY configured but empty"
        echo "  Add your Stripe secret key to backend/.env to enable payments"
    else
        echo -e "${GREEN}✓ PASS${NC} - STRIPE_SECRET_KEY configured"
        test_passed=$((test_passed + 1))
    fi
else
    echo -e "${YELLOW}⚠ WARNING${NC} - STRIPE_SECRET_KEY not configured"
    echo "  Add STRIPE_SECRET_KEY=sk_test_... to backend/.env"
fi
echo ""

# Test 7: Frontend configuration
echo -e "${YELLOW}Test 7: Check Frontend Stripe Configuration${NC}"
if grep -q "VITE_STRIPE_PUBLISHABLE_KEY=" ../frontend/.env; then
    if grep -q "VITE_STRIPE_PUBLISHABLE_KEY=$" ../frontend/.env; then
        echo -e "${YELLOW}⚠ WARNING${NC} - VITE_STRIPE_PUBLISHABLE_KEY configured but empty"
        echo "  Add your Stripe publishable key to frontend/.env"
    else
        echo -e "${GREEN}✓ PASS${NC} - VITE_STRIPE_PUBLISHABLE_KEY configured"
        test_passed=$((test_passed + 1))
    fi
else
    echo -e "${YELLOW}⚠ WARNING${NC} - VITE_STRIPE_PUBLISHABLE_KEY not configured"
fi
echo ""

# Summary
echo "========================================"
echo "Test Summary"
echo "========================================"
echo -e "Tests Passed: ${GREEN}$test_passed${NC}"
echo -e "Tests Failed: ${RED}$test_failed${NC}"
echo ""

if [ $test_failed -eq 0 ]; then
    echo -e "${GREEN}✓ All basic tests passed!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Add Stripe API keys to environment variables"
    echo "2. Test checkout flow with Stripe test cards"
    echo "3. Configure webhook endpoint after deployment"
    echo ""
else
    echo -e "${RED}✗ Some tests failed. Please review and fix.${NC}"
    exit 1
fi
