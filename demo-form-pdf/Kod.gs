// Demo: formularz Google -> tabela (Excel-owy arkusz) -> PDF w folderze na Dysku Google.
// Uruchom RAZ funkcję setup(). Linki do wszystkiego pojawią się w arkuszu, w zakładce "Linki".

const NAZWA = 'Zgłoszenie usterki – demo';
const POLE_EMAIL = 'Twój e-mail'; // kopia PDF idzie na adres wpisany w formularzu
const EMAIL_DODATKOWY = ''; // opcjonalnie: stały adres, który dostaje kopię każdego zgłoszenia

function setup() {
  const form = FormApp.create(NAZWA);
  form.setDescription('Wypełnij zgłoszenie. Po wysłaniu powstanie PDF, a dane trafią do tabeli.');
  form.setCollectEmail(false);

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
  form.addTextItem().setTitle(POLE_EMAIL)
    .setHelpText('Na ten adres wyślemy kopię zgłoszenia w PDF.')
    .setValidation(FormApp.createTextValidation().requireTextIsEmail().build())
    .setRequired(true);

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
  body.appendParagraph(NAZWA).setHeading(DocumentApp.ParagraphHeading.HEADING1);
  body.appendParagraph('Wysłano: ' + kiedy);
  body.appendTable(wiersze);
  doc.saveAndClose();

  const nazwaPliku = Utilities.formatDate(odp.getTimestamp(), tz, 'yyyy-MM-dd_HHmm') + '_' + kto.replace(/[^\wąćęłńóśźżĄĆĘŁŃÓŚŹŻ-]+/g, '_');
  const docFile = DriveApp.getFileById(doc.getId());
  const pdf = docFile.getAs('application/pdf').setName(nazwaPliku + '.pdf');
  const plik = DriveApp.getFolderById(props.getProperty('FOLDER_ID')).createFile(pdf);
  docFile.setTrashed(true);

  SpreadsheetApp.openById(props.getProperty('SS_ID')).getSheetByName('PDF-y')
    .appendRow([kiedy, kto, plik.getUrl()]);

  const emailZFormularza = (wiersze.filter(w => w[0] === POLE_EMAIL)[0] || [])[1] || '';
  // Gdy formularz nie ma pola e-mail, kopia idzie na konto właściciela skryptu, żeby mail nigdy nie zniknął po cichu.
  const adresaci = [emailZFormularza, EMAIL_DODATKOWY].filter(String).join(',')
    || Session.getEffectiveUser().getEmail();
  MailApp.sendEmail({
    to: adresaci,
    subject: 'Kopia zgłoszenia: ' + kto + ' (' + kiedy + ')',
    body: 'Zgłoszenie od: ' + kto + ' dotarło.\nWysłano: ' + kiedy + '\nKopia formularza w PDF w załączniku.',
    attachments: [plik.getBlob()],
  });
  Logger.log('Mail wysłany do: ' + adresaci);

}
