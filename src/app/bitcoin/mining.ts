import { AxiosInstance } from 'axios';
import {
  HistoricalBlockFee,
  HistoricalBlockReward,
  MiningInstance,
  PoolHashrate,
  PoolInfo,
  PoolStat,
  PoolsHashrate,
  PoolsStats,
  RewardStats,
} from '../../interfaces/bitcoin/mining';
import { Block } from '../../interfaces/bitcoin/blocks';

export const useMining = (api: AxiosInstance): MiningInstance => {
  type PoolInfoResponse = PoolInfo & {
    unique_id?: number;
  };

  type PoolsHashrateResponse = {
    timestamp: number;
    avgHashRate: number;
    share: number;
    poolName: string;
  };

  const normalizePoolInfo = (pool: PoolInfoResponse): PoolInfo => {
    const { unique_id, ...rest } = pool;
    return {
      ...rest,
      poolUniqueId: pool.poolUniqueId ?? unique_id ?? 0,
    };
  };

  const validateNonEmptyString = (value: unknown, fieldName: string) => {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new TypeError(`${fieldName} must be a non-empty string`);
    }
  };

  const listPools = async () => {
    const { data } = await api.get<PoolInfoResponse[]>(`/v1/mining/pools`);
    return data.map(normalizePoolInfo);
  };

  const getPools = async (params: { interval: string }) => {
    if (typeof params !== 'object' || params === null) {
      throw new TypeError('params must be an object');
    }
    if (
      typeof params.interval !== 'string' ||
      params.interval.trim().length === 0
    ) {
      throw new TypeError('interval must be a non-empty string');
    }
    const { data } = await api.get<PoolsStats>(
      `/v1/mining/pools/${params.interval}`
    );
    return data;
  };

  const getPool = async (params: { slug: string }) => {
    if (typeof params !== 'object' || params === null) {
      throw new TypeError('params must be an object');
    }
    validateNonEmptyString(params.slug, 'slug');
    const { data } = await api.get<PoolStat & { pool: PoolInfoResponse }>(
      `/v1/mining/pool/${params.slug}`
    );
    return {
      ...data,
      pool: normalizePoolInfo(data.pool),
    };
  };

  const getPoolHashrate = async (params: { slug: string }) => {
    if (typeof params !== 'object' || params === null) {
      throw new TypeError('params must be an object');
    }
    validateNonEmptyString(params.slug, 'slug');
    const { data } = await api.get<PoolHashrate[]>(
      `/v1/mining/pool/${params.slug}/hashrate`
    );
    return data;
  };

  const getPoolBlocks = async (params: { slug: string; height?: number }) => {
    if (typeof params !== 'object' || params === null) {
      throw new TypeError('params must be an object');
    }
    validateNonEmptyString(params.slug, 'slug');
    const heightPath =
      typeof params.height === 'number' ? `/${params.height}` : '';
    const { data } = await api.get<Block[]>(
      `/v1/mining/pool/${params.slug}/blocks${heightPath}`
    );
    return data;
  };

  const getPoolsHashrate = async (params?: { interval?: string }) => {
    if (typeof params !== 'undefined' && (typeof params !== 'object' || params === null)) {
      throw new TypeError('params must be an object');
    }
    if (typeof params?.interval !== 'undefined') {
      validateNonEmptyString(params.interval, 'interval');
    }
    const intervalPath = params?.interval ? `/${params.interval}` : '';
    const { data } = await api.get<PoolsHashrateResponse[]>(
      `/v1/mining/hashrate/pools${intervalPath}`
    );
    return data.map(({ avgHashRate, ...entry }) => ({
      ...entry,
      avgHashrate: avgHashRate,
    }));
  };

  const getHistoricalBlockFees = async (params?: { interval?: string }) => {
    if (typeof params !== 'undefined' && (typeof params !== 'object' || params === null)) {
      throw new TypeError('params must be an object');
    }
    if (typeof params?.interval !== 'undefined') {
      validateNonEmptyString(params.interval, 'interval');
    }
    const intervalPath = params?.interval ? `/${params.interval}` : '';
    const { data } = await api.get<HistoricalBlockFee[]>(
      `/v1/mining/blocks/fees${intervalPath}`
    );
    return data;
  };

  const getHistoricalBlockRewards = async (params?: { interval?: string }) => {
    if (typeof params !== 'undefined' && (typeof params !== 'object' || params === null)) {
      throw new TypeError('params must be an object');
    }
    if (typeof params?.interval !== 'undefined') {
      validateNonEmptyString(params.interval, 'interval');
    }
    const intervalPath = params?.interval ? `/${params.interval}` : '';
    const { data } = await api.get<HistoricalBlockReward[]>(
      `/v1/mining/blocks/rewards${intervalPath}`
    );
    return data;
  };

  const getRewardStats = async (params?: { blockCount?: number }) => {
    if (typeof params !== 'undefined' && (typeof params !== 'object' || params === null)) {
      throw new TypeError('params must be an object');
    }
    if (
      typeof params?.blockCount !== 'undefined' &&
      (Number.isInteger(params.blockCount) === false || params.blockCount <= 0)
    ) {
      throw new TypeError('blockCount must be a positive integer');
    }
    const blockCountPath =
      typeof params?.blockCount === 'number' ? `/${params.blockCount}` : '';
    const { data } = await api.get<RewardStats>(
      `/v1/mining/reward-stats${blockCountPath}`
    );
    return data;
  };

  return {
    listPools,
    getPools,
    getPool,
    getPoolHashrate,
    getPoolBlocks,
    getPoolsHashrate,
    getHistoricalBlockFees,
    getHistoricalBlockRewards,
    getRewardStats,
  };
};
