-- Виправлення структури таблиці user_subscriptions
-- Додаємо відсутні поля та виправляємо назви стовпців

-- Перевірка існуючих стовпців
DO $$
BEGIN
    -- Додавання end_date якщо існує
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_subscriptions' AND column_name = 'end_date'
    ) THEN
        ALTER TABLE user_subscriptions 
        ADD COLUMN end_date TIMESTAMP WITH TIME ZONE;
    END IF;
    
    -- Перейменування starts_at на start_date якщо існує
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_subscriptions' AND column_name = 'starts_at'
    ) THEN
        ALTER TABLE user_subscriptions RENAME COLUMN starts_at TO start_date;
    END IF;
    
    -- Додавання start_date якщо не існує
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_subscriptions' AND column_name = 'start_date'
    ) THEN
        ALTER TABLE user_subscriptions 
        ADD COLUMN start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
    
    -- Додавання billing_period якщо не існує
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_subscriptions' AND column_name = 'billing_period'
    ) THEN
        ALTER TABLE user_subscriptions 
        ADD COLUMN billing_period TEXT NOT NULL DEFAULT 'month' CHECK (billing_period IN ('month', 'year'));
    END IF;
    
    -- Додавання is_active якщо не існує
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_subscriptions' AND column_name = 'is_active'
    ) THEN
        ALTER TABLE user_subscriptions 
        ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
    
    -- Додавання cancelled_at якщо не існує
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_subscriptions' AND column_name = 'cancelled_at'
    ) THEN
        ALTER TABLE user_subscriptions 
        ADD COLUMN cancelled_at TIMESTAMP WITH TIME ZONE;
    END IF;
    
    -- Оновлення expires_at якщо існує
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_subscriptions' AND column_name = 'expires_at'
    ) THEN
        -- Переконуємо expires_at в end_date для узгодженості
        UPDATE user_subscriptions 
        SET end_date = expires_at 
        WHERE end_date IS NULL AND expires_at IS NOT NULL;
    END IF;
    
    -- Якщо end_date порожній, встановлюємо expires_at
    UPDATE user_subscriptions 
    SET end_date = expires_at 
    WHERE end_date IS NULL AND expires_at IS NOT NULL;
END $$;

-- Створення індексів для нових полів якщо не існують
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_start_date ON user_subscriptions(start_date);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_end_date ON user_subscriptions(end_date);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_billing_period ON user_subscriptions(billing_period);

-- Оновлення тригерів
DROP TRIGGER IF EXISTS user_subscriptions_updated_at ON user_subscriptions;
CREATE TRIGGER user_subscriptions_updated_at
    BEFORE UPDATE ON user_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_user_subscriptions_updated_at();

-- Додавання коментарів
COMMENT ON COLUMN user_subscriptions.start_date IS 'Subscription start date';
COMMENT ON COLUMN user_subscriptions.end_date IS 'Subscription end date';
COMMENT ON COLUMN user_subscriptions.billing_period IS 'Billing period: month or year';
COMMENT ON COLUMN user_subscriptions.is_active IS 'Whether subscription is currently active';
COMMENT ON COLUMN user_subscriptions.cancelled_at IS 'Subscription cancellation date';
