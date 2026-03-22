import { describe, it, expect } from 'vitest';
import { getEnhanceData, simulateEnhance } from '../lib/enhanceLogic';

describe('Enhancement Logic', () => {
  it('should correctly identify enhancement data for S grade', () => {
    const data = getEnhanceData('S');
    expect(data.prob).toBe(35);
    expect(data.cost).toBe(250000);
    expect(data.statIncrease).toBe(10);
  });

  it('should fail if max tries (7) are reached', () => {
    const result = simulateEnhance('S', 7, 1000000);
    expect(result.success).toBe(false);
    expect(result.error).toBe('MAX_TRIES');
    expect(result.cost).toBe(0);
  });

  it('should fail if insufficient gold', () => {
    const result = simulateEnhance('S', 0, 100);
    expect(result.success).toBe(false);
    expect(result.error).toBe('INSUFFICIENT_GOLD');
    expect(result.cost).toBe(0);
  });

  it('should correctly distribute stats exactly equal to statIncrease on success', () => {
    // Run simulation multiple times to force a success
    let successCount = 0;
    
    // S grade -> +10 stats
    for (let i = 0; i < 100; i++) {
      const result = simulateEnhance('S', 0, 1000000);
      if (result.success && result.statsAdded) {
        successCount++;
        const totalAdds = result.statsAdded.skill1 + result.statsAdded.skill2 + result.statsAdded.skill3;
        expect(totalAdds).toBe(10);
        
        // 10 / 3 = 3 remainder 1. So it should be [3, 3, 4] in some order.
        const values = Object.values(result.statsAdded).sort((a, b) => a - b);
        expect(values).toEqual([3, 3, 4]);
      }
    }
    
    // Make sure we at least got one success
    expect(successCount).toBeGreaterThan(0);
  });

  it('should deduct cost but add 0 stats on failure', () => {
    // Override random to guarantee failure
    const originalRandom = Math.random;
    Math.random = () => 0.99; // 99% > 35%, so fail S grade
    
    const result = simulateEnhance('S', 0, 1000000);
    expect(result.success).toBe(false);
    expect(result.cost).toBe(250000);
    expect(result.statsAdded).toEqual({ skill1: 0, skill2: 0, skill3: 0 });
    
    // Restore
    Math.random = originalRandom;
  });
});
