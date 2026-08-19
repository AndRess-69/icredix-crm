/**
 * iCredix · Backup a Google Sheets (segunda base de datos)
 * --------------------------------------------------------
 * CÓMO INSTALAR:
 * 1. Abre la hoja de cálculo de Google que usará como backup.
 * 2. Extensiones → Apps Script.
 * 3. Borra el contenido y pega todo este archivo.
 * 4. Define el token secreto: Extensiones → Propiedades del script →
 *    Añadir propiedad, clave TOKEN y valor tu secreto (debe coincidir con
 *    el que configures en la app, en Configuración → Google Sheets).
 * 5. Implementar → Nueva implementación → Web app.
 *    - Ejecutar como: Yo
 *    - Acceso: Cualquier persona (anónimo)
 * 6. Copia la URL del Web App y pégala en la app.
 *
 * NOTA DE SEGURIDAD: si TOKEN no está definido, el Web App rechaza todas
 * las peticiones (fail-closed). Nunca uses un token por defecto.
 */

function getToken() {
  return (
    PropertiesService.getScriptProperties().getProperty("TOKEN") || ""
  );
}

function doGet() {
  return json({
    ok: false,
    error: "Este Web App solo acepta peticiones POST",
  });
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);

    const expectedToken = getToken();
    if (!expectedToken) {
      return json({
        ok: false,
        error:
          "Backup no configurado: define el token TOKEN en Propiedades del script.",
      });
    }

    if (body.token !== expectedToken) {
      return json({ ok: false, error: "Token inválido" });
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const action = body.action;

    switch (action) {
      case "ping":
        return json({ ok: true, title: ss.getName() });

      case "append": {
        const sheet = ensureSheet(ss, body.tab);
        if (sheet.getLastRow() === 0 && Array.isArray(body.headers)) {
          sheet.appendRow(body.headers);
        }
        (body.rows || []).forEach(function (row) {
          sheet.appendRow(row);
        });
        return json({ ok: true, added: (body.rows || []).length });
      }

      case "overwrite": {
        const sheet = ensureSheet(ss, body.tab);
        sheet.clearContents();
        if (Array.isArray(body.headers)) {
          sheet.appendRow(body.headers);
        }
        (body.rows || []).forEach(function (row) {
          sheet.appendRow(row);
        });
        return json({ ok: true, written: (body.rows || []).length });
      }

      default:
        return json({ ok: false, error: "Acción desconocida: " + action });
    }
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

function ensureSheet(ss, name) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  return sheet;
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
