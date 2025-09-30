import { lazy } from 'react';

const ServiceAdministration = lazy(() =>
  import('./service-administration' /* webpackChunkName: "service-administration" */)
);

export default ServiceAdministration;
