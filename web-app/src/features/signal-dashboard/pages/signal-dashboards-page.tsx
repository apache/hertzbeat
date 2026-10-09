/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { HertzBeatTimeZoneProvider } from '@/platform/perses';
import { useSignalDashboardController } from '../controller/use-signal-dashboard-controller';
import { SignalDashboardView } from '../components/signal-dashboard-view';
export function SignalDashboardsPage() {
  const controller = useSignalDashboardController();
  return (
    <HertzBeatTimeZoneProvider timeZone={controller.state.timeZone}>
      <SignalDashboardView key={controller.state.runtimeIdentity} {...controller} />
    </HertzBeatTimeZoneProvider>
  );
}
