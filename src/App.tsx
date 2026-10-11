import eventData from "./2025.json";
import "./index.css";

type ScoringSystem = {
  scoring_positions: number;
  points_allocation: Record<string, number>;
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

const drivers = Array.from(
  new Set(
    eventData.flatMap((event) =>
      [...(event.Race ?? []), ...(event.Sprint ?? [])].map((result) => result.Abbreviation),
    ),
  ),
);

const eventPoints = eventData.map((event) => {
  const racePoints = new Map<string, number>();
  const sprintPoints = new Map<string, number>();

  for (const result of event.Race ?? []) {
    racePoints.set(
      result.Abbreviation,
      (racePoints.get(result.Abbreviation) ?? 0) +
        pointsForPosition(result.Position, pointsSystem.grand_prix),
    );
  }

  for (const result of event.Sprint ?? []) {
    sprintPoints.set(
      result.Abbreviation,
      (sprintPoints.get(result.Abbreviation) ?? 0) +
        pointsForPosition(result.Position, pointsSystem.sprint_race),
    );
  }

  return { event, racePoints, sprintPoints };
});

const totalPoints = new Map<string, number>();
for (const { racePoints, sprintPoints } of eventPoints) {
  for (const [abbreviation, score] of [...racePoints, ...sprintPoints]) {
    totalPoints.set(abbreviation, (totalPoints.get(abbreviation) ?? 0) + score);
  }
}

const rankedDrivers = [...drivers].sort(
  (first, second) =>
    (totalPoints.get(second) ?? 0) - (totalPoints.get(first) ?? 0) ||
    first.localeCompare(second),
);

export function App() {
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
                    <span className="mt-1 block text-sm font-bold tracking-wide text-white">
                      {event.ShortEventName}
                    </span>
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
                          Sprint
                        </th>,
                      ]
                    : []),
                  <th
                    key={`${event.RoundNumber}-race-label`}
                    className="border-b border-r border-white/10 px-3 pb-3 pt-3 text-center text-[10px] font-medium tracking-normal text-slate-500"
                    scope="col"
                  >
                    Race
                  </th>,
                ])}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {rankedDrivers.map((driver, index) => (
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
                  {eventPoints.flatMap(({ event, racePoints, sprintPoints }) => [
                    ...(event.Sprint?.length
                      ? [
                          <td
                            key={`${event.RoundNumber}-sprint-${driver}`}
                            className={`min-w-16 px-3 py-4 text-center tabular-nums ${
                              (sprintPoints.get(driver) ?? 0) > 0
                                ? "font-semibold text-white"
                                : "text-slate-600"
                            }`}
                          >
                            {sprintPoints.get(driver) ?? 0}
                          </td>,
                        ]
                      : []),
                    <td
                      key={`${event.RoundNumber}-race-${driver}`}
                      className={`min-w-16 border-r border-white/10 px-3 py-4 text-center tabular-nums ${
                        (racePoints.get(driver) ?? 0) > 0
                          ? "font-semibold text-white"
                          : "text-slate-600"
                      }`}
                    >
                      {racePoints.get(driver) ?? 0}
                    </td>,
                  ])}
                  <td
                    className="sticky right-0 z-10 border-l border-white/10 bg-[#111318] px-4 py-4 text-center font-bold tabular-nums text-red-200"
                  >
                    {totalPoints.get(driver) ?? 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

export default App;
