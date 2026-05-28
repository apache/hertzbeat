import React from 'react';
import LogManagePage from '../manage/log-manage-page';

export default function LogStreamPage() {
  return (
    <div data-log-stream-canonical-live-route="log-manage-stream">
      <LogManagePage forcedView="stream" showViewToggle={false} />
    </div>
  );
}
