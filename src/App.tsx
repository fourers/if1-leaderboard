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
        points: pointsForPosition(result.Position, pointsSystem.grand_prix),
        status: result.Status,
      },
    );
  }

  for (const result of event.Sprint ?? []) {
    sprintResults.set(
      result.Abbreviation,
      {
        position: result.Position,
        points: pointsForPosition(result.Position, pointsSystem.sprint_race),
        status: result.Status,
      },
    );
  }

  return { event, raceResults, sprintResults };
});

const totalPoints = new Map<string, number>();
for (const { raceResults, sprintResults } of eventPoints) {
  for (const [abbreviation, result] of [...raceResults, ...sprintResults]) {
    totalPoints.set(
      abbreviation,
      (totalPoints.get(abbreviation) ?? 0) + result.points,
    );
  }
}

const rankedDrivers = [...drivers].sort(
  (first, second) =>
    (totalPoints.get(second) ?? 0) - (totalPoints.get(first) ?? 0) ||
    first.localeCompare(second),
);

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
          {result.position}
          {result.points > 0 && (
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
                  {eventPoints.flatMap(({ event, raceResults, sprintResults }) => [
                    ...(event.Sprint?.length
                      ? [
                          <ResultCell
                            key={`${event.RoundNumber}-sprint-${driver}`}
                            result={sprintResults.get(driver)}
                            className=""
                          />,
                        ]
                      : []),
                    <ResultCell
                      key={`${event.RoundNumber}-race-${driver}`}
                      result={raceResults.get(driver)}
                      className="border-r border-white/10"
                    />,
                  ])}
                  <td
                    className="sticky right-0 z-10 border-l border-white/10 bg-[#111318] px-4 py-4 text-center font-bold tabular-nums text-green-200"
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
