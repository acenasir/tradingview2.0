import { describe, expect, it } from 'vitest';
import { changeTone, formatChange, formatCompact, formatPercent, formatPrice } from './format';

describe('format', () => {
  it('formats prices with magnitude-aware decimals', () => {
    expect(formatPrice(1234.5)).toBe('1,234.50');
    expect(formatPrice(12.3)).toBe('12.30');
    expect(formatPrice(0.001234)).toBe('0.001234');
    expect(formatPrice(undefined)).toBe('—');
    expect(formatPrice(null)).toBe('—');
  });

  it('formats signed percentages', () => {
    expect(formatPercent(1.234)).toBe('+1.23%');
    expect(formatPercent(-0.4)).toBe('-0.40%');
    expect(formatPercent(0)).toBe('0.00%');
  });

  it('formats signed changes', () => {
    expect(formatChange(2.5, 2)).toBe('+2.50');
    expect(formatChange(-1, 2)).toBe('-1.00');
  });

  it('formats compact volume', () => {
    expect(formatCompact(1_200_000)).toBe('1.2M');
    expect(formatCompact(undefined)).toBe('—');
  });

  it('derives a direction tone', () => {
    expect(changeTone(1)).toBe('up');
    expect(changeTone(-1)).toBe('down');
    expect(changeTone(0)).toBe('flat');
    expect(changeTone(undefined)).toBe('flat');
  });
});
