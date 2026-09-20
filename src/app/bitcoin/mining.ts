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
  type PoolsHashrateResponse = {
    timestamp: number;
    avgHashRate: number;
    share: number;
    poolName: string;
  };

  const listPools = async () => {
    const { data } = await api.get<PoolInfo[]>(`/v1/mining/pools`);
    return data;
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
    const { data } = await api.get<PoolStat>(`/v1/mining/pool/${params.slug}`);
    return data;
  };

  const getPoolHashrate = async (params: { slug: string }) => {
    const { data } = await api.get<PoolHashrate[]>(
      `/v1/mining/pool/${params.slug}/hashrate`
    );
    return data;
  };

  const getPoolBlocks = async (params: { slug: string; height?: number }) => {
    const heightPath =
      typeof params.height === 'number' ? `/${params.height}` : '';
    const { data } = await api.get<Block[]>(
      `/v1/mining/pool/${params.slug}/blocks${heightPath}`
    );
    return data;
  };

  const getPoolsHashrate = async (params?: { interval?: string }) => {
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
    const intervalPath = params?.interval ? `/${params.interval}` : '';
    const { data } = await api.get<HistoricalBlockFee[]>(
      `/v1/mining/blocks/fees${intervalPath}`
    );
    return data;
  };

  const getHistoricalBlockRewards = async (params?: { interval?: string }) => {
    const intervalPath = params?.interval ? `/${params.interval}` : '';
    const { data } = await api.get<HistoricalBlockReward[]>(
      `/v1/mining/blocks/rewards${intervalPath}`
    );
    return data;
  };

  const getRewardStats = async (params?: { blockCount?: number }) => {
    const blockCount = params?.blockCount ?? 144;
    const { data } = await api.get<RewardStats>(
      `/v1/mining/reward-stats/${blockCount}`
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
