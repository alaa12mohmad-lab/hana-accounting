# 🚛 شركة الهنا للنقل — النظام المحاسبي

نظام محاسبي متكامل لشركة الهنا للنقل — يعمل أونلاين عبر GitHub Pages مع Firebase.

## 📁 الملفات المطلوبة في الـ Repo

```
📁 repo/
├── index.html       ← النظام الكامل
├── manifest.json    ← إعدادات PWA
├── sw.js            ← Service Worker (وضع أوفلاين)
├── icon-192.png     ← أيقونة التطبيق
└── icon-512.png     ← أيقونة التطبيق (كبيرة)
```

---

## 🚀 خطوات الرفع على GitHub Pages

### الخطوة 1 — إنشاء المستودع
1. اذهب إلى [github.com](https://github.com) وسجّل الدخول
2. اضغط **New repository**
3. اسم المستودع: `hana-accounting` (أو أي اسم)
4. اختر **Public** (مطلوب لـ GitHub Pages المجاني)
5. اضغط **Create repository**

### الخطوة 2 — رفع الملفات
**طريقة بسيطة (بدون Git):**
1. اضغط **Add file** → **Upload files**
2. اسحب الملفات الخمسة معاً:
   - `index.html`
   - `manifest.json`
   - `sw.js`
   - `icon-192.png`
   - `icon-512.png`
3. اضغط **Commit changes**

### الخطوة 3 — تفعيل GitHub Pages
1. اذهب إلى **Settings** في المستودع
2. في القائمة اليسرى: **Pages**
3. تحت **Source**: اختر **Deploy from a branch**
4. Branch: **main** / Folder: **/ (root)**
5. اضغط **Save**
6. انتظر دقيقة ثم ستجد الرابط:
   ```
   https://USERNAME.github.io/hana-accounting/
   ```

---

## 🔥 إعداد Firebase (قاعدة البيانات السحابية)

### 1. إنشاء المشروع
- اذهب إلى [console.firebase.google.com](https://console.firebase.google.com)
- **Add project** → اختر اسماً → **Continue** (مجاني)

### 2. تفعيل Firestore
```
Build → Firestore Database → Create database → Start in test mode → Enable
```

### 3. تفعيل المصادقة
```
Build → Authentication → Get started → Email/Password → Enable → Save
```

### 4. قواعد الأمان (مهمة!)
اذهب إلى **Firestore → Rules** وضع هذا الكود:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // الدعوات: المدير فقط يكتب، المستخدمون يقرأون
    match /invitations/{docId} {
      allow read:  if request.auth != null;
      allow write: if request.auth != null &&
                   request.auth.token.email == '3laalafi@gmail.com';
    }
    // باقي البيانات: المستخدمون المسجّلون فقط
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```
→ اضغط **Publish**

### 5. الحصول على Config
```
Project Settings ⚙️ → Your apps → أضف Web app </>
→ Register app → انسخ الـ config
```

---

## ⚙️ ربط النظام بـ Firebase

1. افتح الرابط: `https://USERNAME.github.io/hana-accounting/`
2. اذهب إلى **إعدادات الشركة** (في الشريط الجانبي)
3. انزل لقسم **الاتصال بـ Firebase**
4. الصق قيم الـ config في الحقول
5. اضغط **☁️ اتصل بـ Firebase الآن**
6. سيُعاد تحميل الصفحة → ستظهر شاشة تسجيل الدخول

---

## 🔐 نظام الدعوات (Invitation System)

### كيف يعمل
```
المدير يضيف بريد المستخدم → المستخدم يفتح الرابط → يسجّل بكلمة مروره الخاصة
```

### إضافة مستخدم جديد
1. سجّل دخولك بحساب المدير (`3laalafi@gmail.com`)
2. اضغط **إدارة الدعوات** في الشريط الجانبي
3. اضغط **＋ إضافة دعوة جديدة**
4. أدخل البريد الإلكتروني للمستخدم
5. أرسل له رابط النظام
6. يفتح الرابط → ينقر "إنشاء حساب" → يدخل بريده وكلمة مرور يختارها

### إلغاء مستخدم
- من صفحة الدعوات → اضغط **🚫 إلغاء** بجانب البريد → لن يتمكن من الدخول

---

## 📱 تثبيت التطبيق على الهاتف (PWA)

### Android (Chrome)
1. افتح الرابط في Chrome
2. ستظهر رسالة "Add to Home screen" أو اضغط ⋮ → **Install app**
3. سيُنصَّب كتطبيق مستقل

### iPhone (Safari)
1. افتح الرابط في Safari
2. اضغط زر المشاركة ↑
3. اختر **Add to Home Screen**
4. اضغط **Add**

---

## 📊 مميزات النظام

| الميزة | الوصف |
|--------|-------|
| 🔐 أمان | نظام دعوات — فقط المدعوون يدخلون |
| ☁️ سحابة | Firebase Firestore — بيانات آمنة أونلاين |
| 📱 موبايل | متجاوب مع جميع الشاشات |
| 📲 PWA | قابل للتثبيت كتطبيق على الهاتف |
| 🔄 أوفلاين | يعمل بدون إنترنت بعد التحميل الأول |
| 💾 نسخ احتياطي | JSON + Excel + تصدير تلقائي |

---

## 🆓 الخطة المجانية — الحدود

| الخدمة | المجاني |
|--------|---------|
| GitHub Pages | ✅ غير محدود |
| Firebase Firestore | 50K قراءة + 20K كتابة يومياً |
| Firebase Auth | ✅ غير محدود |
| Firebase Storage | 5GB |

> كافٍ لشركة صغيرة إلى متوسطة بسهولة

---

*إيميل المدير: 3LAALAFI@GMAIL.COM*
