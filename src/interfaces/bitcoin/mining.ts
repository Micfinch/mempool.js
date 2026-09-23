export interface Pool {
  name: string;
  slug: string;
  poolUniqueId: number;
  [key: string]: any;
}

export interface Pools {
  blockCount: number;
  lastEstimatedHashrate: number;
  lastEstimatedHashrate3d: number;
  lastEstimatedHashrate1w: number;
  pools: Pool[];
}

export type MiningPools = Pool[] | Pools;

export interface MiningInstance {
  getPools: (params?: { interval?: string }) => Promise<MiningPools>;
}
