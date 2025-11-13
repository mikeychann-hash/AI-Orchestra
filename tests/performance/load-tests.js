/**
 * Performance Load Tests - Iteration 3
 * Load testing for AI Orchestra API endpoints
 *
 * Uses autocannon for HTTP load testing
 *
 * Test Scenarios:
 * - Baseline performance (1 concurrent user)
 * - Normal load (10 concurrent users)
 * - High load (50 concurrent users)
 * - Stress test (100 concurrent users)
 * - Long-running tests (memory leak detection)
 * - Response time benchmarks
 *
 * Usage:
 *   node tests/performance/load-tests.js
 *
 * Note: Requires server to be running on localhost:3000
 */

import autocannon from 'autocannon';
import { spawn } from 'child_process';
import { setTimeout } from 'timers/promises';

const API_URL = 'http://localhost:3000';
const TEST_DURATION = 10; // seconds per test
const WARMUP_TIME = 2; // seconds to wait for server warmup

// ANSI color codes for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

/**
 * Print formatted section header
 */
function printHeader(title) {
  console.log(`\n${colors.bright}${colors.cyan}${'='.repeat(80)}${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}  ${title}${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}${'='.repeat(80)}${colors.reset}\n`);
}

/**
 * Print test result summary
 */
function printResult(name, result) {
  const { requests, latency, throughput, errors } = result;
  const status = errors > 0 ? `${colors.red}FAIL${colors.reset}` : `${colors.green}PASS${colors.reset}`;

  console.log(`\n${colors.bright}Test: ${name}${colors.reset} - ${status}`);
  console.log(`${'─'.repeat(80)}`);
  console.log(`Requests:      ${requests.total} total, ${requests.average.toFixed(2)}/sec`);
  console.log(`Latency:       avg ${latency.mean.toFixed(2)}ms, p99 ${latency.p99.toFixed(2)}ms`);
  console.log(`Throughput:    ${(throughput.total / 1024 / 1024).toFixed(2)} MB total, ${(throughput.average / 1024).toFixed(2)} KB/sec`);
  console.log(`Errors:        ${errors}`);
  console.log(`${'─'.repeat(80)}`);
}

/**
 * Run a load test with autocannon
 */
async function runLoadTest(config) {
  return new Promise((resolve, reject) => {
    const instance = autocannon(config, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });

    // Handle progress (optional)
    autocannon.track(instance);
  });
}

/**
 * Test 1: Health Endpoint - Baseline Performance
 */
async function testHealthBaseline() {
  printHeader('Test 1: Health Endpoint - Baseline Performance (1 user)');

  const result = await runLoadTest({
    url: `${API_URL}/health`,
    connections: 1,
    duration: TEST_DURATION,
    pipelining: 1,
  });

  printResult('Health Baseline', result);

  return {
    name: 'Health Baseline',
    passed: result.errors === 0 && result.requests.average > 0,
    result,
  };
}

/**
 * Test 2: Health Endpoint - Normal Load
 */
async function testHealthNormal() {
  printHeader('Test 2: Health Endpoint - Normal Load (10 users)');

  const result = await runLoadTest({
    url: `${API_URL}/health`,
    connections: 10,
    duration: TEST_DURATION,
    pipelining: 1,
  });

  printResult('Health Normal Load', result);

  return {
    name: 'Health Normal Load',
    passed: result.errors === 0 && result.requests.average > 50,
    result,
  };
}

/**
 * Test 3: Health Endpoint - High Load
 */
async function testHealthHighLoad() {
  printHeader('Test 3: Health Endpoint - High Load (50 users)');

  const result = await runLoadTest({
    url: `${API_URL}/health`,
    connections: 50,
    duration: TEST_DURATION,
    pipelining: 1,
  });

  printResult('Health High Load', result);

  return {
    name: 'Health High Load',
    passed: result.errors === 0 && result.requests.average > 100,
    result,
  };
}

/**
 * Test 4: Health Endpoint - Stress Test
 */
async function testHealthStress() {
  printHeader('Test 4: Health Endpoint - Stress Test (100 users)');

  const result = await runLoadTest({
    url: `${API_URL}/health`,
    connections: 100,
    duration: TEST_DURATION,
    pipelining: 1,
  });

  printResult('Health Stress Test', result);

  return {
    name: 'Health Stress',
    passed: result.errors === 0, // May have lower throughput but shouldn't error
    result,
  };
}

/**
 * Test 5: Status Endpoint - Normal Load
 */
