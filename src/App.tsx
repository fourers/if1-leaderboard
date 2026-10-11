import { useEffect, useRef, useState } from "react";
import eventData from "./2025.json";
import "./index.css";

type ScoringSystem = {
  scoring_positions: number;
  points_allocation: Record<string, number>;
};
type SessionName = "Race" | "Sprint";
type SimulatedOrder = {
  drivers: string[];
  classifiedCount: number;
};

const pointsSystem: Record<"grand_prix" | "sprint_race", ScoringSystem> = {
  grand_prix: {
    scoring_positions: 10,
    points_allocation: {
      "1": 25,
      "2": 18,
      "3": 15,
      "4": 12,
      "5": 10,
      "6": 8,
      "7": 6,
      "8": 4,
      "9": 2,
      "10": 1,
    },
  },
  sprint_race: {
    scoring_positions: 8,
    points_allocation: {
      "1": 8,
      "2": 7,
      "3": 6,
      "4": 5,
      "5": 4,
      "6": 3,
      "7": 2,
      "8": 1,
    },
  },
};

function pointsForPosition(position: number, scoring: ScoringSystem) {
  if (position < 1 || position > scoring.scoring_positions) {
    return 0;
  }

  return scoring.points_allocation[String(position)] ?? 0;
}

function swapDrivers(drivers: string[], firstIndex: number, secondIndex: number) {
  const firstDriver = drivers[firstIndex];
  const secondDriver = drivers[secondIndex];
  if (firstDriver === undefined || secondDriver === undefined) return;

  drivers[firstIndex] = secondDriver;
  drivers[secondIndex] = firstDriver;
}

const drivers = Array.from(
  new Set(
    eventData.flatMap((event) =>
      [...(event.Race ?? []), ...(event.Sprint ?? [])].map((result) => result.Abbreviation),
    ),
  ),
);

const eventPoints = eventData.map((event) => {
  const raceResults = new Map<
    string,
    { position: number; points: number; status: string }
  >();
  const sprintResults = new Map<
    string,
    { position: number; points: number; status: string }
  >();

  for (const result of event.Race ?? []) {
    raceResults.set(
      result.Abbreviation,
      {
        position: result.Position,
        points:
          result.Status === "Retired"
            ? 0
            : pointsForPosition(result.Position, pointsSystem.grand_prix),
        status: result.Status,
      },
    );
  }

  for (const result of event.Sprint ?? []) {
    sprintResults.set(
      result.Abbreviation,
      {
        position: result.Position,
        points:
          result.Status === "Retired"
            ? 0
            : pointsForPosition(result.Position, pointsSystem.sprint_race),
        status: result.Status,
      },
    );
  }

  return { event, raceResults, sprintResults };
});

function ResultCell({
  result,
  className,
}: {
  result: { position: number; points: number; status: string } | undefined;
  className: string;
}) {
  const resultColor = !result
    ? "text-slate-600"
    : result.status === "Retired"
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
          ? `Position ${result.position}, ${result.points} points, ${result.status}`
          : "No result"
      }
      className={`${className} min-w-16 px-3 py-4 text-center font-semibold tabular-nums ${resultColor}`}
    >
      {result ? (
        <>
          {result.status === "Retired" ? "RET" : result.position}
          {result.status !== "Retired" && result.points > 0 && (
            <sup className="ml-0.5 text-[9px] font-medium opacity-75">{result.points}</sup>
          )}
        </>
      ) : (
        "—"
      )}
    </td>
  );
}

