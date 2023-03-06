# TiTS - Toggl into Tempo Synchronizer

TiTS is a Command Line Interface (CLI) written in TypeScript that helps you manage your time entries by fetching them from Toggl and adding them to Tempo via Tempo's API.

## Features

- Fetch time entries from Toggl API and add them to Tempo via Tempo's API.
- Tries to find an issue key suffix in the description, but prompts you for one if not found.
- Handles one day at a time, with the option to use custom dates.
- Group identical issue descriptions into one combined time entry.
- Asks if you want to round to ~~15~~ 5 minute intervals (value can be changed).
- Can auto round to nearest interval at specified thresholds.
- Supports black- or whitelist for auto rounding or skipping for certain projects.

## Limitations

- Currently doesn't set the `account` field in Tempo. If your company is using it you'll have to add it manually afterwards for the time being.

## Prerequisites

- [Node.js](https://nodejs.org/en/) must be installed on your machine.
- An API key for Toggl and an API key and Author ID from Tempo. You can obtain them from the respective websites.

## Installation

Clone the repository

```bash
$ git clone git@github.com:emillinden/TiTS.git dir-name
```

Cd into the directory and install npm

```bash
$ cd dir-name
$ npm install
```

Build the project

```bash
$ npm run build
```

Install TiTS globally

```bash
$ npm install -g .
```

## Usage

Run `tits` followed by a command and arguments (optional).

### Sync todays entries from Toggl to Tempo

Use the `sync` command. Can be followed by `-d` `(--date)` arg which takes a date, i.e. `YYYY-MM-DD`.

```bash
$ tits sync
```

You can also use `today` and `yesterday`.

```bash
$ tits sync -d yesterday
```

The first time you run the sync command you will be prompted for Toggl/Tempo credentials if you haven't already entered them.

## Configuration

Specify the config you want to set by writing `tits config --key value`.

```bash
# Examples
$ tits config --round-to 30 # Sets the rounding interval to 30 minutes
$ tits config --strategy blacklist # Sets the rounding strategy to blacklist
$ tits config --blacklist DEV,ADMIN # Toggle "DEV" and "ADMIN" keys in the blacklist
```

See `tits config --help` for available configurations.

To reset the config file, use:

```bash
$ tits config --reset
```

**Warning!** You will have to enter api credentials again.

## Todos

- [ ] Set account to project default on worklogs
- [ ] Sync issues from Jira as Tempo projects (or tags) for easier issue logging
- [ ] Prompt user for correction if issue key doesn't exist in Jira
- [ ] Try to get issue key from Toggl project name and tag (in that order) if not found in description
- [ ] Command for deleting entries from Tempo by day
- [ ] Handle failing API keys
- [ ] Error handling if post to tempo fails
- [ ] `setup` command for guiding user through setting up config values
- [x] Check if issue keys exists in Jira before starting sync
- [x] Black/whitelist of project keys to skip rounding
- [x] Replace autoRoundAt config with autoRoundUpAt and autoRoundDownAt
- [x] Replace temp _any_ types
- [x] Custom rounding intervals
- [x] Automatic rounding option by threshold
- [x] Better config file handling
- [x] Prompt user to stop Toggl Timer if one is currently running.
