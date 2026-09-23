import assert = require('assert');
import axios from 'axios';

const run = async (name: string, fn: () => Promise<void>) => {
  try {
    await fn();
    process.stdout.write(`PASS ${name}\n`);
  } catch (error) {
    process.stderr.write(`FAIL ${name}\n`);
    throw error;
  }
};

const main = async () => {
  await run('mempoolJS defaults to mempool.space API endpoints', async () => {
    const originalCreate = axios.create;
    const configs: unknown[] = [];

    try {
      (axios as unknown as { create: (config: unknown) => unknown }).create = (
        config
      ) => {
        configs.push(config);
        return {};
      };

      delete require.cache[require.resolve('../index')];
      const mempoolJS = require('../index');

      mempoolJS();

      assert.deepStrictEqual(
        configs.map((config) => (config as { baseURL: string }).baseURL),
        ['https://mempool.space/api/', 'https://mempool.space/liquid/api/']
      );
    } finally {
      axios.create = originalCreate;
      delete require.cache[require.resolve('../index')];
    }
  });
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
