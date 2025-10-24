# XBetHub - Миграция от Render към Vercel

## 📋 Преглед

Този guide ви води стъпка по стъпка през процеса на миграция на вашия проект от Render към Vercel.
Vercel предлага по-добра производителност, безплатен tier без "заспиване" и по-бързо deployment.

## ✅ Какво е направено в проекта

### 1. **Serverless Functions в `/functions` папка**
- ✅ `functions/auth.js` - Authentication (login)
- ✅ `functions/predictions.js` - CRUD операции за прогнози
- ✅ `functions/stats.js` - Публична статистика
- ✅ `functions/analytics.js` - Анализ на трафика
- ✅ `functions/botAnalysis.js` - Анализ на ботове

### 2. **MongoDB Connection Caching**
- ✅ Оптимизирана връзка за serverless environment
- ✅ Автоматично преизползване на connections
- ✅ Graceful handling при липса на MONGODB_URI

### 3. **Vercel Configuration**
- ✅ `vercel.json` с правилен routing
- ✅ Builds конфигурация за Node.js
- ✅ Environment variables setup

### 4. **Server.js оптимизация**
- ✅ Подобрена MongoDB connection с timeout settings
- ✅ Static file serving
- ✅ Error handling

## 🚀 СТЪПКА 1: Подготовка на MongoDB

### Опция А: MongoDB Atlas (Препоръчително)

1. **Създайте MongoDB Atlas акаунт** (ако нямате):
   - Отидете на https://www.mongodb.com/cloud/atlas
   - Регистрирайте се безплатно

2. **Създайте нов Cluster**:
   - Изберете FREE tier (M0)
   - Изберете регион близо до вашите потребители
   - Създайте cluster (отнема 3-5 минути)

3. **Конфигурирайте Database Access**:
   - Database Access > Add New Database User
   - Създайте потребител с парола
   - Запишете username и password!

4. **Конфигурирайте Network Access**:
   - Network Access > Add IP Address
   - Изберете "Allow Access from Anywhere" (0.0.0.0/0)
   - Това е необходимо за Vercel serverless functions

5. **Вземете Connection String**:
   - Clusters > Connect > Connect your application
   - Копирайте connection string
   - Замете `<password>` с вашата парола
   - Пример: `mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/xbethub?retryWrites=true&w=majority`

### Опция Б: Използвайте съществуващата Render база данни

Ако вече имате MongoDB на Render, можете да продължите да я използвате:
- Копирайте MONGODB_URI от Render Environment Variables
- Използвайте същия connection string в Vercel

## 🚀 СТЪПКА 2: Deploy към Vercel

### Метод 1: Чрез Vercel CLI (Препоръчително)

1. **Инсталирайте Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Login в Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy проекта**:
   ```bash
   cd /Users/borisa22/untitled\ folder/xbethib
   vercel
   ```

