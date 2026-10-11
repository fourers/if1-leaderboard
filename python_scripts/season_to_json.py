import json

import fastf1 as ff1


def load_session(season, event_name, event_format):
    event = ff1.get_session(season, event_name, event_format)
    event.load(laps=False, telemetry=False, weather=False, messages=False)

    results = []
    for _, driver_row in event.results.iterrows():
        results.append({
            "Abbreviation": driver_row["Abbreviation"],
            "GridPosition": driver_row["GridPosition"],
            "Position": driver_row["Position"],
            "Status": driver_row["Status"],
            "TeamName": driver_row["TeamName"],
        })
    return results


def main():
    season = 2025
    schedule = ff1.get_event_schedule(season, include_testing=False)
    json_data = []
    for _, event in schedule.iterrows():
        event_name = event["EventName"]
        event_data = {
            "EventName": event_name,
            "RoundNumber": event["RoundNumber"],
            "ShortEventName": event_name.replace("Grand Prix", "").strip()
        }
        if event["EventFormat"] == "sprint_qualifying":
            event_data["Sprint"] = load_session(season, event_name, "S")
        event_data["Race"] = load_session(season, event_name, "R")
        json_data.append(event_data)
    print(json.dumps(json_data, indent=2))


if __name__ == "__main__":
    main()
