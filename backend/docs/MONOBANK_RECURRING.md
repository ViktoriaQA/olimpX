# Monobank Regular Payments (Recurring Billing)

Цей документ описує реалізацію регулярних платежів через Monobank Acquiring.

## Що реалізовано

### ✅ Базова інтеграція
- [x] Створення рахунків з токенізацією карток
- [x] Збереження карток в гаманці користувача
- [x] Отримання списку збережених карток
- [x] Створення регулярних платежів по токену

### ✅ API методи
- `createInvoice()` - створення рахунку з опцією збереження картки
- `getWalletCards()` - отримання списку карток в гаманці
- `createRecurringPayment()` - створення платежу по збереженій картці

## Конфігурація

### Токен доступу
```bash
MONOBANK_TOKEN=mmShA4fvi7ft4DtgkoFaGGA
```

### Створення рахунку з токенізацією
```typescript
const invoiceRequest = {
  amount: 9900, // в копійках (99.00 UAH)
  ccy: 980, // UAH
  merchantPaymInfo: {
    reference: "sub_user123_1234567890",
    destination: "Оплата підписки",
    comment: "Пакет: Premium"
  },
  redirectUrl: "https://your-site.com/subscription/success",
  webHookUrl: "https://your-site.com/api/v1/payment/callback",
  saveCardData: {
    saveCard: true,
    walletId: "user123" // унікальний ID користувача
  }
};
```

## Процес регулярних платежів

### 1. Перший платіж (з токенізацією)
```typescript
// При створенні першого платежу
const paymentRequest = {
  order_id: "sub_user123_1234567890",
  amount: 99,
  currency: "UAH",
  description: "Оплата підписки Premium",
  order_type: "recurring", // важливо для токенізації
  customer: "user123" // використовується як walletId
};

// Monobank автоматично збереже картку в гаманці
```

### 2. Отримання токена картки
Після успішного платежу токен доступний в callback:
```typescript
interface MonobankCallbackData {
  invoiceId: string;
  status: "success";
  paymentInfo: {
    cardMask: "5168****1234",
    cardType: "visa",
    token: "saved_card_token_abc123" // токен для регулярних платежів
  };
}
```

### 3. Регулярний платіж
```typescript
// Створення регулярного платежу по токену
const recurringPayment = await monobankService.createRecurringPayment(
  "user123", // walletId
  "saved_card_token_abc123", // токен картки
  99, // сума в UAH
  "Автоматичне продовження підписки"
);
```

### 4. Управління картками
```typescript
// Отримання всіх збережених карток користувача
const cards = await monobankService.getWalletCards("user123");

console.log(cards);
// [
//   {
//     "cardToken": "saved_card_token_abc123",
//     "cardMask": "5168****1234",
//     "cardType": "visa",
//     "cardBank": "monobank",
//     "expiryDate": "12/25"
//   }
// ]
```

## Приклад використання

### Створення підписки з автоматичним продовженням
```typescript
// 1. Створення першого платежу
const invoice = await monobankService.createInvoice({
  order_id: `sub_${userId}_${Date.now()}`,
  amount: 99,
  currency: "UAH",
  description: "Оплата підписки Premium",
  order_type: "recurring",
  customer: userId, // walletId
  email: "user@example.com"
});

// 2. Збереження токена після успішного платежу
if (callbackData.paymentInfo?.token) {
  await saveUserCardToken(userId, callbackData.paymentInfo.token);
}

// 3. Регулярний платіж через місяць
const userToken = await getUserCardToken(userId);
if (userToken) {
  const recurringPayment = await monobankService.createRecurringPayment(
    userId, // walletId
    userToken, // токен картки
    99, // сума
    "Автоматичне продовження підписки"
  );
}
```

## Управління помилками

### Поширені помилки
```typescript
try {
  const payment = await monobankService.createRecurringPayment(walletId, token, amount, description);
} catch (error) {
  if (error.message.includes('CARD_EXPIRED')) {
    // Картка застаріла - потрібно оновити
    await notifyUserToUpdateCard(userId);
  } else if (error.message.includes('INSUFFICIENT_FUNDS')) {
    // Недостатньо коштів
    await notifyUserInsufficientFunds(userId);
  } else if (error.message.includes('CARD_BLOCKED')) {
    // Картка заблокована
    await notifyUserCardBlocked(userId);
  }
}
```

