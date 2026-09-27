import { AxiosInstance } from 'axios';
import {
  Adjustment,
  DifficultyInstance,
  Hashrate,
} from '../../interfaces/bitcoin/difficulty';

export const useDifficulty = (api: AxiosInstance): DifficultyInstance => {
  const getDifficultyAdjustment = async () => {
    const { data } = await api.get<Adjustment>(`/v1/difficulty-adjustment`);
    return data;
  };

  const getHashrate = async (params?: { interval?: string }): Promise<Hashrate> => {
    const interval = params?.interval ? `/${params.interval}` : '';
    const { data } = await api.get<Hashrate>(`/v1/mining/hashrate${interval}`);
    return data;
  }

  return {
    getDifficultyAdjustment,
    getHashrate,
  };
};
