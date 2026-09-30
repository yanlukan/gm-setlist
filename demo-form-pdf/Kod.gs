// Demo: formularz Google -> tabela (Excel-owy arkusz) -> PDF w folderze na Dysku Google.
// Uruchom RAZ funkcję setup(). Linki do wszystkiego pojawią się w arkuszu, w zakładce "Linki".

const NAZWA = 'Zgłoszenie usterki – demo';
const POLE_EMAIL = 'Twój e-mail'; // stare formularze: kopia PDF idzie na adres z tego pola
const KOLOR = '#1a4d8f'; // kolor nagłówka PDF
const EMAIL_DODATKOWY = ''; // opcjonalnie: stały adres, który dostaje kopię każdego zgłoszenia

// Wspólne ustawienia wyglądu i zachowania formularza.
function dopracujFormularz(form) {
  form.setDescription('Wypełnij zgłoszenie – zajmie to około minuty. Po wysłaniu otrzymasz kopię w PDF na swój adres e-mail.');
  form.setRequireLogin(true);   // logowanie kontem Google: adres e-mail podpowiada się sam
  form.setCollectEmail(true);   // zweryfikowany adres trafia do odpowiedzi
  form.setProgressBar(true);
  form.setShowLinkToRespondAgain(false);
  form.setConfirmationMessage('Dziękujemy! Zgłoszenie zostało przyjęte. Kopię w PDF wysłaliśmy na Twój adres e-mail.');
}

// Dla już istniejącego formularza: uruchom RAZ, zamiast ponownego setup().
function ulepszFormularz() {
  const trig = ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'naWyslanie')[0];
  const form = FormApp.openById(trig.getTriggerSourceId());
  dopracujFormularz(form);
  form.getItems().filter(i => i.getTitle() === POLE_EMAIL).forEach(i => form.deleteItem(i));
  Logger.log('Formularz zaktualizowany: ' + form.getPublishedUrl());
}

function setup() {
  const form = FormApp.create(NAZWA);
  dopracujFormularz(form);

  form.addTextItem().setTitle('Imię i nazwisko').setRequired(true);
  form.addDateItem().setTitle('Data zgłoszenia').setRequired(true);
  form.addTextItem().setTitle('Miejsce (lokalizacja)').setRequired(true);
  form.addListItem().setTitle('Rodzaj usterki')
    .setChoiceValues(['Elektryczna', 'Hydrauliczna', 'Sprzęt / maszyna', 'Budynek', 'Inna'])
    .setRequired(true);
  form.addMultipleChoiceItem().setTitle('Priorytet')
    .setChoiceValues(['Niski', 'Średni', 'Wysoki'])
    .setRequired(true);
  form.addParagraphTextItem().setTitle('Opis problemu').setRequired(true);
  form.addMultipleChoiceItem().setTitle('Czy usterka jest już naprawiona?')
    .setChoiceValues(['Tak', 'Nie'])
    .setRequired(true);
  form.addParagraphTextItem().setTitle('Uwagi');

  const ss = SpreadsheetApp.create(NAZWA + ' – odpowiedzi');
  const linki = ss.getSheets()[0];
  linki.setName('Linki');
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());

  const folder = DriveApp.createFolder(NAZWA + ' – PDF');

  const pdfy = ss.insertSheet('PDF-y');
  pdfy.appendRow(['Wysłano', 'Imię i nazwisko', 'Link do PDF']);

  PropertiesService.getScriptProperties().setProperties({
    FOLDER_ID: folder.getId(),
    SS_ID: ss.getId(),
  });

  ScriptApp.newTrigger('naWyslanie').forForm(form).onFormSubmit().create();

  linki.getRange(1, 1, 4, 2).setValues([
    ['Formularz dla pracowników', form.getPublishedUrl()],
    ['Edycja formularza', form.getEditUrl()],
    ['Tabela z danymi', ss.getUrl()],
    ['Folder z PDF-ami', folder.getUrl()],
  ]);
  linki.autoResizeColumns(1, 2);
  Logger.log(linki.getRange(1, 1, 4, 2).getValues().map(r => r.join(': ')).join('\n'));
}

