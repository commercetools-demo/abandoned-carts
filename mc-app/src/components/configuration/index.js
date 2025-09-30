import { lazy } from 'react';

const Configuration = lazy(() =>
  import('./configuration' /* webpackChunkName: "configuration" */)
);

export default Configuration;
