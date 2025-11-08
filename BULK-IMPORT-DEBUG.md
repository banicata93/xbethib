# Bulk Import Debugging Guide

## Как да тествате:

### 1. Стартирайте сървъра
```bash
npm start
```

### 2. Отворете браузъра
Отидете на: `http://localhost:3000/bulk-import`

### 3. Логнете се (ако не сте)
- Отидете на `/login` 
- Въведете admin credentials

### 4. Отворете Browser Console
- Chrome/Edge: `F12` или `Cmd+Option+I` (Mac)
- Firefox: `F12` или `Cmd+Option+K` (Mac)
- Safari: `Cmd+Option+C` (Mac)

### 5. Копирайте тестовия JSON
Отворете файла `test-bulk-import.json` и копирайте съдържанието.

### 6. Paste-нете в textarea
Paste-нете JSON-а в голямото текстово поле на страницата.

### 7. Натиснете "Import Predictions"

### 8. Проверете Console логовете

Трябва да видите следните логове:

```
DOM loaded, initializing bulk-import.js
Token found, setting up event listeners
Clear button found, adding listener
Import button found, adding listener
Delete button found, adding listener
Logout link found, adding listener
All event listeners set up successfully
```

Когато натиснете бутона:
```
Import button clicked!
importPredictions function called
JSON input length: XXX
JSON parsed successfully: {predictions: Array(3)}
Importing 3 predictions
Sending POST request to /api/predictions
Response status: 201
Response data: {message: "...", success: 3, failed: 0, ...}
```

## Възможни проблеми:

### Проблем 1: "Import button NOT found"
- Проверете дали HTML файлът има `id="importBtn"`
- Проверете дали скриптът се зарежда след HTML елементите

### Проблем 2: "No token found, redirecting to login"
- Логнете се отново в `/login`
- Проверете localStorage/sessionStorage в DevTools

### Проблем 3: Бутонът не реагира
- Проверете дали има JavaScript грешки в Console
- Проверете дали скриптът `/js/bulk-import.js` се зарежда (Network tab)

### Проблем 4: CSP грешки
- Проверете дали няма inline event handlers (`onclick=`)
- Всички event handlers трябва да са в external JS файл

### Проблем 5: 401 Unauthorized
- Token-ът е изтекъл или невалиден
- Логнете се отново

### Проблем 6: 400 Bad Request
- JSON форматът е невалиден
- Проверете validation errors в response

## Тестов JSON формат:

```json
{
  "predictions": [
    {
      "matchDate": "2025-11-10",
      "homeTeam": "Manchester United",
      "awayTeam": "Liverpool",
      "leagueFlag": "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
      "prediction": "BTTS",
      "odds": 1.85,
      "result": "pending"
    }
  ]
}
```

## Задължителни полета:
- `matchDate` - дата в ISO формат (YYYY-MM-DD)
- `homeTeam` - име на домакин
- `awayTeam` - име на гост
- `prediction` - прогноза (текст)

## Опционални полета:
- `leagueFlag` - emoji флаг (по подразбиране: ⚽)
- `odds` - коефициент (число)
- `result` - резултат (pending/win/loss/void, по подразбиране: pending)