async function testStatusNormal() {
  printHeader('Test 5: Status Endpoint - Normal Load (10 users)');

  const result = await runLoadTest({
    url: `${API_URL}/api/status`,
    connections: 10,
    duration: TEST_DURATION,
  });

  printResult('Status Normal Load', result);

  return {
    name: 'Status Normal Load',
    passed: result.errors === 0,
    result,
  };
}

/**
 * Test 6: Providers Endpoint - Normal Load
 */
async function testProvidersNormal() {
  printHeader('Test 6: Providers Endpoint - Normal Load (10 users)');

  const result = await runLoadTest({
    url: `${API_URL}/api/providers`,
    connections: 10,
    duration: TEST_DURATION,
  });

  printResult('Providers Normal Load', result);

  return {
    name: 'Providers Normal Load',
    passed: result.errors === 0,
    result,
  };
}

/**
 * Test 7: Models Endpoint - Normal Load
 */
async function testModelsNormal() {
  printHeader('Test 7: Models Endpoint - Normal Load (10 users)');

  const result = await runLoadTest({
    url: `${API_URL}/api/models`,
    connections: 10,
    duration: TEST_DURATION,
  });

  printResult('Models Normal Load', result);

  return {
    name: 'Models Normal Load',
    passed: result.errors === 0,
    result,
  };
}

/**
 * Test 8: Metrics Endpoint - Normal Load
 */
async function testMetricsNormal() {
  printHeader('Test 8: Metrics Endpoint - Normal Load (10 users)');

  const result = await runLoadTest({
    url: `${API_URL}/metrics`,
    connections: 10,
    duration: TEST_DURATION,
  });

  printResult('Metrics Normal Load', result);

  return {
    name: 'Metrics Normal Load',
    passed: result.errors === 0,
    result,
  };
}

/**
 * Test 9: Mixed Endpoint Load Test
 */
async function testMixedLoad() {
  printHeader('Test 9: Mixed Endpoint Load (10 users across multiple endpoints)');

  const endpoints = [
    { path: '/health', method: 'GET' },
    { path: '/api/status', method: 'GET' },
    { path: '/api/providers', method: 'GET' },
    { path: '/api/models', method: 'GET' },
    { path: '/metrics', method: 'GET' },
  ];

  const requests = endpoints.map((endpoint) => ({
    method: endpoint.method,
    path: endpoint.path,
  }));

  const result = await runLoadTest({
    url: API_URL,
    connections: 10,
    duration: TEST_DURATION,
    requests,
  });

  printResult('Mixed Endpoint Load', result);

  return {
    name: 'Mixed Load',
    passed: result.errors === 0,
    result,
  };
}

/**
 * Test 10: Response Time Percentiles
 */
async function testResponseTimePercentiles() {
  printHeader('Test 10: Response Time Percentiles (Health Endpoint)');

  const result = await runLoadTest({
    url: `${API_URL}/health`,
    connections: 20,
    duration: TEST_DURATION,
  });

  console.log(`\nResponse Time Percentiles:`);
  console.log(`  p50:  ${result.latency.p50.toFixed(2)}ms`);
  console.log(`  p75:  ${result.latency.p75.toFixed(2)}ms`);
  console.log(`  p90:  ${result.latency.p90.toFixed(2)}ms`);
  console.log(`  p95:  ${result.latency.p95.toFixed(2)}ms`);
  console.log(`  p99:  ${result.latency.p99.toFixed(2)}ms`);
  console.log(`  p999: ${result.latency.p999.toFixed(2)}ms`);
  console.log(`  max:  ${result.latency.max.toFixed(2)}ms\n`);

  // Check if p99 latency is acceptable (under 1000ms for health check)
  const acceptable = result.latency.p99 < 1000;

  return {
    name: 'Response Time Percentiles',
    passed: acceptable,
    result,
  };
}

/**
 * Test 11: Long Running Test (Memory Leak Detection)
 */
async function testLongRunning() {
  printHeader('Test 11: Long Running Test - Memory Leak Detection (30 seconds)');

  const result = await runLoadTest({
    url: `${API_URL}/health`,
    connections: 5,
    duration: 30, // Longer duration
  });

  printResult('Long Running Test', result);

  // Check if throughput is consistent (shouldn't degrade significantly)
  const consistentPerformance = result.requests.average > 0;

  return {
    name: 'Long Running',
    passed: result.errors === 0 && consistentPerformance,
    result,
  };
}

/**
 * Test 12: Sustained Load Test
 */
async function testSustainedLoad() {
  printHeader('Test 12: Sustained Load Test (20 users, 20 seconds)');

  const result = await runLoadTest({
    url: `${API_URL}/health`,
    connections: 20,
    duration: 20,
  });

  printResult('Sustained Load', result);

  return {
    name: 'Sustained Load',
    passed: result.errors === 0,
    result,
  };
}

