# Фінальне налаштування Monobank Integration

## ✅ Що готово до тестування

### 1. **Основна інтеграція**
- Створення рахунків з токенізацією карток
- Обробка webhook з ECDSA підписами
- Отримання статусу платежів
- Генерація квитанцій

### 2. **Регулярні платежі**
- Збереження карток в гаманці користувача
- Створення платежів по токену
- Управління картками

### 3. **API Ендпоінти**
```
POST /api/v1/payment/initiate-subscription  - Створення підписки
POST /api/v1/payment/callback               - Webhook обробка
GET  /api/v1/payment/status/:orderId        - Статус платежу
GET  /api/v1/payment/wallet/cards          - Картки гаманця
POST /api/v1/payment/recurring              - Регулярний платіж
```

## 🚀 Тестування

### Крок 1: Налаштування середовища
Додайте у ваш `.env` файл:
```bash
MONOBANK_TOKEN=mmShA4fvi7ft4DtgkoFaGGA
MONOBANK_CALLBACK_URL=http://localhost:3001/api/v1/payment/callback
MONOBANK_RESULT_URL=http://localhost:5173/subscription/success
```

### Крок 2: Створення тестового платежу
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
  "order_id": "sub_user123_timestamp",
  "payment_id": "invoice_uuid"
}
```

### Крок 3: Тестування токенізації
1. Перейдіть за `checkout_url`
2. Виконайте платіж тестовою карткою
3. Перевірте що картка збереглась

### Крок 4: Перевірка збережених карток
```bash
curl -X GET http://localhost:3001/api/v1/payment/wallet/cards \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Крок 5: Створення регулярного платежу
```bash
curl -X POST http://localhost:3001/api/v1/payment/recurring \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "cardToken": "saved_card_token",
    "amount": 99,
    "description": "Регулярний платіж",
    "package_id": "package_uuid"
  }'
```

## 📋 Перевірка функціональності

### ✅ Список що потрібно перевірити

1. **Створення рахунку**
   - [ ] Повертає правильний `checkout_url`
   - [ ] URL веде на Monobank checkout
   - [ ] Правильна сума та валюта

2. **Токенізація**
   - [ ] Для `order_type: "recurring"` встановлено `saveCard: true`
   - [ ] `walletId` генерується правильно
   - [ ] Callback повертає токен картки

3. **Webhook обробка**
   - [ ] ECDSA підпис перевіряється
   - [ ] Статус платежу оновлюється
   - [ ] Підписка активується

4. **Регулярні платежі**
   - [ ] Картки зберігаються в гаманці
   - [ ] Можна отримати список карток
   - [ ] Регулярний платіж працює

5. **Помилки**
   - [ ] Невалідний токен повертає 403
   - [ ] Невалідні дані повертають 400
   - [ ] Логи інформативні

## 🔧 Debug інструменти

### Логи для моніторингу
```bash
# Створення платежу
🚀 [PAYMENT] Initiating subscription payment...
💳 [PAYMENT] Creating payment with Monobank...
✅ [PAYMENT] Monobank response: {...}

# Webhook обробка
🔔 [CALLBACK] Received Monobank callback...
🔍 [CALLBACK] Parsing Monobank webhook data...
✅ [CALLBACK] Parsed callback data: {...}

# Регулярні платежі
🃏 [WALLET] Getting cards for user: user123
🔄 [RECURRING] Creating recurring payment: {...}
✅ [RECURRING] Payment created: {...}
```

### Поширені помилки та рішення

**"Missing required header 'X-Token'"**
- Перевірте `MONOBANK_TOKEN` в `.env`
- Переконайтесь що токен правильний

**"Invalid webhook signature"**
- Перевірте `MONOBANK_WEBHOOK_SECRET`
- ECDSA підпис налаштований правильно

**"Card not found"**
- Користувач ще не зберігав картки
- Потрібно виконати перший платіж з токенізацією

## 📱 Тестування з фронтендом

### React компоненти для тестування
```typescript
// Отримання карток
const { data: cards } = await fetch('/api/v1/payment/wallet/cards');

// Створення регулярного платежу
const payment = await fetch('/api/v1/payment/recurring', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    cardToken: selectedCard.token,
    amount: 99,
    description: 'Автоматичне продовження'
  })
});
```

## 🎯 Production checklist

### Перед деплоєм:
- [ ] Додати реальний `MONOBANK_WEBHOOK_SECRET`
- [ ] Налаштувати production webhook URL
- [ ] Протестувати з реальними картками
- [ ] Налаштувати моніторинг помилок

### Безпека:
- [ ] Валідація всіх вхідних даних
- [ ] Перевірка прав доступу користувачів
- [ ] Логування всіх платежів
- [ ] Обробка дублікатів webhook

## 📞 Підтримка

### Корисні посилання:
- [Monobank API Docs](https://monobank.ua/api-docs/acquiring)
- [Особистий кабінет](https://web.monobank.ua/)
- [Техпідтримка](mailto:acquiring@monobank.ua)

### Коди помилок:
- `400` - Невалідні параметри
- `403` - Невалідний токен
- `404` - Рахунок/гаманець не знайдено
- `429` - Забагато запитів
- `500` - Внутрішня помилка

---

**Готово до тестування!** 🚀

Запустіть бекенд і почніть з кроку 2. Всі компоненти інтеграції налаштовані відповідно до офіційної документації Monobank.
