# Очищення тестових підписок

## Огляд

Цей документ описує способи очищення тестових підписок з бази даних.

## Методи очищення

### 1. Через CLI (Рекомендовано для розробки)

```bash
# Очистити всі тестові підписки (потребує підтвердження)
npm run cleanup:subscriptions -- --confirm

# Очистити підписки конкретного користувача
npm run cleanup:subscriptions -- USER_ID --confirm

# Зберегти останню активну підписку
npm run cleanup:subscriptions -- --keep-latest --confirm

# Зберегти останню активну підписку для конкретного користувача
npm run cleanup:subscriptions -- USER_ID --keep-latest --confirm

# Автоматичне підтвердження в development режимі
NODE_ENV=development npm run cleanup:subscriptions

# Автоматично зберегти останню підписку в development
NODE_ENV=development npm run cleanup:subscriptions -- --keep-latest
```

### 2. Через API (Admin endpoint)

```bash
# Очистити всі підписки
curl -X POST http://localhost:3001/api/admin/cleanup/subscriptions \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json"

# Очистити підписки конкретного користувача
curl -X POST http://localhost:3001/api/admin/cleanup/subscriptions \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"userId": "USER_ID"}'

# Зберегти останню активну підписку
curl -X POST http://localhost:3001/api/admin/cleanup/subscriptions \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"keepLatest": true}'

# Зберегти останню підписку для конкретного користувача
curl -X POST http://localhost:3001/api/admin/cleanup/subscriptions \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"userId": "USER_ID", "keepLatest": true}'
```

## Опції очищення

### Повне очищення (за замовчуванням)
- Видаляє всі підписки користувача
- Видаляє всі спроби платежів
- Видаляє всі рекурентні підписки
- Скидає профіль користувача

### Збереження останньої активної підписки (`--keep-latest`)
- Знаходить останню активну підписку за датою створення
- Видаляє всі інші підписки
- Видаляє старі рекурентні підписки (залишає тільки для останньої)
- **Не скидає профіль користувача** (залишається активна підписка)
- Видаляє всі спроби платежів (складно фільтрувати)

## Що очищується

Скрипт видаляє дані з таких таблиць:

1. **user_subscriptions** - всі записи підписок (крім останньої активної при `--keep-latest`)
2. **payment_attempts** - всі спроби платежів
3. **recurring_subscriptions** - всі рекурентні підписки (крім останньої при `--keep-latest`)
4. **custom_users** - скидає поля підписок у профілях користувачів (тільки при повному очищенні)

## Безпека

- Скрипт потребує підтвердження (`--confirm`) в production режимі
- API endpoint доступний тільки для адміністраторів
- В development режимі підтвердження не потрібне
- Всі дії логуються в консолі

## Приклади використання

### Очищення після тестування

```bash
# Після тестування платежів - повне очищення
npm run cleanup:subscriptions -- --confirm

# Перевірка результатів
curl http://localhost:3001/api/subscriptions/history \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Очищення зі збереженням підписки

```bash
# Для адміністративного очищення - зберегти останню підписку
npm run cleanup:subscriptions -- --keep-latest --confirm

# Для конкретного користувача
npm run cleanup:subscriptions -- USER_ID --keep-latest --confirm
```

### Очищення конкретного користувача

```bash
# Знайти user_id в логах або базі даних
# Наприклад: 0f2475f2-eba7-40fc-9555-172df2850e3f

# Повне очищення
npm run cleanup:subscriptions -- 0f2475f2-eba7-40fc-9555-172df2850e3f --confirm

# Зберегти останню підписку
npm run cleanup:subscriptions -- 0f2475f2-eba7-40fc-9555-172df2850e3f --keep-latest --confirm
```

## Результати

Скрипт повертає статистику:

```json
{
  "deletedSubscriptions": 5,
  "deletedPaymentAttempts": 3,
  "deletedRecurringSubscriptions": 2,
  "updatedProfiles": 2,
  "errors": []
}
```

## Адміністративна панель

Для адміністративної панелі рекомендується використовувати API endpoint з параметром `keepLatest: true`:

```javascript
// Приклад виклику з адмінки
const response = await fetch('/api/admin/cleanup/subscriptions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    userId: selectedUserId,
    keepLatest: true // Зберегти останню активну підписку
  })
});
```

## Увага

⚠️ **Дія незворотна** - всі видалені дані неможливо відновити!

✅ **Рекомендовано** - робіть backup бази даних перед очищенням в production

🔒 **Безпека** - переконайтесь що ви маєте права адміністратора перед використанням

💡 **Порада** - використовуйте `--keep-latest` для адміністративного очищення, щоб не порушувати поточні підписки користувачів
