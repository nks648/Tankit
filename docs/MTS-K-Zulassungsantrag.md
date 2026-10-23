# TankIT – Zulassung als Verbraucher-Informationsdienst (MTS-K)

Ziel: offizielle Echtzeit-Kraftstoffpreise aller Tankstellen in Deutschland direkt
von der **Markttransparenzstelle für Kraftstoffe (MTS-K)** beim Bundeskartellamt
beziehen – ohne Drittanbieter.

Grundlage: § 6 MTS-Kraftstoff-Verordnung (MTSKraftV) und die *Hilfestellung der
MTS-K zur Gestaltung eines Antrags* (Stand Dezember 2023):
https://www.bundeskartellamt.de/DE/Aufgaben/MarkttransparenzstelleFuerKraftstoffe/ZulassungVIDs/zulassungvids_node.html

Die Zulassung ist kostenlos. Der Antrag ist formlos (E-Mail genügt).

---

## Teil 1 – Vor dem Absenden erledigen

| ✓ | Punkt | Warum |
|---|---|---|
| ☐ | **Impressum** auf der Website (Name, ladungsfähige Anschrift, E-Mail) | Pflichtangabe „Verantwortlicher nach § 5 DDG“ im Antrag; für öffentliche Dienste ohnehin Pflicht |
| ☐ | **Datenschutzerklärung** (Nutzer melden Preise, Karte lädt OSM-Kacheln) | DSGVO |
| ☐ | **Kontaktperson mit Telefonnummer** festlegen | Pflichtangabe § 6 Satz 2 Nr. 3 |
| ☐ | **Beschwerdestelle** einplanen (E-Mail-Adresse + „Preis falsch?“-Funktion in der App) | § 7 Abs. 2 MTSKraftV – Beschwerden müssen wöchentlich an die MTS-K gemeldet werden |
| ☐ | **Betrieb eines kleinen Servers** einplanen (siehe Teil 3) | Datenbezug nur per „Client Pull“ über die Mobilithek, nicht direkt aus dem Browser |

---

## Teil 2 – Antragstext (zum Kopieren)

Platzhalter in `[eckigen Klammern]` ersetzen.

**An:** mts-kraftstoffe@bundeskartellamt.bund.de
**Betreff:** Antrag auf Zulassung als Anbieter eines Verbraucher-Informationsdienstes – „TankIT“

