# Monobank Acquiring Integration

Цей документ описує процес інтеграції з Monobank Acquiring API для прийому онлайн-платежів.

## Передумови

1. **Отримання доступу до Monobank Acquiring**
   - Зареєструйтеся у [особистому кабінеті Monobank](https://mbank.me/merchant)
   - Отримайте токен для API доступу
   - Налаштуйте webhook URL для отримання сповіщень про платежі

2. **Налаштування середовища**
   - Додайте необхідні змінні середовища у ваш `.env` файл

## Конфігурація

### Змінні середовища

```bash
# Monobank Configuration
MONOBANK_TOKEN=your_monobank_token_here
MONOBANK_WEBHOOK_SECRET=your_monobank_webhook_secret_here
MONOBANK_CALLBACK_URL=http://localhost:3001/api/v1/payment/callback
MONOBANK_RESULT_URL=http://localhost:5173/subscription/success
```

### Опис змінних

- `MONOBANK_TOKEN` - Токен доступу до Monobank API
- `MONOBANK_WEBHOOK_SECRET` - Секретний ключ для перевірки webhook підписів
- `MONOBANK_CALLBACK_URL` - URL для отримання callback'ів від Monobank
- `MONOBANK_RESULT_URL` - URL для перенаправлення користувача після оплати

## API Методи

### 1. Створення рахунку (Invoice)

```typescript
POST /api/v1/payment/initiate-subscription
```

**Тіло запиту:**
```json
{
  "package_id": "package_uuid",
  "billing_cycle": "monthly" | "yearly"
}
```

**Відповідь:**
```json
{
  "checkout_url": "https://mbank.me/checkout/...",
  "order_id": "sub_user123_timestamp",
  "payment_id": "invoice_uuid"
}
```

### 2. Перевірка статусу платежу

```typescript
GET /api/v1/payment/status/:orderId
```

**Відповідь:**
```json
{
  "order_id": "sub_user123_timestamp",
  "status": "completed" | "processing" | "failed" | "pending",
  "amount": 99.00,
  "currency": "UAH",
  "subscription_id": "subscription_uuid"
}
```

### 3. Обробка Webhook

```typescript
POST /api/v1/payment/callback
```

Monobank надсилає POST-запити з ECDSA підписом для підтвердження платежів.

**Тіло webhook:**
```json
{
  "data": {
    "invoiceId": "invoice_uuid",
    "status": "success",
    "amount": 9900,
    "ccy": 980,
    "merchantPaymInfo": {
      "reference": "order_id",
      "destination": "Опис платежу"
    },
    "paymentInfo": {
      "cardMask": "5168****1234",
      "cardType": "visa",
      "token": "saved_card_token"
    }
  },
  "signature": "ecdsa_signature_base64"
}
```

## Статуси платежів

| Monobank статус | Внутрішній статус | Опис |
|---------------|------------------|------|
| `created` | `pending` | Рахунок створено, очікує оплати |
| `processing` | `processing` | Платіж в обробці |
| `success` | `completed` | Платіж успішно завершено |
| `failure` | `failed` | Платіж не вдався |
| `expired` | `failed` | Час життя рахунку закінчився |
| `reversed` | `failed` | Платіж скасовано/повернено |

## Безпека

### ECDSA Підписи

Monobank використовує ECDSA для підпису webhook'ів:

1. **Налаштування публічного ключа**
   ```bash
   # Додайте публічний ключ у змінну середовища
   MONOBANK_WEBHOOK_SECRET="-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"
   ```

2. **Перевірка підпису**
   ```typescript
   const signature = req.body.signature;
   const data = JSON.stringify(req.body.data);
   const isValid = monobankService.verifyWebhookSignature(data, signature);
   ```

## Токенізація

Для регулярних платежів Monobank підтримує збереження карток:

- `saveCard: true` при створенні рахунку
- Токен збереженої картки доступний у `paymentInfo.token`
- Використовуйте токен для автоматичних списань

## Помилки

### Коди помилок

| Код | Опис |
|-----|------|
| 400 | Невірний формат запиту |
| 401 | Невірний токен доступу |
| 404 | Рахунок не знайдено |
| 409 | Конфлікт статусу |
| 500 | Внутрішня помилка сервера |

### Обробка помилок

```typescript
try {
  const invoice = await monobankService.createInvoice(request);
  // обробка успішного результату
} catch (error) {
  if (error.message.includes('401')) {
    // проблема з токеном
  } else if (error.message.includes('400')) {
    // проблема з даними
  }
}
```

## Тестування

Monobank не має окремого тестового середовища. Для тестування:

1. Використовуйте невеликі суми (1-2 грн)
2. Тестуйте з реальними картками
3. Перевіряйте webhook обробку локально (наприклад, через ngrok)

## Міграція з LiqPay

### Основні відмінності

| Параметр | LiqPay | Monobank |
|-----------|---------|----------|
| Аутентифікація | public_key + private_key | X-Token |
| Кодування | Base64 | JSON |
| Підпис | SHA1 | ECDSA |
| ID рахунку | order_id | invoiceId |
| Сума | в гривнях | в копійках |
| Callback | POST з data/signature | POST з data/signature (ECDSA) |

### Кроки міграції

1. **Оновіть конфігурацію**
   ```bash
   # Замініть LiqPay змінні
   MONOBANK_TOKEN=...
   MONOBANK_WEBHOOK_SECRET=...
   ```

2. **Замініть сервіс**
   ```typescript
   // Було
   import LiqPayService from './services/liqpayService';
   
   // Стало
   import MonobankService from './services/monobankService';
   ```

3. **Оновіть обробку callback**
   ```typescript
   // Було
   const callbackData = await liqPayService.parseCallback(data, signature);
   
   // Стало
   const callbackData = monobankService.parseWebhookData(req.body);
   ```

## Підтримка

- [Документація Monobank API](https://monobank.ua/api-docs/acquiring)
- [Технічна підтримка Monobank](mailto:acquiring@monobank.ua)
- [Приклади інтеграції](https://github.com/monobank)

## Корисні посилання

- [Особистий кабінет мерчанта](https://mbank.me/merchant)
- [API документація](https://monobank.ua/api-docs/acquiring)
- [iFrame віджет](https://monobank.ua/api-docs/acquiring/methods/ia/docs--widget-frame)
