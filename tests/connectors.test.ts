import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getConnector } from '../src/lib/connectors';

describe('Security Connector Abstraction', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should report NOT_CONFIGURED when connectors lack credentials', async () => {
    const logscale = getConnector('logscale', {}, {});
    expect(logscale.isConfigured()).toBe(false);

    const health = await logscale.health();
    expect(health.status).toBe('NOT_CONFIGURED');
    expect(health.isDemoData).toBe(true);

    const exec = await logscale.execute({ query: 'test query' });
    expect(exec.success).toBe(false);
    expect(exec.errorMessage).toContain('CONNECTOR NOT CONFIGURED');
  });

  it('should validate credentials and handle live connector queries when configured', async () => {
    // Mock global fetch for live SIEM test
    const mockFetch = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any) => {
      const urlStr = String(url);
      if (urlStr.includes('/services/server/info')) {
        return new Response(JSON.stringify({ version: '9.1.0' }), { status: 200 });
      }
      if (urlStr.includes('/services/search/jobs')) {
        return new Response(
          JSON.stringify({
            results: [
              {
                timestamp: new Date().toISOString(),
                host: 'DC01.corp.internal',
                user: 'SYSTEM',
                action: 'Kerberoasting Detected',
              },
            ],
          }),
          { status: 200 }
        );
      }
      return new Response('Not Found', { status: 404 });
    });

    const splunk = getConnector(
      'splunk',
      { baseUrl: 'https://splunk.corp.internal:8089' },
      { token: 'hec-token-123' }
    );
    expect(splunk.isConfigured()).toBe(true);

    const health = await splunk.health();
    expect(health.status).toBe('HEALTHY');

    const exec = await splunk.execute({ query: 'index=wineventlog EventCode=4769' });
    expect(exec.success).toBe(true);
    expect(exec.events.length).toBeGreaterThan(0);
    expect(exec.isDemoData).toBe(false);
  });
});