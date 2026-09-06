// ==============================================================================
// NOTIFICATION PROVIDER ABSTRACTION ARCHITECTURE
// ==============================================================================

export interface NotificationPayload {
  tenantId: string;
  recipient: string; // phone or email or userId
  title: string;
  message: string;
  data?: Record<string, any>;
}

export interface NotificationResult {
  success: boolean;
  channel: 'INTERNAL' | 'EMAIL' | 'SMS' | 'WHATSAPP';
  messageId?: string;
  error?: string;
}

export interface NotificationProvider {
  channel: 'INTERNAL' | 'EMAIL' | 'SMS' | 'WHATSAPP';
  send(payload: NotificationPayload): Promise<NotificationResult>;
}

export class EmailNotificationProvider implements NotificationProvider {
  channel: 'EMAIL' = 'EMAIL';

  async send(payload: NotificationPayload): Promise<NotificationResult> {
    console.log(`[EMAIL DISPATCH] To: ${payload.recipient} | Subject: ${payload.title}`);
    return {
      success: true,
      channel: 'EMAIL',
      messageId: `EMAIL-${Date.now()}`
    };
  }
}

export class SmsNotificationProvider implements NotificationProvider {
  channel: 'SMS' = 'SMS';

  async send(payload: NotificationPayload): Promise<NotificationResult> {
    console.log(`[SMS DISPATCH] To: ${payload.recipient} | Text: ${payload.message}`);
    return {
      success: true,
      channel: 'SMS',
      messageId: `SMS-${Date.now()}`
    };
  }
}

export class WhatsAppNotificationProvider implements NotificationProvider {
  channel: 'WHATSAPP' = 'WHATSAPP';

  async send(payload: NotificationPayload): Promise<NotificationResult> {
    console.log(`[WHATSAPP DISPATCH] To: ${payload.recipient} | Text: ${payload.message}`);
    return {
      success: true,
      channel: 'WHATSAPP',
      messageId: `WA-${Date.now()}`
    };
  }
}

export class NotificationHub {
  private providers: Map<string, NotificationProvider> = new Map();

  constructor() {
    this.registerProvider(new EmailNotificationProvider());
    this.registerProvider(new SmsNotificationProvider());
    this.registerProvider(new WhatsAppNotificationProvider());
  }

  registerProvider(provider: NotificationProvider) {
    this.providers.set(provider.channel, provider);
  }

  async broadcast(channel: 'INTERNAL' | 'EMAIL' | 'SMS' | 'WHATSAPP', payload: NotificationPayload) {
    const provider = this.providers.get(channel);
    if (provider) {
      return await provider.send(payload);
    }
    return { success: false, channel, error: 'Provider not configured' };
  }
}

export const notificationHub = new NotificationHub();
