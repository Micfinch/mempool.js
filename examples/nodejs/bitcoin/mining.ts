import mempoolJS from "./../../../src/index";

const init = async () => {
  try {
    const {
      bitcoin: { mining },
    } = mempoolJS();

    const rewardStats = await mining.getRewardStats();
    console.log(rewardStats);

    const pool = await mining.getPool({ slug: "foundryusa" });
    console.log(pool);
  } catch (error) {
    console.log(error);
  }
};
init();
