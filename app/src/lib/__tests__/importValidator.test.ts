// importValidator unit tests — Phase 6 Plan 06-02 Task 01.
// TDD RED phase: tests written before implementation.
// Tests validate JSON Schema validation + cross-reference checks.

process.env['EXPO_PUBLIC_SUPABASE_URL'] = 'https://test.example';
process.env['EXPO_PUBLIC_SUPABASE_ANON_KEY'] = 'test-anon-key';

import { validatePayload, type ValidationResult } from '../importValidator';
import fullPayload from '../../../../schemas/examples/full.json';
import minimalPayload from '../../../../schemas/examples/minimal.json';
import edgeCasesPayload from '../../../../schemas/examples/edge-cases.json';

describe('importValidator', () => {
  describe('validatePayload', () => {
    it('accepts valid full payload', () => {
      const result: ValidationResult = validatePayload(fullPayload);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.payload.schemaVersion).toBe('spatenstich-import.v1');
        expect(result.payload.capture.timestamp).toBeDefined();
        expect(result.payload.beds).toHaveLength(2);
        expect(result.payload.plants).toHaveLength(2);
      }
    });

    it('accepts valid minimal payload', () => {
      const result: ValidationResult = validatePayload(minimalPayload);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.payload.schemaVersion).toBe('spatenstich-import.v1');
      }
    });

    it('accepts edge-cases payload with low confidence', () => {
      const result: ValidationResult = validatePayload(edgeCasesPayload);
      expect(result.ok).toBe(true);
    });

    it('rejects missing schemaVersion', () => {
      const invalid = {
        capture: { timestamp: '2026-05-09T10:00:00Z' },
      };
      const result: ValidationResult = validatePayload(invalid);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.length).toBeGreaterThan(0);
        const errorText = result.errors.join(' ');
        expect(errorText).toMatch(/schemaVersion/);
      }
    });

    it('rejects invalid sunExposure enum value', () => {
      const invalid = {
        schemaVersion: 'spatenstich-import.v1',
        capture: { timestamp: '2026-05-09T10:00:00Z' },
        beds: [
          {
            localId: 'bed-1',
            label: 'Test Beet',
            sunExposure: 'halfShade', // invalid — only 'full' | 'half' | 'shade' | 'mixed' allowed
          },
        ],
      };
      const result: ValidationResult = validatePayload(invalid);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.length).toBeGreaterThan(0);
        const errorText = result.errors.join(' ');
        expect(errorText).toMatch(/sunExposure/);
      }
    });

    it('rejects plant with unknown bedRef', () => {
      const invalid = {
        schemaVersion: 'spatenstich-import.v1',
        capture: { timestamp: '2026-05-09T10:00:00Z' },
        beds: [
          { localId: 'bed-a', label: 'Hochbeet' },
        ],
        plants: [
          {
            localId: 'plant-1',
            bedRef: 'bed-does-not-exist', // invalid bedRef
            commonNameDe: 'Tomate',
          },
        ],
      };
      const result: ValidationResult = validatePayload(invalid);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.length).toBeGreaterThan(0);
        const errorText = result.errors.join(' ');
        expect(errorText).toMatch(/unbekannte bedRef/);
      }
    });

    it('rejects empty object', () => {
      const result: ValidationResult = validatePayload({});
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.length).toBeGreaterThan(0);
      }
    });

    it('returns actionable German error messages', () => {
      // Plant with unknown bedRef should produce a German-language error
      const invalid = {
        schemaVersion: 'spatenstich-import.v1',
        capture: { timestamp: '2026-05-09T10:00:00Z' },
        plants: [
          {
            localId: 'plant-x',
            bedRef: 'nonexistent-bed',
            commonNameDe: 'Petersilie',
          },
        ],
      };
      const result: ValidationResult = validatePayload(invalid);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        // Error should contain German text
        const hasGermanText = result.errors.some((e: string) => e.includes('unbekannte bedRef'));
        expect(hasGermanText).toBe(true);
      }
    });

    it('handles non-object input gracefully', () => {
      const result: ValidationResult = validatePayload('not an object');
      expect(result.ok).toBe(false);
    });

    it('handles null input gracefully', () => {
      const result: ValidationResult = validatePayload(null);
      expect(result.ok).toBe(false);
    });
  });
});
