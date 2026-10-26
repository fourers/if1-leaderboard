import { create } from "zustand";
import { persist } from "zustand/middleware";

export type SessionName = "Race" | "Sprint";

export type SimulatedOrder = {
  drivers: string[];
  classifiedCount: number;
  startedCount?: number;
  resultsVoided?: boolean;
};

type SelectedSession = {
  round: number;
  session: SessionName;
};

type AppState = {
  selectedYear: number;
  selectedSession: SelectedSession | null;
  simulatedOrders: Record<string, SimulatedOrder>;
  setSelectedYear: (year: number) => void;
  setSelectedSession: (session: SelectedSession | null) => void;
  adjustPosition: (
    key: string,
    defaultOrder: SimulatedOrder,
    driver: string,
    direction: "up" | "down",
  ) => void;
  toggleResultsVoided: (key: string, defaultOrder: SimulatedOrder) => void;
  resetSessionPositions: (key: string) => void;
  resetAllPositions: () => void;
};

function swapDrivers(drivers: string[], firstIndex: number, secondIndex: number) {
  const firstDriver = drivers[firstIndex];
  const secondDriver = drivers[secondIndex];
  if (firstDriver === undefined || secondDriver === undefined) return;

  drivers[firstIndex] = secondDriver;
  drivers[secondIndex] = firstDriver;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      selectedYear: 2026,
      selectedSession: null,
      simulatedOrders: {},
      setSelectedYear: (selectedYear) =>
        set({ selectedYear, selectedSession: null, simulatedOrders: {} }),
      setSelectedSession: (selectedSession) => set({ selectedSession }),
      adjustPosition: (key, defaultOrder, driver, direction) =>
        set((state) => {
          const activeSimulation = state.simulatedOrders[key] ?? defaultOrder;
          const drivers = [...activeSimulation.drivers];
          const index = drivers.indexOf(driver);
          if (index < 0) return state;

          let startedCount =
            Math.min(
              activeSimulation.startedCount ?? defaultOrder.startedCount ?? drivers.length,
              drivers.length,
            );
          let classifiedCount = Math.min(activeSimulation.classifiedCount, startedCount);
          if (direction === "up") {
            if (index === startedCount && index < drivers.length) {
              startedCount += 1;
            } else if (index === classifiedCount && index < startedCount) {
              classifiedCount += 1;
            } else if (index > 0) {
              swapDrivers(drivers, index - 1, index);
            }
          } else if (index === classifiedCount - 1) {
            classifiedCount -= 1;
          } else if (index < classifiedCount - 1) {
            swapDrivers(drivers, index, index + 1);
          } else if (
            index >= classifiedCount &&
            index < startedCount - 1
          ) {
            swapDrivers(drivers, index, index + 1);
          } else if (index >= startedCount && index < drivers.length - 1) {
            swapDrivers(drivers, index, index + 1);
          }

          return {
            simulatedOrders: {
              ...state.simulatedOrders,
              [key]: {
                ...activeSimulation,
                drivers,
                classifiedCount,
                startedCount,
              },
            },
          };
        }),
      toggleResultsVoided: (key, defaultOrder) =>
        set((state) => {
          const activeSimulation = state.simulatedOrders[key] ?? defaultOrder;
          return {
            simulatedOrders: {
              ...state.simulatedOrders,
              [key]: {
                ...activeSimulation,
                resultsVoided: !activeSimulation.resultsVoided,
              },
            },
          };
        }),
      resetSessionPositions: (key) =>
        set((state) => {
          const { [key]: _removed, ...simulatedOrders } = state.simulatedOrders;
          return { simulatedOrders };
        }),
      resetAllPositions: () => set({ simulatedOrders: {} }),
    }),
    {
      name: "f1-leaderboard-state",
      version: 4,
      migrate: (persistedState, version) => {
        if (version >= 4 || typeof persistedState !== "object" || persistedState === null) {
          return persistedState as AppState;
        }

        const previousState = persistedState as Partial<
          Pick<AppState, "selectedYear" | "selectedSession" | "simulatedOrders">
        >;
        const year = previousState.selectedYear ?? 2025;
        const simulatedOrders = Object.fromEntries(
          Object.entries(previousState.simulatedOrders ?? {}).map(([key, order]) => {
            const migratedKey = /^\d{4}-\d+-(Race|Sprint)$/.test(key)
              ? key
              : `${year}-${key}`;
            const { eventVoided, ...simulation } = order as SimulatedOrder & {
              eventVoided?: boolean;
            };

            return [
              migratedKey,
              {
                ...simulation,
                ...(version < 4 && eventVoided ? { resultsVoided: true } : {}),
              },
            ];
          }),
        );

        return {
          selectedYear: year,
          selectedSession: previousState.selectedSession ?? null,
          simulatedOrders,
        } as AppState;
      },
    },
  ),
);
