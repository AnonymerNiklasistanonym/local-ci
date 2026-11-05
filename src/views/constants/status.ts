import type { WorkerStatus } from '../../worker/states.js';

export const statusIcon: Record<WorkerStatus, string> = {
  running: '⟳',
  success: '✓',
  error: '✗',
  warning: '!',
  created: '+',
} as const;

export const statusColor: Record<WorkerStatus, string> = {
  running: 'blue',
  success: 'green',
  error: 'red',
  warning: 'yellow',
  created: 'gray',
} as const;
