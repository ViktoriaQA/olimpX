# Тестування Monobank Integration

Цей документ описує як протестувати інтеграцію з Monobank Acquiring.

## Передумови

1. **Отримайте тестові дані**
   - Зареєструйтеся у [особистому кабінеті Monobank](https://mbank.me/merchant)
   - Отримайте токен для API доступу
   - Налаштуйте webhook URL (можна використовувати ngrok для локального тестування)

2. **Налаштуйте середовище**

```bash
# Скопіюйте .env.example в .env
cp .env.example .env

# Додайте ваші реальні дані
MONOBANK_TOKEN=your_real_monobank_token
MONOBANK_WEBHOOK_SECRET=your_webhook_secret
MONOBANK_CALLBACK_URL=https://your-domain.com/api/v1/payment/callback
MONOBANK_RESULT_URL=https://your-domain.com/subscription/success
```

## Тестування API

### 1. Створення платежу

Використовуйте curl або Postman для створення тестового платежу:

```bash
curl -X POST http://localhost:3001/api/v1/payment/initiate-subscription \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "package_id": "your_package_id",
    "billing_cycle": "monthly"
  }'
```

**Очікувана відповідь:**
```json
{
  "checkout_url": "https://mbank.me/checkout/...",
  "order_id": "sub_user123_1234567890",
  "payment_id": "invoice_uuid"
}
```

### 2. Перевірка статусу

```bash
curl -X GET http://localhost:3001/api/v1/payment/status/sub_user123_1234567890 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 3. Тестування Webhook

Для локального тестування webhook'ів:

1. **Встановіть ngrok:**
   ```bash
   npm install -g ngrok
   ```

2. **Запустіть ngrok:**
   ```bash
   ngrok http 3001
   ```

3. **Додайте ngrok URL у налаштування Monobank:**
   ```
   https://abcd1234.ngrok.io/api/v1/payment/callback
   ```

4. **Створіть тестовий платіж і перевірте логи**

## Ручне тестування

### Тестовий сценарій

1. **Створення підписки**
   - Перейдіть на сторінку підписки
   - Виберіть пакет
   - Натисніть "Оплатити"
   - Перевірте redirect на Monobank checkout

2. **Процес оплати**
   - Використовуйте реальну картку (невеликі суми)
   - Завершіть платіж
   - Перевірте redirect назад

3. **Перевірка результату**
   - Перевірте статус підписки в профілі
   - Перевірте запис в базі даних
   - Перевірте webhook логи

## Debug логи

Увімкніть детальні логи в `.env`:

```bash
LOG_LEVEL=debug
```

Основні логи для моніторингу:

```bash
# Створення платежу
🚀 [PAYMENT] Initiating subscription payment...
💳 [PAYMENT] Creating payment with Monobank...
✅ [PAYMENT] Monobank response: ...

# Обробка callback
🔔 [CALLBACK] Received Monobank callback...
🔍 [CALLBACK] Parsing Monobank webhook data...
✅ [CALLBACK] Parsed callback data: ...

# Помилки
💥 [MONOBANK] Error creating invoice: ...
❌ [CALLBACK] Invalid webhook signature
```

## Поширені помилки

### 1. "Invalid token"
- Перевірте правильність токена в `.env`
- Переконайтесь що токен активний

### 2. "Webhook verification failed"
- Перевірте webhook secret
- Переконайтесь що публічний ключ правильний

### 3. "Invoice not found"
- Перевірте правильність invoiceId
- Переконайтесь що рахунок не застарів

### 4. "Callback not received"
- Перевірте webhook URL доступність
- Перевірте ngrok тунель

## Автоматизовані тести

Для запуску базових тестів:

```bash
# Встановіть залежності для тестування
npm install --save-dev jest @types/jest ts-jest

# Запустіть тести
npm test
```

## Production checklist

Перед деплоєм в production:

1. **Перевірте конфігурацію**
   - [ ] Правильний MONOBANK_TOKEN
   - [ ] Правильний MONOBANK_WEBHOOK_SECRET
   - [ ] Правильні URL адреси

2. **Налаштуйте webhook**
   - [ ] Додайте production URL в Monobank
   - [ ] Перевірте HTTPS сертифікат
   - [ ] Протестуйте webhook обробку

3. **Безпека**
   - [ ] Валідація webhook підписів
   - [ ] Обробка дублікатів callback
   - [ ] Логування всіх платежів

4. **Моніторинг**
   - [ ] Налаштуйте сповіщення про помилки
   - [ ] Моніторинг статусу платежів
   - [ ] Резервні механізми

## Корисні інструменти

- **Postman колекція:** [export/postman/monobank.json](export/postman/monobank.json)
- **Webhook тестування:** [https://webhook.site](https://webhook.site)
- **API документація:** [Monobank API Docs](https://monobank.ua/api-docs/acquiring)

## Підтримка

Якщо виникли проблеми:

1. Перевірте логи додатку
2. Перевірте статус Monobank сервісів
3. Зв'яжіться з технічною підтримкою Monobank: acquiring@monobank.ua
