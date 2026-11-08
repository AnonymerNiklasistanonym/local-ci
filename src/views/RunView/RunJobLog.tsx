import { Text } from 'ink';
import { humanTime } from '../../utils/human.js';
import type { WorkerLog } from '../../worker/messages.js';

interface RunJobLogProps {
  log: WorkerLog;
}

export const RunJobLog = ({ log: [type, message] }: RunJobLogProps) => {
  return type === 'command' ? (
    <Text color="gray" bold>
      $ {message}
    </Text>
  ) : type === 'command:status' ? (
    <Text color="gray" dimColor>
      {`[${[message.error && `ERROR(${message.error})`, message.exitCode, humanTime(message.timeMs)]
        .filter((a): a is string => Boolean(a))
        .join(', ')}]`}
    </Text>
  ) : (
    <Text color={type === 'stderr' ? 'yellow' : undefined}>{message.trimEnd()}</Text>
  );
};
