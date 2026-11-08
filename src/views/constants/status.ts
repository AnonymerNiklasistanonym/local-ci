import type { WorkerStatus } from '../../worker/states.js';

export const statusIcon: Record<WorkerStatus, string> = {
  created: '+',
  error: '✗',
  running: '⟳',
  success: '✓',
  warning: '!',
} as const;

export const statusColor: Record<WorkerStatus, string> = {
  created: 'gray',
  error: 'red',
  running: 'blue',
  success: 'green',
  warning: 'yellow',
} as const;
