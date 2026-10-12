import { useEffect, useState } from "react";
import {
  formatPosition,
  resultStatus,
  type EventSeasonData,
  type ScoredResult,
} from "../season";
import type { SessionName } from "../store";

function ResultCell({
  result,
  originalPosition,
  className,
}: {
  result: ScoredResult | undefined;
  originalPosition: number | undefined;
  className: string;
}) {
  const positionChanged =
    result !== undefined &&
    originalPosition !== undefined &&
    result.position !== originalPosition;
  const resultColor = !result
    ? "text-slate-600"
    : result.status === resultStatus.retired ||
        result.status === resultStatus.didNotStart
      ? "text-red-300"
      : result.position === 1
        ? "text-amber-300"
        : result.position === 2
          ? "text-sky-300"
          : result.position === 3
            ? "text-amber-600"
            : "text-white";

  return (
    <td
      aria-label={
        result
          ? `Position ${result.position}${
              positionChanged ? `, originally ${originalPosition}` : ""
            }, ${result.status}`
          : "No result"
      }
      className={`${className} min-w-16 whitespace-nowrap px-3 py-4 text-center font-semibold tabular-nums ${resultColor}`}
    >
      {result ? (
        <>
          {positionChanged && (
            <sub className="mr-0.5 text-[9px] text-white font-medium opacity-75">
              {originalPosition}{"▸"}
            </sub>
          )}
          {formatPosition(result.position, result.status)}
        </>
      ) : (
        "—"
      )}
    </td>
  );
}

type LeaderboardProps = {
  season: number;
  events: EventSeasonData[];
  rankedDrivers: string[];
  totals: Map<string, number>;
  originalTotals: Map<string, number>;
  getResult: (round: number, session: SessionName, driver: string) => ScoredResult | undefined;
  onSelectSession: (round: number, session: SessionName) => void;
  onResetAll: () => void;
  hasChanges: boolean;
};

