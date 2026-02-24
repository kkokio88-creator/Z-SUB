// Google Chat 알림 플레이스홀더
// 실제 API 연동은 Google Chat Webhook URL 설정 후 구현

export interface ChatNotification {
  title: string;
  message: string;
  planId?: string;
  sender?: string;
}

/**
 * Google Chat으로 알림 전송 (플레이스홀더)
 * 실제 사용 시 GOOGLE_CHAT_WEBHOOK_URL 환경변수 설정 필요
 */
export const sendGoogleChatNotification = async (notification: ChatNotification): Promise<boolean> => {
  const webhookUrl = import.meta.env.VITE_GOOGLE_CHAT_WEBHOOK_URL;

  if (!webhookUrl) {
    console.info('[GoogleChat] Webhook URL 미설정 - 알림 건너뜀:', notification.title);
    return false;
  }

  try {
    const payload = {
      text: `*${notification.title}*\n${notification.message}${notification.sender ? `\n_by ${notification.sender}_` : ''}`,
    };

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

/** 검토 완료 알림 */
export const notifyReviewCompleted = (planDate: string, reviewer: string) =>
  sendGoogleChatNotification({
    title: '식단 검토 완료',
    message: `${planDate} 식단이 ${reviewer}에 의해 검토 완료되었습니다.`,
    sender: reviewer,
  });

/** 최종 확정 알림 */
export const notifyPlanFinalized = (planDate: string) =>
  sendGoogleChatNotification({
    title: '식단 최종 확정',
    message: `${planDate} 식단이 최종 확정되었습니다.`,
  });

/** 재검토 요청 알림 */
export const notifyReReviewRequested = (planDate: string, requester: string) =>
  sendGoogleChatNotification({
    title: '재검토 요청',
    message: `${planDate} 식단에 대한 재검토가 요청되었습니다.`,
    sender: requester,
  });
