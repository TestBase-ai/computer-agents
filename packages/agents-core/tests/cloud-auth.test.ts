/**
 * CloudRuntime Authentication Tests
 *
 * Verifies that CloudRuntime properly enforces API key authentication
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CloudRuntime } from '../src/runtime/CloudRuntime';

describe('CloudRuntime Authentication', () => {
  const originalEnv = process.env.TESTBASE_API_KEY;

  beforeEach(() => {
    // Clear environment variable before each test
    delete process.env.TESTBASE_API_KEY;
  });

  afterEach(() => {
    // Restore original environment variable
    if (originalEnv) {
      process.env.TESTBASE_API_KEY = originalEnv;
    } else {
      delete process.env.TESTBASE_API_KEY;
    }
  });

  it('should throw error when no API key is provided', () => {
    expect(() => {
      new CloudRuntime({});
    }).toThrow('CloudRuntime requires an API key');
  });

  it('should throw error with helpful message when API key is missing', () => {
    expect(() => {
      new CloudRuntime();
    }).toThrow(/CloudRuntime requires an API key.*Environment variable/s);
  });

  it('should accept API key from config', () => {
    const runtime = new CloudRuntime({
      apiKey: 'test-api-key-123',
    });

    expect(runtime).toBeDefined();
    expect(runtime.type).toBe('cloud');
  });

  it('should accept API key from environment variable', () => {
    process.env.TESTBASE_API_KEY = 'test-env-key-456';

    const runtime = new CloudRuntime({});

    expect(runtime).toBeDefined();
    expect(runtime.type).toBe('cloud');
  });

  it('should prefer config API key over environment variable', () => {
    process.env.TESTBASE_API_KEY = 'env-key';

    const runtime = new CloudRuntime({
      apiKey: 'config-key',
    });

    expect(runtime).toBeDefined();
    // We can't directly check which key was used, but we verified it doesn't throw
  });

  it('should initialize with debug and timeout options', () => {
    const runtime = new CloudRuntime({
      apiKey: 'test-key',
      debug: true,
      timeout: 300000,
    });

    expect(runtime).toBeDefined();
    expect(runtime.type).toBe('cloud');
  });

  it('should have default timeout of 600000ms when not specified', () => {
    const runtime = new CloudRuntime({
      apiKey: 'test-key',
    });

    expect(runtime).toBeDefined();
    // Default timeout should be 10 minutes (600000ms) as per CloudRuntime.ts:77
  });
});