export function Leaderboard({
  season,
  events,
  rankedDrivers,
  totals,
  originalTotals,
  getResult,
  onSelectSession,
  onResetAll,
  hasChanges,
}: LeaderboardProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!isFullscreen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsFullscreen(false);
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isFullscreen]);

  return (
    <section
      aria-label={`${season} IF1 Drivers' championship`}
      className={
        isFullscreen
          ? "fixed inset-0 z-50 flex h-dvh w-screen flex-col overflow-hidden bg-[#111318]"
          : "overflow-hidden rounded-2xl border border-white/10 bg-[#111318] shadow-2xl shadow-black/20"
      }
    >
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-white/10 px-5 py-5 sm:px-7">
        <div>
          <h2 className="text-xl font-bold text-white">{season} IF1 Drivers' Championship</h2>
          <p className="mt-1 text-sm text-slate-500">
            {events.length} rounds · {rankedDrivers.length} drivers
          </p>
        </div>
        <div className="flex items-center gap-4">
          <p className="text-xs text-slate-500">You can adjust finishing positions per race.</p>
          <button
            aria-pressed={isFullscreen}
            className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-slate-300 transition hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-300"
            onClick={() => setIsFullscreen((fullscreen) => !fullscreen)}
            type="button"
          >
            {isFullscreen ? "Exit full screen" : "Full screen"}
          </button>
          <button
            className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-slate-300 transition hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-300 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={!hasChanges}
            onClick={onResetAll}
            type="button"
          >
            Reset all
          </button>
        </div>
      </div>

      <div
        className={`leaderboard-scrollbar ${
          isFullscreen ? "min-h-0 flex-1 overflow-auto" : "overflow-auto"
        }`}
      >
        <table className="w-full border-collapse text-left">
          <caption className="sr-only">
            {season} Formula 1 championship points per race and sprint for each driver
          </caption>
          <thead className="sticky top-0 z-20 bg-[#171a21] text-xs uppercase tracking-[0.12em] text-slate-400">
            <tr>
              <th
                className="leaderboard-pinned-left sticky left-0 z-30 min-w-20 border-b border-white/10 bg-[#171a21] px-5 py-4 font-semibold sm:px-7"
                rowSpan={2}
                scope="col"
              >
                Driver
              </th>
              {events.map(({ event }, eventIndex) => (
                <th
                  key={event.RoundNumber}
                  className={`min-w-32 border-b border-white/10 px-3 py-3 text-center font-semibold ${
                    eventIndex < events.length - 1 ? "border-r" : ""
                  }`}
                  colSpan={event.Sprint?.length ? 2 : 1}
                  scope="col"
                >
                  <span className="block text-[10px] text-slate-500">
                    Round {event.RoundNumber}
                  </span>
                  <button
                    className="mt-1 block w-full cursor-pointer text-sm font-bold tracking-wide text-white underline decoration-white/20 underline-offset-4 transition hover:text-red-300 hover:decoration-red-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-red-300"
                    onClick={() => onSelectSession(event.RoundNumber, "Race")}
                    type="button"
                  >
                    {event.ShortEventName}
                  </button>
                </th>
              ))}
              <th
                className="leaderboard-pinned-right sticky right-0 z-20 min-w-28 border-b border-white/10 bg-[#171a21] px-4 py-4 text-center font-semibold"
                rowSpan={2}
                scope="col"
              >
                Total
              </th>
            </tr>
            <tr>
              {events.flatMap(({ event, raceResults, sprintResults }, eventIndex) => [
                ...(event.Sprint?.length
                  ? [
                      <th
                        key={`${event.RoundNumber}-sprint-label`}
                        className="border-b border-white/10 px-3 pb-3 pt-3 text-center text-[10px] font-medium tracking-normal text-slate-500"
                        scope="col"
                      >
                        <button
                          className="cursor-pointer underline decoration-white/20 underline-offset-4 transition hover:text-red-300 hover:decoration-red-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-red-300"
                          onClick={() => onSelectSession(event.RoundNumber, "Sprint")}
                          type="button"
                        >
                          Sprint
                        </button>
                      </th>,
                    ]
                  : []),
                <th
                  key={`${event.RoundNumber}-race-label`}
                  className={`border-b border-white/10 px-3 pb-3 pt-3 text-center text-[10px] font-medium tracking-normal text-slate-500 ${
                    eventIndex < events.length - 1 ? "border-r" : ""
                  }`}
                  scope="col"
                >
                  <button
                    className="cursor-pointer underline decoration-white/20 underline-offset-4 transition hover:text-red-300 hover:decoration-red-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-red-300"
                    onClick={() => onSelectSession(event.RoundNumber, "Race")}
                    type="button"
                  >
                    Race
                  </button>
                </th>,
              ])}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.06]">
            {rankedDrivers.map((driver, index) => {
              const total = totals.get(driver) ?? 0;
              const originalTotal = originalTotals.get(driver) ?? 0;
              const adjustment = total - originalTotal;

              return (
                <tr key={driver} className="transition-colors hover:bg-white/[0.025]">
                  <th
                    className="leaderboard-pinned-left sticky left-0 z-10 bg-[#111318] px-5 py-4 text-left sm:px-7"
                    scope="row"
                  >
                    <span className="mr-2 text-xs font-semibold tabular-nums text-slate-500">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="font-bold tracking-wide text-slate-200">{driver}</span>
                  </th>
                  {events.flatMap(({ event, raceResults, sprintResults }, eventIndex) => [
                    ...(event.Sprint?.length
                      ? [
                          <ResultCell
                            key={`${event.RoundNumber}-sprint-${driver}`}
                            result={getResult(event.RoundNumber, "Sprint", driver)}
                            originalPosition={sprintResults.get(driver)?.position}
                            className=""
                          />,
                        ]
                      : []),
                    <ResultCell
                      key={`${event.RoundNumber}-race-${driver}`}
                      result={getResult(event.RoundNumber, "Race", driver)}
                      originalPosition={raceResults.get(driver)?.position}
                      className={eventIndex < events.length - 1 ? "border-r border-white/10" : ""}
                    />,
                  ])}
                  <td
                    aria-label={`Season total ${total} points${
                      adjustment === 0
                        ? ""
                        : `, ${adjustment > 0 ? "increased" : "decreased"} by ${Math.abs(adjustment)}`
                    }`}
                    className="leaderboard-pinned-right sticky right-0 z-10 bg-[#111318] px-4 py-4 text-center font-bold tabular-nums text-green-200"
                  >
                    {total}
                    {adjustment !== 0 && (
                      <sup className="ml-0.5 text-[9px] font-medium text-white">
                        {originalTotal}
                        {adjustment > 0 ? `+${adjustment}` : adjustment}
                      </sup>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
