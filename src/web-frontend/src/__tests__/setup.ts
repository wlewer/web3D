import '@testing-library/jest-dom';

// Polyfill ImageData for jsdom (used by three.js / threepipe)
if (typeof globalThis.ImageData === 'undefined') {
  globalThis.ImageData = class ImageData {
    data: Uint8ClampedArray;
    width: number;
    height: number;
    constructor(data: any, width: number, height?: number) {
      if (typeof data === 'number' && typeof width === 'number') {
        this.width = data;
        this.height = width;
        this.data = new Uint8ClampedArray(this.width * this.height * 4);
      } else {
        this.data = new Uint8ClampedArray(data || []);
        this.width = width;
        this.height = height || 1;
      }
    }
  } as any;
}

