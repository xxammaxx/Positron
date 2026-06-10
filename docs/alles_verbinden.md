Du bist ein erfahrener Full-Stack-Entwickler. Deine Aufgabe ist es, 
dieses Projekt vollständig zu analysieren und ALLE Mock-Daten, 
Simulationen, Platzhalter und fehlenden Verbindungen zu identifizieren 
und durch echte Implementierungen zu ersetzen.

## PHASE 1: VOLLSTÄNDIGE PROJEKT-ANALYSE

Scanne ALLE Dateien im Projektordner rekursiv und erstelle eine 
vollständige Bestandsaufnahme:

### 1.1 Identifiziere Mock-Daten & Simulationen

Suche nach folgenden Mustern und liste JEDEN Fund auf:

**JavaScript/TypeScript:**
- `Math.random()`
- `setTimeout` / `setInterval` (als Datensimulation)
- `mock`, `Mock`, `MOCK`
- `dummy`, `Dummy`, `DUMMY`
- `fake`, `Fake`, `FAKE`
- `stub`, `Stub`
- `placeholder`
- `TODO`, `FIXME`, `HACK`, `XXX`
- `hardcoded`, fest eingetragene Arrays/Objekte als "Datenquelle"
- `[...Array(n)]` als fake Datengenerator
- `lorem ipsum`
- Kommentare wie `// temporär`, `// später ersetzen`, `// echte API`
- `console.log` die Debugzwecken dienen
- Beispieldaten wie `"test@test.com"`, `"password123"`, `"John Doe"`

**Python:**
- `random.random()`, `random.randint()`
- `pass` in Funktionen die Logik haben sollten
- `return None` wo Daten erwartet werden
- `raise NotImplementedError`
- Hardcodierte Listen/Dictionaries als Datenquelle
- `time.sleep()` als Simulation

**Allgemein:**
- Auskommentierter Code der aktiv sein sollte
- Leere Funktionen/Methoden mit nur Kommentaren
- `return []`, `return {}`, `return null/None` ohne Logik
- Statische JSON-Dateien die eigentlich API-Calls sein sollten
- Lokale Daten die aus einer DB kommen sollten

### 1.2 Identifiziere fehlende Verbindungen

**Frontend → Backend:**
- Komponenten die Daten lokal halten statt API aufzurufen
- Fehlende fetch/axios/httpClient Calls
- Formulare die keine echte Submission haben
- State Management (Redux/Zustand/Context) ohne Backend-Sync

**Backend → Datenbank:**
- Routen/Controller ohne DB-Queries
- Fehlende Repository/Service Layer Verbindungen
- In-Memory Speicherung statt persistenter DB
- Fehlende ORM/Query Builder Verwendung

**Service → Service:**
- Microservices die sich nicht gegenseitig aufrufen
- Fehlende Message Queue Verbindungen
- Nicht implementierte Webhooks/Callbacks
- Fehlende Auth-Middleware Verbindungen

**Externe APIs:**
- API-Keys die vorhanden sind aber nicht verwendet werden
- Fehlende Third-Party Integrationen (Payment, Mail, SMS, etc.)
- Nicht verbundene OAuth-Flows
- Fehlende Webhook-Handler

### 1.3 Erstelle einen vollständigen Report

Formatiere den Report so:

```
=== MOCK & SIMULATION REPORT ===

KRITISCH (blockiert Funktionalität):
[Datei]: [Zeile] - [Beschreibung] - [Was es sein sollte]

HOCH (fehlt wichtige Verbindung):
[Datei]: [Zeile] - [Beschreibung] - [Was es sein sollte]

MITTEL (Platzhalter/temporäre Lösung):
[Datei]: [Zeile] - [Beschreibung] - [Was es sein sollte]

NIEDRIG (Cleanup/Optimierung):
[Datei]: [Zeile] - [Beschreibung] - [Was es sein sollte]

GESAMT: X Probleme gefunden
```

---

## PHASE 2: ARCHITEKTUR-MAPPING

Bevor du Änderungen machst, erstelle eine Karte der Systemarchitektur:

1. **Welche Technologien werden verwendet?**
   - Frontend Framework (React/Vue/Angular/etc.)
   - Backend Framework (Express/FastAPI/Django/etc.)
   - Datenbank (PostgreSQL/MongoDB/MySQL/etc.)
   - ORM/Query Builder
   - State Management
   - Auth-System (JWT/Session/OAuth)
   - Externe Services (aus .env, package.json, requirements.txt)

2. **Welche Umgebungsvariablen existieren?**
   - Lese .env, .env.example, .env.local
   - Welche sind gesetzt? Welche fehlen?
   - Welche werden im Code NICHT verwendet?
   - Welche werden referenziert aber NICHT definiert?

3. **Welche API-Endpunkte existieren?**
   - Alle definierten Routes/Endpoints auflisten
   - Welche haben keine echte Implementierung?
   - Welche werden im Frontend aufgerufen aber existieren nicht im Backend?

4. **Datenbankschema:**
   - Welche Models/Tables existieren?
   - Welche Beziehungen fehlen?
   - Welche Felder sind undefined/any statt typisiert?

