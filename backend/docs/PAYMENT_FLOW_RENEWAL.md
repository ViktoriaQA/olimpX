# Процес оплати підписок: Перша оплата та Автопоновлення

## 1. Перша оплата підписки користувачем

### Етапи процесу:

#### 1.1 Ініціація платежу
```
POST /api/v1/payment/initiate-recurring-subscription
```

**Фронтенд надсилає:**
- `package_id` - ID обраного пакету
- `billing_period` - 'month' або 'year'
- `user_id` - ID користувача (з JWT токена)

**Бекенд створює:**
- `order_id` - унікальний ID замовлення
- `PaymentRequest` з даними про платіж
- Викликає Monobank API для створення інвойсу

#### 1.2 Redirect на оплату Monobank
- Користувача перенаправляє на `checkout_url` Monobank
- Користувач вводить дані картки та підтверджує платіж
- Monobank повертає токен для автоматичних платежів

#### 1.3 Webhook callback від Monobank
```
POST /api/v1/payment/callback
```

**Monobank надсилає:**
- `status` - статус платежу ('success')
- `paymentInfo.token` - токен для автоматичних списань
- `paymentId` - ID платежу
- `amount` - сума

**Бекенд обробляє:**
1. Оновлює статус `payment_attempts` на 'completed'
2. Створює запис в `user_subscriptions`
3. **Створює запис в `recurring_subscriptions`** (якщо є токен)
4. Оновлює профіль користувача

### 1.4 Створення recurring subscription
```typescript
// Тільки якщо order_type === 'recurring' і є токен
if (existingAttempt.order_type === 'recurring' && callbackData.paymentInfo?.token) {
  await this.createRecurringSubscriptionRecord(
    existingAttempt.user_id,
    existingAttempt.package_id,
    subscriptionId,
    paymentId,
    callbackData.paymentInfo.token, // ← Ключовий елемент
    existingAttempt.amount,
    'month'
  );
}
```

**Результат:**
- `recurring_subscriptions` запис створено
- `next_payment_date` = через 1 місяць
- `rec_token` збережено для майбутніх платежів
- Автоподовження налаштовано ✅

---

## 2. Автоподовлення підписок

### 2.1 Cron Job (кожну годину)
```typescript
// Запускається кожну годину на 5-й хвилині
cron.schedule('5 * * * *', async () => {
  const processor = new AutomaticRenewalProcessor();
  await processor.processDueRenewals();
});
```

### 2.2 Пошук підписок для продовження
```sql
SELECT * FROM recurring_subscriptions 
WHERE is_active = true 
  AND status = 'active' 
  AND next_payment_date <= NOW()
  AND failed_attempts < 3;
```

### 2.3 Процес продовження для кожної підписки:

#### 2.3.1 Створення нового платежу
- Генерується новий `order_id` для продовження
- Створюється `PaymentRequest` для Monobank

#### 2.3.2 Токен-платіж (без участі користувача)
```typescript
// Використання збереженого токена
const renewalSuccess = await this.processTokenCharge(subscription, paymentRequest);
```

**Monobank API виклик:**
- Використовується `rec_token` для автоматичного списання
- Користувач НЕ перенаправляється на сторінку оплати
- Гроші списуються автоматично

#### 2.3.3 Обробка результату платежу

**Успішний платіж:**
```typescript
if (renewalSuccess) {
  // 1. Розширити user_subscription на +1 місяць
  await this.extendUserSubscription(userId, packageId, 1);
  
  // 2. Оновити recurring_subscription
  await supabase
    .from('recurring_subscriptions')
    .update({
      last_payment_date: NOW(),
      next_payment_date: NOW() + INTERVAL '1 month',
      failed_attempts: 0
    });
}
```

**Невдалий платіж:**
```typescript
await this.handleRenewalFailure(subscription, errorMessage);
// Збільшує failed_attempts, відключає після 3 спроб
```

### 2.4 Оновлення даних користувача
- `user_subscriptions.end_date` продовжується
- `custom_users.subscription_expires_at` оновлюється
- Статус залишається 'active'

---

## 3. Ключові таблиці та поля

### 3.1 payment_attempts
```sql
order_id | user_id | package_id | status | payment_id | order_type
-----------------------------------------------------------
sub_123  | user_1 | pack_1    | completed | pay_123 | recurring
```

### 3.2 user_subscriptions  
```sql
user_id | package_id | status | end_date
-------------------------------------------
user_1  | pack_1    | active | 2026-04-22
```

### 3.3 recurring_subscriptions (найважливіша!)
```sql
subscription_id | user_id | rec_token | next_payment_date | failed_attempts
----------------------------------------------------------------------------
test_sub_123    | user_1  | token_abc | 2026-04-22       | 0
```

---

## 4. Потокові діаграми

### 4.1 Перша оплата
```
Користувач → Фронтенд → Бекенд → Monobank → Користувач
    |           |         |          |           |
    |           |         |          |           |
    |←- Checkout URL -|          |           |
    |                     |          |           |
    |←- Redirect на оплату -→|          |
    |                     |          |           |
    |                     |          |←- Платіж -|
    |                     |          |           |
    |←- Webhook з токеном -|          |
    |                     |          |           |
    |←- Підписка активована -|
```

### 4.2 Автоподовлення
```
Cron Job → Бекенд → Monobank → Бекенд → База даних
   |          |         |          |           |
   |          |         |          |           |
   |←- Запуск щогодини -|          |           |
   |          |         |          |           |
   |←- Пошук підписок -|          |           |
   |          |         |          |           |
   |          |←- Токен-платіж -|          |
   |          |         |          |           |
   |          |←- Успіх/Невдача -|          |
   |          |         |          |           |
   |←- Оновлення даних -|
```

---

## 5. Умови успішного автоподовлення

✅ **Є запис в `recurring_subscriptions`**  
✅ **`is_active = true` та `status = 'active'`**  
✅ **`next_payment_date <= NOW()`**  
✅ **`failed_attempts < 3`**  
✅ **`rec_token` валідний**  

---

## 6. Поширені проблеми

### 6.1 Recurring subscription не створюється
**Причина:** Відсутній токен від Monobank
**Рішення:** Перевірити `callbackData.paymentInfo?.token`

### 6.2 Автоподовлення не працює
**Причина:** Порожня таблиця `recurring_subscriptions`
**Рішення:** Перевірити логіку створення записів

### 6.3 Помилки в токен-платежі
**Причина:** Токен недійсний або картка закрита
**Рішення:** `failed_attempts` збільшується, після 3 спроб підписка відключається

---

## 7. Моніторинг та логи

**Ключові логи для моніторингу:**
```
🔄 [RENEWAL] Starting automatic renewal processing...
📊 [RENEWAL] Found X subscriptions due for renewal
💳 [RENEWAL] Token charge logged: {subscriptionId, amount, token}
✅ [RENEWAL] Renewal successful for subscription
❌ [RENEWAL] Token charge failed
```

**SQL для перевірки:**
```sql
-- Підписки, що потребують продовження
SELECT * FROM recurring_subscriptions 
WHERE next_payment_date <= NOW() 
  AND is_active = true;

-- Проблемні підписки
SELECT * FROM recurring_subscriptions 
WHERE failed_attempts > 0;
```
