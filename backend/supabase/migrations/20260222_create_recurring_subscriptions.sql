-- Створення таблиці recurring_subscriptions
-- Таблиця для зберігання рекурентних підписок з токенами автопродовження

CREATE TABLE IF NOT EXISTS recurring_subscriptions (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES custom_users(id) ON DELETE CASCADE,
    package_id UUID NOT NULL REFERENCES subscription_plans(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES user_subscriptions(id) ON DELETE CASCADE,
    payment_id TEXT NOT NULL,
    rec_token TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'paused', 'expired')),
    billing_period TEXT NOT NULL DEFAULT 'month' CHECK (billing_period IN ('month', 'year')),
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'UAH',
    last_payment_date TIMESTAMP WITH TIME ZONE,
    next_payment_date TIMESTAMP WITH TIME ZONE,
    failed_attempts INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    cancelled_at TIMESTAMP WITH TIME ZONE
);

-- Створення індексів для кращої продуктивності
CREATE INDEX IF NOT EXISTS idx_recurring_subscriptions_user_id ON recurring_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_recurring_subscriptions_package_id ON recurring_subscriptions(package_id);
CREATE INDEX IF NOT EXISTS idx_recurring_subscriptions_subscription_id ON recurring_subscriptions(subscription_id);
CREATE INDEX IF NOT EXISTS idx_recurring_subscriptions_status ON recurring_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_recurring_subscriptions_next_payment_date ON recurring_subscriptions(next_payment_date);
CREATE INDEX IF NOT EXISTS idx_recurring_subscriptions_rec_token ON recurring_subscriptions(rec_token);
CREATE INDEX IF NOT EXISTS idx_recurring_subscriptions_is_active ON recurring_subscriptions(is_active);

-- Увімкнення RLS
ALTER TABLE recurring_subscriptions ENABLE ROW LEVEL SECURITY;

-- Створення RLS політик
-- Користувачі можуть бачити свої рекурентні підписки
DROP POLICY IF EXISTS "Users can view own recurring subscriptions" ON recurring_subscriptions;
CREATE POLICY "Users can view own recurring subscriptions" ON recurring_subscriptions
    FOR SELECT USING (auth.uid()::text = user_id::text);

-- Service role може керувати всіма рекурентними підписками
DROP POLICY IF EXISTS "Service role can manage recurring subscriptions" ON recurring_subscriptions;
CREATE POLICY "Service role can manage recurring subscriptions" ON recurring_subscriptions
    FOR ALL USING (auth.role() IN ('authenticated', 'service_role'));

-- Надання дозволів
GRANT ALL ON recurring_subscriptions TO authenticated;
GRANT ALL ON recurring_subscriptions TO service_role;

-- Створення тригера для оновлення updated_at
CREATE OR REPLACE FUNCTION update_recurring_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER recurring_subscriptions_updated_at
    BEFORE UPDATE ON recurring_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_recurring_subscriptions_updated_at();

-- Створення функції для автоматичного розрахунку наступної дати платежу
CREATE OR REPLACE FUNCTION calculate_next_payment_date(
    last_date TIMESTAMP WITH TIME ZONE,
    billing_period TEXT
) RETURNS TIMESTAMP WITH TIME ZONE AS $$
BEGIN
    IF billing_period = 'month' THEN
        RETURN last_date + INTERVAL '1 month';
    ELSIF billing_period = 'year' THEN
        RETURN last_date + INTERVAL '1 year';
    ELSE
        RETURN last_date + INTERVAL '1 month';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Створення функції для отримання активних рекурентних підписок для продовження
DROP FUNCTION IF EXISTS get_recurring_subscriptions_for_renewal();
CREATE OR REPLACE FUNCTION get_recurring_subscriptions_for_renewal()
RETURNS TABLE (
    id TEXT,
    user_id UUID,
    package_id UUID,
    subscription_id UUID,
    payment_id TEXT,
    rec_token TEXT,
    amount DECIMAL(10,2),
    currency TEXT,
    billing_period TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        rs.id,
        rs.user_id,
        rs.package_id,
        rs.subscription_id,
        rs.payment_id,
        rs.rec_token,
        rs.amount,
        rs.currency,
        rs.billing_period
    FROM recurring_subscriptions rs
    WHERE rs.is_active = true
    AND rs.status = 'active'
    AND rs.next_payment_date <= NOW()
    AND rs.failed_attempts < 3;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Створення функції для логування спроб продовження
CREATE OR REPLACE FUNCTION log_renewal_attempt(
    subscription_id UUID,
    success BOOLEAN,
    error_message TEXT DEFAULT NULL,
    new_payment_id TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    IF success THEN
        -- Оновлюємо дату наступного платежу при успіху
        UPDATE recurring_subscriptions 
        SET 
            last_payment_date = NOW(),
            next_payment_date = calculate_next_payment_date(NOW(), billing_period),
            failed_attempts = 0,
            updated_at = NOW()
        WHERE id = subscription_id;
    ELSE
        -- Збільшуємо лічильник невдалих спроб
        UPDATE recurring_subscriptions 
        SET 
            failed_attempts = failed_attempts + 1,
            updated_at = NOW()
        WHERE id = subscription_id;
        
        -- Якщо 3 невдалі спроби - деактивуємо підписку
        UPDATE recurring_subscriptions 
        SET 
            status = 'expired',
            is_active = false,
            updated_at = NOW()
        WHERE id = subscription_id AND failed_attempts + 1 >= 3;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Додавання коментарів
COMMENT ON TABLE recurring_subscriptions IS 'Recurring subscriptions with auto-renewal tokens';
COMMENT ON COLUMN recurring_subscriptions.id IS 'Unique recurring subscription identifier';
COMMENT ON COLUMN recurring_subscriptions.user_id IS 'User who owns the recurring subscription';
COMMENT ON COLUMN recurring_subscriptions.package_id IS 'Subscription plan package';
COMMENT ON COLUMN recurring_subscriptions.subscription_id IS 'Related user subscription (UUID)';
COMMENT ON COLUMN recurring_subscriptions.payment_id IS 'Original payment ID';
COMMENT ON COLUMN recurring_subscriptions.rec_token IS 'Recurring token for auto-payments';
COMMENT ON COLUMN recurring_subscriptions.status IS 'Status: active, cancelled, paused, expired';
COMMENT ON COLUMN recurring_subscriptions.billing_period IS 'Billing period: month or year';
COMMENT ON COLUMN recurring_subscriptions.last_payment_date IS 'Date of last successful payment';
COMMENT ON COLUMN recurring_subscriptions.next_payment_date IS 'Date of next scheduled payment';
COMMENT ON COLUMN recurring_subscriptions.failed_attempts IS 'Number of failed renewal attempts';
COMMENT ON COLUMN recurring_subscriptions.is_active IS 'Whether subscription is currently active';
COMMENT ON COLUMN recurring_subscriptions.cancelled_at IS 'Date when subscription was cancelled';
