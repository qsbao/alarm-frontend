export function formatCauseChipSuffix(clusterSize: number): string {
  const extras = clusterSize - 1;
  if (extras <= 0) return '';
  return extras === 1 ? '+1 alarm' : `+${extras} alarms`;
}
