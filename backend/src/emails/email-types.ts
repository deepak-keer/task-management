export const EMAIL_NOTIFICATION_TYPES = [
  'task_assigned',
  'mentioned_in_comment',
  'task_status_changed',
  'task_approved',
  'sprint_deadline',
  'task_due_tomorrow',
  'high_priority_assigned',
] as const;

export type EmailNotificationType = (typeof EMAIL_NOTIFICATION_TYPES)[number];

export const EMAIL_NOTIFICATION_LABELS: Record<EmailNotificationType, string> = {
  task_assigned: 'Task assigned to you',
  mentioned_in_comment: 'Someone mentioned you',
  task_status_changed: 'Task status changed',
  task_approved: 'Task approved',
  sprint_deadline: 'Sprint deadline approaching',
  task_due_tomorrow: 'Task due tomorrow',
  high_priority_assigned: 'High priority task assigned',
};

export const normalizeEmailNotificationType = (
  type: string,
  meta: Record<string, unknown> = {},
): EmailNotificationType | null => {
  if (type === 'mentioned') return 'mentioned_in_comment';
  if (type === 'due_reminder') return 'task_due_tomorrow';
  if (type === 'task_assigned' && meta.priority === 'high') return 'high_priority_assigned';
  if ((EMAIL_NOTIFICATION_TYPES as readonly string[]).includes(type)) {
    return type as EmailNotificationType;
  }

  return null;
};
