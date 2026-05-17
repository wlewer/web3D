import { describe, it, expect } from 'vitest';

describe('App Component', () => {
  it('should be importable without errors', async () => {
    const module = await import('../App');
    expect(module.default).toBeDefined();
    expect(typeof module.default).toBe('function');
  });
});
