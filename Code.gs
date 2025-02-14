function doGet() {
  var html = HtmlService.createTemplateFromFile("index").evaluate();
  // set this to ALLOWALL, then embedded in google site
  return html.setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(fileName) {
  return HtmlService.createHtmlOutputFromFile(fileName).getContent();
}

function getData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let ws = ss.getSheetByName("Items");
  let res = {};
  res.items = ws.getRange(2, 1, ws.getLastRow()-1, 5).getValues();
  ws = ss.getSheetByName("Sales");
  res.sales = ws.getRange(2, 1, ws.getLastRow()-1, 5).getValues();
  return res;
}

function setData(data) {
  const importedData = JSON.parse(data);
  const orderLength = importedData.order.length;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ws = ss.getSheetByName("Sales");
  range = ws.getRange(ws.getLastRow()+1, 1, orderLength, 5);
  range.setValues(importedData.order);

  ws = ss.getSheetByName("Payments"); 
  const paymentColumns = importedData.payment[0].length;
  range = ws.getRange(ws.getLastRow()+1, 1, 1, paymentColumns);
  range.setValues(importedData.payment);
}
    