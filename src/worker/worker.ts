#!/usr/bin/env node

import type { WorkerLog, WorkerMessage } from './messages.js';
import { parentPort, threadId, workerData } from 'worker_threads';
import type { WorkerData } from './data.js';
import { appendFileSync } from 'fs';
import { spawn } from 'child_process';

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
  send({ commands, cwd, jobId, threadId, type: 'start' });
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
        indexCommand,
        jobId,
        text: typeof command === 'string' ? command : command.join(' '),
        type: 'command',
      });

      currentExitCode = await new Promise<number>((resolve) => {
        send({
          command,
          indexCommand,
          jobId,
          type: 'start:command',
        });
        const child = spawn(file, args, {
          cwd,
          env: {
            ...process.env, // Keep existing environment variables (default behavior)
            FORCE_COLOR: '1', // Force color output
          },
          shell,
          stdio: ['ignore', 'pipe', 'pipe'],
        });

        child.stdout.on('data', (d: Buffer) => {
          logsCommand.push(['stdout', d.toString()]);
          send({
            indexCommand,
            jobId,
            text: d.toString(),
            type: 'stdout',
          });
        });
        child.stderr.on('data', (d: Buffer) => {
          logsCommand.push(['stderr', d.toString()]);
          send({
            indexCommand,
            jobId,
            text: d.toString(),
            type: 'stderr',
          });
        });

        child.on('error', (err) => {
          send({
            indexCommand,
            jobId,
            text: err.message,
            type: 'error',
          });
          logsCommand.push([
            'command:status',
            { error: err.message, timeMs: performance.now() - startedAtCommand },
          ] as WorkerLog);
          send({
            code: 1,
            indexCommand,
            jobId,
            logs: logsCommand,
            progress: (indexCommand / commands.length) * 100,
            timeWorkerMs: performance.now() - startedAtCommand,
            type: 'done:command',
          });
          resolve(1);
        });

        child.on('close', (code) => {
          logsCommand.push(['command:status', { exitCode: code ?? 0, timeMs: performance.now() - startedAtCommand }]);
          send({
            code: code ?? 0,
            indexCommand,
            jobId,
            logs: logsCommand,
            progress: (indexCommand / commands.length) * 100,
            timeWorkerMs: performance.now() - startedAtCommand,
            type: 'done:command',
          });
          resolve(code ?? 0);
        });
      });
      logs.push(...logsCommand);
    }
    send({
      code: currentExitCode,
      jobId,
      logs,
      timeWorkerMs: performance.now() - startedAt,
      type: 'done',
    });
    log('done');
  } catch (err) {
    send({
      jobId,
      text: err instanceof Error ? err.message : JSON.stringify(err),
      type: 'error',
    });
    send({
      code: -1,
      jobId,
      logs,
      timeWorkerMs: performance.now() - startedAt,
      type: 'done',
    });
  }
});

process.on('exit', (code) => {
  send({ code, jobId, type: 'exit' });
});
