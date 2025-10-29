#!/usr/bin/env node

/**
 * Phase 7 Testing Suite Runner
 * Runs all automated tests for voice latency, persona consistency, and session recall
 */

import VoiceLatencyTester from './voiceLatencyTest.js';
import SessionRecallTester from './sessionRecallTest.js';
import { writeFileSync } from 'fs';
import { join } from 'path';

class Phase7TestRunner {
  constructor() {
    this.results = {
      voiceLatency: null,
      sessionRecall: null,
      overallStatus: 'PENDING',
      timestamp: new Date().toISOString(),
      testDuration: 0
    };
  }

  /**
   * Run all Phase 7 tests
   */
  async runAllTests() {
    console.log('\n╔═══════════════════════════════════════════════════════╗');
    console.log('║       BIG SNUGGLES - PHASE 7 TEST SUITE              ║');
    console.log('║       Testing & Optimization Verification            ║');
    console.log('╚═══════════════════════════════════════════════════════╝\n');

    const startTime = Date.now();

    try {
      // Test 1: Voice Latency
      console.log('🎯 TEST SUITE 1: Voice Latency Performance');
      console.log('═'.repeat(60));
      await this.runVoiceLatencyTests();
      console.log('\n');

      // Test 2: Session Recall
      console.log('🎯 TEST SUITE 2: Session Recall Accuracy');
      console.log('═'.repeat(60));
      await this.runSessionRecallTests();
      console.log('\n');

      // Calculate overall status
      this.calculateOverallStatus();

      // Calculate test duration
      this.results.testDuration = Date.now() - startTime;

      // Generate final report
      this.generateFinalReport();

      // Export results
      this.exportResults();

      return this.results;
    } catch (error) {
      console.error('❌ Test suite failed:', error);
      this.results.overallStatus = 'FAILED';
      this.results.error = error.message;
      return this.results;
    }
  }

  /**
   * Run voice latency tests
   */
  async runVoiceLatencyTests() {
    try {
      const tester = new VoiceLatencyTester({
        wsUrl: process.env.WS_URL || 'ws://localhost:8000',
        targetLatency: 1000,
        idealLatency: 800
      });

      await tester.runTestSuite();
      
      this.results.voiceLatency = {
        metrics: tester.metrics,
        results: tester.testResults,
        passed: tester.metrics.averageLatency <= tester.targetLatency,
        status: tester.metrics.averageLatency <= tester.targetLatency ? 'PASSED' : 'FAILED'
      };

      return this.results.voiceLatency;
    } catch (error) {
      console.error('Voice latency tests failed:', error);
      this.results.voiceLatency = {
        status: 'ERROR',
        error: error.message
      };
      return this.results.voiceLatency;
    }
  }

  /**
   * Run session recall tests
   */
  async runSessionRecallTests() {
    try {
      const tester = new SessionRecallTester();
      await tester.runCompleteSuite();

      const summary = tester.generateFinalReport();

      this.results.sessionRecall = {
        scenarios: tester.testResults,
        averageAccuracy: summary.averageAccuracy,
        passed: summary.averageAccuracy >= 80,
        status: summary.averageAccuracy >= 80 ? 'PASSED' : 'NEEDS_IMPROVEMENT'
      };

      return this.results.sessionRecall;
    } catch (error) {
      console.error('Session recall tests failed:', error);
      this.results.sessionRecall = {
        status: 'ERROR',
        error: error.message
      };
      return this.results.sessionRecall;
    }
  }

  /**
   * Calculate overall test status
   */
  calculateOverallStatus() {
    const voicePassed = this.results.voiceLatency?.passed || false;
    const recallPassed = this.results.sessionRecall?.passed || false;

    if (voicePassed && recallPassed) {
      this.results.overallStatus = 'ALL TESTS PASSED ✅';
    } else if (voicePassed || recallPassed) {
      this.results.overallStatus = 'PARTIAL PASS ⚠️';
    } else {
      this.results.overallStatus = 'TESTS FAILED ❌';
    }
  }