---

## PHASE 3: IMPLEMENTIERUNGS-PLAN

Erstelle für JEDES gefundene Problem einen konkreten Implementierungsplan:

```
PROBLEM #[N]:
Datei: [Pfad]
Zeile: [N]
Aktueller Code: [Code-Snippet]
Problem: [Beschreibung]
Lösung: [Konkrete Lösung]
Abhängigkeiten: [Was muss vorher fertig sein]
Geschätzter Aufwand: [Klein/Mittel/Groß]
```

Priorisiere nach:
1. Blocking Issues (nichts funktioniert ohne diese)
2. Core Features (Hauptfunktionalität)
3. Supporting Features (ergänzende Funktionen)
4. Polish (Verbesserungen)

---

## PHASE 4: ECHTE IMPLEMENTIERUNG

Implementiere die Fixes in der priorisierten Reihenfolge.

### Regeln für die Implementierung:

**NIEMALS:**
- Neue Mock-Daten einführen
- `setTimeout` für Datensimulation verwenden
- Hardcodierte Daten als Lösung einsetzen
- Funktionen leer lassen mit `// TODO`
- Vorhandene funktionierende Verbindungen brechen

**IMMER:**
- Echte API-Calls implementieren
- Fehlerbehandlung (try/catch, error states) einbauen
- Loading-States implementieren
- TypeScript-Typen/Python-Type-Hints verwenden
- Bestehende Patterns des Projekts befolgen
- Umgebungsvariablen für sensitive Daten nutzen

### Für jede Datei die du änderst:

1. Zeige den ORIGINAL Code (mit Kommentar `// VORHER:`)
2. Zeige den NEUEN Code (mit Kommentar `// NACHHER:`)
3. Erkläre was geändert wurde und warum

### Verbindungsmuster die du implementieren sollst:

**Frontend API-Call Pattern:**
```javascript
// Ersetze hardcodierte Daten durch:
const [data, setData] = useState(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);

useEffect(() => {
  const fetchData = async () => {
    try {
      const response = await apiClient.get('/endpoint');
      setData(response.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  fetchData();
}, []);
```

**Backend DB-Query Pattern:**
```javascript
// Ersetze in-memory arrays durch:
const getData = async (req, res) => {
  try {
    const data = await Model.findAll({ 
      where: { ...filters },
      include: [...relations]
    });
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
```

**Service-Verbindungs Pattern:**
```javascript
// Ersetze fehlende Service-Calls durch:
const externalService = require('./services/externalService');

const processData = async (input) => {
  const result = await externalService.process(input);
  return result;
};
```

---

## PHASE 5: VERIFIKATION

Nach allen Implementierungen:

### 5.1 Erstelle einen Verbindungs-Checker
```
Schreibe ein Script das prüft:
- Sind alle API-Endpunkte erreichbar?
- Sind alle DB-Verbindungen aktiv?
- Sind alle Umgebungsvariablen gesetzt?
- Gibt es noch Mock-Patterns im Code?
```

### 5.2 End-to-End Datenfluss dokumentieren
```
Für jedes Feature, dokumentiere:
User Action → Frontend Component → API Call → 
Backend Route → Service Layer → Database → 
Response → Frontend Update → User sieht Ergebnis
```

### 5.3 Erstelle abschließenden Report
```
=== IMPLEMENTIERUNGS-ABSCHLUSS-REPORT ===

BEHOBEN:
✅ [Problem] in [Datei] - [Lösung]

NICHT BEHOBEN (externe Abhängigkeit/Konfiguration nötig):
⚠️ [Problem] - [Grund] - [Was manuell getan werden muss]

NEUE ABHÄNGIGKEITEN HINZUGEFÜGT:
📦 [Package] - [Grund]

UMGEBUNGSVARIABLEN DIE GESETZT WERDEN MÜSSEN:
🔑 [Variable] - [Wozu] - [Wo zu finden]

NÄCHSTE SCHRITTE:
1. [Schritt]
2. [Schritt]
```

---

## WICHTIGE HINWEISE:

1. **Ändere NICHTS** was bereits korrekt und echt verbunden ist
2. **Frage nach** wenn du dir bei einer Implementierung nicht sicher bist, 
   ob Mock oder echte Logik gewünscht ist
3. **Dokumentiere** jeden Schritt damit Änderungen nachvollziehbar sind
4. **Teste** gedanklich jeden Datenfluss durch bevor du ihn implementierst
5. **Beachte** bestehende Fehlerbehandlungs-Muster im Projekt
6. **Respektiere** die bestehende Ordnerstruktur und Namenskonventionen
7. Wenn du eine **.env.example** findest, stelle sicher dass alle 
   Variablen in der echten **.env** vorhanden sind

## STARTE JETZT:

Beginne mit Phase 1 - scanne alle Dateien und erstelle den vollständigen 
Report. Warte NICHT auf weitere Anweisungen zwischen den Phasen, 
führe alle 5 Phasen sequenziell durch.

Zeige mir nach Phase 1 den Report und frage ob du mit Phase 2-5 
fortfahren sollst, oder ob bestimmte Bereiche ausgeschlossen werden sollen.
```

