import { describe, it, expect, beforeEach } from 'vitest';
import {
  registerComponent,
  registerComponents,
  hasComponent,
  getRegisteredTypes,
  getComponentEntry,
} from '../../core/template/ComponentRegistry';

describe('ComponentRegistry', () => {
  beforeEach(() => {
    // Clear registry before each test
    const types = getRegisteredTypes();
    // Note: we cannot easily clear the Map from outside,
    // so tests should be written to be idempotent.
  });

  it('should report built-in components as registered', () => {
    const types = getRegisteredTypes();
    expect(types.length).toBeGreaterThan(0);
    expect(types).toContain('hero-3d-carousel');
    expect(types).toContain('model-card-grid');
    expect(types).toContain('workshop-3d');
    expect(types).toContain('text-block');
    expect(types).toContain('image-block');
    expect(types).toContain('home-buttons');
  });

  it('should check component existence with hasComponent', () => {
    expect(hasComponent('hero-3d-carousel')).toBe(true);
    expect(hasComponent('model-card-grid')).toBe(true);
    expect(hasComponent('non-existent')).toBe(false);
  });

  it('should return component entry with loader', () => {
    const entry = getComponentEntry('text-block');
    expect(entry).toBeDefined();
    expect(typeof entry!.loader).toBe('function');
  });

  it('should return undefined for unknown component', () => {
    const entry = getComponentEntry('unknown-component');
    expect(entry).toBeUndefined();
  });

  it('should register a new component dynamically', () => {
    const testLoader = () => Promise.resolve({ default: (() => null) as any });
    registerComponent('test-dynamic', testLoader);

    expect(hasComponent('test-dynamic')).toBe(true);
    expect(getRegisteredTypes()).toContain('test-dynamic');

    const entry = getComponentEntry('test-dynamic');
    expect(entry).toBeDefined();
    expect(entry!.loader).toBe(testLoader);
  });

  it('should register multiple components at once', () => {
    const loaderA = () => Promise.resolve({ default: (() => null) as any });
    const loaderB = () => Promise.resolve({ default: (() => null) as any });

    registerComponents([
      { type: 'batch-a', loader: loaderA },
      { type: 'batch-b', loader: loaderB },
    ]);

    expect(hasComponent('batch-a')).toBe(true);
    expect(hasComponent('batch-b')).toBe(true);
  });
});
