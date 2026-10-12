import { useEffect, useRef } from "react";
import {
  formatPosition,
  getDefaultSimulation,
  pointsForSession,
  resultStatus,
  type RaceEvent,
  type RaceResult,
} from "../season";
import type { SessionName, SimulatedOrder } from "../store";

type ResultsModalProps = {
  event: RaceEvent | undefined;
  session: SessionName | undefined;
  simulation: SimulatedOrder | undefined;
  hasChanges: boolean;
  onAdjust: (driver: string, direction: "up" | "down") => void;
  onReset: () => void;
  onClose: () => void;
};

export function ResultsModal({
  event,
  session,
  simulation: savedSimulation,
  hasChanges,
  onAdjust,
  onReset,
  onClose,
}: ResultsModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const results: readonly RaceResult[] = event && session ? event[session] ?? [] : [];
  const defaultSimulation = getDefaultSimulation(results);
  const simulation = savedSimulation ?? defaultSimulation;
  const startedCount =
    simulation.startedCount ?? defaultSimulation.startedCount ?? simulation.drivers.length;
  const classifiedCount = Math.min(simulation.classifiedCount, startedCount);
  const resultsByDriver = new Map(results.map((result) => [result.Abbreviation, result]));

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (event && session && !dialog.open) {
      dialog.showModal();
    } else if ((!event || !session) && dialog.open) {
      dialog.close();
    }
  }, [event, session]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="race-results-title"
      className="m-auto max-h-[min(85vh,48rem)] w-[min(64rem,calc(100%-2rem))] overflow-hidden rounded-2xl border border-white/10 bg-[#111318] p-0 text-slate-200 shadow-2xl backdrop:bg-black/70"
      onClick={(clickEvent) => {
        if (clickEvent.target === clickEvent.currentTarget) onClose();
      }}
      onClose={onClose}
    >
      {event && session && (
        <>
          <header className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-5 sm:px-7">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-400">
                Round {event.RoundNumber} · {session} results
              </p>
              <h2 id="race-results-title" className="mt-1 text-2xl font-bold text-white">
                {event.EventName}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-slate-300 transition hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-300 disabled:cursor-not-allowed disabled:opacity-40"
                disabled={!hasChanges}
                onClick={onReset}
                type="button"
              >
                Reset
              </button>
              <button
                aria-label="Close race results"
                className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-slate-300 transition hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-300"
                onClick={onClose}
                type="button"
              >
                Close
              </button>
            </div>
          </header>

          <div className="max-h-[calc(min(85vh,48rem)-6rem)] overflow-auto">
            <table className="w-full border-collapse text-left">
              <caption className="sr-only">
                {event.EventName} {session.toLowerCase()} results and starting grid positions
              </caption>
              <thead className="sticky top-0 bg-[#171a21] text-xs uppercase tracking-[0.12em] text-slate-400">
                <tr>
                  <th className="px-5 py-3 font-semibold sm:px-7" scope="col">Pos</th>
                  <th className="px-4 py-3 font-semibold" scope="col">Original</th>
                  <th className="px-4 py-3 font-semibold" scope="col">Driver</th>
                  <th className="px-4 py-3 font-semibold" scope="col">Team</th>
                  <th className="px-4 py-3 text-right font-semibold" scope="col">Grid</th>
                  <th className="px-5 py-3 text-right font-semibold sm:px-7" scope="col">Points</th>
                  <th className="px-4 py-3 text-right font-semibold" scope="col">Δ Points</th>
                  <th className="px-4 py-3 text-center font-semibold" scope="col">Adjust</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {simulation.drivers.map((driver, index) => {
                  const result = resultsByDriver.get(driver);
                  if (!result) return null;

                  const isDns = index >= startedCount;
                  const isDnf = index >= classifiedCount && !isDns;
                  const currentPosition = isDnf || isDns ? null : index + 1;
                  const positionStatus = isDns
                    ? resultStatus.didNotStart
                    : isDnf
                      ? resultStatus.retired
                      : result.Status === resultStatus.retired ||
                          result.Status === resultStatus.didNotStart
                        ? resultStatus.finished
                        : result.Status;
                  const adjustedPoints = pointsForSession(currentPosition ?? 0, session);
                  const originalPoints =
                    result.Status === resultStatus.retired ||
                    result.Status === resultStatus.didNotStart
                      ? 0
                      : pointsForSession(result.Position, session);
                  const pointsDifference = adjustedPoints - originalPoints;
                  const positionColor = getPositionColor(currentPosition, isDnf || isDns);

                  return (
                    <tr key={result.Abbreviation}>
                      <td className={`px-5 py-3 font-bold tabular-nums sm:px-7 ${positionColor}`}>
                        {formatPosition(currentPosition ?? 0, positionStatus)}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-slate-500">
                        {formatPosition(result.Position, result.Status)}
                      </td>
                      <td className="px-4 py-3 font-semibold text-white">
                        {result.Abbreviation}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-400">{result.TeamName}</td>
                      <td className="px-5 py-3 text-right tabular-nums text-slate-300 sm:px-7">
                        {result.GridPosition ?? "—"}
                      </td>
                      <td className="px-5 py-3 text-right font-semibold tabular-nums text-white sm:px-7">
                        {adjustedPoints}
                      </td>
                      <td
                        aria-label={`${pointsDifference > 0 ? "+" : ""}${pointsDifference} points difference`}
                        className={`px-4 py-3 text-right font-semibold tabular-nums ${
                          pointsDifference > 0
                            ? "text-emerald-300"
                            : pointsDifference < 0
                              ? "text-red-300"
                              : "text-slate-500"
                        }`}
                      >
                        {pointsDifference === 0
                          ? "—"
                          : pointsDifference > 0
                            ? `+${pointsDifference}`
                            : pointsDifference}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            aria-label={
                              index === startedCount
                                ? `Upgrade ${result.Abbreviation} from DNS to DNF`
                                : `Move ${result.Abbreviation} up`
                            }
                            className="flex h-11 w-11 items-center justify-center rounded-lg border border-white/15 bg-[#222630] text-lg font-bold text-slate-200 shadow-[0_2px_0_#08090c] transition-transform hover:border-white/25 hover:bg-[#303541] hover:text-white active:translate-y-0.5 active:shadow-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-300 disabled:cursor-not-allowed disabled:opacity-30 disabled:shadow-none"
                            disabled={
                              index === 0 &&
                              index !== classifiedCount &&
                              index !== startedCount
                            }
                            onClick={() => onAdjust(driver, "up")}
                            type="button"
                          >
                            ▴
                          </button>
                          <button
                            aria-label={`Move ${result.Abbreviation} down`}
                            className="flex h-11 w-11 items-center justify-center rounded-lg border border-white/15 bg-[#222630] text-lg font-bold text-slate-200 shadow-[0_2px_0_#08090c] transition-transform hover:border-white/25 hover:bg-[#303541] hover:text-white active:translate-y-0.5 active:shadow-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-300 disabled:cursor-not-allowed disabled:opacity-30 disabled:shadow-none"
                            disabled={
                              index === simulation.drivers.length - 1 ||
                              (index === startedCount - 1 && index >= classifiedCount)
                            }
                            onClick={() => onAdjust(driver, "down")}
                            type="button"
                          >
                            ▾
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </dialog>
  );
}

function getPositionColor(position: number | null, isRetired: boolean) {
  if (isRetired) return "text-red-300";
  if (position === 1) return "text-amber-300";
  if (position === 2) return "text-sky-300";
  if (position === 3) return "text-amber-600";
  return "text-slate-200";
}
