# Як застосувати міграції для платежів

## 🚨 Проблема
Система платежів не працює, тому що міграції не застосовані до Supabase. Помилка:
```
Key (user_id)=(...) is not present in table "users"
```

## ✅ Рішення

### Крок 1: Застосуйте міграції через Supabase Dashboard

1. Відкрийте [Supabase Dashboard](https://supabase.com/dashboard)
2. Перейдіть до вашого проекту
3. В розділі "SQL Editor" виконайте послідовно:

#### 1. Створення таблиць
```sql
-- Виконайте вміст файлу:
20260222_add_payment_tables_simple.sql
```

#### 2. Виправлення RLS політик
```sql
-- Виконайте вміст файлу:
20260222_fix_rls_policies.sql
```

### Крок 2: Перевірка результату

Після застосування міграцій перевірте, що таблиці створені:

```sql
-- Перевірка таблиць
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('payment_attempts', 'user_subscriptions', 'receipts');

-- Перевірка RLS
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('payment_attempts', 'user_subscriptions', 'receipts');
```

### Крок 3: Тестування

Після застосування міграцій:

1. Перезапустіть backend:
```bash
npm run dev
```

2. Спробуйте оформити підписку на фронтенді

3. Перевірте логи - помилка має зникнути

## 🔧 Важливі моменти

- **Таблиця користувачів**: `custom_users` (не `users`)
- **RLS політики**: Повинні дозволяти авторизованим користувачам
- **Foreign keys**: Мають посилатися на `custom_users.id`

## 📋 Структура таблиць

### payment_attempts
- `id` (TEXT) - Primary key
- `user_id` (UUID) → `custom_users.id`
- `order_id` (TEXT) - Payment order ID
- `status` (TEXT) - pending/completed/failed/etc

### user_subscriptions  
- `id` (TEXT) - Primary key
- `user_id` (UUID) → `custom_users.id`
- `package_id` (UUID) → `subscription_plans.id`
- `status` (TEXT) - active/expired/cancelled

### receipts
- `id` (TEXT) - Primary key  
- `user_id` (UUID) → `custom_users.id`
- `order_id` (TEXT) → `payment_attempts.order_id`

## ✅ Перевірка працездатності

Після застосування міграцій система повинна:
1. ✅ Створювати платежі без помилок
2. ✅ Зберігати дані в `payment_attempts`
3. ✅ Відображати історію підписок
4. ✅ Надсилати Telegram сповіщення (якщо налаштовано)
