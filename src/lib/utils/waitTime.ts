// Calculates estimated wait time in minutes based on pending pages
export function calcWaitMinutes(
  pendingPages: number,
  avgPrintTimeSec: number
): number {
  return Math.ceil((pendingPages * avgPrintTimeSec) / 60)
}
