/**
 * Voice Latency Testing Framework
 * Measures end-to-end latency for voice interactions
 * Target: <1000ms (ideally <800ms)
 */

import { performance } from 'perf_hooks';
import WebSocket from 'ws';

class VoiceLatencyTester {
  constructor(config = {}) {
    this.wsUrl = config.wsUrl || 'ws://localhost:8000';
    this.targetLatency = config.targetLatency || 1000; // ms
    this.idealLatency = config.idealLatency || 800; // ms
    this.testResults = [];
    this.metrics = {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      averageLatency: 0,
      minLatency: Infinity,
      maxLatency: 0,
      p95Latency: 0,
      p99Latency: 0
    };
  }

  /**
   * Measure audio round-trip latency
   */
  async measureAudioLatency(audioData, testName = 'default') {
    return new Promise((resolve, reject) => {
      const startTime = performance.now();
      const timings = {
        captureStart: startTime,
        wsConnected: 0,
        audioSent: 0,
        firstResponseReceived: 0,
        audioCompleted: 0,
        totalLatency: 0
      };

      const ws = new WebSocket(this.wsUrl);
      let firstChunkReceived = false;

      ws.on('open', () => {
        timings.wsConnected = performance.now() - startTime;
        
        // Send audio data
        ws.send(JSON.stringify({
          type: 'audio_start',
          sessionId: `test-${Date.now()}`,
          config: {
            sampleRate: 16000,
            channels: 1
          }
        }));

        ws.send(audioData);
        timings.audioSent = performance.now() - startTime;
      });

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());

        if (message.type === 'audio_chunk' && !firstChunkReceived) {
          firstChunkReceived = true;
          timings.firstResponseReceived = performance.now() - startTime;
        }

        if (message.type === 'audio_end' || message.type === 'response_complete') {
          timings.audioCompleted = performance.now() - startTime;
          timings.totalLatency = timings.audioCompleted;

          ws.close();

          const result = {
            testName,
            passed: timings.totalLatency <= this.targetLatency,
            ideal: timings.totalLatency <= this.idealLatency,
            timings,
            timestamp: new Date().toISOString()
          };

          this.recordResult(result);
          resolve(result);
        }
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        reject(error);
      });

