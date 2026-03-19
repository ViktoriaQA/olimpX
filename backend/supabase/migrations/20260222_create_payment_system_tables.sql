-- Створення основних таблиць платіжної системи
-- Ця міграція створює відсутні таблиці для повного циклу оплати

-- Спочатку перевіримо та виправимо існуючі таблиці
DO $$
BEGIN
    -- Перевірка та відновлення payment_attempts
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_attempts') THEN
        -- Перевіряємо чи існує стовпець status
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'payment_attempts' AND column_name = 'status'
        ) THEN
            DROP TABLE payment_attempts CASCADE;
        END IF;
    END IF;
    
    -- Перевірка та відновлення user_subscriptions
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_subscriptions') THEN
        -- Перевіряємо чи існує стовпець expires_at
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'user_subscriptions' AND column_name = 'expires_at'
        ) THEN
            DROP TABLE user_subscriptions CASCADE;
        END IF;
    END IF;
    
    -- Перевірка та відновлення receipts
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'receipts') THEN
        -- Перевіряємо чи існує стовпець payment_date
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'receipts' AND column_name = 'payment_date'
        ) THEN
            DROP TABLE receipts CASCADE;
        END IF;
    END IF;
END $$;

-- 1. Таблиця payment_attempts для відстеження спроб оплати
CREATE TABLE IF NOT EXISTS payment_attempts (
    order_id TEXT PRIMARY KEY, -- Унікальний ID замовлення
    user_id UUID NOT NULL REFERENCES custom_users(id) ON DELETE CASCADE,
    package_id UUID NOT NULL REFERENCES subscription_plans(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'UAH',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
    payment_method TEXT NOT NULL DEFAULT 'monobank',
    checkout_url TEXT,
    payment_id TEXT,
    billing_period TEXT NOT NULL DEFAULT 'month' CHECK (billing_period IN ('month', 'year')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Перевірка та додавання відсутніх стовпців до payment_attempts
DO $$
BEGIN
    -- Додавання status якщо існує
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'payment_attempts' AND column_name = 'status'
    ) THEN
        ALTER TABLE payment_attempts 
        ADD COLUMN status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled'));
    END IF;
    
    -- Додавання payment_method якщо існує
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'payment_attempts' AND column_name = 'payment_method'
    ) THEN
        ALTER TABLE payment_attempts 
        ADD COLUMN payment_method TEXT NOT NULL DEFAULT 'monobank';
    END IF;
    
    -- Додавання checkout_url якщо існує
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'payment_attempts' AND column_name = 'checkout_url'
    ) THEN
        ALTER TABLE payment_attempts 
        ADD COLUMN checkout_url TEXT;
    END IF;
    
    -- Додавання payment_id якщо існує
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'payment_attempts' AND column_name = 'payment_id'
    ) THEN
        ALTER TABLE payment_attempts 
        ADD COLUMN payment_id TEXT;
    END IF;
    
    -- Додавання billing_period якщо існує
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'payment_attempts' AND column_name = 'billing_period'
    ) THEN
        ALTER TABLE payment_attempts 
        ADD COLUMN billing_period TEXT NOT NULL DEFAULT 'month' CHECK (billing_period IN ('month', 'year'));
    END IF;
    
    -- Додавання completed_at якщо існує
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'payment_attempts' AND column_name = 'completed_at'
    ) THEN
        ALTER TABLE payment_attempts 
        ADD COLUMN completed_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- 2. Таблиця user_subscriptions для присвоєння пакетів користувачам
CREATE TABLE IF NOT EXISTS user_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES custom_users(id) ON DELETE CASCADE,
    package_id UUID NOT NULL REFERENCES subscription_plans(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
    billing_period TEXT NOT NULL DEFAULT 'month' CHECK (billing_period IN ('month', 'year')),
    starts_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW() + INTERVAL '1 month',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    cancelled_at TIMESTAMP WITH TIME ZONE
    -- Унікальність: один активний пакет на користувача
    -- Це буде реалізовано через частковий унікальний індекс нижче
);

