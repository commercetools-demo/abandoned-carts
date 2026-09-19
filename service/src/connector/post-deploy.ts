import dotenv from 'dotenv';
dotenv.config();

import { createApiRoot } from '../client/create.client';
import { assertError } from '../utils/assert.utils';
import { ensureAbandonedCartType } from './actions';

async function postDeploy(): Promise<void> {
  const apiRoot = createApiRoot();
  await ensureAbandonedCartType(apiRoot);
}

async function run(): Promise<void> {
  try {
    await postDeploy();
  } catch (error) {
    assertError(error);
    process.stderr.write(`Post-deploy failed: ${error.message}\n`);
    process.exitCode = 1;
  }
}

run();
