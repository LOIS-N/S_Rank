export function getEnhanceData(grade: string) {
  switch (grade) {
    case 'D': return { prob: 80, cost: 2000, statIncrease: 2 };
    case 'C': return { prob: 70, cost: 5000, statIncrease: 3 };
    case 'B': return { prob: 60, cost: 20000, statIncrease: 5 };
    case 'A': return { prob: 45, cost: 90000, statIncrease: 8 };
    case 'S': return { prob: 35, cost: 250000, statIncrease: 10 };
    default: return { prob: 0, cost: 0, statIncrease: 0 };
  }
}

export type EnhanceResult = {
  success: boolean;
  cost: number;
  error?: 'MAX_TRIES' | 'INSUFFICIENT_GOLD';
  statsAdded?: {
    skill1: number;
    skill2: number;
    skill3: number;
  };
};

export function simulateEnhance(grade: string, currentTries: number, currentGold: number): EnhanceResult {
  const data = getEnhanceData(grade);
  
  // Validation
  if (currentTries >= 7) {
    return { success: false, cost: 0, error: 'MAX_TRIES' };
  }
  if (currentGold < data.cost) {
    return { success: false, cost: 0, error: 'INSUFFICIENT_GOLD' };
  }

  // Probability Roll
  const isSuccess = Math.random() < (data.prob / 100);

  if (!isSuccess) {
    // Fail: Deduct cost, add no stats
    return { 
      success: false, 
      cost: data.cost, 
      statsAdded: { skill1: 0, skill2: 0, skill3: 0 } 
    };
  }

  // Success: Distribute stats evenly
  const baseAdd = Math.floor(data.statIncrease / 3);
  const remainder = data.statIncrease % 3;

  const stats = [baseAdd, baseAdd, baseAdd];
  const indices = [0, 1, 2];
  
  // Shuffle indices to randomly pick which stats get the remainder
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  // Distribute the remainder sequentially to the shuffled indices
  for (let i = 0; i < remainder; i++) {
    stats[indices[i]] += 1;
  }

  return {
    success: true,
    cost: data.cost,
    statsAdded: {
      skill1: stats[0],
      skill2: stats[1],
      skill3: stats[2],
    }
  };
}
