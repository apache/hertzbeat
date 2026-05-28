import React from 'react';

import MonitorDetailPage from './monitor-detail-page';

export default async function MonitorDetailRoutePage({ params }: { params: Promise<{ monitorId: string }> }) {
  const resolved = await params;
  return <MonitorDetailPage monitorId={resolved.monitorId} />;
}
