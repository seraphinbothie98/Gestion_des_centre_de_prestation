// ==============================================================================
// PAYMENT PROVIDER ABSTRACTION ARCHITECTURE
// ==============================================================================

export interface PaymentInitiationParams {
  amount: number;
  currency: string;
  customerPhone?: string;
  customerEmail?: string;
  orderReference: string;
  description: string;
}

export interface PaymentResult {
  success: boolean;
  transactionId: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  rawResponse?: any;
  errorMessage?: string;
}

export interface PaymentProvider {
  providerName: string;
  initiatePayment(params: PaymentInitiationParams): Promise<PaymentResult>;
  verifyPayment(transactionId: string): Promise<PaymentResult>;
  refund(transactionId: string, amount: number): Promise<PaymentResult>;
}

// Cash In-Store Provider
export class CashPaymentProvider implements PaymentProvider {
  providerName = 'CASH';

  async initiatePayment(params: PaymentInitiationParams): Promise<PaymentResult> {
    return {
      success: true,
      transactionId: `CASH-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      status: 'SUCCESS',
    };
  }

  async verifyPayment(transactionId: string): Promise<PaymentResult> {
    return { success: true, transactionId, status: 'SUCCESS' };
  }

  async refund(transactionId: string, amount: number): Promise<PaymentResult> {
    return { success: true, transactionId: `REF-${transactionId}`, status: 'SUCCESS' };
  }
}

// Mobile Money (Orange Money / MTN MoMo) Provider
export class MobileMoneyProvider implements PaymentProvider {
  constructor(public providerName: 'ORANGE_MONEY' | 'MTN_MOMO', private apiKey?: string) {}

  async initiatePayment(params: PaymentInitiationParams): Promise<PaymentResult> {
    // Simulated direct push STK / USSD prompt
    const txId = `${this.providerName === 'ORANGE_MONEY' ? 'OM' : 'MOMO'}-${Date.now()}`;
    return {
      success: true,
      transactionId: txId,
      status: 'SUCCESS',
      rawResponse: { provider: this.providerName, reference: params.orderReference, phone: params.customerPhone }
    };
  }

  async verifyPayment(transactionId: string): Promise<PaymentResult> {
    return { success: true, transactionId, status: 'SUCCESS' };
  }

  async refund(transactionId: string, amount: number): Promise<PaymentResult> {
    return { success: true, transactionId: `REF-${transactionId}`, status: 'SUCCESS' };
  }
}

// Payment Provider Factory
export class PaymentService {
  private providers: Map<string, PaymentProvider> = new Map();

  constructor() {
    this.registerProvider(new CashPaymentProvider());
    this.registerProvider(new MobileMoneyProvider('ORANGE_MONEY'));
    this.registerProvider(new MobileMoneyProvider('MTN_MOMO'));
  }

  registerProvider(provider: PaymentProvider) {
    this.providers.set(provider.providerName, provider);
  }

  getProvider(method: string): PaymentProvider {
    const provider = this.providers.get(method);
    if (!provider) {
      // Fallback to cash if unknown
      return this.providers.get('CASH')!;
    }
    return provider;
  }
}

export const paymentService = new PaymentService();