4. **Следвайте инструкциите**:
   - Set up and deploy? **Yes**
   - Which scope? Изберете вашия account
   - Link to existing project? **No**
   - What's your project's name? **xbethib**
   - In which directory is your code located? **./**
   - Want to override settings? **No**

5. **Deploy to production**:
   ```bash
   vercel --prod
   ```

### Метод 2: Чрез GitHub (Автоматичен Deploy)

1. **Push кода към GitHub**:
   ```bash
   git add .
   git commit -m "Prepare for Vercel deployment"
   git push origin main
   ```

2. **Свържете с Vercel**:
   - Отидете на https://vercel.com/new
   - Import Git Repository
   - Изберете вашия GitHub repo
   - Click "Import"

3. **Конфигурация**:
   - Framework Preset: **Other**
   - Root Directory: **./
   - Build Command: (оставете празно)
   - Output Directory: (оставете празно)
   - Install Command: `npm install`

## 🚀 СТЪПКА 3: Конфигуриране на Environment Variables

1. **Отидете в Vercel Dashboard**:
   - https://vercel.com/dashboard
   - Изберете проекта **xbethib**

2. **Settings > Environment Variables**:
   
   Добавете следните променливи:

   **MONGODB_URI**:
   ```
   mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/xbethub?retryWrites=true&w=majority
   ```
   - Environment: Production, Preview, Development (изберете всички)

   **JWT_SECRET**:
   ```
   your-super-secret-jwt-key-minimum-32-characters-long
   ```
   - Environment: Production, Preview, Development (изберете всички)

3. **Redeploy проекта**:
   - Deployments > Latest Deployment > ... > Redeploy
   - Или:
   ```bash
   vercel --prod
   ```

## 🚀 СТЪПКА 4: Тестване на Deployment

### 1. Проверете основните страници:

- **Главна страница**: `https://your-project.vercel.app/`
- **Admin Login**: `https://your-project.vercel.app/login?admin-access=true`
- **Admin Panel**: `https://your-project.vercel.app/admin`
- **Analytics**: `https://your-project.vercel.app/analytics`
- **Bot Analysis**: `https://your-project.vercel.app/bot-analysis`

### 2. Тествайте API Endpoints:

```bash
# Test stats endpoint (public)
curl https://your-project.vercel.app/api/stats

# Test predictions endpoint (public GET)
curl https://your-project.vercel.app/api/predictions
```

### 3. Проверете Logs:

- Vercel Dashboard > Your Project > Deployments
- Click на последния deployment
- Functions > View Logs

### 4. Създайте Admin потребител:

Ако нямате admin потребител в базата данни:

```bash
# Локално (ако имате достъп до MongoDB)
node create-admin.js
```

Или използвайте MongoDB Compass/Atlas UI за да добавите admin потребител директно.

## 🚀 СТЪПКА 5: Миграция на данни (ако е необходимо)

Ако използвате нова MongoDB база данни:

### Метод 1: MongoDB Compass

1. Свържете се към старата база (Render)
2. Export collections като JSON
3. Свържете се към новата база (Atlas)
4. Import JSON файловете

### Метод 2: mongodump/mongorestore

```bash
# Export от Render
mongodump --uri="mongodb+srv://old-connection-string" --out=./backup

# Import в Atlas
mongorestore --uri="mongodb+srv://new-connection-string" ./backup
```

## 🚀 СТЪПКА 6: Обновете Custom Domain (опционално)

Ако имате custom domain:

1. **Vercel Dashboard > Your Project > Settings > Domains**
2. **Add Domain**: Въведете вашия домейн
3. **Конфигурирайте DNS**:
   - Type: `A`
   - Name: `@` (или subdomain)
   - Value: `76.76.21.21`
   
   ИЛИ
   
   - Type: `CNAME`
   - Name: `www` (или subdomain)
   - Value: `cname.vercel-dns.com`

4. **Изчакайте DNS propagation** (до 48 часа)

## 🌟 API Endpoints и Routing

### API Endpoints:
- `GET /api/stats` - Публична статистика (без автентикация)
- `POST /api/auth/login` - Логин
- `GET /api/predictions` - Всички прогнози (изисква автентикация)
- `POST /api/predictions` - Добавяне на прогноза (изисква автентикация)
- `PUT /api/predictions/:id` - Обновяване на прогноза
- `DELETE /api/predictions/:id` - Изтриване на прогноза
- `GET /api/analytics/*` - Анализ на трафика
- `GET /api/botAnalysis/*` - Анализ на ботове

### Страници:
- `/` - Главна страница с всички прогнози
- `/admin` - Админ панел
- `/analytics` - Анализ на трафика
- `/bot-analysis` - Анализ на ботове
- `/login?admin-access=true` - Логин страница

## 🔐 СТЪПКА 7: Финални проверки

### 1. Функционалност:
- ✅ Главната страница зарежда правилно
- ✅ Прогнозите се показват
- ✅ Admin login работи
- ✅ Можете да добавяте/редактирате/изтривате прогнози
- ✅ Analytics и Bot Analysis работят

### 2. Performance:
- ✅ Страниците зареждат бързо (под 2 секунди)
- ✅ API endpoints отговарят бързо
- ✅ Няма "заспиване" на сайта

### 3. Мониторинг:
- ✅ Vercel Dashboard > Analytics
- ✅ Function Logs за debugging
- ✅ Error tracking

### 4. Изтрийте Render deployment (опционално):
- Ако всичко работи добре на Vercel
- Можете да спрете/изтриете Render service
- Спестете пари и ресурси

## 📁 Структура на проекта след миграцията:

```
xbethib/
├── api/                    # Serverless functions
│   ├── auth.js
│   ├── predictions.js
│   ├── stats.js
│   ├── analytics.js
│   └── botAnalysis.js
├── models/                 # MongoDB модели
├── public/                 # Статични файлове
├── views/                  # HTML templates
├── server.js              # Main server за SSR
├── vercel.json           # Vercel конфигурация
└── package.json
```

## 🎯 Предимства на Vercel спрямо Render

### ✅ Performance:
- **Няма "заспиване"** - сайтът е винаги активен
- **По-бързо зареждане** - Edge Network
- **Автоматично scaling** - справя се с traffic spikes

### ✅ Developer Experience:
- **Instant deployments** - deploy за секунди
- **Preview deployments** - всеки branch получава URL
- **Automatic HTTPS** - безплатен SSL

### ✅ Cost:
- **Безплатен tier** - достатъчен за повечето проекти
- **100GB bandwidth/месец** - безплатно
- **Unlimited deployments** - безплатно

## 🔧 Мониторинг и Maintenance

### Logs и Debugging:
```bash
# Real-time logs
vercel logs your-project.vercel.app

# Function logs
vercel logs your-project.vercel.app --follow
```

### Dashboard:
- **Analytics**: Vercel Dashboard > Analytics
- **Function Logs**: Deployments > Functions > Logs
- **Performance**: Speed Insights
- **Environment Variables**: Settings > Environment Variables

### Automatic Deployments:
- Всеки `git push` към main branch = автоматичен production deploy
- Pull requests = preview deployments
- Rollback с 1 click

## 🐛 Troubleshooting

### Проблем: "MONGODB_URI is not set"
**Решение**:
1. Vercel Dashboard > Settings > Environment Variables
2. Добавете MONGODB_URI
3. Redeploy проекта

### Проблем: "Cannot connect to MongoDB"
**Решение**:
1. Проверете MongoDB Atlas Network Access
2. Добавете 0.0.0.0/0 (Allow from anywhere)
3. Проверете дали connection string е правилен

### Проблем: "Function timeout"
**Решение**:
1. Vercel free tier има 10s timeout
2. Оптимизирайте MongoDB queries
3. Добавете indexes в MongoDB

### Проблем: "Static files not loading"
**Решение**:
1. Проверете `public/` папката
2. Vercel автоматично serve-ва static files
3. Проверете paths в HTML

## 📞 Поддръжка и Помощ

### Ресурси:
- **Vercel Docs**: https://vercel.com/docs
- **MongoDB Atlas Docs**: https://docs.atlas.mongodb.com/
- **Vercel Community**: https://github.com/vercel/vercel/discussions

### Ако има проблеми:
1. ✅ Проверете Vercel function logs
2. ✅ Проверете MongoDB connection
3. ✅ Проверете environment variables
4. ✅ Тествайте API endpoints локално
5. ✅ Проверете Network Access в MongoDB Atlas

## 🎉 Готово!

**Вашият сайт вече работи на Vercel!**

- ⚡ По-бърз
- 🚀 Винаги активен (no sleep)
- 💰 Безплатен
- 📊 С built-in analytics

**Следващи стъпки:**
1. Споделете новия URL с потребителите
2. Обновете SEO/social media links
3. Мониторирайте performance в Vercel Dashboard
4. Наслаждавайте се на по-добрата производителност! �
