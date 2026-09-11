import { AxiosInstance } from 'axios';
import { Asset, AssetsInstance } from '../../interfaces/liquid/assets';

export const useAssets = (api: AxiosInstance): AssetsInstance => {
  const getAsset = async (params: { asset_id: string }) => {
    const { data } = await api.get<Asset>(`/asset/${params.asset_id}`);
    return data;
  };

  const getAssets = async (params: { asset_ids: string[] }) => {
    if (typeof params !== 'object' || params === null) {
      throw new TypeError('params must be an object');
    }
    if (Array.isArray(params.asset_ids) === false) {
      throw new TypeError('asset_ids must be an array');
    }
    if (
      params.asset_ids.some(
        (asset_id) =>
          typeof asset_id !== 'string' || asset_id.trim().length === 0
      )
    ) {
      throw new TypeError('asset_ids must contain non-empty strings');
    }
    if (params.asset_ids.length === 0) {
      return [];
    }
    const data = await Promise.all(
      params.asset_ids.map((asset_id) => getAsset({ asset_id }))
    );
    return data;
  };

  const getAssetIcon = async (params: { asset_id: string }) => {
    const { data } = await api.get(`/v1/asset/${params.asset_id}/icon`);
    return data;
  };

  const getAssetTxs = async (params: {
    asset_id: string;
    is_mempool: boolean;
  }) => {
    const paramsMempools = params.is_mempool === true ? '/mempool' : '/chain';
    const { data } = await api.get<Asset>(
      `/asset/${params.asset_id}/txs${paramsMempools}`
    );
    return data;
  };

  const getAssetSupply = async (params: {
    asset_id: string;
    decimal: boolean;
  }) => {
    const paramDecimal = params.decimal === true ? '/decimal' : '';
    const { data } = await api.get<Asset>(
      `/asset/${params.asset_id}/supply${paramDecimal}`
    );
    return data;
  };

  const getAssetsIcons = async () => {
    const { data } = await api.get<string[]>(`/v1/assets/icons`);
    return data;
  };

  return {
    getAsset,
    getAssets,
    getAssetIcon,
    getAssetTxs,
    getAssetSupply,
    getAssetsIcons,
  };
};
