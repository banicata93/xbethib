# XBetHub Analytics System

## 📊 Обща информация

Системата за аналитика на XBetHub автоматично следи и анализира трафика на сайта. Данните се съхраняват в MongoDB и могат да се преглеждат през админ панела.

## 🎯 Какво се следи?

### Основни метрики:
- **Общ брой посещения** - всички заявки към страниците
- **Уникални посещения** - първо посещение на страница за деня от даден IP
- **Активни сесии** - потребители активни в последните 30 минути
- **Средни посещения на ден** - изчислени за избрания период

### Детайлна информация:
- **Устройства** - mobile, tablet, desktop
- **Браузъри** - Chrome, Firefox, Safari, Edge, и др.
- **Операционни системи** - Windows, macOS, Linux, Android, iOS
- **Страници** - кои страници се посещават най-често
- **Referrers** - откъде идват потребителите (директно, от търсачки, от други сайтове)
- **Време на посещение** - timestamp за всяко посещение
- **IP адреси** - за идентификация на уникални посетители

## 🚀 Как да използвате аналитиката?

### 1. Достъп до Analytics Dashboard

1. Влезте в админ панела: `/admin`
2. Кликнете на бутона **"Analytics"** в навигацията
3. Или отидете директно на: `/analytics.html`

### 2. Преглед на статистики

**Период селектор:**
- **24h** - последните 24 часа
- **7 days** - последната седмица
- **30 days** - последния месец
- **90 days** - последните 3 месеца

**Секции:**
- **Overview Stats** - общи метрики в карти
- **Visits Over Time** - график с посещения по дни
- **Devices** - разпределение по устройства
- **Browsers** - разпределение по браузъри
- **Top Pages** - най-посещавани страници
- **Real-time Activity** - активност в реално време
- **Traffic Sources** - източници на трафик

### 3. Real-time мониторинг

Секцията "Real-time Activity" се обновява автоматично на всеки 30 секунди и показва:
- Брой активни сесии (последните 30 минути)
- Последните 10 посещения с информация за време, страница и устройство

## 🔧 API Endpoints

Всички endpoints изискват автентикация (Bearer token).

### GET `/api/analytics/overview`
Връща обща статистика за избран период.

**Query параметри:**
- `period` - брой дни назад (по подразбиране: 7)

**Отговор:**
```json
{
  "period": 7,
  "totalVisits": 1234,
  "uniqueVisits": 567,
  "deviceStats": [...],
  "browserStats": [...],
  "topPages": [...],
  "visitsByDay": [...]
}
```

### GET `/api/analytics/realtime`
Връща статистика в реално време (последните 24 часа).

**Отговор:**
```json
{
  "visitsByHour": [...],
  "activeSessions": 5,
  "recentVisits": [...]
}
```

### GET `/api/analytics/referrers`
Връща статистика за referrers.

**Query параметри:**
- `period` - брой дни назад (по подразбиране: 7)

### GET `/api/analytics/geography`
Връща географска статистика (ако е налична).

### DELETE `/api/analytics/cleanup`
Изтрива стари записи за поддръжка.

**Query параметри:**
- `days` - изтрива записи по-стари от X дни (по подразбиране: 90)

## 📦 Структура на данните

### Analytics Model (MongoDB)

```javascript
{
  timestamp: Date,           // Време на посещението
  path: String,             // URL път (напр. "/", "/admin")
  fullUrl: String,          // Пълен URL
  referrer: String,         // Откъде идва потребителят
  ip: String,               // IP адрес
  country: String,          // Държава (опционално)
  city: String,             // Град (опционално)
  userAgent: String,        // User agent string
  device: String,           // "mobile", "tablet", "desktop"
  browser: String,          // Име на браузъра
  os: String,               // Операционна система
  sessionId: String,        // Уникален ID на сесията
  language: String,         // Език на браузъра
  isUnique: Boolean         // Дали е уникално посещение за деня
}
```

## 🛠️ Конфигурация

### Middleware

Analytics middleware е добавен в `server.js` и автоматично следи всички заявки към HTML страници. Игнорира:
- API заявки (`/api/*`)
- Статични файлове (`/css/*`, `/js/*`, `/images/*`)
- Файлове с разширения

### Изключване на следенето

Ако искате да изключите следенето за определени страници, редактирайте:
```javascript
// В middleware/analytics.js
if (req.path.startsWith('/api/') || 
    req.path.startsWith('/css/') || 
    req.path.startsWith('/js/') || 
    req.path.startsWith('/images/') ||
    req.path === '/your-excluded-page' ||  // Добавете тук
    req.path.includes('.')) {
    return next();
}
```

## 🔐 Сигурност

- Всички analytics endpoints са защитени с JWT автентикация
- Само администратори имат достъп до статистиките
- IP адресите се съхраняват за идентификация, но не се показват публично
- Данните се съхраняват в MongoDB с подходящи индекси за бързи заявки

## 🌐 Google Analytics (Опционално)

За допълнително следене можете да добавите Google Analytics:

1. Създайте Google Analytics акаунт на: https://analytics.google.com
2. Вземете вашия Measurement ID (напр. `G-XXXXXXXXXX`)
3. Отворете `/views/index.html`
4. Намерете коментирания код за Google Analytics
5. Разкоментирайте го и заменете `GA_MEASUREMENT_ID` с вашия ID

```html
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-XXXXXXXXXX');
</script>
```

## 🧹 Поддръжка

### Автоматично изчистване на стари данни

За да не претоварите базата данни, периодично изтривайте стари записи:

```bash
# Изтрива записи по-стари от 90 дни
curl -X DELETE "http://localhost:3000/api/analytics/cleanup?days=90" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Или създайте cron job:
```bash
# Всяка неделя в 2:00 сутринта
0 2 * * 0 curl -X DELETE "http://your-domain.com/api/analytics/cleanup?days=90" -H "Authorization: Bearer YOUR_TOKEN"
```

## 📈 Препоръки

1. **Проверявайте статистиките редовно** - поне веднъж седмично
2. **Анализирайте най-посещаваните страници** - фокусирайте се върху популярния контент
3. **Следете referrers** - разберете откъде идват потребителите
4. **Оптимизирайте за мобилни** - ако имате много мобилни потребители
5. **Изтривайте стари данни** - пазете базата данни чиста

## 🐛 Troubleshooting

### Аналитиката не записва данни?

1. Проверете дали middleware-ът е добавен в `server.js`
2. Проверете MongoDB връзката
3. Проверете конзолата за грешки

### Не виждам данни в dashboard?

1. Уверете се, че сте логнати като администратор
2. Проверете дали има записи в базата данни:
   ```javascript
   db.analytics.find().limit(10)
   ```
3. Проверете browser console за грешки

### Статистиките са неточни?

- Уникалните посещения се базират на IP + дата
- Ако използвате VPN или proxy, това може да повлияе на точността
- За по-точно следене, добавете Google Analytics

## 📞 Поддръжка

За въпроси и проблеми, моля свържете се с разработчика или отворете issue в GitHub репото.
