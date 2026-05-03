export function shouldShowStreamPauseOverlay({ isPaused, itemCount }: { isPaused: boolean; itemCount: number }) {
  return isPaused && itemCount > 0;
}

export function shouldShowStreamBackpressureNotice(droppedCount: number) {
  return droppedCount > 0;
}