export function App() {
  const [selectedSession, setSelectedSession] = useState<{
    round: number;
    session: SessionName;
  } | null>(null);
  const [simulatedOrders, setSimulatedOrders] = useState<Record<string, SimulatedOrder>>({});
  const raceDialogRef = useRef<HTMLDialogElement>(null);
  const selectedEvent = eventData.find(
    (event) => event.RoundNumber === selectedSession?.round,
  );
  const sessionResults = selectedEvent?.[selectedSession?.session ?? "Race"] ?? [];
  const simulationKey = selectedSession
    ? `${selectedSession.round}-${selectedSession.session}`
    : "";
  const originalOrder = [...sessionResults].sort(
    (first, second) => first.Position - second.Position,
  );
  const defaultSimulation: SimulatedOrder = {
    drivers: originalOrder.map((result) => result.Abbreviation),
    classifiedCount: originalOrder.filter((result) => result.Status !== "Retired").length,
  };
  const simulation = simulatedOrders[simulationKey] ?? defaultSimulation;
  const resultsByDriver = new Map(
    sessionResults.map((result) => [result.Abbreviation, result]),
  );
  const hasSimulationChanges = simulatedOrders[simulationKey] !== undefined;
  const getCurrentResult = (
    round: number,
    session: SessionName,
    driver: string,
  ) => {
    const event = eventPoints.find(({ event }) => event.RoundNumber === round);
    const original = session === "Race"
      ? event?.raceResults.get(driver)
      : event?.sprintResults.get(driver);
    if (!event || !original) return undefined;

    const order = simulatedOrders[`${round}-${session}`];
    if (!order) return original;

    const index = order.drivers.indexOf(driver);
    if (index < 0) return original;

    const isRetired = index >= order.classifiedCount;
    const scoring = session === "Sprint"
      ? pointsSystem.sprint_race
      : pointsSystem.grand_prix;
    const position = isRetired ? original.position : index + 1;
    const status = isRetired
      ? "Retired"
      : original.status === "Retired"
        ? "Finished"
        : original.status;

    return {
      ...original,
      position,
      status,
      points: status === "Retired" ? 0 : pointsForPosition(position, scoring),
    };
  };

  const totalPoints = new Map<string, number>(drivers.map((driver) => [driver, 0]));
  for (const { event } of eventPoints) {
    for (const driver of drivers) {
      const racePoints = getCurrentResult(event.RoundNumber, "Race", driver)?.points ?? 0;
      const sprintPoints = getCurrentResult(event.RoundNumber, "Sprint", driver)?.points ?? 0;
      totalPoints.set(driver, (totalPoints.get(driver) ?? 0) + racePoints + sprintPoints);
    }
  }

  const rankedDrivers = [...drivers].sort(
    (first, second) =>
      (totalPoints.get(second) ?? 0) - (totalPoints.get(first) ?? 0) ||
      first.localeCompare(second),
  );

  const adjustPosition = (driver: string, direction: "up" | "down") => {
    if (!selectedSession) return;

    setSimulatedOrders((current) => {
      const activeSimulation = current[simulationKey] ?? defaultSimulation;
      const drivers = [...activeSimulation.drivers];
      const index = drivers.indexOf(driver);
      if (index < 0) return current;

      let classifiedCount = activeSimulation.classifiedCount;
      if (direction === "up") {
        if (index === classifiedCount && index < drivers.length) {
          classifiedCount += 1;
        } else if (index > 0) {
          swapDrivers(drivers, index - 1, index);
        }
      } else if (index === classifiedCount - 1) {
        classifiedCount -= 1;
      } else if (index >= classifiedCount && index < drivers.length - 1) {
        swapDrivers(drivers, index, index + 1);
      } else if (index < classifiedCount - 1) {
        swapDrivers(drivers, index, index + 1);
      }

      return {
        ...current,
        [simulationKey]: { drivers, classifiedCount },
      };
    });
  };

  const resetPositions = () => {
    setSimulatedOrders((current) => {
      const { [simulationKey]: _, ...remaining } = current;
      return remaining;
    });
  };

  useEffect(() => {
    const dialog = raceDialogRef.current;
    if (!dialog) return;

    if (selectedEvent && !dialog.open) {
      dialog.showModal();
    } else if (!selectedEvent && dialog.open) {
      dialog.close();
    }
  }, [selectedEvent]);

  return (
    <main className="mx-auto min-h-screen w-full max-w-[1600px] px-4 py-10 sm:px-8 sm:py-16">
      <header className="mb-8 border-b border-white/10 pb-7">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-red-400">
          Formula 1 · 2025 season
        </p>
        <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">
          Drivers’ championship
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
          Drivers’ points at every race and sprint, ranked by full-season total.
        </p>
      </header>

      <section
        aria-label="2025 full season drivers’ championship"
        className="overflow-hidden rounded-2xl border border-white/10 bg-[#111318] shadow-2xl shadow-black/20"
      >
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-white/10 px-5 py-5 sm:px-7">
          <div>
            <h2 className="text-xl font-bold text-white">Season points by event</h2>
            <p className="mt-1 text-sm text-slate-500">
              {eventPoints.length} rounds · {rankedDrivers.length} drivers
            </p>
          </div>
          <p className="text-xs text-slate-500">Scroll horizontally to see all rounds</p>
        </div>

        <div className="overflow-auto">
          <table className="w-full border-collapse text-left">
            <caption className="sr-only">
              2025 Formula 1 championship points per race and sprint for each driver
            </caption>
            <thead className="bg-[#171a21] text-xs uppercase tracking-[0.12em] text-slate-400">
              <tr>
                <th
                  className="sticky left-0 z-30 min-w-20 border-b border-r border-white/10 bg-[#171a21] px-5 py-4 font-semibold sm:px-7"
                  rowSpan={2}
                  scope="col"
                >
                  Driver
                </th>
                {eventPoints.map(({ event }) => (
                  <th
                    key={event.RoundNumber}
                    className="min-w-32 border-b border-r border-white/10 px-3 py-3 text-center font-semibold"
                    colSpan={event.Sprint?.length ? 2 : 1}
                    scope="col"
                  >
                    <span className="block text-[10px] text-slate-500">Round {event.RoundNumber}</span>
                    <button
                      className="mt-1 block w-full cursor-pointer text-sm font-bold tracking-wide text-white underline decoration-white/20 underline-offset-4 transition hover:text-red-300 hover:decoration-red-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-red-300"
                      onClick={() =>
                        setSelectedSession({ round: event.RoundNumber, session: "Race" })
                      }
                      type="button"
                    >
                      {event.ShortEventName}
                    </button>
                  </th>
                ))}
                <th
                  className="sticky right-0 z-20 min-w-28 border-b border-l border-white/10 bg-[#171a21] px-4 py-4 text-center font-semibold"
                  rowSpan={2}
                  scope="col"
                >
                  Total
                </th>
              </tr>
              <tr>
                {eventPoints.flatMap(({ event }) => [
                  ...(event.Sprint?.length
                    ? [
                        <th
                          key={`${event.RoundNumber}-sprint-label`}
                          className="border-b border-white/10 px-3 pb-3 pt-3 text-center text-[10px] font-medium tracking-normal text-slate-500"
                          scope="col"
                        >
                          <button
                            className="cursor-pointer underline decoration-white/20 underline-offset-4 transition hover:text-red-300 hover:decoration-red-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-red-300"
                            onClick={() =>
                              setSelectedSession({
                                round: event.RoundNumber,
                                session: "Sprint",
                              })
                            }
                            type="button"
                          >
                            Sprint
                          </button>
                        </th>,
                      ]
                    : []),
                  <th
                    key={`${event.RoundNumber}-race-label`}
                    className="border-b border-r border-white/10 px-3 pb-3 pt-3 text-center text-[10px] font-medium tracking-normal text-slate-500"
                    scope="col"
                  >
                    <button
                      className="cursor-pointer underline decoration-white/20 underline-offset-4 transition hover:text-red-300 hover:decoration-red-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-red-300"
                      onClick={() =>
                        setSelectedSession({ round: event.RoundNumber, session: "Race" })
                      }
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
                const originalTotal = eventPoints.reduce((total, { raceResults, sprintResults }) => {
                  return (
                    total +
                    (raceResults.get(driver)?.points ?? 0) +
                    (sprintResults.get(driver)?.points ?? 0)
                  );
                }, 0);
                const pointsAdjustment = (totalPoints.get(driver) ?? 0) - originalTotal;

                return (
                  <tr key={driver} className="transition-colors hover:bg-white/[0.025]">
                    <th
                      className="sticky left-0 z-10 border-r border-white/10 bg-[#111318] px-5 py-4 text-left sm:px-7"
                      scope="row"
                    >
                      <span className="mr-2 text-xs font-semibold tabular-nums text-slate-500">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="font-bold tracking-wide text-slate-200">{driver}</span>
                    </th>
                    {eventPoints.flatMap(({ event }) => [
                      ...(event.Sprint?.length
                        ? [
                            <ResultCell
                              key={`${event.RoundNumber}-sprint-${driver}`}
                              result={getCurrentResult(event.RoundNumber, "Sprint", driver)}
                              className=""
                            />,
                          ]
                        : []),
                      <ResultCell
                        key={`${event.RoundNumber}-race-${driver}`}
                        result={getCurrentResult(event.RoundNumber, "Race", driver)}
                        className="border-r border-white/10"
                      />,
                    ])}
                    <td
                      aria-label={`Season total ${totalPoints.get(driver) ?? 0} points${
                        pointsAdjustment === 0
                          ? ""
                          : `, ${pointsAdjustment > 0 ? "increased" : "decreased"} by ${Math.abs(pointsAdjustment)}`
                      }`}
                      className="sticky right-0 z-10 border-l border-white/10 bg-[#111318] px-4 py-4 text-center font-bold tabular-nums text-green-200"
                    >
                      {totalPoints.get(driver) ?? 0}
                      {pointsAdjustment !== 0 && (
                        <sup className="ml-0.5 text-[9px] font-medium">
                          <span className="text-white">{originalTotal}{pointsAdjustment > 0 ? `+${pointsAdjustment}` : pointsAdjustment}</span>
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

      <dialog
        ref={raceDialogRef}
        aria-labelledby="race-results-title"
        className="m-auto max-h-[min(85vh,48rem)] w-[min(64rem,calc(100%-2rem))] overflow-hidden rounded-2xl border border-white/10 bg-[#111318] p-0 text-slate-200 shadow-2xl backdrop:bg-black/70"
        onClick={(clickEvent) => {
          if (clickEvent.target === clickEvent.currentTarget) {
            setSelectedSession(null);
          }
        }}
        onClose={() => setSelectedSession(null)}
      >
        {selectedEvent && (
          <>
            <header className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-5 sm:px-7">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-400">
                  Round {selectedEvent.RoundNumber} · {selectedSession?.session} results
                </p>
                <h2 id="race-results-title" className="mt-1 text-2xl font-bold text-white">
                  {selectedEvent.EventName}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-slate-300 transition hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-300 disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={!hasSimulationChanges}
                  onClick={resetPositions}
                  type="button"
                >
                  Reset
                </button>
                <button
                  aria-label="Close race results"
                  className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-slate-300 transition hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-300"
                  onClick={() => setSelectedSession(null)}
                  type="button"
                >
                  Close
                </button>
              </div>
            </header>

            <div className="max-h-[calc(min(85vh,48rem)-6rem)] overflow-auto">
              <table className="w-full border-collapse text-left">
                <caption className="sr-only">
                  {selectedEvent.EventName} {selectedSession?.session.toLowerCase()} results and starting grid positions
                </caption>
                <thead className="sticky top-0 bg-[#171a21] text-xs uppercase tracking-[0.12em] text-slate-400">
                  <tr>
                    <th className="px-5 py-3 font-semibold sm:px-7" scope="col">Pos</th>
                    <th className="px-4 py-3 font-semibold" scope="col">Original</th>
                    <th className="px-4 py-3 font-semibold" scope="col">Driver</th>
                    <th className="px-4 py-3 font-semibold" scope="col">Team</th>
                    <th className="px-4 py-3 text-right font-semibold" scope="col">
                      Grid
                    </th>
                    <th className="px-5 py-3 text-right font-semibold sm:px-7" scope="col">
                      Points
                    </th>
                    <th className="px-4 py-3 text-right font-semibold" scope="col">
                      Δ Points
                    </th>
                    <th className="px-4 py-3 text-center font-semibold" scope="col">
                      Adjust
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {simulation.drivers.map((driver, index) => {
                    const result = resultsByDriver.get(driver);
                    if (!result) return null;
                    const isRetired = index >= simulation.classifiedCount;
                    const currentPosition = isRetired ? null : index + 1;
                    const scoring =
                      selectedSession?.session === "Sprint"
                        ? pointsSystem.sprint_race
                        : pointsSystem.grand_prix;
                    const adjustedPoints = pointsForPosition(currentPosition ?? 0, scoring);
                    const originalPoints =
                      result.Status === "Retired"
                        ? 0
                        : pointsForPosition(result.Position, scoring);
                    const pointsDifference = adjustedPoints - originalPoints;
                    const positionColor = isRetired
                      ? "text-red-300"
                      : currentPosition === 1
                        ? "text-amber-300"
                        : currentPosition === 2
                          ? "text-sky-300"
                          : currentPosition === 3
                            ? "text-amber-600"
                            : "text-slate-200";

                    return (
                      <tr key={result.Abbreviation}>
                        <td
                          className={`px-5 py-3 font-bold tabular-nums sm:px-7 ${positionColor}`}
                        >
                          {isRetired ? "RET" : currentPosition}
                        </td>
                        <td className="px-4 py-3 tabular-nums text-slate-500">
                          {result.Position}
                        </td>
                        <td className="px-4 py-3 font-semibold text-white">
                          {result.Abbreviation}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-400">
                          {result.TeamName}
                        </td>
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
                                aria-label={`Move ${result.Abbreviation} up`}
                                className="flex h-11 w-11 items-center justify-center rounded-lg border border-white/15 bg-[#222630] text-lg font-bold text-slate-200 shadow-[0_2px_0_#08090c] transition hover:border-white/25 hover:bg-[#303541] hover:text-white active:translate-y-0.5 active:shadow-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-300 disabled:cursor-not-allowed disabled:opacity-30 disabled:shadow-none"
                                disabled={index === 0}
                                onClick={() => adjustPosition(driver, "up")}
                                type="button"
                              >
                                ↑
                              </button>
                              <button
                                aria-label={`Move ${result.Abbreviation} down`}
                                className="flex h-11 w-11 items-center justify-center rounded-lg border border-white/15 bg-[#222630] text-lg font-bold text-slate-200 shadow-[0_2px_0_#08090c] transition hover:border-white/25 hover:bg-[#303541] hover:text-white active:translate-y-0.5 active:shadow-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-300 disabled:cursor-not-allowed disabled:opacity-30 disabled:shadow-none"
                                disabled={isRetired && index === simulation.drivers.length - 1}
                                onClick={() => adjustPosition(driver, "down")}
                                type="button"
                              >
                                ↓
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
    </main>
  );
}

export default App;
