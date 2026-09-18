import { lazy } from 'react';

const Carts = lazy(() => import('./carts' /* webpackChunkName: "carts" */));

export default Carts;