function naWyslanie(e) {
  const props = PropertiesService.getScriptProperties();
  const odp = e.response;
  const tz = Session.getScriptTimeZone();
  const kiedy = Utilities.formatDate(odp.getTimestamp(), tz, 'dd.MM.yyyy HH:mm');
  const pozycje = odp.getItemResponses();
  const wiersze = pozycje.map(p => [p.getItem().getTitle(), String(p.getResponse())]);
  const kto = wiersze.length ? wiersze[0][1] : '';

  const doc = DocumentApp.create('tmp-' + odp.getId());
  const body = doc.getBody();
  body.setMarginTop(50).setMarginBottom(50).setMarginLeft(56).setMarginRight(56);
  const tytul = body.appendParagraph(NAZWA);
  tytul.setHeading(DocumentApp.ParagraphHeading.HEADING1).setAttributes({
    [DocumentApp.Attribute.FOREGROUND_COLOR]: KOLOR, [DocumentApp.Attribute.FONT_FAMILY]: 'Arial',
  });
  body.appendParagraph('Wysłano: ' + kiedy + '  ·  Nr zgłoszenia: ' + odp.getId().slice(-8).toUpperCase())
    .setAttributes({ [DocumentApp.Attribute.FOREGROUND_COLOR]: '#666666', [DocumentApp.Attribute.FONT_SIZE]: 10, [DocumentApp.Attribute.FONT_FAMILY]: 'Arial' });
  body.appendHorizontalRule();
  const tabela = body.appendTable(wiersze);
  tabela.setBorderColor('#d9d9d9').setColumnWidth(0, 160).setColumnWidth(1, 330);
  for (let r = 0; r < tabela.getNumRows(); r++) {
    const c0 = tabela.getCell(r, 0), c1 = tabela.getCell(r, 1);
    c0.setBackgroundColor('#f1f5f9').setPaddingTop(6).setPaddingBottom(6);
    c1.setPaddingTop(6).setPaddingBottom(6);
    c0.editAsText().setBold(true).setFontFamily('Arial').setFontSize(10).setForegroundColor('#333333');
    c1.editAsText().setFontFamily('Arial').setFontSize(10);
  }
  doc.addFooter().appendParagraph('Dokument wygenerowany automatycznie ze zgłoszenia w formularzu.')
    .setAttributes({ [DocumentApp.Attribute.FOREGROUND_COLOR]: '#999999', [DocumentApp.Attribute.FONT_SIZE]: 8, [DocumentApp.Attribute.FONT_FAMILY]: 'Arial' });
  doc.saveAndClose();

  const nazwaPliku = Utilities.formatDate(odp.getTimestamp(), tz, 'yyyy-MM-dd_HHmm') + '_' + kto.replace(/[^\wąćęłńóśźżĄĆĘŁŃÓŚŹŻ-]+/g, '_');
  const docFile = DriveApp.getFileById(doc.getId());
  const pdf = docFile.getAs('application/pdf').setName(nazwaPliku + '.pdf');
  const plik = DriveApp.getFolderById(props.getProperty('FOLDER_ID')).createFile(pdf);
  docFile.setTrashed(true);

  SpreadsheetApp.openById(props.getProperty('SS_ID')).getSheetByName('PDF-y')
    .appendRow([kiedy, kto, plik.getUrl()]);

  const emailZFormularza = odp.getRespondentEmail() || (wiersze.filter(w => w[0] === POLE_EMAIL)[0] || [])[1] || '';
  // Gdy formularz nie ma pola e-mail, kopia idzie na konto właściciela skryptu, żeby mail nigdy nie zniknął po cichu.
  const adresaci = [emailZFormularza, EMAIL_DODATKOWY].filter(String).join(',')
    || Session.getEffectiveUser().getEmail();
  MailApp.sendEmail({
    to: adresaci,
    subject: 'Kopia zgłoszenia: ' + kto + ' (' + kiedy + ')',
    body: 'Zgłoszenie od: ' + kto + ' dotarło.\nWysłano: ' + kiedy + '\nKopia formularza w PDF w załączniku.',
    htmlBody: '<div style="font-family:Arial,sans-serif;font-size:14px;color:#222">'
      + '<h2 style="color:' + KOLOR + ';margin:0 0 12px">Zgłoszenie przyjęte</h2>'
      + '<p>Dzień dobry,<br>zgłoszenie od <b>' + kto + '</b> dotarło do nas ' + kiedy + '.</p>'
      + '<p>Kopię w formacie PDF znajdziesz w załączniku.</p>'
      + '<p style="color:#888;font-size:12px;margin-top:24px">Wiadomość wygenerowana automatycznie – prosimy na nią nie odpowiadać.</p></div>',
    name: NAZWA,
    noReply: true,
    attachments: [plik.getBlob()],
  });
  Logger.log('Mail wysłany do: ' + adresaci);
}

// Uruchom ręcznie raz: wymusi zgodę na wysyłanie maili i sprawdzi, czy mail w ogóle dochodzi.
function testMaila() {
  MailApp.sendEmail(Session.getEffectiveUser().getEmail(), 'Test – ' + NAZWA, 'Jeśli to czytasz, wysyłka maili działa.');
}
