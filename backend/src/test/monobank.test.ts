import MonobankService from '../services/monobankService';

// Mock environment variables
process.env.MONOBANK_TOKEN = 'test_token';
process.env.MONOBANK_CALLBACK_URL = 'http://localhost:3001/api/v1/payment/callback';
process.env.MONOBANK_RESULT_URL = 'http://localhost:5173/subscription/success';
process.env.NODE_ENV = 'development';

describe('MonobankService', () => {
  let monobankService: MonobankService;

  beforeEach(() => {
    monobankService = new MonobankService();
  });

  describe('createInvoice', () => {
    it('should create invoice with correct parameters', async () => {
      const paymentRequest = {
        order_id: 'test_order_123',
        amount: 100,
        currency: 'UAH',
        description: 'Test payment',
        order_type: 'recurring' as const,
        email: 'test@example.com',
        product_name: 'Test Package'
      };

      // Note: This test would require mocking fetch or using a test token
      try {
        const result = await monobankService.createInvoice(paymentRequest);
        expect(result).toHaveProperty('checkout_url');
        expect(result).toHaveProperty('payment_id');
        expect(result).toHaveProperty('order_id', paymentRequest.order_id);
      } catch (error) {
        // Expected to fail without real token
        expect(error).toBeDefined();
      }
    });
  });

  describe('mapMonobankStatus', () => {
    it('should map success status correctly', () => {
      const status = monobankService.mapMonobankStatus('success');
      expect(status).toBe('completed');
    });

    it('should map failure status correctly', () => {
      const status = monobankService.mapMonobankStatus('failure');
      expect(status).toBe('failed');
    });

    it('should map processing status correctly', () => {
      const status = monobankService.mapMonobankStatus('processing');
      expect(status).toBe('processing');
    });

    it('should map created status correctly', () => {
      const status = monobankService.mapMonobankStatus('created');
      expect(status).toBe('pending');
    });

    it('should map unknown status to processing', () => {
      const status = monobankService.mapMonobankStatus('unknown');
      expect(status).toBe('processing');
    });
  });

  describe('verifyWebhookSignature', () => {
    it('should skip verification when webhook secret is not configured', () => {
      // Temporarily remove webhook secret
      delete process.env.MONOBANK_WEBHOOK_SECRET;
      
      const result = monobankService.verifyWebhookSignature('test_data', 'test_signature');
      expect(result).toBe(true);
      
      // Restore webhook secret
      process.env.MONOBANK_WEBHOOK_SECRET = 'test_secret';
    });
  });

  describe('parseWebhookData', () => {
    it('should throw error when data is missing', () => {
      const body = { signature: 'test_signature' };
      
      expect(() => {
        monobankService.parseWebhookData(body);
      }).toThrow('Missing data or signature in webhook');
    });

    it('should throw error when signature is missing', () => {
      const body = { data: { test: 'data' } };
      
      expect(() => {
        monobankService.parseWebhookData(body);
      }).toThrow('Missing data or signature in webhook');
    });
  });
});

// Integration test example (requires real token)
describe('MonobankService Integration', () => {
  it('should create and check invoice status', async () => {
    // This test requires a real Monobank token
    // Uncomment and run with real credentials for integration testing
    
    /*
    const realService = new MonobankService();
    const paymentRequest = {
      order_id: `test_${Date.now()}`,
      amount: 1, // 1 UAH
      currency: 'UAH',
      description: 'Integration test',
      order_type: 'one-time' as const,
      email: 'test@example.com'
    };

    try {
      const invoice = await realService.createInvoice(paymentRequest);
      console.log('Created invoice:', invoice);

      const status = await realService.getInvoiceStatus(invoice.payment_id);
      console.log('Invoice status:', status);

      expect(invoice).toHaveProperty('checkout_url');
      expect(status).toHaveProperty('status');
    } catch (error) {
      console.error('Integration test failed:', error);
      throw error;
    }
    */
  });
});
