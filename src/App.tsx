import { Leaderboard } from "./components/Leaderboard";
import { ResultsModal } from "./components/ResultsModal";
import {
  eventPoints,
  getCurrentResult,
  getDefaultSimulation,
  getSeasonStandings,
} from "./season";
import { useAppStore } from "./store";
import type { SessionName } from "./store";
import "./index.css";

export function App() {
  const selectedSession = useAppStore((state) => state.selectedSession);
  const simulatedOrders = useAppStore((state) => state.simulatedOrders);
  const setSelectedSession = useAppStore((state) => state.setSelectedSession);
  const updatePosition = useAppStore((state) => state.adjustPosition);
  const resetSessionPositions = useAppStore((state) => state.resetSessionPositions);
  const resetAllPositions = useAppStore((state) => state.resetAllPositions);

  const selectedEvent = eventPoints.find(
    ({ event }) => event.RoundNumber === selectedSession?.round,
  )?.event;
  const sessionResults = selectedEvent?.[selectedSession?.session ?? "Race"] ?? [];
  const simulationKey = selectedSession
    ? `${selectedSession.round}-${selectedSession.session}`
    : "";
  const defaultSimulation = getDefaultSimulation(sessionResults);
  const hasSessionChanges = simulatedOrders[simulationKey] !== undefined;
  const { totals, originalTotals, rankedDrivers } = getSeasonStandings(
    eventPoints,
    simulatedOrders,
  );
  const getResult = (round: number, session: SessionName, driver: string) =>
    getCurrentResult(eventPoints, simulatedOrders, round, session, driver);

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
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-red-400">
          Formula 1 · 2025 season
        </p>
        <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">
          IF1 Drivers' championship
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
          Drivers' points at every race and sprint, ranked by full-season total.
        </p>
      </header>

      <Leaderboard
        events={eventPoints}
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
