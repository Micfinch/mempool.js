import mempoolJS from "./../../../src/index";

const init = async () => {
  try {
    const {
      bitcoin: { mining },
    } = mempoolJS();

    const pools = await mining.listPools();
    console.log(pools);

    const rewardStats = await mining.getRewardStats({ blockCount: 144 });
    console.log(rewardStats);
  } catch (error) {
    console.log(error);
  }
};
init();
