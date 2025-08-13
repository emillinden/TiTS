# TiTS - Toggl into Tempo Synchronizer

TiTS is a Command Line Interface (CLI) written in TypeScript that helps you manage your time entries by fetching them from Toggl and adding them to Tempo via Tempo's API.

![](https://s11.gifyu.com/images/S15ve.gif)

## Features

- Fetch time entries from Toggl API and add them to Tempo via Tempo's API.
- Tries to find an issue key suffix in the description, but prompts you for one if not found.
- Handles one day at a time, with the option to use custom dates.
- Group identical issue descriptions into one combined time entry.
- Asks if you want to round to ~~15~~ 5 minute intervals (value can be changed).
- Can auto round to nearest interval at specified thresholds.
- Supports black- or whitelist for auto rounding or skipping for certain projects.
- Show command for showing current worklogs in Tempo
- Delete command for deleting worklogs for a provided date

## Prerequisites

- [Node.js](https://nodejs.org/en/) must be installed on your machine.
- An API key for Toggl and an API key and Author ID from Tempo. You can obtain them from the respective websites.

## Installation/update

Clone the repository

```bash
git clone git@github.com:emillinden/TiTS.git dir-name
```

Cd into the directory and install npm

```bash
cd dir-name
npm install
```

Build the project

```bash
npm run build
```

Install TiTS globally

```bash
npm install -g .
```

## Usage

> For matching against Jira issues your Toggl entries need to be in the following format: `KEY-123 Description`.
> For example `DEV-1337 Daily standup` where `DEV` is the project key, `123` is the issue number and `Daily standup` is the description which will be added to the Tempo worklog.

Run `tits` followed by a command and arguments (optional).

### Sync todays entries from Toggl to Tempo

Use the `sync` command. Can be followed by `-d` `(--date)` arg which takes a date, i.e. `YYYY-MM-DD`.

```bash
tits sync
```

You can also use `today` and `yesterday`.

```bash
tits sync -d yesterday
```

The first time you run the sync command you will be prompted for Toggl/Tempo credentials if you haven't already entered them.

### Show worklogs

To show worklogs for a specific day, run the `show` command.

```bash
tits show
# or tits show -d yesterday
# or tits show -d 2025-09-16
```

### Delete/scrub worklogs

You can also delete worklogs for a specific day. Works just like the `sync` command above.

When running this command you'll first get an overview of what gets deleted, and a prompt to continue or abort.

```bash
tits delete
# or tits delete -d yesterday
# or tits delete -d 2025-09-16
```

## Configuration

Specify the config you want to set by writing `tits config --key value`.

```bash
# Examples
$ tits config --round-to 30 # Sets the rounding interval to 30 minutes
$ tits config --strategy blacklist # Sets the rounding strategy to blacklist
$ tits config --blacklist DEV,ADMIN # Toggle "DEV" and "ADMIN" keys in the blacklist
$ tits config --min-entry-time 60 # Sets the minimum time entry time to 60 minutes
```

See `tits config --help` for available configurations.

### Account attribute

Some Tempo setups use an account key to define billing accounts.

You can enable account attribute syncing by running `tits config --use-accounts true` and providing an account key by running `tits config --account-key YourAccountKey`.

For each new project key (first part of the issue key) you're syncing to you'll be prompted for the corresponding account key, you will get the option to save the key for future synchronizations.

### Reset config

To reset the config file, use:

```bash
tits config --reset
```

**Warning!** You will have to enter api credentials again.

## Hope you'll save some time!
