import React from 'react';
import { ExceptionCenterSurface } from '../../../components/pages/exception-center-surface';
import { normalizeExceptionRouteType } from '../../../lib/exception-center/view-model';

export default async function ExceptionPage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;
  const normalizedType = normalizeExceptionRouteType(type);

  return <ExceptionCenterSurface type={normalizedType} />;
}
