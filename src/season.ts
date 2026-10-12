import seasonData from "./season_data.json";
import type { SimulatedOrder, SessionName } from "./store";

type SeasonRecord = (typeof seasonData)[number];
type ScoringSystem = {
  scoring_positions: number;
  points_allocation: Record<string, number>;
};

export type RaceEvent = SeasonRecord["Events"][number];
export type RaceResult = {
  Abbreviation: string;
  Position: number;
  GridPosition?: number;
  Status: string;
  TeamName: string;
};
export type ScoredResult = {
  position: number;
  points: number;
  status: string;
};
export type EventSeasonData = {
  event: RaceEvent;
  raceResults: Map<string, ScoredResult>;
  sprintResults: Map<string, ScoredResult>;
};
export type SeasonData = {
  year: number;
  events: EventSeasonData[];
  drivers: string[];
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

export function pointsForPosition(position: number, scoring: ScoringSystem) {
  if (position < 1 || position > scoring.scoring_positions) {
    return 0;
  }

  return scoring.points_allocation[String(position)] ?? 0;
}

export function pointsForSession(position: number, session: SessionName) {
  return pointsForPosition(
    position,
    session === "Sprint" ? pointsSystem.sprint_race : pointsSystem.grand_prix,
  );
}

export const seasons: SeasonData[] = seasonData.map(({ Season, Events }) => {
  const events = Events.map((event) => {
    const raceResults = new Map<string, ScoredResult>();
    const sprintResults = new Map<string, ScoredResult>();

    for (const result of event.Race ?? []) {
      raceResults.set(result.Abbreviation, {
        position: result.Position,
        points:
          result.Status === "Retired"
            ? 0
            : pointsForPosition(result.Position, pointsSystem.grand_prix),
        status: result.Status,
      });
    }

    for (const result of event.Sprint ?? []) {
      sprintResults.set(result.Abbreviation, {
        position: result.Position,
        points:
          result.Status === "Retired"
            ? 0
            : pointsForPosition(result.Position, pointsSystem.sprint_race),
        status: result.Status,
      });
    }

    return { event, raceResults, sprintResults };
  });
  const drivers = Array.from(
    new Set(
      Events.flatMap((event) =>
        [...(event.Race ?? []), ...(event.Sprint ?? [])].map((result) => result.Abbreviation),
      ),
    ),
  );

  return { year: Season, events, drivers };
});

export function getSeasonData(year: number) {
  return seasons.find((season) => season.year === year);
}

export function getCurrentResult(
  events: EventSeasonData[],
  simulatedOrders: Record<string, SimulatedOrder>,
  year: number,
  round: number,
  session: SessionName,
  driver: string,
): ScoredResult | undefined {
  const event = events.find(({ event }) => event.RoundNumber === round);
  const original =
    session === "Race"
      ? event?.raceResults.get(driver)
      : event?.sprintResults.get(driver);
  if (!event || !original) return undefined;

  const order = simulatedOrders[`${year}-${round}-${session}`];
  if (!order) return original;

  const index = order.drivers.indexOf(driver);
  if (index < 0) return original;

  const isRetired = index >= order.classifiedCount;
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
    points: status === "Retired" ? 0 : pointsForSession(position, session),
  };
}

export function getSeasonStandings(
  events: EventSeasonData[],
  simulatedOrders: Record<string, SimulatedOrder>,
  seasonDrivers: string[],
  year: number,
) {
  const totals = new Map<string, number>(seasonDrivers.map((driver) => [driver, 0]));
  const originalTotals = new Map<string, number>(seasonDrivers.map((driver) => [driver, 0]));
  const racePositionCounts = new Map<string, Map<number, number>>(
    seasonDrivers.map((driver) => [driver, new Map<number, number>()]),
  );

  for (const { event, raceResults, sprintResults } of events) {
    for (const driver of seasonDrivers) {
      const raceResult = getCurrentResult(
        events,
        simulatedOrders,
        year,
        event.RoundNumber,
        "Race",
        driver,
      );
      const sprintResult = getCurrentResult(
        events,
        simulatedOrders,
        year,
        event.RoundNumber,
        "Sprint",
        driver,
      );
      const points = (raceResult?.points ?? 0) + (sprintResult?.points ?? 0);
      const originalPoints =
        (raceResults.get(driver)?.points ?? 0) +
        (sprintResults.get(driver)?.points ?? 0);

      totals.set(driver, (totals.get(driver) ?? 0) + points);
      originalTotals.set(
        driver,
        (originalTotals.get(driver) ?? 0) + originalPoints,
      );

      if (raceResult && raceResult.status !== "Retired") {
        const positions = racePositionCounts.get(driver);
        if (positions) {
          positions.set(
            raceResult.position,
            (positions.get(raceResult.position) ?? 0) + 1,
          );
        }
      }
    }
  }

  const rankedDrivers = [...seasonDrivers].sort(
    (first, second) => {
      const pointsDifference =
        (totals.get(second) ?? 0) - (totals.get(first) ?? 0);
      if (pointsDifference !== 0) return pointsDifference;

      for (let position = 1; position <= seasonDrivers.length; position += 1) {
        const countDifference =
          (racePositionCounts.get(second)?.get(position) ?? 0) -
          (racePositionCounts.get(first)?.get(position) ?? 0);
        if (countDifference !== 0) return countDifference;
      }

      return first.localeCompare(second);
    },
  );

  return { totals, originalTotals, rankedDrivers };
}

export function getDefaultSimulation(results: readonly RaceResult[]): SimulatedOrder {
  const originalOrder = [...results].sort(
    (first, second) => first.Position - second.Position,
  );

  return {
    drivers: originalOrder.map((result) => result.Abbreviation),
    classifiedCount: originalOrder.filter((result) => result.Status !== "Retired").length,
  };
}

export function formatPosition(position: number, positionStatus: string): string {
  if (positionStatus === "Retired" || positionStatus === "Did not start") {
    return "RET";
  } else {
    return position.toString();
  }
}
