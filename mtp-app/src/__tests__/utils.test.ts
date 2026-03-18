/**
 * Unit tests for src/lib/utils.ts
 */
import { cn, formatCurrency, formatDate, formatDateTime, generateSlug } from '@/lib/utils';

describe('cn (class name merge)', () => {
  it('returns a single class string', () => {
    expect(cn('foo')).toBe('foo');
  });

  it('merges multiple class strings', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('ignores falsy values', () => {
    expect(cn('foo', false && 'bar', null, undefined, '')).toBe('foo');
  });

  it('handles conditional object syntax', () => {
    expect(cn({ foo: true, bar: false, baz: true })).toBe('foo baz');
  });

  it('handles array input', () => {
    expect(cn(['a', 'b'])).toBe('a b');
  });

  it('returns empty string when no valid classes', () => {
    expect(cn(false, null, undefined)).toBe('');
  });
});

describe('formatCurrency', () => {
  it('formats a number as USD by default', () => {
    expect(formatCurrency(100)).toBe('$100.00');
  });

  it('formats a string amount', () => {
    expect(formatCurrency('250.50')).toBe('$250.50');
  });

  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('$0.00');
  });

  it('formats large amounts with correct decimal places', () => {
    expect(formatCurrency(1234.5)).toBe('$1,234.50');
  });

  it('formats a different currency', () => {
    const result = formatCurrency(100, 'EUR', 'de-DE');
    // Just check it contains '100' and some currency indicator
    expect(result).toContain('100');
  });

  it('rounds to 2 decimal places', () => {
    expect(formatCurrency(10.999)).toBe('$11.00');
  });
});

describe('formatDate', () => {
  it('formats a Date object', () => {
    const d = new Date(2025, 0, 15); // Jan 15, 2025 (local time)
    const result = formatDate(d);
    expect(result).toContain('2025');
    expect(result).toContain('Jan');
    expect(result).toContain('15');
  });

  it('formats an ISO string', () => {
    const result = formatDate('2025-06-01T00:00:00.000Z');
    expect(result).toContain('2025');
  });

  it('accepts custom options', () => {
    const d = new Date(2025, 5, 1); // June 1
    const result = formatDate(d, { month: 'long', year: 'numeric' });
    expect(result).toContain('2025');
    expect(result).toContain('June');
  });
});

describe('formatDateTime', () => {
  it('includes both date and time parts', () => {
    const d = new Date(2025, 0, 15, 10, 30); // Jan 15 10:30 AM
    const result = formatDateTime(d);
    expect(result).toContain('2025');
    expect(result).toContain('Jan');
    expect(result).toMatch(/\d{1,2}:\d{2}/); // time pattern
  });
});

describe('generateSlug', () => {
  it('lowercases the input', () => {
    expect(generateSlug('Hello World')).toBe('hello-world');
  });

  it('replaces spaces with hyphens', () => {
    expect(generateSlug('My Business')).toBe('my-business');
  });

  it('replaces multiple spaces/symbols with a single hyphen', () => {
    expect(generateSlug('foo  --  bar')).toBe('foo-bar');
  });

  it('removes leading and trailing hyphens', () => {
    expect(generateSlug('  hello  ')).toBe('hello');
  });

  it('handles special characters', () => {
    expect(generateSlug("Bob's Store!")).toBe('bobs-store');
  });

  it('handles numbers', () => {
    expect(generateSlug('Store 123')).toBe('store-123');
  });

  it('returns empty string for empty input', () => {
    expect(generateSlug('')).toBe('');
  });

  it('handles org names with dots and commas', () => {
    expect(generateSlug('A.B.C, Inc.')).toBe('a-b-c-inc');
  });
});