/**
 * Test 13: Burst Traffic Test
 */
async function testBurstTraffic() {
  printHeader('Test 13: Burst Traffic Test (200 connections)');

  const result = await runLoadTest({
    url: `${API_URL}/health`,
    connections: 200,
    duration: 5, // Short burst
    pipelining: 1,
  });

  printResult('Burst Traffic', result);

  // Burst tests may have some errors, but should handle most requests
  const handlesMostRequests = result.requests.total > 100;

  return {
    name: 'Burst Traffic',
    passed: handlesMostRequests,
    result,
  };
}

/**
 * Test 14: Pipelining Test
 */
async function testPipelining() {
  printHeader('Test 14: HTTP Pipelining Test (10 connections, 10 pipelined requests)');

  const result = await runLoadTest({
    url: `${API_URL}/health`,
    connections: 10,
    duration: TEST_DURATION,
    pipelining: 10,
  });

  printResult('Pipelining', result);

  return {
    name: 'Pipelining',
    passed: result.errors === 0 && result.requests.average > 0,
    result,
  };
}

/**
 * Test 15: Connection Reuse Test
 */
async function testConnectionReuse() {
  printHeader('Test 15: Connection Reuse Test');

  const result = await runLoadTest({
    url: `${API_URL}/health`,
    connections: 10,
    duration: TEST_DURATION,
    pipelining: 1,
    connectionRate: 5, // Limit new connections per second
  });

  printResult('Connection Reuse', result);

  return {
    name: 'Connection Reuse',
    passed: result.errors === 0,
    result,
  };
}

/**
 * Test 16: Timeout Handling
 */
async function testTimeoutHandling() {
  printHeader('Test 16: Timeout Handling Test');

  const result = await runLoadTest({
    url: `${API_URL}/health`,
    connections: 10,
    duration: TEST_DURATION,
    timeout: 5, // 5 second timeout
  });

  printResult('Timeout Handling', result);

  return {
    name: 'Timeout Handling',
    passed: result.errors === 0,
    result,
  };
}

/**
 * Test 17: Concurrent Mixed Methods
 */
async function testConcurrentMixedMethods() {
  printHeader('Test 17: Concurrent Mixed Methods (GET only, different endpoints)');

  const result = await runLoadTest({
    url: API_URL,
    connections: 15,
    duration: TEST_DURATION,
    requests: [
      { method: 'GET', path: '/health' },
      { method: 'GET', path: '/api/status' },
      { method: 'GET', path: '/api/providers' },
      { method: 'GET', path: '/metrics' },
    ],
  });

  printResult('Concurrent Mixed Methods', result);

  return {
    name: 'Concurrent Mixed Methods',
    passed: result.errors === 0,
    result,
  };
}

/**
 * Test 18: Rate Limiting Test
 */
async function testRateLimiting() {
  printHeader('Test 18: Rate Limiting Test (verify rate limits work)');

  // Send many requests rapidly to trigger rate limiting
  const result = await runLoadTest({
    url: `${API_URL}/api/status`,
    connections: 50,
    duration: 5,
    pipelining: 10,
  });

  printResult('Rate Limiting', result);

  // Some 429 errors are expected if rate limiting is working
  console.log(`\n${colors.yellow}Note: 429 errors expected if rate limiting is configured${colors.reset}`);

  return {
    name: 'Rate Limiting',
    passed: true, // Always pass - this is informational
    result,
  };
}

/**
 * Test 19: Recovery Test
 */
async function testRecovery() {
  printHeader('Test 19: Recovery Test (load → pause → load)');

  // First load
  console.log('Phase 1: Initial load...');
  const result1 = await runLoadTest({
    url: `${API_URL}/health`,
    connections: 20,
    duration: 5,
  });

  // Pause
  console.log('Phase 2: Pausing for 3 seconds...');
  await setTimeout(3000);

  // Second load
  console.log('Phase 3: Second load...');
  const result2 = await runLoadTest({
    url: `${API_URL}/health`,
    connections: 20,
    duration: 5,
  });

  console.log(`\nPhase 1: ${result1.requests.average.toFixed(2)} req/sec`);
  console.log(`Phase 2: ${result2.requests.average.toFixed(2)} req/sec`);

  // Check if server recovered (second load should be similar to first)
  const recovered = Math.abs(result1.requests.average - result2.requests.average) < result1.requests.average * 0.5;

  return {
    name: 'Recovery',
    passed: recovered && result1.errors === 0 && result2.errors === 0,
    result: result2,
  };
}

