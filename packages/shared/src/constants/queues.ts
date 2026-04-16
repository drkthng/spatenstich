export const QUEUES = { AI_JOBS: 'ai_jobs' } as const;
export type QueueName = typeof QUEUES[keyof typeof QUEUES];
