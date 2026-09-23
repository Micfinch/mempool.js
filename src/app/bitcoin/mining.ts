import { AxiosInstance } from 'axios';
import {
  MiningInstance,
  MiningPools,
  Pool,
} from '../../interfaces/bitcoin/mining';

export const useMining = (api: AxiosInstance): MiningInstance => {
  const markUnknownPools = (pools: Pool[]) => {
    pools.forEach((pool) => {
      if (pool.poolUniqueId === 0) {
        pool.name = 'Unknown';
      }
    });
  };

  const getPools = async (params: { interval?: string } = {}): Promise<MiningPools> => {
    const endpoint = `/v1/mining/pools${params.interval !== undefined ? `/${params.interval}` : ''}`;
    const { data } = await api.get<MiningPools>(endpoint);
    const pools = Array.isArray(data) ? data : data.pools;
    markUnknownPools(pools);
    return data;
  };

  return {
    getPools,
  };
};
