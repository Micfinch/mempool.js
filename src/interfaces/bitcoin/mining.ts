import { Block } from './blocks';
import { DifficultyData, Hashrate } from './difficulty';

export type MiningInterval =
  | '24h'
  | '3d'
  | '1w'
  | '1m'
  | '3m'
  | '6m'
  | '1y'
  | '2y'
  | '3y'
  | '4y'
  | 'all';

export interface MiningPoolSummary {
  name: string;
  slug: string;
  unique_id: number;
}

export interface MiningPool {
  id: number;
  uniqueId: number;
  name: string;
  link: string;
  regexes: string[];
  addresses: string[];
  slug: string;
}

export interface MiningPoolInfo {
  poolId: number;
  name: string;
  link: string;
  blockCount: number;
  emptyBlocks: number;
  slug: string;
  avgMatchRate: number | null;
  avgFeeDelta: number | null;
  poolUniqueId: number;
}

export interface MiningPoolStats extends MiningPoolInfo {
  rank: number;
}

export interface MiningPoolsStats {
  pools: MiningPoolStats[];
  blockCount: number;
  lastEstimatedHashrate: number;
  lastEstimatedHashrate3d: number;
  lastEstimatedHashrate1w: number;
}

export interface MiningPoolStat {
  pool: MiningPool;
  blockCount: Record<'all' | '24h' | '1w', number>;
  blockShare: Record<'all' | '24h' | '1w', number>;
  estimatedHashrate: number;
  reportedHashrate: number | null;
  avgBlockHealth: number | null;
  totalReward: number;
}

export interface RewardStats {
  totalReward: number;
  totalFee: number;
  totalTx: number;
}

export type DifficultyAdjustmentHistory = [number, number, number, number];
export type BlocksHealthHistoryPoint = [number, number, number];
export type HistoricalSeriesPoint = unknown;

export interface HistoricalBlockSizesWeights {
  sizes: HistoricalSeriesPoint[];
  weights: HistoricalSeriesPoint[];
}

export interface HistoricalPriceParams {
  timestamp?: number;
  currency?: string;
}

export interface MiningInstance {
  listPools: () => Promise<MiningPoolSummary[]>;
  getPoolsStats: (params?: { interval?: MiningInterval }) => Promise<MiningPoolsStats>;
  getPoolHistoricalHashrate: (params: { slug: string }) => Promise<HistoricalSeriesPoint[]>;
  getPoolBlocks: (params: { slug: string; height?: number }) => Promise<Block[]>;
  getPool: (params: { slug: string }) => Promise<MiningPoolStat>;
  getPoolsHistoricalHashrate: (params: { interval: MiningInterval }) => Promise<HistoricalSeriesPoint[]>;
  getHistoricalHashrate: (params: { interval: string }) => Promise<Hashrate>;
  getDifficultyAdjustments: (params?: { interval?: MiningInterval }) => Promise<DifficultyAdjustmentHistory[]>;
  getRewardStats: (params: { blockCount: number }) => Promise<RewardStats>;
  getHistoricalBlockFees: (params: { interval: MiningInterval }) => Promise<HistoricalSeriesPoint[]>;
  getBlockFeesTimespan: (params: { from: number; to: number }) => Promise<number>;
  getHistoricalBlockRewards: (params: { interval: MiningInterval }) => Promise<HistoricalSeriesPoint[]>;
  getHistoricalBlockFeeRates: (params: { interval: MiningInterval }) => Promise<HistoricalSeriesPoint[]>;
  getHistoricalBlockSizesWeights: (params: { interval: MiningInterval }) => Promise<HistoricalBlockSizesWeights>;
  getHistoricalBlocksHealth: (params: { interval: MiningInterval }) => Promise<BlocksHealthHistoryPoint[]>;
  getHistoricalPrice: (params?: HistoricalPriceParams) => Promise<unknown>;
}
