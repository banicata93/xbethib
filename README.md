# XBetHub

Sports Predictions Platform

## Инсталация в SuperHosting

1. Влезте в cPanel на вашия хостинг акаунт

2. Инсталирайте Node.js чрез Setup Node.js App:
   - Изберете версия: 16.x LTS
   - Application mode: Production
   - Application root: public_html
   - Application URL: вашият-домейн.com
   - Application startup file: server.js

3. Качете файловете:
   - Използвайте FTP или File Manager
   - Качете всички файлове в public_html директорията
   - Не качвайте node_modules папката

4. Инсталирайте зависимостите:
   ```bash
   cd ~/public_html
   npm install --production
   ```

5. Конфигурирайте MongoDB:
   - Създайте нова база данни от cPanel
   - Запишете connection string
   - Обновете MONGODB_URI в ecosystem.config.js

6. Стартирайте приложението:
   ```bash
   cd ~/public_html
   pm2 start ecosystem.config.js
   ```

7. Проверете дали работи:
   - Отворете вашият-домейн.com в браузъра
   - Проверете логовете: `pm2 logs xbethub`

## Важно

- Не забравяйте да промените JWT_SECRET в production
- Направете backup на базата данни
- Проверете дали .env файлът е защитен
- Рестартирайте Node.js приложението след промени: `pm2 restart xbethub`
