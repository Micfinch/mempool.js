import axios, { AxiosInstance } from 'axios';
import { MempoolConfig } from '../../interfaces';
import { MempoolCacheController } from '../../interfaces/cache';
import { applyCache } from './cache';

export const makeBitcoinAPI = ({
  hostname,
  network,
  protocol,
  config,
  cache,
}: MempoolConfig): { api: AxiosInstance; cache: MempoolCacheController } => {
  if (!protocol) {
    hostname?.includes('localhost')
      ? (protocol = 'http')
      : (protocol = 'https');
  }
  if (network && ['testnet', 'signet'].includes(network)) {
    network = `/${network}`;
  } else {
    network = '';
  }
  const api = axios.create({
    baseURL: `${protocol}://${hostname}${network}/api/`,
    ...config,
  });
  const cacheController = applyCache(api, cache);
  return {
    api,
    cache: cacheController,
  };
};

export const makeLiquidAPI = ({
  hostname,
  network,
  protocol,
  config,
  cache,
}: MempoolConfig): { api: AxiosInstance; cache: MempoolCacheController } => {
  if (!protocol) {
    hostname?.includes('localhost')
      ? (protocol = 'http')
      : (protocol = 'https');
  }
  if (network && ['testnet', 'liquidtestnet'].includes(network)) {
    network = `/liquidtestnet`;
  } else {
    network = '/liquid';
  }
  const api = axios.create({
    baseURL: `${protocol}://${hostname}${network}/api/`,
    ...config,
  });
  const cacheController = applyCache(api, cache);
  return {
    api,
    cache: cacheController,
  };
};

export default {
  makeBitcoinAPI,
  makeLiquidAPI,
};
