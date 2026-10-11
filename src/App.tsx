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
  const points = new Map<string, number>();

  for (const result of event.Race ?? []) {
    points.set(
      result.Abbreviation,
      (points.get(result.Abbreviation) ?? 0) +
        pointsForPosition(result.Position, pointsSystem.grand_prix),
    );
  }

  for (const result of event.Sprint ?? []) {
    points.set(
      result.Abbreviation,
      (points.get(result.Abbreviation) ?? 0) +
        pointsForPosition(result.Position, pointsSystem.sprint_race),
    );
  }

  return { event, points };
});

const totalPoints = new Map<string, number>();
for (const { points } of eventPoints) {
  for (const [abbreviation, score] of points) {
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
          Points scored at each Grand Prix, with sprint points included where applicable.
          Drivers are ranked by their full-season total.
        </p>
      </header>

      <section
        aria-label="2025 full season drivers’ championship"
        className="overflow-hidden rounded-2xl border border-white/10 bg-[#111318] shadow-2xl shadow-black/20"
      >
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-white/10 px-5 py-5 sm:px-7">
          <div>
            <h2 className="text-xl font-bold text-white">Season points by Grand Prix</h2>
            <p className="mt-1 text-sm text-slate-500">
              {eventPoints.length} rounds · {rankedDrivers.length} drivers
            </p>
          </div>
          <p className="text-xs text-slate-500">Scroll horizontally to see all drivers</p>
        </div>

        <div className="overflow-auto">
          <table className="w-full border-collapse text-left">
            <caption className="sr-only">
              2025 Formula 1 championship points per Grand Prix for each driver
            </caption>
            <thead className="bg-[#171a21] text-xs uppercase tracking-[0.12em] text-slate-400">
              <tr>
                <th
                  className="sticky left-0 z-20 min-w-52 border-b border-r border-white/10 bg-[#171a21] px-5 py-4 font-semibold sm:px-7"
                  scope="col"
                >
                  Grand Prix
                </th>
                {rankedDrivers.map((driver, index) => (
                  <th
                    key={driver}
                    className="min-w-24 border-b border-white/10 px-3 py-4 text-center font-semibold"
                    scope="col"
                  >
                    <span className="block text-[10px] text-slate-500">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="mt-1 block text-sm font-bold tracking-wide text-white">
                      {driver}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {eventPoints.map(({ event, points }) => (
                <tr key={event.RoundNumber} className="transition-colors hover:bg-white/[0.025]">
                  <th
                    className="sticky left-0 z-10 border-r border-white/10 bg-[#111318] px-5 py-4 text-left sm:px-7"
                    scope="row"
                  >
                    <span className="mr-2 text-xs font-semibold tabular-nums text-slate-500">
                      {String(event.RoundNumber).padStart(2, "0")}
                    </span>
                    <span className="font-medium text-slate-200">{event.ShortEventName}</span>
                  </th>
                  {rankedDrivers.map((driver) => {
                    const score = points.get(driver) ?? 0;
                    return (
                      <td
                        key={driver}
                        className={`px-3 py-4 text-center tabular-nums ${
                          score > 0 ? "font-semibold text-white" : "text-slate-600"
                        }`}
                      >
                        {score}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-red-500/10">
              <tr>
                <th
                  className="sticky bottom-0 left-0 z-20 border-r border-t border-red-400/20 bg-[#271316] px-5 py-4 text-left font-bold text-white sm:px-7"
                  scope="row"
                >
                  Season total
                </th>
                {rankedDrivers.map((driver) => (
                  <td
                    key={driver}
                    className="border-t border-red-400/20 px-3 py-4 text-center font-bold tabular-nums text-red-200"
                  >
                    {totalPoints.get(driver) ?? 0}
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    </main>
  );
}

export default App;
