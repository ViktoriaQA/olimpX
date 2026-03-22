-- Додавання order_id до таблиці user_subscriptions
-- Це дозволить зв'язати підписку з відповідним платежем

-- Додавання order_id якщо не існує
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_subscriptions' AND column_name = 'order_id'
    ) THEN
        ALTER TABLE user_subscriptions 
        ADD COLUMN order_id TEXT;
        
        -- Створення індексу для order_id
        CREATE INDEX idx_user_subscriptions_order_id ON user_subscriptions(order_id);
        
        -- Додавання коментаря
        COMMENT ON COLUMN user_subscriptions.order_id IS 'Order ID from payment system for tracking';
    END IF;
END $$;