> Sehr geehrte Damen und Herren,
>
> hiermit beantrage ich gemäß § 6 MTSKraftV die Zulassung als Anbieter eines
> Verbraucher-Informationsdienstes für den Dienst **„TankIT“**.
>
> **I. Pflichtangaben (§ 6 Satz 2 MTSKraftV)**
>
> 1. Antragsteller: [Vor- und Nachname / ggf. Organisation], [Straße Nr.], [PLZ Ort],
>    E-Mail: [E-Mail], Fax: [falls vorhanden]
> 2. Bezeichnung des Dienstes: **TankIT – Spritpreise von der Community**,
>    erreichbar unter https://nks648.github.io/Tankit/ (später als App für iOS und Android)
> 3. Kontaktperson: [Name], Telefon: [Telefonnummer]
> 4. Verantwortlicher nach § 5 DDG: [Name, Anschrift, Telefon, E-Mail]
>
> **II. Glaubhaftmachung (§ 6 Satz 1 MTSKraftV)**
>
> *Zur Person:* [2–3 Sätze: wer Sie sind, Motivation – z. B. „Ich entwickle TankIT als
> gemeinnütziges, kostenloses Angebot, damit Autofahrer schnell die günstigste
> Tankstelle in ihrer Nähe finden.“]
>
> *Der Dienst:* TankIT ist eine kostenlose Web-Anwendung (später zusätzlich als App).
> Nutzer geben eine Postleitzahl ein oder teilen ihren Standort und sehen alle
> Tankstellen im gewählten Umkreis (5–25 km) auf einer Karte und in einer Liste,
> sortierbar nach Preis oder Entfernung, für Super E5, Super E10 und Diesel – mit
> Adresse, Öffnungsstatus und einem Link zur Navigation. Der Abruf erfolgt
> ausschließlich auf Nutzeraktion. Zusätzlich können Nutzer Preise melden und
> bestätigen; diese Community-Daten werden von den MTS-K-Daten eindeutig getrennt
> und gekennzeichnet (§ 7 Abs. 1 Nr. 4 MTSKraftV, MTS-K-Logo).
>
> *Nutzerkreis:* Das Angebot richtet sich an alle Verbraucherinnen und Verbraucher.
> Es ist ohne Registrierung, ohne Anmeldung und kostenlos nutzbar und nicht auf
> einen bestimmten Nutzerkreis beschränkt.
>
> *Beginn und Dauerhaftigkeit:* Der Dienst ist seit [Datum] öffentlich erreichbar.
> Die Einbindung der MTS-K-Daten soll unmittelbar nach Zulassung erfolgen. Der
> Betrieb ist auf Dauer angelegt; Hosting und Datenbank laufen auf
> [Anbieter, z. B. GitHub Pages und Supabase (Rechenzentrum Frankfurt)], die
> Kosten trage ich selbst.
>
> *Räumliche Verfügbarkeit:* Das Angebot umfasst bundesweit alle Tankstellen und ist
> bundesweit über das Internet abrufbar.
>
> *Aktualität und Technik:* Die Preisdaten werden über die Mobilithek im Modus
> „Client Pull“ fortlaufend (mindestens [jede Minute]) abgerufen, in einer
> Datenbank gespeichert und den Nutzern bei jeder Suche aktuell angezeigt. Die
> Infrastruktur ist für [Anzahl] gleichzeitige Nutzer ausgelegt und skaliert bei
> Bedarf.
>
> *Finanzierung / Geschäftsmodell:* TankIT ist nicht kommerziell. Es gibt keine
> Werbung und keinen Verkauf von Daten. [ggf. „Spenden zur Deckung der
> Serverkosten“]
>
> *Verwendung der Daten:* Ich erkläre, dass ich die von der MTS-K bereitgestellten
> Daten ausschließlich zur Verbraucherinformation verwende und weder an
> Mineralölunternehmen noch an Tankstellenbetreiber oder mit diesen verbundene
> Unternehmen weitergebe. Ich gehöre selbst nicht der Mineralölwirtschaft an.
> Eine Beschwerdestelle wird unter [beschwerde@…] eingerichtet; eingehende
> Beschwerden übermittle ich wöchentlich in der vorgegebenen Form.
>
> Als Anlage füge ich Screenshots des Dienstes bei.
>
> Mit freundlichen Grüßen
> [Name]

**Anlagen:** 2–3 Screenshots (Liste, Karte, Preis-Melden-Dialog) – sie machen
den Antrag glaubhafter (Hilfestellung der MTS-K).

---

## Teil 3 – Was nach der Zulassung technisch nötig ist

Laut *Modalitäten des Datenbezugs und der Verbraucherinformation* (Stand 07/2023):

1. **Registrierung bei der Mobilithek** (Plattform der Bundesanstalt für
   Straßenwesen) und Abonnement der MTS-K-Datenangebote *Grunddaten* und
   *Preisdaten*.
2. **Datenbezug per „Client Pull“** über HTTPS oder SOAP. Die Daten kommen im
   Mobilithek-Containerformat: Base64-kodierte, GZIP-komprimierte XML-Dokumente
   nach dem *Datenmodell MTS-K 01-01-00*.
   → Dafür braucht TankIT einen kleinen Dienst, der regelmäßig abruft und die
   Preise in die Datenbank schreibt (geplant: Supabase-Tabelle `official_prices`,
   befüllt von einem geplanten Job). Die Web-App liest dann von dort – der
   Mobilithek-Zugang bleibt geheim auf dem Server.
3. **Beschwerdestelle:** Beschwerden jeden Montag gesammelt für die Vorwoche
   über die Mobilithek (SOAP-Push, Schema *MTS-K Beschwerden 01-01-00*) melden –
   auch Leermeldungen.
4. **Kennzeichnung:** MTS-K-Daten mit dem von der MTS-K bereitgestellten Logo
   kennzeichnen, getrennt von Community-Preisen.
5. **Alle Tankstellen anzeigen:** keine Filterung, die der Nutzer nicht selbst
   gewählt hat.

Technische Unterlagen:
- Datenmodell MTS-K: https://mobilithek.info/cms/downloads/datenmodell-mts-k-01-01
- Schnittstellenbeschreibung: https://mobilithek.info/cms/downloads/tssb-de
- Containerformat: https://mobilithek.info/cms/downloads/container-spec-de

Die Server-Komponente (Teil 3, Punkte 2 und 3) wird gebaut, sobald die Zulassung
und der Mobilithek-Zugang vorliegen, weil die genauen Zugangsdaten und Endpunkte
erst dann bekannt sind.
