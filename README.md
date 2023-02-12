# TiTS - Toggl into Tempo Synchronizer

TiTS is a Command Line Interface (CLI) written in TypeScript that helps you manage your time entries by fetching them from Toggl and adding them to Tempo via Tempo's API.

## Features

- Fetch time entries from Toggl API and add them to Tempo via Tempo's API.
- Tries to find an issue key suffix in the description, but prompts you for one if not found.
- Handles one day at a time, with the option to use custom dates.
- Group identical issue descriptions into one combined time entry.
- Asks if you want to round to 15 minute intervals (value can be changed).

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

### Set config values

```bash
# Example
$ tits config --key value
```

See `tits config --help` for available configurations.

To reset the config file, use:

```bash
$ tits config --reset
```

You will have to enter connection credentials again.

## Todos

- Check if issue keys exists in Jira and prompt for correction if it doesn't
- Whitelist of issue keys to skip rounding, for example ABC-\*
- Whitelist of issue keys to auto round
- Try to get issue key from Toggl project name if not found in description
- Command for deleting entries from Tempo by day
- ✅ ~~Custom rounding intervals~~
- ✅ ~~Automatic rounding option by margin~~
- ✅ ~~Better config file handling~~
