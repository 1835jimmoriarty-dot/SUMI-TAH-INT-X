import { describe, it, expect } from 'vitest';
import { getConnector } from '../src/lib/connectors';

describe('Security Connector Abstraction', () => {
  it('should report NOT_CONFIGURED when connectors lack credentials', async () => {
    const logscale = getConnector('logscale', {}, {});
    expect(logscale.isConfigured()).toBe(false);

    const health = await logscale.health();
    expect(health.status).toBe('NOT_CONFIGURED');

    const exec = await logscale.execute({ query: 'test query' });
    expect(exec.success).toBe(false);
    expect(exec.errorMessage).toContain('CONNECTOR NOT CONFIGURED');
  });

  it('should validate credentials when configured', async () => {
    const splunk = getConnector('splunk', { baseUrl: 'https://splunk.corp.internal:8089' }, { token: 'hec-token-123' });
    expect(splunk.isConfigured()).toBe(true);

    const health = await splunk.health();
    expect(health.status).toBe('HEALTHY');
    expect(health.latencyMs).toBeGreaterThan(0);

    const exec = await splunk.execute({ query: 'index=wineventlog EventCode=4769' });
    expect(exec.success).toBe(true);
    expect(exec.events.length).toBeGreaterThan(0);
  });
});