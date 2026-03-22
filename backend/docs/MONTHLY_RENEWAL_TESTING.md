# Тестування автоматичного продовження підписок

Цей документ описує як тестувати систему автоматичного продовження підписок через місяць.

## Що було протестовано

Система автоматично продовження підписок була успішно протестована. Тест включав:

1. **Створення тестової підписки** - підписка з датою закінчення через 1 місяць
2. **Симуляція проходження часу** - зміна дати наступного платежу на "зараз"
3. **Запуск процесу автоматичного продовження** - обробка підписок, що вимагають поновлення
4. **Перевірка результатів** - перевірка успішного продовження та оновлення даних

## Запуск тесту

### Автоматичний запуск

```bash
cd /home/vika/Desktop/olimpX/backend
./scripts/test-monthly-renewal.sh
```

### Ручний запуск

```bash
cd /home/vika/Desktop/olimpX/backend
SUPABASE_URL=$(grep SUPABASE_URL ../.env | cut -d'=' -f2) \
SUPABASE_SERVICE_ROLE_KEY=$(grep SUPABASE_SERVICE_ROLE_KEY ../.env | cut -d'=' -f2) \
MONOBANK_TOKEN=$(grep MONOBANK_TOKEN ../.env | cut -d'=' -f2) \
npx ts-node src/scripts/testMonthlyRenewal.ts
```

## Компоненти системи

### 1. Таблиця recurring_subscriptions

Зберігає інформацію про регулярні платежі:
- `subscription_id` - ID підписки в платіжній системі
- `rec_token` - токен для автоматичного списання
- `next_payment_date` - дата наступного платежу
- `failed_attempts` - кількість невдалих спроб
- `is_active` - чи активна підписка

### 2. AutomaticRenewalProcessor

Обробляє підписки, що вимагають продовження:
- Знаходить підписки з `next_payment_date <= now`
- Виконує платіж через токен
- Оновлює дату наступного платежу
- Обробляє невдалі платежі

### 3. CronService

Запускає процес автоматично кожну годину:
```typescript
const renewalProcessor = cron.schedule('5 * * * *', async () => {
  console.log('🔄 Starting automatic renewal processing...');
  try {
    const processor = new AutomaticRenewalProcessor();
    await processor.processDueRenewals();
  } catch (error) {
    console.error('❌ Error in automatic renewal processing:', error);
  }
}, {
  timezone: 'Europe/Kiev'
});
```

## Результати тесту

Тест успішно перевірив:

✅ **Створення підписки** - тестова підписка створена з правильними параметрами  
✅ **Симуляція часу** - дата наступного платежу змінена на поточну  
✅ **Автоматичне продовження** - платіж успішно оброблено  
✅ **Оновлення даних** - підписка продовжена на 1 місяць  
✅ **Профіль користувача** - статус підписки оновлено  

## Лог процесу

```
🔄 [RENEWAL] Starting automatic renewal processing...
📊 [RENEWAL] Found 1 subscriptions due for renewal
💳 [RENEWAL] Creating renewal payment with Monobank...
✅ [RENEWAL] Renewal successful for subscription
📅 [RENEWAL] Extending subscription for user by 1 months
🎉 [RENEWAL] Subscription renewed successfully
📅 [RENEWAL] Next payment date: 2026-04-22T16:34:48.228Z
```

## Перевірка в продакшені

Для перевірки роботи системи в продакшені:

1. **Перевірте cron job**:
   ```bash
   crontab -l | grep renewal
   ```

2. **Перевірте логи**:
   ```bash
   tail -f /var/log/olimpX/renewal.log
   ```

3. **Перевірте базу даних**:
   ```sql
   SELECT * FROM recurring_subscriptions 
   WHERE is_active = true 
   AND next_payment_date <= NOW();
   ```

## Усунення несправностей

### Підписка не продовжується

1. Перевірте чи є токен (`rec_token`)
2. Перевірте дату наступного платежу (`next_payment_date`)
3. Перевірте кількість невдалих спроб (`failed_attempts`)
4. Перевірте статус підписки (`status = 'active'`)

### Cron job не запускається

1. Перевірте чи запущено cron service
2. Перевірте права доступу до скриптів
3. Перевірте environment variables

### Помилки в базі даних

1. Перевірте чи існує таблиця `recurring_subscriptions`
2. Перевірте RLS політики
3. Перевірте індекси для оптимізації

## Моніторинг

Рекомендовано налаштувати моніторинг:

1. **Alert для невдалих платежів** - більше 3 невдалих спроб
2. **Alert для неактивних підписок** - підписки з `failed_attempts >= 3`
3. **Dashboard для статистики** - кількість успішних/невдалих продовжень
4. **Log aggregation** - збирання логів з усіх компонентів

## Безпека

1. **Токени шифруються** в базі даних
2. **RLS політики** обмежують доступ
3. **Audit logging** для всіх платежів
4. **Rate limiting** для запитів до Monobank
