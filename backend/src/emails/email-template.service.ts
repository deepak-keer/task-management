import { Injectable } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import { EMAIL_NOTIFICATION_LABELS, EmailNotificationType } from './email-types';

type TemplateData = {
  userName: string;
  message: string;
  taskTitle: string;
  projectName: string;
  actorName: string;
  actionUrl: string;
  timestamp: string;
  preferencesUrl: string;
};

const TEMPLATE_BY_TYPE: Record<EmailNotificationType, string> = {
  task_assigned: 'task_assigned.html',
  mentioned_in_comment: 'mentioned.html',
  task_status_changed: 'status_changed.html',
  task_approved: 'approved.html',
  sprint_deadline: 'deadline.html',
  task_due_tomorrow: 'due_tomorrow.html',
  high_priority_assigned: 'high_priority.html',
};

@Injectable()
export class EmailTemplateService {
  render(type: EmailNotificationType, data: TemplateData): string {
    const template = this.loadTemplate(TEMPLATE_BY_TYPE[type]);
    return template.replace(/\{\{(\w+)\}\}/g, (_match, key: keyof TemplateData | 'title') => {
      if (key === 'title') return this.escape(EMAIL_NOTIFICATION_LABELS[type]);
      return this.escape(data[key as keyof TemplateData] || '');
    });
  }

  private loadTemplate(filename: string): string {
    const paths = [
      join(process.cwd(), 'src', 'emails', 'templates', filename),
      join(__dirname, 'templates', filename),
    ];

    for (const path of paths) {
      try {
        return readFileSync(path, 'utf8');
      } catch {
        // Try the next runtime path.
      }
    }

    return this.fallbackTemplate();
  }

  private fallbackTemplate(): string {
    return `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#0f172a">
        <h2>{{title}}</h2>
        <p>Hello {{userName}},</p>
        <p>{{message}}</p>
        <p><strong>Task:</strong> {{taskTitle}}<br><strong>Project:</strong> {{projectName}}<br><strong>By:</strong> {{actorName}}<br><strong>When:</strong> {{timestamp}}</p>
        <p><a href="{{actionUrl}}">View in TaskFlow</a></p>
        <p style="font-size:12px;color:#64748b">Manage preferences: {{preferencesUrl}}</p>
      </div>
    `;
  }

  private escape(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
