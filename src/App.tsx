import { Leaderboard } from "./components/Leaderboard";
import { ResultsModal } from "./components/ResultsModal";
import {
  getCurrentResult,
  getDefaultSimulation,
  getSeasonStandings,
  getSeasonData,
  seasons,
} from "./season";
import { useAppStore } from "./store";
import type { SessionName } from "./store";
import "./index.css";

export function App() {
  const selectedYear = useAppStore((state) => state.selectedYear);
  const selectedSession = useAppStore((state) => state.selectedSession);
  const simulatedOrders = useAppStore((state) => state.simulatedOrders);
  const setSelectedYear = useAppStore((state) => state.setSelectedYear);
  const setSelectedSession = useAppStore((state) => state.setSelectedSession);
  const updatePosition = useAppStore((state) => state.adjustPosition);
  const resetSessionPositions = useAppStore((state) => state.resetSessionPositions);
  const resetAllPositions = useAppStore((state) => state.resetAllPositions);

  const season = getSeasonData(selectedYear) ?? seasons[0];
  if (!season) {
    return <main className="p-8 text-slate-200">No season data is available.</main>;
  }

  const selectedEvent = season.events.find(
    ({ event }) => event.RoundNumber === selectedSession?.round,
  )?.event;
  const sessionResults = selectedEvent?.[selectedSession?.session ?? "Race"] ?? [];
  const simulationKey = selectedSession
    ? `${selectedYear}-${selectedSession.round}-${selectedSession.session}`
    : "";
  const defaultSimulation = getDefaultSimulation(sessionResults);
  const hasSessionChanges = simulatedOrders[simulationKey] !== undefined;
  const { totals, originalTotals, rankedDrivers } = getSeasonStandings(
    season.events,
    simulatedOrders,
    season.drivers,
    season.year,
  );
  const getResult = (round: number, session: SessionName, driver: string) =>
    getCurrentResult(season.events, simulatedOrders, season.year, round, session, driver);

  const selectSession = (round: number, session: SessionName) => {
    setSelectedSession({ round, session });
  };

  const adjustPosition = (driver: string, direction: "up" | "down") => {
    if (!selectedSession) return;
    updatePosition(simulationKey, defaultSimulation, driver, direction);
  };

  return (
    <main className="mx-auto min-h-screen w-full max-w-[1600px] px-4 py-10 sm:px-8 sm:py-16">
      <header className="mb-8 border-b border-white/10 pb-7">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-red-400">
              Formula 1 · {season.year} season
            </p>
            <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">
              IF1 Drivers' championship
            </h1>
          </div>
          <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-400">
            Season
            <select
              className="min-w-32 rounded-lg border border-white/10 bg-[#1a1d24] px-3 py-2.5 text-sm text-white outline-none transition focus:border-red-400"
              value={season.year}
              onChange={(changeEvent) => setSelectedYear(Number(changeEvent.target.value))}
            >
              {seasons.map(({ year }) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
          Drivers' points at every race and sprint, ranked by full-season total.
        </p>
      </header>

      <Leaderboard
        season={season.year}
        events={season.events}
        rankedDrivers={rankedDrivers}
        totals={totals}
        originalTotals={originalTotals}
        getResult={getResult}
        onSelectSession={selectSession}
        onResetAll={resetAllPositions}
        hasChanges={Object.keys(simulatedOrders).length > 0}
      />

      <ResultsModal
        event={selectedEvent}
        key={`${season.year}-${selectedEvent?.RoundNumber ?? "closed"}`}
        session={selectedSession?.session}
        simulation={simulatedOrders[simulationKey]}
        hasChanges={hasSessionChanges}
        onAdjust={adjustPosition}
        onReset={() => resetSessionPositions(simulationKey)}
        onClose={() => setSelectedSession(null)}
      />
    </main>
  );
}

export default App;
