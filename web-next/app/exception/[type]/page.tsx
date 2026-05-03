import React from 'react';
import { ExceptionCenterSurface } from '../../../components/pages/exception-center-surface';

export default async function ExceptionPage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;

  return <ExceptionCenterSurface type={type} />;
}