  /**
   * Generate final comprehensive report
   */
  generateFinalReport() {
    console.log('\n╔═══════════════════════════════════════════════════════╗');
    console.log('║              PHASE 7 TEST SUMMARY                     ║');
    console.log('╚═══════════════════════════════════════════════════════╝\n');

    // Voice Latency Summary
    console.log('🎤 Voice Latency Performance:');
    if (this.results.voiceLatency?.metrics) {
      const metrics = this.results.voiceLatency.metrics;
      const color = this.results.voiceLatency.passed ? '\x1b[32m' : '\x1b[31m';
      console.log(`   Status: ${color}${this.results.voiceLatency.status}\x1b[0m`);
      console.log(`   Average Latency: ${metrics.averageLatency.toFixed(2)}ms`);
      console.log(`   Target: <1000ms (Ideal: <800ms)`);
      console.log(`   Tests Run: ${metrics.totalTests}`);
      console.log(`   Pass Rate: ${((metrics.passedTests / metrics.totalTests) * 100).toFixed(1)}%`);
    } else {
      console.log(`   Status: \x1b[31mERROR\x1b[0m`);
      console.log(`   Error: ${this.results.voiceLatency?.error || 'Unknown error'}`);
    }

    console.log('');

    // Session Recall Summary
    console.log('🧠 Session Recall Accuracy:');
    if (this.results.sessionRecall?.averageAccuracy !== undefined) {
      const color = this.results.sessionRecall.passed ? '\x1b[32m' : '\x1b[33m';
      console.log(`   Status: ${color}${this.results.sessionRecall.status}\x1b[0m`);
      console.log(`   Average Accuracy: ${this.results.sessionRecall.averageAccuracy.toFixed(1)}%`);
      console.log(`   Target: ≥80%`);
      console.log(`   Scenarios Tested: ${this.results.sessionRecall.scenarios.length}`);
    } else {
      console.log(`   Status: \x1b[31mERROR\x1b[0m`);
      console.log(`   Error: ${this.results.sessionRecall?.error || 'Unknown error'}`);
    }

    console.log('');
    console.log('─'.repeat(60));
    
    // Overall Status
    const statusColor = this.results.overallStatus.includes('PASSED') ? '\x1b[32m' : 
                       this.results.overallStatus.includes('PARTIAL') ? '\x1b[33m' : '\x1b[31m';
    console.log(`\n   Overall Status: ${statusColor}${this.results.overallStatus}\x1b[0m`);
    console.log(`   Test Duration: ${(this.results.testDuration / 1000).toFixed(2)}s`);
    console.log(`   Timestamp: ${this.results.timestamp}\n`);

    console.log('═'.repeat(60));

    // Recommendations
    this.printRecommendations();
  }

  /**
   * Print recommendations based on test results
   */
  printRecommendations() {
    console.log('\n📋 Recommendations:\n');

    const recommendations = [];

    // Voice latency recommendations
    if (this.results.voiceLatency?.metrics) {
      const avgLatency = this.results.voiceLatency.metrics.averageLatency;
      
      if (avgLatency > 1000) {
        recommendations.push('❗ Voice latency exceeds target - optimize audio processing pipeline');
        recommendations.push('   • Review WebSocket configuration');
        recommendations.push('   • Reduce audio buffer size');
        recommendations.push('   • Implement connection pooling');
      } else if (avgLatency > 800) {
        recommendations.push('⚠️  Voice latency approaching target - consider optimizations');
        recommendations.push('   • Monitor network conditions');
        recommendations.push('   • Optimize audio encoding/decoding');
      } else {
        recommendations.push('✅ Voice latency performance is excellent');
      }
    }

    // Session recall recommendations
    if (this.results.sessionRecall?.averageAccuracy !== undefined) {
      const accuracy = this.results.sessionRecall.averageAccuracy;
      
      if (accuracy < 80) {
        recommendations.push('❗ Session recall needs improvement');
        recommendations.push('   • Review memory storage logic');
        recommendations.push('   • Improve context extraction algorithms');
        recommendations.push('   • Add semantic search capabilities');
      } else if (accuracy < 90) {
        recommendations.push('⚠️  Session recall is acceptable but can be improved');
        recommendations.push('   • Implement memory association tracking');
        recommendations.push('   • Enhance importance scoring');
      } else {
        recommendations.push('✅ Session recall performance is excellent');
      }
    }

    // General recommendations
    recommendations.push('\n📊 Next Steps:');
    recommendations.push('   • Review detailed test results in phase7_test_results.json');
    recommendations.push('   • Monitor production metrics after deployment');
    recommendations.push('   • Run tests regularly to track performance trends');

    recommendations.forEach(rec => console.log(rec));
    console.log('');
  }

  /**
   * Export test results to JSON
   */
  exportResults() {
    const filename = 'phase7_test_results.json';
    const filepath = join(process.cwd(), filename);

    try {
      const output = {
        ...this.results,
        metadata: {
          phase: 'Phase 7: Testing & Optimization',
          testRunner: 'Phase7TestRunner',
          environment: {
            nodeVersion: process.version,
            platform: process.platform,
            wsUrl: process.env.WS_URL || 'ws://localhost:8000'
          }
        }
      };

      writeFileSync(filepath, JSON.stringify(output, null, 2));
      console.log(`\n✅ Test results exported to: ${filename}\n`);
    } catch (error) {
      console.error('Failed to export results:', error);
    }
  }
}

// Run tests if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const runner = new Phase7TestRunner();
  
  runner.runAllTests()
    .then((results) => {
      const exitCode = results.overallStatus.includes('PASSED') ? 0 : 1;
      console.log(`\nExiting with code: ${exitCode}\n`);
      process.exit(exitCode);
    })
    .catch((error) => {
      console.error('Test runner failed:', error);
      process.exit(1);
    });
}

export default Phase7TestRunner;
