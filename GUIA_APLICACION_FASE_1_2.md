# Guía de aplicación manual — FASE 1 y FASE 2 (iCredix CRM)

El código ya está implementado, verificado (`tsc`, `lint`, `build`) y con las migraciones listas.
Esta guía contiene los pasos que solo puedes ejecutar tú, en orden:

1. Desplegar el código en Vercel.
2. Aplicar las 2 migraciones en el SQL Editor de Supabase.
3. Rotar el token de Google Sheets (quedó expuesto antes de la corrección).
4. Ejecutar las 15 pruebas obligatorias y verificar resultados.

---

## Paso 1 — Desplegar el código

- Sube los cambios y despliega en Vercel (build ya validado: 15 rutas, `/creditos` 425 kB).
- Hasta que se despliegue, los guards y formularios nuevos no estarán activos en producción.

---

## Paso 2 — Aplicar las migraciones (SQL Editor de Supabase)

Entra a **Supabase → tu proyecto → SQL Editor** y ejecuta en este orden:

### 2.1 `20260808_fix_update_credit.sql`
- Contenido: el archivo `supabase/migrations/20260808_fix_update_credit.sql` (defines el archivo completo).
- Qué hace: restaura `update_credit` con la firma de **10 parámetros** (incluye `p_device_value`) y vuelve a persistir `device_value`. Solo redefine esta RPC; no toca `create_credit` ni `create_payment`.
- Verificación tras ejecutar:

```sql
select proname, pg_get_function_identity_arguments(oid)
from pg_proc
where proname in ('update_credit', 'create_credit', 'create_payment', 'delete_payment');
```

Resultado esperado:

| proname | argumentos |
|---|---|
| update_credit | uuid, uuid, uuid, text, numeric, numeric, int, date, numeric, numeric |
| create_credit | (firma que ya estaba en BD — no se modifica) |
| create_payment | uuid, uuid, text, text, text, numeric |
| delete_payment | uuid |

### 2.2 `20260808_fix_payment_reversal.sql`
- Contenido: el archivo `supabase/migrations/20260808_fix_payment_reversal.sql` (defines el archivo completo).
- Qué hace:
  - Añade `payments.transferred_to_installment_id` (referencia **exacta** de la cuota que recibió el restante).
  - Añade `payments.is_partial` (bandera sin heurísticas).
  - `create_payment` registra ambas; `delete_payment` revierte de forma exacta (casos A y B) y es no-op si el pago ya estaba borrado (evita el doble reverso).
- Verificación tras ejecutar:

```sql
select column_name
from information_schema.columns
where table_name = 'payments'
  and column_name in ('transferred_to_installment_id', 'is_partial');
```

Resultado esperado: `transferred_to_installment_id` e `is_partial` (2 filas).

> **Rollback** (solo si algo falla): los `drop function ... cascade` al inicio de cada migración permiten re-ejecutarlas limpiamente. Para restaurar el comportamiento anterior basta con re-ejecutar la sección correspondiente de `20260807_next_features.sql`.

---

## Paso 3 — Rotar token de Google Sheets (obligatorio)

El token antiguo quedó incrustado en el HTML en producción antes de esta corrección. Hay que cambiarlo:

1. **Genera un secreto nuevo** (aleatorio, largo; ej. `openssl rand -hex 24` o un generador de contraseñas).
2. En la hoja de backup: **Extensiones → Apps Script**, abre el proyecto del Web App.
3. Borra el contenido y pega el archivo **actualizado** `supabase/apps-script/backup.gs` (lee el token de Propiedades del script, fail-closed).
4. **Extensiones → Propiedades del script → Añadir propiedad**: clave `TOKEN`, valor = tu secreto nuevo.
5. **Implementar → Administrar implementaciones → ✏️ editar → Versión nueva**, y guarda.
6. En la app: **Configuración → Google Sheets**, escribe el token nuevo en el campo y **Guardar**.
   - Nota: tras este despliegue el campo ya **no se autocompleta** (muestra "ya configurado"); déjalo vacío para conservar el existente, o escribe el nuevo para rotarlo.
7. Pulsa **Probar conexión**: debe devolver `ok: true`.

> Si prefieres setear el token por SQL (evita el paso 6 en la UI), ejecuta con el valor nuevo:
>
> ```sql
> update public.company_settings
> set google_script_token = '<nuevo-token>', updated_at = now()
> where id = (select id from public.company_settings limit 1);
> ```
> y verifica luego con **Probar conexión**.

---

## Paso 4 — Las 15 pruebas obligatorias

