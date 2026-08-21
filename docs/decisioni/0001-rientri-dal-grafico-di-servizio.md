# 0001 — I rientri vengono dal grafico di servizio, non dalla pagina turni

*21 agosto 2026 · PR #51, #52*

## Contesto

Il pannello Rientri restava vuoto a qualsiasi ora, su dati veri. Non era un
difetto del calcolo: leggeva la pagina sbagliata del PDF.

Una riga della pagina TURNI DEL PERSONALE e' una **ripresa intera**.
`16.33 CATT R 21.58 GERB` sono cinque ore e mezza di linea che finiscono
mettendo dentro la vettura, non un passaggio da Cattaneo al deposito. Da
Cattaneo al Gerbido sono **nove minuti**.

Il primo tentativo di difesa era un limite sulla durata: scarta oltre 90
minuti. Ha funzionato finche' le riprese duravano cinque ore. Poi e' passata una
ripresa della 74 da 1h21 — sotto il limite — ed e' comparsa come «corsa
diretta, a bordo 1h 21m».

## Decisione

I rientri li danno **solo** le righe del grafico di servizio (`U.L.` → `Entra`),
che sono passaggi per definizione. Le righe della pagina turni non vengono
nemmeno guardate.

Nella mappa `developments` stanno sotto chiavi `RIENTRI <linea> <servizio>`, che
nessun turno puo' avere. `searchReturns` salta ogni altra chiave.

Nessun filtro sulla durata puo' sostituire questa regola: una ripresa corta e
una corsa lunga hanno la stessa faccia, e nessuna soglia le separa. **Il filtro
e' sulla provenienza del dato, non sulla sua misura.**

## Conseguenze

- Un PDF senza il grafico di servizio non permette di calcolare i rientri, e
  l'app lo dice invece di arrangiarsi.
- `graphicLoaded` distingue «il PDF non ha quella pagina» da «non ci sono
  rientri adesso».
- `RIENTRI_PARSER_VERSION` distingue entrambi da «gli orari salvati sono stati
  letti da una versione precedente dell'app».