-- Перевірка та додавання відсутніх стовпців до user_subscriptions
DO $$
BEGIN
    -- Додавання expires_at якщо існує
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_subscriptions' AND column_name = 'expires_at'
    ) THEN
        ALTER TABLE user_subscriptions 
        ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW() + INTERVAL '1 month';
    END IF;
    
    -- Додавання is_active якщо існує
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_subscriptions' AND column_name = 'is_active'
    ) THEN
        ALTER TABLE user_subscriptions 
        ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
    
    -- Додавання cancelled_at якщо існує
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_subscriptions' AND column_name = 'cancelled_at'
    ) THEN
        ALTER TABLE user_subscriptions 
        ADD COLUMN cancelled_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- 3. Таблиця receipts для квитанцій про платежі
CREATE TABLE IF NOT EXISTS receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id TEXT NOT NULL REFERENCES payment_attempts(order_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES custom_users(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'UAH',
    payment_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    payment_method TEXT NOT NULL DEFAULT 'monobank',
    transaction_id TEXT,
    status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'failed', 'refunded')),
    receipt_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Перевірка та додавання відсутніх стовпців до receipts
DO $$
BEGIN
    -- Додавання payment_date якщо існує
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'receipts' AND column_name = 'payment_date'
    ) THEN
        ALTER TABLE receipts 
        ADD COLUMN payment_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW();
    END IF;
    
    -- Додавання receipt_url якщо існує
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'receipts' AND column_name = 'receipt_url'
    ) THEN
        ALTER TABLE receipts 
        ADD COLUMN receipt_url TEXT;
    END IF;
END $$;

-- Створення індексів для payment_attempts
CREATE INDEX IF NOT EXISTS idx_payment_attempts_user_id ON payment_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_attempts_package_id ON payment_attempts(package_id);
CREATE INDEX IF NOT EXISTS idx_payment_attempts_status ON payment_attempts(status);
CREATE INDEX IF NOT EXISTS idx_payment_attempts_created_at ON payment_attempts(created_at);
CREATE INDEX IF NOT EXISTS idx_payment_attempts_payment_id ON payment_attempts(payment_id);