Flujo: en la app, con una sesión real de usuario. Registra el resultado de cada una.

### Créditos (5)

| # | Prueba | Resultado esperado |
|---|---|---|
| 1 | Crear crédito **sin interés** (10 cuotas). | `financed_amount` total == valor financiado; la suma de las 10 cuotas == financiado. |
| 2 | Crear crédito **con interés** (ej. 10%). | El preview y el total guardado = `financiado × 1.10`; la suma de las cuotas == ese total. |
| 3 | **Editar** un crédito sin pagos, con interés. | El preview aplica el interés (no muestra 0) y al guardar el total se recalcula igual que al crear; `balance` se resetea al nuevo total. |
| 4 | **Editar** y verificar `device_value`. | Al guardar y recargar el crédito, `device_value` conserva su valor (lo persiste `update_credit`). |
| 5 | Intentar **editar** un crédito que ya tiene pagos. | La RPC rechaza: "No se puede editar un crédito con pagos registrados". |

### Pagos y reversos (8)

| # | Prueba | Resultado esperado |
|---|---|---|
| 6 | **Pago completo** de una cuota. | Cuota pasa a `pagada`; `balance` disminuye el monto de la cuota. |
| 7 | **Pago parcial** de una cuota intermedia (ej. 60 de 100) con cuotas posteriores pendientes. | La cuota paga pasa a `pagada`; el restante (40) se suma a la **última cuota pendiente**; `transferred_to_installment_id` queda señalando esa cuota; `balance -= 60`. |
| 8 | **Pago parcial** sobre la última cuota pendiente (ej. 60 de 100). | `is_partial = true`; la cuota conserva su monto reducido (40); `balance -= 60`. |
| 9 | **Reverso de un pago completo**. | Cuota vuelve a `pendiente`; `paid_at` en null; `balance` restaurado; el pago queda con `deleted_at` no nulo. |
| 10 | **Reverso de un parcial con traslado** (el de la prueba 7). | La cuota destino vuelve a su monto exacto (se descuenta el restante añadido); la cuota original vuelve a `pendiente`. |
| 11 | **Reverso de un parcial de la última** (el de la prueba 8). | La cuota vuelve a su monto original (100 = 40 + 60); `balance` restaurado. |
| 12 | **Doble reverso** del mismo pago (borrar de nuevo). | Segundo intento es no-op: no cambia `balance`, no da error. |
| 13 | **Pago mayor al monto de la cuota**. | Rechazado: "El valor no puede ser mayor al valor de la cuota" (validación en `createPaymentAction`). |

### Google Sheets (2)

| # | Prueba | Resultado esperado |
|---|---|---|
| 14 | Con el token de Sheets **inválido** o el Web App **lento/caído**, registrar un pago. | El pago se guarda en Supabase y el usuario ve éxito; se registra solo un `console.error` del sync; no hay rollback ni reintento. |
| 15 | Tras la prueba 14, verificar **sin duplicados**. | `payments` no tiene filas duplicadas (1 fila por pago) y la hoja no recibe filas repetidas del mismo pago. |

### Consultas de verificación SQL (para pruebas 1, 2, 6–12)

```sql
-- suma de cuotas == financiado del crédito
select c.financed_amount,
       sum(i.amount) as suma_cuotas,
       (select coalesce(sum(amount), 0) from public.payments
         where credit_id = c.id and deleted_at is null) as total_pagado
from public.credits c
join public.installments i on i.credit_id = c.id
group by c.id;

-- estado de un pago y sus marcadores
select id, installment_id, amount, is_partial, transferred_to_installment_id, deleted_at
from public.payments
where credit_id = '<credit_id>'
order by created_at;

-- balance vs financiado (saldo)
select financed_amount, balance, status
from public.credits where id = '<credit_id>';
```

**Nota:** los resultados esperados de la prueba 7 dependen de la cola de cuotas pendientes; si la "última pendiente" coincide con la cuota que se paga, la RPC lo trata como caso A (prueba 8), también correcto.

---

## Pendientes que requieren tu confirmación (fuera de esta guía)

1. **RLS / policies / grants**: confirmar en la consola qué tablas tienen RLS activo para crear migraciones seguras.
2. **RPCs de bloqueo/desbloqueo**: no versionadas porque no existen en las migraciones; necesito el SQL real de tu BD para no inventar lógica.
3. **Granularidad de roles**: decidido por defecto — sesión para crear/editar/transiciones; **admin** para borrados, configuración y sync. Si los agentes deben poder borrar, avísame.
