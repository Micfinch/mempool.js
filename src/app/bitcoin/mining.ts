import { AxiosInstance } from 'axios';
import {
  BlocksHealthHistoryPoint,
  DifficultyAdjustmentHistory,
  HistoricalBlockSizesWeights,
  HistoricalPriceParams,
  HistoricalSeriesPoint,
  MiningInstance,
  MiningInterval,
  MiningPoolStat,
  MiningPoolsStats,
  MiningPoolSummary,
  RewardStats,
} from '../../interfaces/bitcoin/mining';
import { Block } from '../../interfaces/bitcoin/blocks';
import { Hashrate } from '../../interfaces/bitcoin/difficulty';

const assertNonEmptyString = (value: string, name: string): string => {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new TypeError(`${name} must be a non-empty string`);
  }

  return value.trim();
};

const assertFiniteNumber = (value: number, name: string): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`${name} must be a finite number`);
  }

  return value;
};

const assertPositiveInteger = (value: number, name: string): number => {
  if (!Number.isInteger(value) || value <= 0) {
    throw new TypeError(`${name} must be a positive integer`);
  }

  return value;
};

const buildIntervalPath = (path: string, interval?: string): string => {
  if (!interval) {
    return path;
  }

  return `${path}/${assertNonEmptyString(interval, 'interval')}`;
};

export const useMining = (api: AxiosInstance): MiningInstance => {
  const listPools = async () => {
    const { data } = await api.get<MiningPoolSummary[]>(`/v1/mining/pools`);
    return data;
  };

  const getPoolsStats = async (params: { interval?: MiningInterval } = {}) => {
    const { data } = await api.get<MiningPoolsStats>(
      buildIntervalPath(`/v1/mining/pools`, params.interval)
    );
    return data;
  };

  const getPoolHistoricalHashrate = async (params: { slug: string }) => {
    const slug = assertNonEmptyString(params.slug, 'slug');
    const { data } = await api.get<HistoricalSeriesPoint[]>(
      `/v1/mining/pool/${slug}/hashrate`
    );
    return data;
  };

  const getPoolBlocks = async (params: { slug: string; height?: number }) => {
    const slug = assertNonEmptyString(params.slug, 'slug');
    const heightPath =
      params.height === undefined
        ? ''
        : `/${assertPositiveInteger(params.height, 'height')}`;
    const { data } = await api.get<Block[]>(
      `/v1/mining/pool/${slug}/blocks${heightPath}`
    );
    return data;
  };

  const getPool = async (params: { slug: string }) => {
    const slug = assertNonEmptyString(params.slug, 'slug');
    const { data } = await api.get<MiningPoolStat>(`/v1/mining/pool/${slug}`);
    return data;
  };

  const getPoolsHistoricalHashrate = async (params: { interval: MiningInterval }) => {
    const interval = assertNonEmptyString(params.interval, 'interval');
    const { data } = await api.get<HistoricalSeriesPoint[]>(
      `/v1/mining/hashrate/pools/${interval}`
    );
    return data;
  };

  const getHistoricalHashrate = async (params: { interval: MiningInterval }) => {
    const interval = assertNonEmptyString(params.interval, 'interval');
    const { data } = await api.get<Hashrate>(`/v1/mining/hashrate/${interval}`);
    return data;
  };

  const getDifficultyAdjustments = async (params: { interval?: MiningInterval } = {}) => {
    const { data } = await api.get<DifficultyAdjustmentHistory[]>(
      buildIntervalPath(`/v1/mining/difficulty-adjustments`, params.interval)
    );
    return data;
  };

  const getRewardStats = async (params: { blockCount: number }) => {
    const blockCount = assertPositiveInteger(params.blockCount, 'blockCount');
    const { data } = await api.get<RewardStats>(
      `/v1/mining/reward-stats/${blockCount}`
    );
    return data;
  };

  const getHistoricalBlockFees = async (params: { interval: MiningInterval }) => {
    const interval = assertNonEmptyString(params.interval, 'interval');
    const { data } = await api.get<HistoricalSeriesPoint[]>(
      `/v1/mining/blocks/fees/${interval}`
    );
    return data;
  };

  const getBlockFeesTimespan = async (params: { from: number; to: number }) => {
    const from = assertFiniteNumber(params.from, 'from');
    const to = assertFiniteNumber(params.to, 'to');
    const { data } = await api.get<number>(`/v1/mining/blocks/fees`, {
      params: { from, to },
    });
    return data;
  };

  const getHistoricalBlockRewards = async (params: { interval: MiningInterval }) => {
    const interval = assertNonEmptyString(params.interval, 'interval');
    const { data } = await api.get<HistoricalSeriesPoint[]>(
      `/v1/mining/blocks/rewards/${interval}`
    );
    return data;
  };

  const getHistoricalBlockFeeRates = async (params: { interval: MiningInterval }) => {
    const interval = assertNonEmptyString(params.interval, 'interval');
    const { data } = await api.get<HistoricalSeriesPoint[]>(
      `/v1/mining/blocks/fee-rates/${interval}`
    );
    return data;
  };

  const getHistoricalBlockSizesWeights = async (params: { interval: MiningInterval }) => {
    const interval = assertNonEmptyString(params.interval, 'interval');
    const { data } = await api.get<HistoricalBlockSizesWeights>(
      `/v1/mining/blocks/sizes-weights/${interval}`
    );
    return data;
  };

  const getHistoricalBlocksHealth = async (params: { interval: MiningInterval }) => {
    const interval = assertNonEmptyString(params.interval, 'interval');
    const { data } = await api.get<BlocksHealthHistoryPoint[]>(
      `/v1/mining/blocks/predictions/${interval}`
    );
    return data;
  };

  const getHistoricalPrice = async (params: HistoricalPriceParams = {}) => {
    const { data } = await api.get<unknown>(`/v1/historical-price`, {
      params,
    });
    return data;
  };

  return {
    listPools,
    getPoolsStats,
    getPoolHistoricalHashrate,
    getPoolBlocks,
    getPool,
    getPoolsHistoricalHashrate,
    getHistoricalHashrate,
    getDifficultyAdjustments,
    getRewardStats,
    getHistoricalBlockFees,
    getBlockFeesTimespan,
    getHistoricalBlockRewards,
    getHistoricalBlockFeeRates,
    getHistoricalBlockSizesWeights,
    getHistoricalBlocksHealth,
    getHistoricalPrice,
  };
};
