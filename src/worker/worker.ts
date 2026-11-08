#!/usr/bin/env node

import { parentPort, workerData, threadId } from 'worker_threads';

import { spawn } from 'child_process';
import type { WorkerData } from './data.js';
import type { WorkerLog, WorkerMessage } from './messages.js';
import { appendFileSync } from 'fs';

// Get data with which the worker is started
const { commands, cwd, jobId, logFile } = workerData as WorkerData;

const log = (tag: string, extra?: unknown) => {
  if (!logFile) return;
  const line =
    `[${new Date().toISOString()}] [thread ${threadId}] [pid ${process.pid}] ${tag}` +
    (extra !== undefined ? ` ${JSON.stringify(extra)}` : '') +
    '\n';
  try {
    appendFileSync(logFile, line);
  } catch {
    // don't let logging errors stop the worker
  }
};

// Wait to be triggered before starting
log('wait for host message', workerData);

const send = (msg: WorkerMessage) => {
  log('send message', msg);
  parentPort!.postMessage(msg, {});
};

parentPort!.once('message', async (msgHost) => {
  log('received host message', msgHost);
  send({ type: 'start', jobId, threadId, commands, cwd });
  const startedAt = performance.now();
  const logs: WorkerLog[] = [];

  try {
    let indexCommand = 0;
    let currentExitCode: number | null = 0;
    for (const command of commands) {
      indexCommand++;

      let file: string;
      let args: string[];
      let shell: boolean;
      const logsCommand: WorkerLog[] = [];

      const startedAtCommand = performance.now();

      if (typeof command === 'string') {
        // Shell mode: pass the whole string, let the shell parse it
        file = command;
        args = [];
        shell = true;
        logsCommand.push(['command', command]);
      } else {
        // argv mode: already split, no shell
        [file, ...args] = command;
        shell = false;
        logsCommand.push(['command', command.join(' ')]);
      }
      send({
        type: 'command',
        jobId,
        text: typeof command === 'string' ? command : command.join(' '),
        indexCommand,
      });

      currentExitCode = await new Promise<number>((resolve) => {
        send({
          type: 'start:command',
          jobId,
          command,
          indexCommand,
        });
        const child = spawn(file, args, {
          cwd,
          shell,
          stdio: ['ignore', 'pipe', 'pipe'],
          env: {
            ...process.env, // Keep existing environment variables (default behavior)
            FORCE_COLOR: '1', // Force color output
          },
        });

        child.stdout.on('data', (d: Buffer) => {
          logsCommand.push(['stdout', d.toString()]);
          send({
            type: 'stdout',
            jobId,
            indexCommand,
            text: d.toString(),
          });
        });
        child.stderr.on('data', (d: Buffer) => {
          logsCommand.push(['stderr', d.toString()]);
          send({
            type: 'stderr',
            jobId,
            indexCommand,
            text: d.toString(),
          });
        });

        child.on('error', (err) => {
          send({
            type: 'error',
            jobId,
            indexCommand,
            text: err.message,
          });
          logsCommand.push([
            'command:status',
            { error: err.message, timeMs: performance.now() - startedAtCommand },
          ] as WorkerLog);
          send({
            type: 'done:command',
            jobId,
            indexCommand,
            code: 1,
            logs: logsCommand,
            progress: (indexCommand / commands.length) * 100,
            timeWorkerMs: performance.now() - startedAtCommand,
          });
          resolve(1);
        });

        child.on('close', (code) => {
          logsCommand.push(['command:status', { exitCode: code ?? 0, timeMs: performance.now() - startedAtCommand }]);
          send({
            type: 'done:command',
            jobId,
            indexCommand,
            code: code ?? 0,
            logs: logsCommand,
            progress: (indexCommand / commands.length) * 100,
            timeWorkerMs: performance.now() - startedAtCommand,
          });
          resolve(code ?? 0);
        });
      });
      logs.push(...logsCommand);
    }
    send({
      type: 'done',
      jobId,
      logs,
      code: currentExitCode,
      timeWorkerMs: performance.now() - startedAt,
    });
    log('done');
  } catch (err) {
    send({
      type: 'error',
      jobId,
      text: err instanceof Error ? err.message : JSON.stringify(err),
    });
    send({
      type: 'done',
      jobId,
      logs,
      code: -1,
      timeWorkerMs: performance.now() - startedAt,
    });
  }
});

process.on('exit', (code) => {
  send({ type: 'exit', jobId, code });
});
