# Läxhjälpen

Barnens egna hjälplärare. Barnet väljer sig själv, fotar en sida ur boken eller sina glosor, och får ett läxförhör eller en provträning anpassad efter sin ålder och sitt sätt att lära.

## Så hänger det ihop

- `app/page.js` är allt barnen ser (välj barn, fota, förhör). Förhören sparas i webbläsaren på den mobil eller dator barnet använder.
- `app/api/skapa/route.js` körs på servern. Den skickar fotona till Claude och får tillbaka frågor. API-nyckeln finns bara här.
- `lib/barn.js` innehåller barnens profiler: namn, färger och hur hjälpläraren ska anpassa sig. Ändra här när barnen blir äldre eller behöver något annat.

## Inställningar i Vercel (Environment Variables)

| Namn | Värde |
|---|---|
| `ANTHROPIC_API_KEY` | Nyckeln från console.anthropic.com |
| `FAMILJEKOD` | En kod ni hittar på, som barnen skriver första gången |
| `CLAUDE_MODEL` | Valfritt. Standard är `claude-sonnet-5-5` |

## Köra lokalt

```bash
npm install
ANTHROPIC_API_KEY=... FAMILJEKOD=hemlig npm run dev
```
