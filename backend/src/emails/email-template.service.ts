import { Injectable } from '@nestjs/common';
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

type TemplateTheme = {
  accent: string;
  accentSoft: string;
  border: string;
  actorLabel: string;
  ctaLabel: string;
};

const LOGO_URL = 'https://karmyugtechzone.in/_next/image?url=%2Fkarmyug-logo.png&amp;w=96&amp;q=75';

const TEMPLATE_THEME_BY_TYPE: Record<EmailNotificationType, TemplateTheme> = {
  task_assigned: {
    accent: '#2563eb',
    accentSoft: '#dbeafe',
    border: '#bfdbfe',
    actorLabel: 'Assigned by',
    ctaLabel: 'View task',
  },
  mentioned_in_comment: {
    accent: '#2563eb',
    accentSoft: '#dbeafe',
    border: '#bfdbfe',
    actorLabel: 'Mentioned by',
    ctaLabel: 'Open comment',
  },
  task_status_changed: {
    accent: '#2563eb',
    accentSoft: '#dbeafe',
    border: '#bfdbfe',
    actorLabel: 'Updated by',
    ctaLabel: 'View update',
  },
  task_approved: {
    accent: '#16a34a',
    accentSoft: '#dcfce7',
    border: '#bbf7d0',
    actorLabel: 'Approved by',
    ctaLabel: 'View approval',
  },
  sprint_deadline: {
    accent: '#d97706',
    accentSoft: '#fef3c7',
    border: '#fde68a',
    actorLabel: 'Reminder',
    ctaLabel: 'Review deadline',
  },
  task_due_tomorrow: {
    accent: '#2563eb',
    accentSoft: '#dbeafe',
    border: '#bfdbfe',
    actorLabel: 'Reminder',
    ctaLabel: 'View task',
  },
  high_priority_assigned: {
    accent: '#dc2626',
    accentSoft: '#fee2e2',
    border: '#fecaca',
    actorLabel: 'Assigned by',
    ctaLabel: 'Open priority task',
  },
};

@Injectable()
export class EmailTemplateService {
  render(type: EmailNotificationType, data: TemplateData): string {
    const theme = TEMPLATE_THEME_BY_TYPE[type];
    return this.baseTemplate(type, data, theme);
  }

  private baseTemplate(type: EmailNotificationType, data: TemplateData, theme: TemplateTheme): string {
    const title = this.escape(EMAIL_NOTIFICATION_LABELS[type]);
    const userName = this.escape(data.userName);
    const message = this.escape(data.message);
    const taskTitle = this.escape(data.taskTitle);
    const projectName = this.escape(data.projectName);
    const actorName = this.escape(data.actorName);
    const actionUrl = this.escape(data.actionUrl);
    const timestamp = this.escape(data.timestamp);
    const preferencesUrl = this.escape(data.preferencesUrl);

    return `
      <!doctype html>
      <html>
        <body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#111827">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f4f6;margin:0;padding:32px 16px">
            <tr>
              <td align="center">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
                  <tr>
                    <td style="padding:0;background:${theme.accent};height:6px;line-height:6px;font-size:0">&nbsp;</td>
                  </tr>
                  <tr>
                    <td style="padding:28px 32px 18px;border-bottom:1px solid #eef2f7">
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                        <tr>
                          <td style="vertical-align:middle">
                            <img src="${LOGO_URL}" width="48" height="48" alt="Karmyug Tech Zone" style="display:block;border:0;border-radius:10px">
                          </td>
                          <td align="right" style="vertical-align:middle;font-size:12px;line-height:18px;font-weight:700;color:${theme.accent};text-transform:uppercase">
                            TaskFlow Notification
                          </td>
                        </tr>
                      </table>
                      <h1 style="margin:24px 0 0;font-size:26px;line-height:34px;font-weight:800;color:#0f172a">${title}</h1>
                      <p style="margin:8px 0 0;font-size:14px;line-height:22px;color:#64748b">Karmyug Tech Zone task management update</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:30px 32px">
                      <p style="margin:0 0 14px;font-size:15px;line-height:24px;color:#334155">Hello ${userName},</p>
                      <p style="margin:0 0 24px;font-size:16px;line-height:26px;color:#0f172a">${message}</p>

                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid ${theme.border};background:${theme.accentSoft};border-radius:10px;margin:0 0 26px">
                        <tr>
                          <td style="padding:20px 22px">
                            <p style="margin:0 0 14px;font-size:17px;line-height:24px;font-weight:800;color:#0f172a">${taskTitle}</p>
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                              ${this.detailRow('Project', projectName)}
                              ${this.detailRow(theme.actorLabel, actorName)}
                              ${this.detailRow('Time', timestamp)}
                            </table>
                          </td>
                        </tr>
                      </table>

                      <table role="presentation" cellspacing="0" cellpadding="0">
                        <tr>
                          <td bgcolor="${theme.accent}" style="border-radius:8px">
                            <a href="${actionUrl}" style="display:inline-block;padding:13px 20px;font-size:14px;line-height:20px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:8px">${this.escape(theme.ctaLabel)}</a>
                          </td>
                        </tr>
                      </table>

                      <p style="margin:24px 0 0;font-size:13px;line-height:21px;color:#64748b">
                        Button not working? Open this link:<br>
                        <a href="${actionUrl}" style="color:${theme.accent};text-decoration:none;word-break:break-all">${actionUrl}</a>
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:20px 32px;background:#f8fafc;border-top:1px solid #eef2f7">
                      <p style="margin:0;font-size:12px;line-height:20px;color:#64748b">
                        You are receiving this because email notifications are enabled for your account.
                        Manage preferences: <a href="${preferencesUrl}" style="color:${theme.accent};text-decoration:none;word-break:break-all">${preferencesUrl}</a>
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;
  }

  private detailRow(label: string, value: string): string {
    return `
      <tr>
        <td style="padding:4px 12px 4px 0;width:96px;font-size:13px;line-height:20px;font-weight:700;color:#475569">${this.escape(label)}</td>
        <td style="padding:4px 0;font-size:13px;line-height:20px;color:#0f172a">${value}</td>
      </tr>
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
