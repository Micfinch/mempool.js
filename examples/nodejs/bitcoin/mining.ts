import mempoolJS from "./../../../src/index";

const init = async () => {
  try {
    const {
      bitcoin: { mining },
    } = mempoolJS();

    const rewardStats = await mining.getRewardStats();
    console.log(rewardStats);

    const pools = await mining.getPools({ interval: "1w" });
    console.log(pools);

    const pool = await mining.getPool({ slug: "foundryusa" });
    console.log(pool);

    const poolHashrate = await mining.getPoolHashrate({ slug: "foundryusa" });
    console.log(poolHashrate);

    const poolBlocks = await mining.getPoolBlocks({ slug: "foundryusa" });
    console.log(poolBlocks);

    const poolsHashrate = await mining.getPoolsHashrate({ interval: "1m" });
    console.log(poolsHashrate);

    const fees = await mining.getHistoricalBlockFees({ interval: "1m" });
    console.log(fees);

    const rewards = await mining.getHistoricalBlockRewards({ interval: "1m" });
    console.log(rewards);
  } catch (error) {
    console.log(error);
  }
};
init();
