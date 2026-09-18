import dotenv from 'dotenv';
dotenv.config();

import { assertError } from '../utils/assert.utils';
import { deleteAbandonedCartType } from './actions';

async function preUndeploy(): Promise<void> {
  await deleteAbandonedCartType();
}

async function run(): Promise<void> {
  try {
    await preUndeploy();
  } catch (error) {
    assertError(error);
    process.stderr.write(`Pre-undeploy failed: ${error.message}\n`);
    process.exitCode = 1;
  }
}

run();
