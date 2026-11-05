#!/usr/bin/env node

import { parentPort, workerData, threadId } from 'worker_threads';

import { spawn } from 'child_process';
import type { WorkerData } from './worker/data.js';
import type { WorkerMessage } from './worker/messages.js';
import { appendFileSync } from 'fs';
import { join } from 'path';
import pkg from '../package.json' with { type: 'json' };

// Get data with which the worker is started
const { commands, cwd, jobId, logToFile } = workerData as WorkerData;

const LOG_FILE = join(process.cwd(), `${pkg.name}-worker-${jobId}.log`);

const log = (tag: string, extra?: unknown) => {
  if (!logToFile) return;
  const line =
    `[${new Date().toISOString()}] [thread ${threadId}] [pid ${process.pid}] ${tag}` +
    (extra !== undefined ? ` ${JSON.stringify(extra)}` : '') +
    '\n';
  try {
    appendFileSync(LOG_FILE, line);
  } catch {
    // never let logging break the worker
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

  try {
    let indexCommand = 0;
    let currentExitCode: number | null = 0;
    for (const command of commands) {
      indexCommand++;

      let file: string;
      let args: string[];
      let shell: boolean;

      const logs: ['stdout' | 'stderr' | 'command', string][] = [];
      const startedAtCommand = performance.now();

      if (typeof command === 'string') {
        // Shell mode: pass the whole string, let the shell parse it
        file = command;
        args = [];
        shell = true;
        logs.push(['command', command]);
      } else {
        // argv mode: already split, no shell
        [file, ...args] = command;
        shell = false;
        logs.push(['command', command.join(' ')]);
      }

      currentExitCode = await new Promise<number>((resolve) => {
        const child = spawn(file, args, {
          cwd,
          shell,
          stdio: ['ignore', 'pipe', 'pipe'],
          env: {
            ...process.env, // Keep existing environment variables (default behavior)
            FORCE_COLOR: '1', // Force color output
          },
        });
        send({
          type: 'start:command',
          jobId,
          command,
          indexCommand,
        });

        child.stdout.on('data', (d: Buffer) => {
          logs.push(['stdout', d.toString()]);
          send({
            type: 'stdout',
            jobId,
            indexCommand,
            text: d.toString(),
          });
        });
        child.stderr.on('data', (d: Buffer) => {
          logs.push(['stderr', d.toString()]);
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
          send({
            type: 'done:command',
            jobId,
            indexCommand,
            code: 1,
            logs,
            progress: (indexCommand / commands.length) * 100,
            timeWorkerMs: performance.now() - startedAtCommand,
          });
          resolve(1);
        });

        child.on('close', (code) => {
          send({
            type: 'done:command',
            jobId,
            indexCommand,
            code: code ?? 0,
            logs,
            progress: (indexCommand / commands.length) * 100,
            timeWorkerMs: performance.now() - startedAtCommand,
          });
          resolve(code ?? 0);
        });
      });
    }
    send({
      type: 'done',
      jobId,
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
      code: -1,
      timeWorkerMs: performance.now() - startedAt,
    });
  }
});

process.on('exit', (code) => {
  send({ type: 'exit', jobId, code });
});
