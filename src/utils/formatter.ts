import { resultStatus } from "../season";

const positionStatusLabels: Readonly<Record<string, string>> = {
  [resultStatus.retired]: "DNF",
  [resultStatus.didNotStart]: "DNS",
  [resultStatus.disqualified]: "DSQ",
};

export function formatPosition(position: number, positionStatus: string): string {
  return positionStatusLabels[positionStatus] ?? position.toString();
}

export function getPositionColour(
  position: number | null,
  positionStatus: string,
  defaultColour = "text-slate-200",
): string {
  if (
    positionStatus === resultStatus.retired ||
    positionStatus === resultStatus.didNotStart ||
    positionStatus === resultStatus.disqualified
  ) {
    return "text-red-300";
  }
  if (position === 1) return "text-amber-300";
  if (position === 2) return "text-sky-300";
  if (position === 3) return "text-amber-600";
  return defaultColour;
}
