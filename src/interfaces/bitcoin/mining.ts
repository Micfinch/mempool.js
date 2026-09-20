import { Block } from './blocks';

export interface PoolInfo {
  id: number | null;
  name: string;
  link: string;
  regexes: string;
  addresses: string;
  emptyBlocks: number;
  slug: string;
  poolUniqueId: number;
  unique_id: number;
}

export interface SinglePoolStats {
  poolId: number;
  poolUniqueId: number;
  name: string;
  link: string;
  blockCount: number;
  emptyBlocks: number;
  rank: number;
  share: number;
  lastEstimatedHashrate: number;
  lastEstimatedHashrate3d: number;
  lastEstimatedHashrate1w: number;
  emptyBlockRatio: string;
  logo: string;
  slug: string;
  avgMatchRate: number;
  avgFeeDelta: number;
}

export interface PoolsStats {
  blockCount: number;
  lastEstimatedHashrate: number;
  lastEstimatedHashrate3d: number;
  lastEstimatedHashrate1w: number;
  pools: SinglePoolStats[];
}

export interface PoolStat {
  pool: PoolInfo;
  blockCount: {
    all: number;
    '24h': number;
    '1w': number;
  };
  blockShare: {
    all: number;
    '24h': number;
    '1w': number;
  };
  estimatedHashrate: number;
  avgBlockHealth: number;
  totalReward: number;
}

export interface PoolHashrate {
  timestamp: number;
  avgHashrate: number;
  share: number;
}

export interface PoolsHashrate {
  timestamp: number;
  avgHashRate: number;
  share: number;
  poolName: string;
}

export interface HistoricalBlockReward {
  timestamp: number;
  avgReward: number;
}

export interface HistoricalBlockFee {
  timestamp: number;
  avgFee: number;
}

export interface RewardStats {
  startBlock: number;
  endBlock: number;
  totalReward: number;
  totalFee: number;
  totalTx: number;
}

export interface MiningInstance {
  listPools: () => Promise<PoolInfo[]>;
  getPools: (params: { interval: string }) => Promise<PoolsStats>;
  getPool: (params: { slug: string }) => Promise<PoolStat>;
  getPoolHashrate: (params: { slug: string }) => Promise<PoolHashrate[]>;
  getPoolBlocks: (params: { slug: string; height?: number }) => Promise<Block[]>;
  getPoolsHashrate: (params?: { interval?: string }) => Promise<PoolsHashrate[]>;
  getHistoricalBlockFees: (
    params?: { interval?: string }
  ) => Promise<HistoricalBlockFee[]>;
  getHistoricalBlockRewards: (
    params?: { interval?: string }
  ) => Promise<HistoricalBlockReward[]>;
  getRewardStats: (params?: { blockCount?: number }) => Promise<RewardStats>;
}
