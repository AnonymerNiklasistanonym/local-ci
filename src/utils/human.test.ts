import { describe, expect, it } from 'vitest';
import { humanTime } from './human.js';

describe('humanTime', () => {
  it('ms', () => {
    expect(humanTime(0)).toBe('0ms');
    expect(humanTime(1)).toBe('1ms');
    expect(humanTime(10)).toBe('10ms');
    expect(humanTime(100)).toBe('100ms');
    expect(humanTime(999)).toBe('999ms');
    // Rounding always down
    expect(humanTime(10.9)).toBe('10ms');
    expect(humanTime(11.0)).toBe('11ms');
    expect(humanTime(11.1)).toBe('11ms');
  });
  it('s', () => {
    expect(humanTime(1000)).toBe('1s');
    expect(humanTime(1500)).toBe('1s');
    expect(humanTime(1999)).toBe('1s');
    expect(humanTime(2000)).toBe('2s');
    expect(humanTime(60000 - 1)).toBe('59s');
  });
  it('min', () => {
    expect(humanTime(60000)).toBe('1min 0s');
    expect(humanTime(65000)).toBe('1min 5s');
  });
  it('h', () => {
    expect(humanTime(60000 * 60)).toBe('1h 0min');
    expect(humanTime(60000 * 90)).toBe('1h 30min');
  });
});