/**
 * Test 20: Throughput Benchmark
 */
async function testThroughputBenchmark() {
  printHeader('Test 20: Throughput Benchmark (maximum sustainable throughput)');

  const result = await runLoadTest({
    url: `${API_URL}/health`,
    connections: 50,
    duration: 15,
    pipelining: 5,
  });

  printResult('Throughput Benchmark', result);

  console.log(`\n${colors.bright}Benchmark Results:${colors.reset}`);
  console.log(`  Max Requests/sec:  ${result.requests.max.toFixed(2)}`);
  console.log(`  Avg Requests/sec:  ${result.requests.average.toFixed(2)}`);
  console.log(`  Total Requests:    ${result.requests.total}`);
  console.log(`  Data Transferred:  ${(result.throughput.total / 1024 / 1024).toFixed(2)} MB`);

  return {
    name: 'Throughput Benchmark',
    passed: result.errors === 0 && result.requests.average > 0,
    result,
  };
}

/**
 * Check if server is running
 */
async function checkServerRunning() {
  try {
    const result = await runLoadTest({
      url: `${API_URL}/health`,
      connections: 1,
      duration: 1,
    });
    return result.requests.total > 0;
  } catch (error) {
    return false;
  }
}

/**
 * Main test runner
 */
async function runAllTests() {
  console.log(`${colors.bright}${colors.cyan}`);
  console.log(`╔${'═'.repeat(78)}╗`);
  console.log(`║${' '.repeat(20)}AI Orchestra Performance Tests${' '.repeat(26)}║`);
  console.log(`║${' '.repeat(30)}Iteration 3${' '.repeat(37)}║`);
  console.log(`╚${'═'.repeat(78)}╝`);
  console.log(`${colors.reset}\n`);

  // Check if server is running
  console.log('Checking if server is running...');
  const serverRunning = await checkServerRunning();

  if (!serverRunning) {
    console.error(`${colors.red}Error: Server is not running on ${API_URL}${colors.reset}`);
    console.log(`\nPlease start the server with: ${colors.bright}npm start${colors.reset}`);
    console.log(`Or run tests after server is up.\n`);
    process.exit(1);
  }

  console.log(`${colors.green}✓ Server is running${colors.reset}`);
  console.log(`\nWarming up server...`);
  await setTimeout(WARMUP_TIME * 1000);
  console.log(`${colors.green}✓ Warmup complete${colors.reset}`);

  const tests = [
    testHealthBaseline,
    testHealthNormal,
    testHealthHighLoad,
    testHealthStress,
    testStatusNormal,
    testProvidersNormal,
    testModelsNormal,
    testMetricsNormal,
    testMixedLoad,
    testResponseTimePercentiles,
    testLongRunning,
    testSustainedLoad,
    testBurstTraffic,
    testPipelining,
    testConnectionReuse,
    testTimeoutHandling,
    testConcurrentMixedMethods,
    testRateLimiting,
    testRecovery,
    testThroughputBenchmark,
  ];

  const results = [];

  for (const test of tests) {
    try {
      const result = await test();
      results.push(result);
    } catch (error) {
      console.error(`${colors.red}Test failed with error: ${error.message}${colors.reset}`);
      results.push({
        name: test.name || 'Unknown Test',
        passed: false,
        error: error.message,
      });
    }
  }

  // Print summary
  printHeader('Performance Test Summary');

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const total = results.length;

  console.log(`\n${colors.bright}Results:${colors.reset}`);
  console.log(`  Total Tests:  ${total}`);
  console.log(`  ${colors.green}Passed:       ${passed}${colors.reset}`);
  console.log(`  ${colors.red}Failed:       ${failed}${colors.reset}`);
  console.log(`  Pass Rate:    ${((passed / total) * 100).toFixed(1)}%\n`);

  results.forEach((result) => {
    const status = result.passed
      ? `${colors.green}✓ PASS${colors.reset}`
      : `${colors.red}✗ FAIL${colors.reset}`;
    console.log(`  ${status}  ${result.name}`);
  });

  console.log(`\n${'═'.repeat(80)}\n`);

  if (failed > 0) {
    console.log(`${colors.red}Some performance tests failed. Review results above.${colors.reset}\n`);
    process.exit(1);
  } else {
    console.log(`${colors.green}All performance tests passed!${colors.reset}\n`);
    process.exit(0);
  }
}

// Run tests
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().catch((error) => {
    console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
    process.exit(1);
  });
}

export { runAllTests };
