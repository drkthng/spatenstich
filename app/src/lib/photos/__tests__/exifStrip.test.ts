// Plan 03-05 Task 01 — TDD RED: exifStrip.web tests
// Tests the web variant only (Node env). Native variant tested via E2E (VALIDATION.md I-5).
import * as fs from 'fs';
import * as path from 'path';
import { stripExifAndExtractGps } from '../exifStrip.web';

// Polyfill URL for Node env that may not have it
beforeAll(() => {
  if (typeof globalThis.URL === 'undefined') {
    (globalThis as any).URL = require('url').URL;
  }
});

describe('exifStrip.web', () => {
  const fixturePath = path.resolve(__dirname, '__fixtures__/exif-test.jpg');
  const fixtureExists = fs.existsSync(fixturePath);

  (fixtureExists ? it : it.skip)('extrahiert GPS bei optIn=true', async () => {
    const buffer = fs.readFileSync(fixturePath);
    const base64 = buffer.toString('base64');
    const dataUrl = `data:image/jpeg;base64,${base64}`;

    const result = await stripExifAndExtractGps(dataUrl, { optIn: true });

    expect(result.gps).not.toBeNull();
    expect(result.gps?.lat).toBeCloseTo(52.52, 1);  // Berlin lat
    expect(result.gps?.lng).toBeCloseTo(13.405, 1); // Berlin lng
    expect(result.strippedUri).toMatch(/^blob:/);
  });

  (fixtureExists ? it : it.skip)('extrahiert KEIN GPS bei optIn=false', async () => {
    const buffer = fs.readFileSync(fixturePath);
    const base64 = buffer.toString('base64');
    const dataUrl = `data:image/jpeg;base64,${base64}`;

    const result = await stripExifAndExtractGps(dataUrl, { optIn: false });

    expect(result.gps).toBeNull();
  });

  (fixtureExists ? it : it.skip)('strippedUri enthält KEIN EXIF mehr', async () => {
    const buffer = fs.readFileSync(fixturePath);
    const base64 = buffer.toString('base64');
    const dataUrl = `data:image/jpeg;base64,${base64}`;

    const { strippedUri } = await stripExifAndExtractGps(dataUrl, { optIn: true });

    // Re-fetch stripped blob + verify GPS gone
    const resp = await fetch(strippedUri);
    const blob = await resp.blob();
    const reader = new FileReader();
    const strippedDataUrl: string = await new Promise((resolve) => {
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
    const piexif = require('piexifjs');
    let exif: any = {};
    try {
      exif = piexif.load(strippedDataUrl);
    } catch {
      exif = null;
    }
    // Nach strip: kein GPS-IFD oder leer
    expect(exif?.GPS ? Object.keys(exif.GPS).length : 0).toBe(0);
  });

  // Smoke test with minimal JPEG that has no EXIF at all
  it('Bild ohne GPS bei optIn=true -> gps: null', async () => {
    // 1x1 weißes JPEG ohne EXIF (Header-Minimum)
    const minimalJpeg =
      'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD+fiiiigD/2Q==';
    const result = await stripExifAndExtractGps(minimalJpeg, { optIn: true });
    expect(result.gps).toBeNull();
  });
});
