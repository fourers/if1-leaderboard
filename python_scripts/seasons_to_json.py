import datetime
import json

import click
import fastf1 as ff1


def load_session(season, event_name, event_format):
    event = ff1.get_session(season, event_name, event_format)
    event.load(laps=False, telemetry=False, weather=False, messages=False)

    results = []
    for _, driver_row in event.results.iterrows():
        results.append(
            {
                "Abbreviation": driver_row["Abbreviation"],
                "GridPosition": driver_row["GridPosition"],
                "Position": driver_row["Position"],
                "Status": driver_row["Status"],
                "TeamName": driver_row["TeamName"],
            }
        )
    return results


def get_season_data(season: int):
    schedule = ff1.get_event_schedule(season, include_testing=False)
    json_data = []
    for _, event in schedule.iterrows():
        now = datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)
        if now < event["EventDate"]:
            continue
        event_name = event["EventName"]
        event_data = {
            "EventName": event_name,
            "RoundNumber": event["RoundNumber"],
            "ShortEventName": event_name.replace("Grand Prix", "").strip(),
        }
        if event["EventFormat"] == "sprint_qualifying":
            event_data["Sprint"] = load_session(season, event_name, "S")
        event_data["Race"] = load_session(season, event_name, "R")
        json_data.append(event_data)
    return json_data


@click.command()
@click.option("--season", type=str, default="2025,2026")
def main(season: str):
    json_data = [
        {"Season": int(season_value), "Events": get_season_data(int(season_value))}
        for season_value in season.split(",")
    ]
    print(json.dumps(json_data, indent=2))


if __name__ == "__main__":
    main()
