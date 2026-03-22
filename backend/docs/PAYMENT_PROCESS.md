# Процес обробки платежів

## Огляд

Система обробляє платежі через Monobank і зберігає дані в таблиці `payment_attempts`. Після успішної оплати створюється підписка для користувача.

## Основні таблиці

### 1. payment_attempts
Основна таблиця для зберігання всіх спроб платежів:

**Поля:**
- `id` - унікальний ID спроби платежу
- `user_id` - ID користувача
- `package_id` - ID пакету, який купується
- `order_id` - ID замовлення (для Monobank)
- `payment_id` - ID платежу від Monobank
- `checkout_id` - Monobank checkout ID
- `checkout_url` - URL для перенаправлення на оплату
- `amount` - сума платежу
- `currency` - валюта (UAH, USD, EUR)
- `billing_period` - період білінгу (month/year)
- `status` - статус платежу (pending, processing, completed, failed, expired, refunded)
- `payment_gateway` - тип шлюзу (monobank)
- `response_data` - деталі відповіді від Monobank (JSONB)
- `payment_method` - спосіб оплати (card, googlepay, applepay тощо)
- `subscription_id` - ID підписки (якщо створено)
- `error_message` - повідомлення про помилку
- `created_at`, `updated_at` - часові мітки

### 2. user_subscriptions
Таблиця для зберігання активних підписок користувачів:

**Поля:**
- `id` - унікальний ID підписки
- `user_id` - ID користувача
- `package_id` - ID пакету
- `status` - статус (active, expired, cancelled)
- `start_date` - дата початку підписки
- `end_date` - дата закінчення підписки
- `auto_renew` - автопродовження (true/false)
- `created_at`, `updated_at` - часові мітки

### 3. receipts
Таблиця для зберігання квитанцій:

**Поля:**
- `id` - унікальний ID квитанції
- `order_id` - ID замовлення
- `payment_id` - ID платежу
- `user_id` - ID користувача
- `pdf_data` - PDF квитанція в base64
- `html_data` - HTML квитанція
- `file_path` - шлях до файлу (опціонально)
- `created_at` - час створення

## Процес обробки успішної оплати

### 1. Ініціація платежу
```
POST /api/v1/payment/initiate-subscription
```
- Створюється запис в `payment_attempts` зі статусом 'pending'
- Генерується URL для Monobank checkout
- Користувач перенаправляється на сторінку оплати

### 2. Callback від Monobank
```
POST /api/v1/payment/callback
```
- Monobank надсилає callback про статус платежу
- Оновлюється статус в `payment_attempts`
- Зберігаються деталі відповіді в `response_data`

### 3. Обробка успішного платежу
Якщо статус 'completed':

1. **Оновлення статусу** в `payment_attempts` на 'completed'
2. **Створення підписки** в `user_subscriptions`
3. **Оновлення профілю** користувача в `profiles`
4. **Створення recurring subscription** (якщо є rec_token)
5. **Надсилання Telegram-повідомлення** про успіх
6. **Збереження квитанції** в `receipts`

## Статуси платежів

- **pending** - платіж ініційовано, очікує на оплату
- **processing** - платіж в обробці
- **completed** - платіж успішно виконано
- **failed** - платіж не вдався
- **expired** - час платежу вийшов
- **refunded** - платіж повернено

## API Endpoints

### Платежі
- `POST /api/v1/payment/initiate-subscription` - Ініціювати платіж
- `POST /api/v1/payment/callback` - Callback від Monobank
- `GET /api/v1/payment/status/:orderId` - Перевірити статус
- `GET /api/v1/payment/status/public/:orderId` - Публічний статус
- `POST /api/v1/payment/verify-subscription` - Верифікація підписки
- `DELETE /api/v1/payment/subscriptions/:subscriptionId/cancel` - Скасувати підписку
- `GET /api/v1/payment/receipt/:orderId` - Отримати квитанцію

### Підписки
- `GET /api/subscriptions/plans` - Отримати плани підписок
- `GET /api/subscriptions/history` - Історія підписок користувача
- `GET /api/subscriptions/status` - Поточний статус підписки

## Налаштування

Для роботи Telegram сповіщень потрібно додати в `.env`:
```
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id
```

## Безпека

- Усі таблиці мають Row Level Security (RLS)
- Користувачі можуть бачити тільки свої платежі та підписки
- Service role має повний доступ для обробки платежів
