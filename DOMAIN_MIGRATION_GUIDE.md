# 🌐 Преместване на домейн към Vercel

## 📋 Преглед

Този guide ще ти помогне да прехвърлиш домейна от Render към Vercel.

---

## 🎯 **СТЪПКА 1: Подготовка**

### **Информация която ти трябва:**

1. **Твоят домейн** (например: `xbethub.com`)
2. **Достъп до DNS настройките** на домейна (при domain registrar-а)
3. **Vercel проект URL**: `https://xbethib-jhk7.vercel.app/`

---

## 🚀 **СТЪПКА 2: Добави домейна в Vercel**

### **2.1 Отвори Vercel Dashboard:**

1. Отиди на: https://vercel.com/dashboard
2. Избери проекта **xbethib**
3. Click на **Settings** (горе)
4. Click на **Domains** (ляво меню)

### **2.2 Добави домейна:**

1. Click на **Add** бутона
2. Въведи домейна: `xbethub.com` (или твоят домейн)
3. Click **Add**

### **2.3 Vercel ще ти покаже DNS настройките:**

Ще видиш нещо подобно:

**За root domain (@):**
```
Type: A
Name: @
Value: 76.76.21.21
```

**За www subdomain:**
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

**ВАЖНО:** Запиши тези стойности - ще ти трябват!

---

## 🔧 **СТЪПКА 3: Конфигурирай DNS записите**

### **3.1 Отвори DNS настройките на домейна:**

Отиди при твоя **domain registrar** (където си купил домейна):
- Namecheap: https://www.namecheap.com/myaccount/
- GoDaddy: https://account.godaddy.com/
- Cloudflare: https://dash.cloudflare.com/
- Или друг provider

### **3.2 Намери DNS Management / DNS Settings**

Обикновено е в:
- **Domain List** → Click на домейна → **Manage** → **Advanced DNS** или **DNS**

### **3.3 Изтрий старите записи (от Render):**

Намери и изтрий:
- Стари A записи
- Стари CNAME записи за www
- Всички записи свързани с Render

### **3.4 Добави новите Vercel записи:**

#### **Запис 1: Root domain (A Record)**

- **Type**: `A`
- **Host/Name**: `@` (или остави празно, или въведи домейна)
- **Value/Points to**: `76.76.21.21`
- **TTL**: `Automatic` или `3600` (1 час)

#### **Запис 2: WWW subdomain (CNAME Record)**

- **Type**: `CNAME`
- **Host/Name**: `www`
- **Value/Points to**: `cname.vercel-dns.com`
- **TTL**: `Automatic` или `3600`

### **3.5 Save/Apply промените**

Click на **Save Changes** или **Apply**

---

## ⏳ **СТЪПКА 4: Изчакай DNS propagation**

### **Колко време отнема:**
- **Минимум**: 5-10 минути
- **Обикновено**: 1-2 часа
- **Максимум**: 24-48 часа (рядко)

### **Как да проверя дали е готово:**

#### **Метод 1: Онлайн инструмент**
Отвори: https://www.whatsmydns.net/
- Въведи домейна: `xbethub.com`
- Избери `A` record
- Провери дали показва `76.76.21.21`

#### **Метод 2: Terminal команда**
```bash
# За Mac/Linux
dig xbethub.com

# Трябва да видиш:
# xbethub.com.  3600  IN  A  76.76.21.21
```

---

## ✅ **СТЪПКА 5: Провери в Vercel**

След като DNS propagation завърши:

1. **Vercel Dashboard** → Твоят проект → **Domains**
2. Трябва да видиш домейна със статус **Valid** или **Active**
3. Ако има грешка, click на **Refresh** или **Retry**

---

## 🔒 **СТЪПКА 6: SSL Certificate (автоматично)**

Vercel автоматично ще генерира **безплатен SSL certificate** (HTTPS):
- Отнема 5-10 минути след DNS propagation
- Не трябва да правиш нищо
- Сертификатът се обновява автоматично

---

## 🎉 **СТЪПКА 7: Тествай домейна**

След като всичко е готово:

1. Отвори: `https://xbethub.com` (твоят домейн)
2. Провери:
   - ✅ Сайтът се зарежда
   - ✅ HTTPS работи (зелено катинарче)
   - ✅ Прогнозите се показват
   - ✅ Admin панел работи
   - ✅ Няма грешки в console

---

## 🔄 **СТЪПКА 8: Редирект от www към root (опционално)**

Ако искаш `www.xbethub.com` да редиректва към `xbethub.com`:

