# Learning Experiment

## Experiments

| Experiment | Entry point | View template | Puzzle domain |
|---|---|---|---|
| Reading comprehension | `app_reading.js` | `public/views/reading_experiment.html` | Reading comprehension questions |
| Fractions | `app_fractions.js` | `public/views/fractions_experiment.html` | Fractions problems |

Both experiments share the same overall flow: an optional **pretest** block,
a main **initial** puzzle block (where the AI/hints manipulation applies), and
a **final** puzzle block (assistant removed for everyone, to measure learning
transfer). Chat interactions during the AI condition are logged per puzzle.

## Running an experiment

1. Install dependencies:
   ```
   npm install
   ```
2. Copy `.env.example` to `.env` and fill in:
   - `CONNECTION` (or `MONGODB_URI`) — MongoDB connection string, used to store submitted trial data
   - `OPENAI_API_KEY` — powers the `/chat` endpoint used by the AI condition
   - `PORT` — local port to serve on
3. Start the experiment you want to run:
   ```
   npm run start:reading     # reading comprehension experiment (app_reading.js)
   npm run start:fractions   # fractions experiment (app_fractions.js)
   ```
   (`npm start` / `npm run dev` default to the reading experiment.)
4. Visit `http://localhost:<PORT>/`. Completed sessions are POSTed to
   `/experiment-data` and stored as raw jsPsych trial documents in MongoDB.

## Data

The `data/` folder contains processed data from three pilot runs of these
experiments (originally collected as raw MongoDB exports named
`test.entries.json`, not included here). Each subfolder holds a single
`experiment_data.json` file — a de-identified, minimal extract, not the raw
export.

| Folder | Experiment | Participants | Puzzle-trial records |
|---|---|---|---|
| `data/exp1` | Fractions | 352 | 5,280 |
| `data/exp2` | Fractions | 666 | 11,322 |
| `data/exp3` | Reading comprehension | 201 | 1,809 |

### `experiment_data.json` schema

Each file is a JSON array of records, one record per puzzle a participant
encountered (so a single participant contributes multiple records — one for
each pretest/initial/final puzzle they saw). Fields:

| Field | Type | Description |
|---|---|---|
| `participant_id` | string | Anonymous ID for the participant's session |
| `condition` | `"AI"` \| `"control"` | Which arm the participant was randomly assigned to for that session |
| `puzzle_type` | `"pretest"` \| `"initial"` \| `"final"` | Which block the puzzle belonged to. Only `initial`-block puzzles have the AI assistant / hints panel available; `pretest` and `final` are unassisted for everyone |
| `solved` | boolean | Whether the participant solved the puzzle correctly |
| `skipped` | boolean | Whether the participant pressed the skip button without inputting an answer |
| `chatlog` | array | Chat messages exchanged with the AI assistant on this puzzle|