-- Створення індексів для user_subscriptions
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_package_id ON user_subscriptions(package_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_expires_at ON user_subscriptions(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_is_active ON user_subscriptions(is_active);

-- Частковий унікальний індекс: один активний пакет на користувача
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_subscriptions_active_unique 
ON user_subscriptions(user_id, package_id) 
WHERE status = 'active';

-- Створення індексів для receipts
CREATE INDEX IF NOT EXISTS idx_receipts_order_id ON receipts(order_id);
CREATE INDEX IF NOT EXISTS idx_receipts_user_id ON receipts(user_id);
CREATE INDEX IF NOT EXISTS idx_receipts_payment_date ON receipts(payment_date);
CREATE INDEX IF NOT EXISTS idx_receipts_status ON receipts(status);

-- Увімкнення RLS
ALTER TABLE payment_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;

-- RLS політики для payment_attempts
DROP POLICY IF EXISTS "Users can view own payment attempts" ON payment_attempts;
CREATE POLICY "Users can view own payment attempts" ON payment_attempts
    FOR SELECT USING (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "Service role can manage payment attempts" ON payment_attempts;
CREATE POLICY "Service role can manage payment attempts" ON payment_attempts
    FOR ALL USING (auth.role() IN ('authenticated', 'service_role'));

-- RLS політики для user_subscriptions
DROP POLICY IF EXISTS "Users can view own subscriptions" ON user_subscriptions;
CREATE POLICY "Users can view own subscriptions" ON user_subscriptions
    FOR SELECT USING (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "Service role can manage user subscriptions" ON user_subscriptions;
CREATE POLICY "Service role can manage user subscriptions" ON user_subscriptions
    FOR ALL USING (auth.role() IN ('authenticated', 'service_role'));

-- RLS політики для receipts
DROP POLICY IF EXISTS "Users can view own receipts" ON receipts;
CREATE POLICY "Users can view own receipts" ON receipts
    FOR SELECT USING (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "Service role can insert receipts" ON receipts;
CREATE POLICY "Service role can insert receipts" ON receipts
    FOR INSERT WITH CHECK (auth.role() IN ('authenticated', 'service_role'));

-- Надання дозволів
GRANT ALL ON payment_attempts TO authenticated;
GRANT ALL ON payment_attempts TO service_role;
GRANT ALL ON user_subscriptions TO authenticated;
GRANT ALL ON user_subscriptions TO service_role;
GRANT SELECT ON receipts TO authenticated;
GRANT ALL ON receipts TO service_role;

-- Тригер для оновлення updated_at в payment_attempts
CREATE OR REPLACE FUNCTION update_payment_attempts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER payment_attempts_updated_at
    BEFORE UPDATE ON payment_attempts
    FOR EACH ROW
    EXECUTE FUNCTION update_payment_attempts_updated_at();

-- Тригер для оновлення updated_at в user_subscriptions
CREATE OR REPLACE FUNCTION update_user_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_subscriptions_updated_at
    BEFORE UPDATE ON user_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_user_subscriptions_updated_at();

-- Функція для автоматичного розширення підписки
CREATE OR REPLACE FUNCTION extend_subscription(
    p_user_id UUID,
    p_package_id UUID,
    p_billing_period TEXT,
    p_months INTEGER DEFAULT 1
) RETURNS UUID AS $$
DECLARE
    v_subscription_id UUID;
    v_new_expiry_date TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Перевірка чи існує активна підписка
    SELECT id INTO v_subscription_id
    FROM user_subscriptions
    WHERE user_id = p_user_id 
    AND package_id = p_package_id 
    AND status = 'active'
    AND is_active = true;
    
    IF v_subscription_id IS NOT NULL THEN
        -- Розширення існуючої підписки
        UPDATE user_subscriptions
        SET 
            expires_at = CASE 
                WHEN expires_at > NOW() THEN expires_at + (p_months || ' months')::INTERVAL
                ELSE NOW() + (p_months || ' months')::INTERVAL
            END,
            updated_at = NOW()
        WHERE id = v_subscription_id;
        
        RETURN v_subscription_id;
    ELSE
        -- Створення нової підписки
        INSERT INTO user_subscriptions (user_id, package_id, billing_period, expires_at)
        VALUES (
            p_user_id, 
            p_package_id, 
            p_billing_period, 
            NOW() + (p_months || ' months')::INTERVAL
        )
        RETURNING id INTO v_subscription_id;
        
        RETURN v_subscription_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Функція для створення квитанції після успішної оплати
CREATE OR REPLACE FUNCTION create_payment_receipt(
    p_order_id TEXT,
    p_transaction_id TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_receipt_id UUID;
    v_payment_attempt RECORD;
BEGIN
    -- Отримання інформації про платіж
    SELECT * INTO v_payment_attempt
    FROM payment_attempts
    WHERE order_id = p_order_id;
    
    IF v_payment_attempt IS NULL THEN
        RAISE EXCEPTION 'Payment attempt not found: %', p_order_id;
    END IF;
    
    -- Створення квитанції
    INSERT INTO receipts (
        order_id, 
        user_id, 
        amount, 
        currency, 
        transaction_id
    )
    VALUES (
        p_order_id,
        v_payment_attempt.user_id,
        v_payment_attempt.amount,
        v_payment_attempt.currency,
        p_transaction_id
    )
    RETURNING id INTO v_receipt_id;
    
    RETURN v_receipt_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Додавання коментарів
COMMENT ON TABLE payment_attempts IS 'Payment attempts with payment gateway integration';
COMMENT ON TABLE user_subscriptions IS 'User subscription packages and terms';
COMMENT ON TABLE receipts IS 'Payment receipts and transaction records';

COMMENT ON COLUMN payment_attempts.order_id IS 'Unique order identifier';
COMMENT ON COLUMN payment_attempts.checkout_url IS 'Payment gateway checkout URL for payment';
COMMENT ON COLUMN payment_attempts.payment_id IS 'Payment gateway transaction ID';
COMMENT ON COLUMN payment_attempts.billing_period IS 'Billing period: month or year';

COMMENT ON COLUMN user_subscriptions.expires_at IS 'Subscription expiry date';
COMMENT ON COLUMN user_subscriptions.billing_period IS 'Billing period: month or year';
COMMENT ON COLUMN user_subscriptions.is_active IS 'Whether subscription is currently active';

COMMENT ON COLUMN receipts.transaction_id IS 'Payment gateway transaction ID';
COMMENT ON COLUMN receipts.receipt_url IS 'URL to download receipt PDF';
