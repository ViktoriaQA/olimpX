-- Створення таблиці recurring_subscriptions для автоматичних підписок
-- Ця міграція створює таблицю для зберігання інформації про регулярні платежі

-- 1. Таблиця recurring_subscriptions для автоматичного продовження підписок
CREATE TABLE IF NOT EXISTS recurring_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES custom_users(id) ON DELETE CASCADE,
    package_id UUID NOT NULL REFERENCES subscription_plans(id) ON DELETE CASCADE,
    subscription_id TEXT NOT NULL UNIQUE, -- ID підписки в платіжній системі
    payment_id TEXT NOT NULL, -- ID платежу
    rec_token TEXT NOT NULL, -- Токен для автоматичного списання
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled', 'pending')),
    billing_period TEXT NOT NULL DEFAULT 'month' CHECK (billing_period IN ('month', 'year')),
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'UAH',
    last_payment_date TIMESTAMP WITH TIME ZONE,
    next_payment_date TIMESTAMP WITH TIME ZONE NOT NULL,
    failed_attempts INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    cancelled_at TIMESTAMP WITH TIME ZONE
);

-- Створення індексів для recurring_subscriptions
CREATE INDEX IF NOT EXISTS idx_recurring_subscriptions_user_id ON recurring_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_recurring_subscriptions_package_id ON recurring_subscriptions(package_id);
CREATE INDEX IF NOT EXISTS idx_recurring_subscriptions_status ON recurring_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_recurring_subscriptions_next_payment_date ON recurring_subscriptions(next_payment_date);
CREATE INDEX IF NOT EXISTS idx_recurring_subscriptions_is_active ON recurring_subscriptions(is_active);
CREATE INDEX IF NOT EXISTS idx_recurring_subscriptions_subscription_id ON recurring_subscriptions(subscription_id);

-- Увімкнення RLS
ALTER TABLE recurring_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS політики для recurring_subscriptions
DROP POLICY IF EXISTS "Users can view own recurring subscriptions" ON recurring_subscriptions;
CREATE POLICY "Users can view own recurring subscriptions" ON recurring_subscriptions
    FOR SELECT USING (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "Service role can manage recurring subscriptions" ON recurring_subscriptions;
CREATE POLICY "Service role can manage recurring subscriptions" ON recurring_subscriptions
    FOR ALL USING (auth.role() IN ('authenticated', 'service_role'));

-- Надання дозволів
GRANT ALL ON recurring_subscriptions TO authenticated;
GRANT ALL ON recurring_subscriptions TO service_role;

-- Тригер для оновлення updated_at в recurring_subscriptions
CREATE OR REPLACE FUNCTION update_recurring_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER recurring_subscriptions_updated_at
    BEFORE UPDATE ON recurring_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_recurring_subscriptions_updated_at();

-- Функція для оновлення наступної дати платежу
CREATE OR REPLACE FUNCTION update_next_payment_date(
    p_subscription_id TEXT,
    p_months INTEGER DEFAULT 1
) RETURNS TIMESTAMP WITH TIME ZONE AS $$
DECLARE
    v_next_payment_date TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Отримання поточної дати платежу
    SELECT next_payment_date INTO v_next_payment_date
    FROM recurring_subscriptions
    WHERE subscription_id = p_subscription_id;
    
    IF v_next_payment_date IS NOT NULL THEN
        -- Оновлення наступної дати платежу
        UPDATE recurring_subscriptions
        SET 
            next_payment_date = v_next_payment_date + (p_months || ' months')::INTERVAL,
            last_payment_date = NOW(),
            failed_attempts = 0,
            updated_at = NOW()
        WHERE subscription_id = p_subscription_id;
        
        RETURN v_next_payment_date + (p_months || ' months')::INTERVAL;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Функція для обробки невдалих спроб платежу
CREATE OR REPLACE FUNCTION handle_failed_payment(
    p_subscription_id TEXT,
    p_error_message TEXT DEFAULT 'Payment failed'
) RETURNS INTEGER AS $$
DECLARE
    v_failed_attempts INTEGER;
    v_max_attempts INTEGER := 3;
BEGIN
    -- Збільшення лічильника невдалих спроб
    UPDATE recurring_subscriptions
    SET 
        failed_attempts = failed_attempts + 1,
        updated_at = NOW()
    WHERE subscription_id = p_subscription_id
    RETURNING failed_attempts INTO v_failed_attempts;
    
    -- Якщо кількість спроб перевищує ліміт, деактивувати підписку
    IF v_failed_attempts >= v_max_attempts THEN
        UPDATE recurring_subscriptions
        SET 
            status = 'expired',
            is_active = false,
            updated_at = NOW()
        WHERE subscription_id = p_subscription_id;
    END IF;
    
    RETURN v_failed_attempts;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Додавання коментарів
COMMENT ON TABLE recurring_subscriptions IS 'Recurring subscription payments with automatic renewal';
COMMENT ON COLUMN recurring_subscriptions.subscription_id IS 'Payment gateway subscription ID';
COMMENT ON COLUMN recurring_subscriptions.payment_id IS 'Payment gateway payment ID';
COMMENT ON COLUMN recurring_subscriptions.rec_token IS 'Token for automatic charging';
COMMENT ON COLUMN recurring_subscriptions.next_payment_date IS 'Next scheduled payment date';
COMMENT ON COLUMN recurring_subscriptions.failed_attempts IS 'Number of failed payment attempts';
