import mempoolJS from "./../../../src/index";

const init = async () => {
  try {
    const {
      bitcoin: { mempool },
    } = mempoolJS();
    
    const getMempool = await mempool.getMempool();
    console.log(getMempool);

    const getMempoolBlocks = await mempool.getMempoolBlocks();
    console.log(getMempoolBlocks);
    
    const getMempoolRecent = await mempool.getMempoolRecent();
    console.log(getMempoolRecent);
    
    const getMempoolTxids = await mempool.getMempoolTxids();
    console.log(getMempoolTxids);
  } catch (error) {
    console.log(error);
  }
};
init();
