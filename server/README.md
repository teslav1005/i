# Afnan AI - Backend Server

خادم التحقق من البريد الإلكتروني وحذف الحسابات لتطبيق Afnan AI.

## المميزات

- إرسال رموز التحقق عبر البريد الإلكتروني
- التحقق من رموز الحذف وحذف الحسابات
- تكامل Firebase Admin
- دعم CORS
- معالجة آمنة للأخطاء

## المتطلبات

- Node.js >= 14.0.0
- npm أو yarn

## التثبيت

```bash
npm install
```

## الإعدادات

انسخ ملف `.env.example` إلى `.env` وأضف بيانات اعتمادك:

```bash
cp .env.example .env
```

### متغيرات البيئة المطلوبة:

- `FIREBASE_PRIVATE_KEY_ID`: معرف المفتاح الخاص من Firebase
- `FIREBASE_PRIVATE_KEY`: المفتاح الخاص من Firebase
- `FIREBASE_CLIENT_EMAIL`: بريد العميل من Firebase
- `FIREBASE_CLIENT_ID`: معرف العميل من Firebase
- `FIREBASE_CERT_URL`: رابط الشهادة من Firebase
- `GMAIL_PASSWORD`: كلمة مرور تطبيق Gmail
- `PORT`: منفذ الخادم (الافتراضي: 3000)
- `NODE_ENV`: بيئة التطوير (development/production)

## التشغيل

### وضع التطوير

```bash
npm run dev
```

### وضع الإنتاج

```bash
npm start
```

## نقاط النهاية (API Endpoints)

### 1. إرسال بريد التحقق

**POST** `/send-verification-email`

```json
{
  "email": "user@example.com",
  "code": "1234567",
  "name": "اسم المستخدم"
}
```

**الاستجابة:**
```json
{
  "success": true,
  "message": "Verification email sent successfully"
}
```

### 2. التحقق وحذف الحساب

**POST** `/verify-and-delete-account`

```json
{
  "uid": "user_uid",
  "code": "1234567"
}
```

**الاستجابة:**
```json
{
  "success": true,
  "message": "Account deleted successfully"
}
```

### 3. فحص صحة الخادم

**GET** `/health`

**الاستجابة:**
```json
{
  "status": "OK"
}
```

## الترخيص

جميع الحقوق محفوظة © 2026 Afnan AI
