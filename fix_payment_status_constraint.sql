-- Виправлення обмеження на статуси в payment_attempts
-- Додаємо 'initiated' до дозволених статусів

-- Спочатку видаляємо старе обмеження
ALTER TABLE payment_attempts DROP CONSTRAINT IF EXISTS payment_attempts_status_check;

-- Додаємо нове обмеження з 'initiated'
ALTER TABLE payment_attempts 
ADD CONSTRAINT payment_attempts_status_check 
CHECK (status IN ('pending', 'initiated', 'completed', 'failed', 'cancelled', 'processing', 'expired'));

-- Оновлюємо існуючі записи зі статусом 'initiated' якщо вони є
UPDATE payment_attempts 
SET status = 'pending' 
WHERE status NOT IN ('pending', 'completed', 'failed', 'cancelled', 'processing', 'expired');

-- Додаємо коментар
COMMENT ON CONSTRAINT payment_attempts_status_check ON payment_attempts IS 'Allowed statuses for payment attempts including initiated state';
