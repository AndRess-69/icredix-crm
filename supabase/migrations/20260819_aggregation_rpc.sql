-- ============================================================
-- Agregaciones server-side para dashboard y reportes
-- Reemplaza fetch-all + sum en JS con cálculos en Postgres
-- ============================================================

-- 1. Stats del dashboard en una sola llamada
CREATE OR REPLACE FUNCTION get_dashboard_stats()
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  SELECT jsonb_build_object(
    'active_clients', (
      SELECT count(*) FROM clients WHERE deleted_at IS NULL
    ),
    'active_credits', (
      SELECT count(*) FROM credits WHERE status = 'activo' AND deleted_at IS NULL
    ),
    'payments_today', (
      SELECT count(*) FROM payments
      WHERE created_at >= (now() AT TIME ZONE 'America/Bogota')::date
        AND deleted_at IS NULL
    ),
    'payments_today_amount', (
      SELECT COALESCE(sum(amount), 0) FROM payments
      WHERE created_at >= (now() AT TIME ZONE 'America/Bogota')::date
        AND deleted_at IS NULL
    ),
    'pending_payments', (
      SELECT count(*) FROM installments WHERE status = 'pendiente'
    ),
    'overdue_clients', (
      SELECT count(*) FROM credits WHERE status = 'en_mora' AND deleted_at IS NULL
    ),
    'blocked_devices', (
      SELECT count(*) FROM devices WHERE status = 'bloqueado' AND deleted_at IS NULL
    ),
    'balance_to_collect', (
      SELECT COALESCE(sum(balance), 0) FROM credits
      WHERE status IN ('activo', 'en_mora', 'bloqueado') AND deleted_at IS NULL
    ),
    'monthly_income', (
      SELECT COALESCE(sum(amount), 0) FROM payments
      WHERE created_at >= date_trunc('month', now() AT TIME ZONE 'America/Bogota')
        AND created_at < date_trunc('month', now() AT TIME ZONE 'America/Bogota') + interval '1 month'
        AND deleted_at IS NULL
    )
  );
$$;

-- 2. Pagos agrupados por método
CREATE OR REPLACE FUNCTION get_payments_by_method()
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'method', method,
        'count', cnt,
        'amount', amt
      )
    ),
    '[]'::jsonb
  )
  FROM (
    SELECT
      method,
      count(*) AS cnt,
      sum(amount) AS amt
    FROM payments
    WHERE deleted_at IS NULL
    GROUP BY method
  ) sub;
$$;

-- 3. Créditos agrupados por estado
CREATE OR REPLACE FUNCTION get_credit_status_summary()
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'status', status,
        'count', cnt,
        'financed', financed,
        'balance', bal
      )
    ),
    '[]'::jsonb
  )
  FROM (
    SELECT
      status,
      count(*) AS cnt,
      sum(financed_amount) AS financed,
      sum(balance) AS bal
    FROM credits
    WHERE deleted_at IS NULL
    GROUP BY status
  ) sub;
$$;

-- 4. Pagos agrupados por mes (para gráfico del dashboard)
CREATE OR REPLACE FUNCTION get_monthly_payments_chart(months_back int DEFAULT 6)
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  WITH months AS (
    SELECT generate_series(
      date_trunc('month', now() AT TIME ZONE 'America/Bogota') - ((months_back - 1) || ' months')::interval,
      date_trunc('month', now() AT TIME ZONE 'America/Bogota'),
      '1 month'::interval
    ) AS month
  ),
  monthly_totals AS (
    SELECT
      m.month,
      COALESCE(sum(p.amount), 0) AS total
    FROM months m
    LEFT JOIN payments p
      ON p.deleted_at IS NULL
      AND date_trunc('month', p.created_at AT TIME ZONE 'America/Bogota') = m.month
    GROUP BY m.month
    ORDER BY m.month
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'month', to_char(month, 'YYYY-MM'),
      'amount', total
    )
  )
  FROM monthly_totals;
$$;