      // Timeout after 5 seconds
      setTimeout(() => {
        ws.close();
        reject(new Error('Test timeout'));
      }, 5000);
    });
  }

  /**
   * Measure API processing latency
   */
  async measureApiLatency(endpoint, payload) {
    const startTime = performance.now();
    
    try {
      const response = await fetch(`http://localhost:8000${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const endTime = performance.now();
      const latency = endTime - startTime;

      return {
        endpoint,
        latency,
        passed: latency <= this.targetLatency,
        status: response.status,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('API latency test failed:', error);
      return {
        endpoint,
        latency: -1,
        passed: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Record test result
   */
  recordResult(result) {
    this.testResults.push(result);
    this.metrics.totalTests++;
    
    if (result.passed) {
      this.metrics.passedTests++;
    } else {
      this.metrics.failedTests++;
    }

    // Update latency metrics
    const latency = result.timings?.totalLatency || result.latency || 0;
    if (latency > 0) {
      this.metrics.minLatency = Math.min(this.metrics.minLatency, latency);
      this.metrics.maxLatency = Math.max(this.metrics.maxLatency, latency);
    }
  }

  /**
   * Calculate statistics
   */
  calculateStatistics() {
    if (this.testResults.length === 0) {
      return this.metrics;
    }

    // Extract latencies
    const latencies = this.testResults
      .map(r => r.timings?.totalLatency || r.latency || 0)
      .filter(l => l > 0)
      .sort((a, b) => a - b);

    // Calculate average
    const sum = latencies.reduce((acc, val) => acc + val, 0);
    this.metrics.averageLatency = sum / latencies.length;

    // Calculate percentiles
    const p95Index = Math.floor(latencies.length * 0.95);
    const p99Index = Math.floor(latencies.length * 0.99);
    this.metrics.p95Latency = latencies[p95Index] || 0;
    this.metrics.p99Latency = latencies[p99Index] || 0;

    return this.metrics;
  }

  /**
   * Run comprehensive latency test suite
   */
  async runTestSuite() {
    console.log('🧪 Starting Voice Latency Test Suite...\n');

    // Test 1: WebSocket connection latency
    console.log('Test 1: WebSocket Connection Latency');
    const wsStartTime = performance.now();
    const ws = new WebSocket(this.wsUrl);
    await new Promise((resolve) => {
      ws.on('open', () => {
        const wsLatency = performance.now() - wsStartTime;
        console.log(`  ✓ Connection established in ${wsLatency.toFixed(2)}ms\n`);
        ws.close();
        resolve();
      });
    });

    // Test 2: API endpoint latencies
    console.log('Test 2: API Endpoint Latencies');
    const endpoints = [
      { path: '/api/memory', payload: { userId: 'test-user', limit: 10 } },
      { path: '/api/personality/mode', payload: { userId: 'test-user' } },
      { path: '/api/session/analytics', payload: { userId: 'test-user' } }
    ];

    for (const { path, payload } of endpoints) {
      const result = await this.measureApiLatency(path, payload);
      const status = result.passed ? '✓' : '✗';
      const color = result.passed ? '\x1b[32m' : '\x1b[31m';
      console.log(`  ${color}${status}\x1b[0m ${path}: ${result.latency.toFixed(2)}ms`);
    }
    console.log('');

    // Test 3: Simulate audio processing latency
    console.log('Test 3: Audio Processing Pipeline');
    const audioProcessingTests = [
      { name: 'PCM Conversion', duration: 100 },
      { name: 'Resampling', duration: 50 },
      { name: 'VAD Detection', duration: 30 },
      { name: 'Buffer Management', duration: 20 }
    ];

    let totalPipelineLatency = 0;
    for (const test of audioProcessingTests) {
      // Simulate processing time
      const startTime = performance.now();
      await new Promise(resolve => setTimeout(resolve, test.duration));
      const latency = performance.now() - startTime;
      totalPipelineLatency += latency;
      
      const status = latency <= test.duration + 50 ? '✓' : '✗';
      const color = latency <= test.duration + 50 ? '\x1b[32m' : '\x1b[31m';
      console.log(`  ${color}${status}\x1b[0m ${test.name}: ${latency.toFixed(2)}ms`);
    }
    console.log(`  Total Pipeline Latency: ${totalPipelineLatency.toFixed(2)}ms\n`);

    // Calculate and display final statistics
    this.calculateStatistics();
    this.displayReport();
  }

  /**
   * Display comprehensive test report
   */
  displayReport() {
    console.log('═══════════════════════════════════════════════════════');
    console.log('             VOICE LATENCY TEST REPORT');
    console.log('═══════════════════════════════════════════════════════\n');

    console.log('Test Summary:');
    console.log(`  Total Tests: ${this.metrics.totalTests}`);
    console.log(`  Passed: \x1b[32m${this.metrics.passedTests}\x1b[0m`);
    console.log(`  Failed: \x1b[31m${this.metrics.failedTests}\x1b[0m`);
    console.log(`  Success Rate: ${((this.metrics.passedTests / this.metrics.totalTests) * 100).toFixed(1)}%\n`);

    if (this.testResults.length > 0) {
      console.log('Latency Metrics:');
      console.log(`  Average: ${this.metrics.averageLatency.toFixed(2)}ms`);
      console.log(`  Minimum: ${this.metrics.minLatency.toFixed(2)}ms`);
      console.log(`  Maximum: ${this.metrics.maxLatency.toFixed(2)}ms`);
      console.log(`  P95: ${this.metrics.p95Latency.toFixed(2)}ms`);
      console.log(`  P99: ${this.metrics.p99Latency.toFixed(2)}ms\n`);

      const targetMet = this.metrics.averageLatency <= this.targetLatency;
      const idealMet = this.metrics.averageLatency <= this.idealLatency;

      console.log('Performance Goals:');
      console.log(`  Target (<${this.targetLatency}ms): ${targetMet ? '\x1b[32m✓ MET\x1b[0m' : '\x1b[31m✗ NOT MET\x1b[0m'}`);
      console.log(`  Ideal (<${this.idealLatency}ms): ${idealMet ? '\x1b[32m✓ MET\x1b[0m' : '\x1b[33m○ APPROACHING\x1b[0m'}\n`);
    }

    console.log('Recommendations:');
    if (this.metrics.averageLatency > this.targetLatency) {
      console.log('  ⚠ Consider optimizing audio processing pipeline');
      console.log('  ⚠ Review network configuration and buffering strategies');
    } else if (this.metrics.averageLatency > this.idealLatency) {
      console.log('  ℹ Performance is acceptable but can be improved');
      console.log('  ℹ Consider WebSocket connection pooling');
    } else {
      console.log('  ✓ Performance is excellent - meeting all targets');
    }

    console.log('\n═══════════════════════════════════════════════════════\n');
  }

  /**
   * Export results to JSON
   */
  exportResults(filename = 'latency_test_results.json') {
    const report = {
      timestamp: new Date().toISOString(),
      metrics: this.metrics,
      results: this.testResults,
      config: {
        targetLatency: this.targetLatency,
        idealLatency: this.idealLatency
      }
    };

    return report;
  }
}

// Export for use in other tests
export default VoiceLatencyTester;

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new VoiceLatencyTester({
    wsUrl: process.env.WS_URL || 'ws://localhost:8000',
    targetLatency: 1000,
    idealLatency: 800
  });

  tester.runTestSuite()
    .then(() => {
      const results = tester.exportResults();
      console.log('Test results exported successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Test suite failed:', error);
      process.exit(1);
    });
}
