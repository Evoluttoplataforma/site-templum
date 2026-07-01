// Google Apps Script — cola em Extensões → Apps Script da planilha.
// Depois: Implantar → Nova implantação → Tipo: App da Web
//   Executar como: Eu mesmo
//   Quem tem acesso: Qualquer pessoa (anônimo)
// Copie a URL gerada e coloque como WEBSERIE_SHEET_URL no Worker.

const SHEET_NAME = "Leads"; // nome da aba (crie uma aba com esse nome)

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME)
      || SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

    // Cabeçalho na primeira vez
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "Data/Hora", "Nome", "Email", "Telefone", "Página",
        "Evento", "UTM Source", "UTM Medium", "UTM Campaign",
      ]);
      sheet.getRange(1, 1, 1, 9).setFontWeight("bold");
    }

    sheet.appendRow([
      new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }),
      data.nome || "",
      data.email || "",
      data.telefone || "",
      data.pagina || "",
      data.evento || "",
      data.utm_source || "",
      data.utm_medium || "",
      data.utm_campaign || "",
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Teste manual: rode doGet para ver se a planilha está acessível
function doGet() {
  return ContentService.createTextOutput("ok");
}
