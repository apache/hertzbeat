/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { ServicesView } from '../components/services-view';
import { useServicesController } from '../controller/use-services-controller';
export function ServicesPage() {
  return <ServicesView {...useServicesController()} />;
}
