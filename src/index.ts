import { MempoolConfig, MempoolReturn } from './interfaces/index';
import {
  MempoolCacheController,
  MempoolMemoryCacheStoreOptions,
  MempoolCacheStore,
} from './interfaces/cache';
import { makeBitcoinAPI, makeLiquidAPI } from './services/api/index';
import { createMemoryCacheStore } from './services/api/cache';

import { useAddresses } from './app/bitcoin/addresses';
import { useBlocks } from './app/bitcoin/blocks';
import { useDifficulty } from './app/bitcoin/difficulty';
import { useFees } from './app/bitcoin/fees';
import { useLightning } from './app/bitcoin/lightning';
import { useMempool } from './app/bitcoin/mempool';
import { useTransactions } from './app/bitcoin/transactions';
import { useWebsocket } from './app/bitcoin/websocket';

import { useAssets as useAssetsLiquid } from './app/liquid/assets';
import { useAddresses as useAddressesLiquid } from './app/liquid/addresses';
import { useBlocks as useBlocksLiquid } from './app/liquid/blocks';
import { useFees as useFeesLiquid } from './app/liquid/fees';
import { useMempool as useMempoolLiquid } from './app/liquid/mempool';
import { useTransactions as useTransactionsLiquid } from './app/liquid/transactions';
import { useWebsocket as useWebsocketLiquid } from './app/liquid/websocket';

const hostnameEndpointDefault = 'aero.bitcoinpulse.shop';
const networkEndpointDefault = 'main';

interface MempoolFactory {
  (config?: MempoolConfig): MempoolReturn;
  default?: MempoolFactory;
  createMemoryCacheStore: (
    options?: MempoolMemoryCacheStoreOptions,
  ) => MempoolCacheStore;
}

const createCacheController = (
  controllers: MempoolCacheController[],
): MempoolCacheController => ({
  clear: async () => {
    await Promise.all(controllers.map((controller) => controller.clear()));
  },
});

const mempool: MempoolFactory = (
  { hostname, network, protocol, config, cache }: MempoolConfig = {
    hostname: hostnameEndpointDefault,
    network: networkEndpointDefault,
  },
): MempoolReturn => {
  if (!hostname) hostname = hostnameEndpointDefault;
  if (!network) network = networkEndpointDefault;

  const { api: apiBitcoin, cache: bitcoinCache } = makeBitcoinAPI({
    hostname,
    network,
    protocol,
    config,
    cache,
  });
  const { api: apiLiquid, cache: liquidCache } = makeLiquidAPI({
    hostname,
    network,
    protocol,
    config,
    cache,
  });
  const client: MempoolReturn = {
    bitcoin: {
      addresses: useAddresses(apiBitcoin),
      blocks: useBlocks(apiBitcoin),
      difficulty: useDifficulty(apiBitcoin),
      fees: useFees(apiBitcoin),
      lightning: useLightning(apiBitcoin),
      mempool: useMempool(apiBitcoin),
      transactions: useTransactions(apiBitcoin),
      websocket: useWebsocket(hostname, network, protocol),
    },
    liquid: {
      addresses: useAddressesLiquid(apiLiquid),
      assets: useAssetsLiquid(apiLiquid),
      blocks: useBlocksLiquid(apiLiquid),
      fees: useFeesLiquid(apiLiquid),
      mempool: useMempoolLiquid(apiLiquid),
      transactions: useTransactionsLiquid(apiLiquid),
      websocket: useWebsocketLiquid(hostname, network, protocol),
    },
  };

  if (cache && cache.enabled === true) {
    client.cache = createCacheController([bitcoinCache, liquidCache]);
  }

  return client;
};

mempool.default = mempool;
mempool.createMemoryCacheStore = createMemoryCacheStore;
export = mempool;