1. **Vercel Dashboard** → **Domains**
2. Намери `www.xbethub.com`
3. Click на **Edit**
4. Избери **Redirect to xbethub.com**
5. Save

---

## 🗑️ **СТЪПКА 9: Изтрий Render deployment (опционално)**

След като потвърдиш че всичко работи на Vercel:

1. Отвори: https://dashboard.render.com
2. Намери твоя проект
3. **Settings** → **Delete Service**
4. Потвърди изтриването

**ВАЖНО:** Направи това САМО след като си сигурен че Vercel работи перфектно!

---

## 📊 **DNS Записи - Пълен преглед**

### **Ако използваш Cloudflare:**

| Type  | Name | Content              | Proxy Status | TTL  |
|-------|------|----------------------|--------------|------|
| A     | @    | 76.76.21.21          | DNS only     | Auto |
| CNAME | www  | cname.vercel-dns.com | DNS only     | Auto |

**ВАЖНО:** Cloudflare proxy трябва да е **изключен** (DNS only, сив облак)

### **Ако използваш Namecheap:**

| Type  | Host | Value                | TTL       |
|-------|------|----------------------|-----------|
| A     | @    | 76.76.21.21          | Automatic |
| CNAME | www  | cname.vercel-dns.com | Automatic |

### **Ако използваш GoDaddy:**

| Type  | Name | Value                | TTL  |
|-------|------|----------------------|------|
| A     | @    | 76.76.21.21          | 1 Hour |
| CNAME | www  | cname.vercel-dns.com | 1 Hour |

---

## 🐛 **Troubleshooting**

### **Проблем: "Domain is not configured correctly"**

**Решение:**
1. Провери DNS записите - трябва да са точно както е показано
2. Изчакай повече време за DNS propagation
3. Vercel Dashboard → Domains → Click **Refresh**

### **Проблем: "SSL Certificate not issued"**

**Решение:**
1. Изчакай 10-15 минути
2. Провери дали DNS записите са правилни
3. Ако използваш Cloudflare, изключи proxy (DNS only)

### **Проблем: "Too many redirects"**

**Решение:**
1. Ако използваш Cloudflare, изключи proxy
2. Провери SSL/TLS settings в Cloudflare (трябва да е "Full" или "Flexible")

### **Проблем: Домейнът не се зарежда**

**Решение:**
1. Провери DNS с https://www.whatsmydns.net/
2. Изчакай повече време (до 24 часа)
3. Изчисти browser cache (Ctrl+Shift+Delete)
4. Опитай в incognito/private mode

---

## 📝 **Checklist преди да започнеш:**

- [ ] Имам достъп до DNS настройките на домейна
- [ ] Знам кой е моят domain registrar
- [ ] Vercel проектът работи на preview URL
- [ ] Environment variables са добавени в Vercel
- [ ] Сайтът работи без грешки на Vercel

---

## 📝 **Checklist след миграция:**

- [ ] DNS записите са добавени правилно
- [ ] DNS propagation е завършила (whatsmydns.net)
- [ ] Домейнът се зарежда в браузъра
- [ ] HTTPS работи (зелено катинарче)
- [ ] Прогнозите се показват
- [ ] Admin панел работи
- [ ] Status badges се показват
- [ ] Няма грешки в console
- [ ] Render deployment е изтрит (опционално)

---

## 🎯 **Кратка версия (за опитни):**

1. Vercel Dashboard → Domains → Add `xbethub.com`
2. DNS настройки:
   - A record: `@` → `76.76.21.21`
   - CNAME: `www` → `cname.vercel-dns.com`
3. Изчакай DNS propagation (1-2 часа)
4. Провери: https://xbethub.com
5. Готово! 🎉

---

## 📞 **Нужда от помощ?**

Ако имаш проблеми:
1. Провери DNS записите с https://www.whatsmydns.net/
2. Провери Vercel logs за грешки
3. Изчакай повече време за DNS propagation
4. Попитай мен! 😊

---

## 🎉 **След успешна миграция:**

Поздравления! Твоят сайт вече работи на Vercel с твоя домейн! 🚀

**Предимства:**
- ⚡ По-бързо зареждане
- 🌍 Global CDN
- 🔒 Безплатен SSL
- 💰 Безплатен hosting
- 📊 Built-in analytics
- 🚀 Instant deployments

**Следващи стъпки:**
1. Мониторирай performance в Vercel Dashboard
2. Провери Google Search Console за SEO
3. Обнови social media links
4. Наслаждавай се! 🎉
