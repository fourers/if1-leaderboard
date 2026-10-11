# IF1 Leaderboard

Simulate the F1 leaderboard with race-specific adjustments to finishing positions.

## React app

The React app uses [Bun](https://bun.com/docs). Install the JavaScript dependencies once:

```bash
bun install
```

Start the development server:

```bash
bun run dev
```

Build the app for production:

```bash
bun run build
```

The production files are written to `dist/`. To run the app with the production
server, use:

```bash
bun run start
```

Type-check the app with:

```bash
bun run typecheck
```

## Python scripts

The Python project uses [uv](https://docs.astral.sh/uv/) and requires Python
3.14 or newer. Sync the project dependencies:

```bash
uv sync
```

Run the season data generation script:

```bash
uv run python python_scripts/seasons_to_json.py | tee src/season_data.json
```

The script writes JSON for the configured seasons to standard output. FastF1
may download event data while it runs.
