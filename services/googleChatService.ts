const WEBHOOK_STORAGE_KEY = 'zsub_google_chat_webhook';

/**
 * Reads the Google Chat webhook URL from localStorage.
 * Returns null if not configured.
 */
export const getWebhookUrl = (): string | null => {
  try {
    return localStorage.getItem(WEBHOOK_STORAGE_KEY);
  } catch {
    return null;
  }
};

/**
 * Saves the Google Chat webhook URL to localStorage.
 */
export const setWebhookUrl = (url: string): void => {
  try {
    localStorage.setItem(WEBHOOK_STORAGE_KEY, url);
  } catch {
    /* ignore */
  }
};

export interface GoogleChatNotificationParams {
  title: string;
  body: string;
  reviewer?: string;
  date?: string;
  status?: string;
}

/**
 * Sends a Google Chat card notification via webhook.
 * Returns false silently if no webhook URL is configured.
 */
export const sendGoogleChatNotification = async (params: GoogleChatNotificationParams): Promise<boolean> => {
  const webhookUrl = getWebhookUrl();

  if (!webhookUrl) {
    return false;
  }

  const widgets: object[] = [{ textParagraph: { text: params.body } }];

  if (params.reviewer) {
    widgets.push({ textParagraph: { text: `담당자: ${params.reviewer}` } });
  }
  if (params.date) {
    widgets.push({ textParagraph: { text: `날짜: ${params.date}` } });
  }
  if (params.status) {
    widgets.push({ textParagraph: { text: `상태: ${params.status}` } });
  }

  const payload = {
    cards: [
      {
        header: { title: params.title },
        sections: [
          {
            widgets,
          },
        ],
      },
    ],
  };

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    return response.ok;
  } catch (error) {
    console.error('[GoogleChat] 알림 전송 실패:', error);
    return false;
  }
};