## Безпека

### Зберігання токенів
- Токени зберігаються в зашифрованому вигляді в базі даних
- Використовується HMAC для перевірки цілісності
- Регулярна очистка застарілих токенів

### Валідація
```typescript
// Перевірка валідності токена перед використання
const cards = await monobankService.getWalletCards(walletId);
const isValidToken = cards.some(card => card.cardToken === token);

if (!isValidToken) {
  throw new Error('Invalid card token');
}
```

## Cron задачі для регулярних платежів

### Щоденна перевірка підписок
```typescript
// scripts/process-recurring-payments.ts
export async function processRecurringPayments() {
  const subscriptions = await getActiveSubscriptions();
  
  for (const subscription of subscriptions) {
    if (isTimeToRenew(subscription)) {
      try {
        const payment = await monobankService.createRecurringPayment(
          subscription.user_id,
          subscription.card_token,
          subscription.amount,
          `Автоматичне продовження підписки ${subscription.plan_name}`
        );
        
        await updateSubscriptionAfterPayment(subscription.id, payment);
      } catch (error) {
        await handlePaymentError(subscription, error);
      }
    }
  }
}
```

## Моніторинг

### Метрики для відстеження
- Кількість успішних регулярних платежів
- Кількість невдалих платежів з розбивкою по причинах
- Середній час між платежами
- Кількість активних токенізованих карток

### Сповіщення
```typescript
// При успішному регулярному платежі
await sendEmail(user.email, 'Підписку успішно продовжено', {
  amount: payment.amount,
  nextBillingDate: calculateNextBillingDate()
});

// При невдалий платежі
await sendEmail(user.email, 'Проблема з оплатою підписки', {
  error: error.message,
  updateCardUrl: 'https://your-site.com/billing/update-card'
});
```

## API Ендпоінти

### Нові маршрути для фронтенду
```typescript
// Отримання збережених карток
GET /api/v1/payment/cards/:walletId

// Створення регулярного платежу
POST /api/v1/payment/recurring

// Видалення збереженої картки
DELETE /api/v1/payment/cards/:cardToken
```

## Тестування

### Тестовий сценарій
1. Створіть тестового користувача з walletId
2. Виконайте перший платіж з `saveCard: true`
3. Перевірте що картка збереглась в гаманці
4. Створіть регулярний платіж по токену
5. Перевірте статус платежу

### Приклад тесту
```typescript
describe('Monobank Recurring Payments', () => {
  it('should save card and create recurring payment', async () => {
    // 1. Створення рахунку з токенізацією
    const invoice = await monobankService.createInvoice({
      order_id: 'test_order',
      amount: 1,
      currency: 'UAH',
      description: 'Test payment',
      order_type: 'recurring',
      customer: 'test_user'
    });

    // 2. Мок успішного callback
    const mockCallback = {
      invoiceId: invoice.invoiceId,
      status: 'success',
      paymentInfo: {
        token: 'test_token_123'
      }
    };

    // 3. Створення регулярного платежу
    const recurring = await monobankService.createRecurringPayment(
      'test_user',
      'test_token_123',
      1,
      'Test recurring'
    );

    expect(recurring).toBeDefined();
  });
});
```

## Порівняння з LiqPay

| Функція | LiqPay | Monobank |
|---------|---------|----------|
| Токенізація | `rec_token` | `paymentInfo.token` |
| Гаманець | Немає | `walletId` |
| Регулярні платежі | `paytoken` | `createRecurringPayment` |
| Управління картками | Обмежено | `getWalletCards` |

## Підтримка

- [Документація Monobank](https://monobank.ua/api-docs/acquiring)
- [API для регулярних платежів](https://monobank.ua/api-docs/acquiring/methods/subscription)
- Технічна підтримка: acquiring@monobank.ua
