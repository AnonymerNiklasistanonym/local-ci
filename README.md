# local-ci

With this tool its possible to define a local CI pipeline which can for example be part of a git hook.
One of the reasons why this was created is that Powershell is horrible at running stuff in parallel (e.g. separate threads).

> [!WARNING]
> This is currently a WIP and not a working/finished project!
>
> TODOs:
>
> - [x] Log file support
> - [x] Correct return value
> - [x] Show return value of commands in output/logs
> - [ ] Early exit on pipeline failure
> - [ ] Filter jobs/stages
> - [x] Create a file log on demand
> - [ ] Update design
> - [x] If it fails in non-interactive render error log as is
> - [x] Select first failed (not allowed to fail) job when jobs fail
> - [x] Add buttons/keyboard key listeners (if in interactive mode)
>   - [x] Button to rerun pipeline
>   - [ ] Button to rerun job
>   - [x] Copy the full log of the current job to the clipboard

```
Usage: local-ci [options] [mode]

run your own local ci for example as part of a git hook

Arguments:
  mode                       what should be done (choices: "info", "run", default: "run")

Options:
  -V, --version              output the version number
  -v, --verbose              show extra info (default: false)
  -i, --interactive          do not close the program if its done to inspect logs (default: false)
  --config <path>            path to your local-ci config (default: ".local-ci.json")
  --only <stages/labels...>  only run specific stages (build lint) or labels (:fix)
  -h, --help                 display help for command
```

![Demo Screenshot](./docs/demo.png)

## Configration

A configuration file has a fixed [JSON schema](./local-ci.schema.json) (but supports comments inside the JSON file).
The structure is very simple:

- A list of stages that are being run **in sequence**
- Each stage has a set of jobs that are being run **in parallel**
- Each job has a list of commands that will be run **in sequence**

To quickly enable/disable stages and stages each of them has the following properties:

- `label`: A list of strings that will run this job in case it is found as part of the CLI option list `--only :label`
- `mandatory`: Runs the job/stage even if it wasn't specified (like an `install` stage/job)
- `explicit`: Does not run the job/stage if it wasn't explicitly specified via a `label`

Example:

```jsonc
{
  "$schema": "./local-ci.schema.json",
  "name": "example",
  "stages": [
    {
      // Make sure that the dependencies are in sync
      "name": "install",
      "mandatory": true,
      "jobs": [
        {
          "name": "npm depdendencies",
          "commands": [["npm", "ci"]],
        },
      ],
    },
    {
      // Check that there are no format/lint or build issues
      "name": "check",
      "jobs": [
        {
          "name": "format",
          "allowedToFail": true,
          "commands": [["npm", "run", "format:check"]],
        },
        {
          "name": "format:fix",
          "explicit": true,
          "labels": ["fix"],
          "commands": [["npm", "run", "format"]],
        },
        {
          "name": "lint",
          "allowedToFail": true,
          "commands": [["npm", "run", "lint:check"]],
        },
        {
          "name": "lint:fix",
          "explicit": true,
          "labels": ["fix"],
          "commands": [["npm", "run", "lint"]],
        },
        {
          "name": "build",
          "commands": [["npm", "run", "build"]],
        },
      ],
    },
  ],
}
```

## Build

The following command generates the files:

- `dist/cli.mjs`
- `dist/worker.mjs`

```sh
npm install
npm run build
```

The file `cli.mjs` can then be run with:

```sh
npm run start
# or directly via node
node .
node dist/cli.mjs
# TODO Not supported any more, fix at some point
# or directly via node with permissions (but disable their warn messages)
node --disable-warning=PERM0002 --disable-warning=PERM0006 \
     --permission --allow-fs-read=* --allow-fs-write=* --allow-worker --allow-child-process \
     dist/cli.mjs
```

## Development

### Logs

Logs are created using `pino` in JSON format and are best viewed using:

```sh
# -L is the log level
# -m highlights specific strings in the output
cat local-ci.log | npx pino-pretty -L info -m optionalHighlight
```
