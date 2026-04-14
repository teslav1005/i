const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const admin = require('firebase-admin');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Firebase Admin
const serviceAccount = {
    type: "service_account",
    project_id: "afnan-49d21",
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: process.env.FIREBASE_CERT_URL
};

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: "afnan-49d21"
});

const db = admin.firestore();

// Configure Gmail SMTP
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'afnanaiapi@gmail.com',
        pass: process.env.GMAIL_PASSWORD // App password from Google
    }
});

// Email template with Afnan ai branding
const getEmailTemplate = (code, name) => {
    return `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
                background-color: #f5f5f5;
                margin: 0;
                padding: 0;
            }
            .container {
                max-width: 600px;
                margin: 20px auto;
                background-color: white;
                border-radius: 12px;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                overflow: hidden;
            }
            .header {
                background: linear-gradient(135deg, #ffffff 0%, #f9f9f9 100%);
                padding: 30px;
                text-align: center;
                border-bottom: 1px solid #eee;
            }
            .logo {
                width: 50px;
                height: 50px;
                margin-bottom: 15px;
            }
            .header h1 {
                color: #000;
                margin: 0;
                font-size: 28px;
                font-weight: bold;
            }
            .content {
                padding: 40px 30px;
                text-align: center;
            }
            .content p {
                color: #666;
                font-size: 16px;
                line-height: 1.6;
                margin: 15px 0;
            }
            .code-box {
                background-color: #f0f0f0;
                border: 2px solid #ddd;
                border-radius: 8px;
                padding: 25px;
                margin: 30px 0;
                text-align: center;
            }
            .code {
                font-size: 36px;
                font-weight: bold;
                color: #000;
                letter-spacing: 8px;
                font-family: 'Courier New', monospace;
            }
            .warning {
                background-color: #fff3cd;
                border-left: 4px solid #ffc107;
                padding: 15px;
                margin: 20px 0;
                border-radius: 4px;
                text-align: right;
                font-size: 14px;
                color: #856404;
            }
            .footer {
                background-color: #f9f9f9;
                padding: 20px 30px;
                text-align: center;
                border-top: 1px solid #eee;
                font-size: 12px;
                color: #999;
            }
            .button {
                display: inline-block;
                background-color: #000;
                color: white;
                padding: 12px 30px;
                border-radius: 6px;
                text-decoration: none;
                margin: 20px 0;
                font-weight: bold;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <img src="https://i.postimg.cc/TYd6FZy0/grok-image-x6em5fj-edit-96291120058942.png" alt="Afnan ai" class="logo">
                <h1>Afnan ai</h1>
            </div>
            <div class="content">
                <p>مرحباً ${name}،</p>
                <p>تم طلب حذف حسابك. لتأكيد هذا الإجراء، يرجى إدخال رمز التحقق أدناه:</p>
                <div class="code-box">
                    <div class="code">${code}</div>
                </div>
                <p>هذا الرمز صالح لمدة 15 دقيقة فقط.</p>
                <div class="warning">
                    ⚠️ تنبيه: هذا الإجراء لا يمكن التراجع عنه. سيتم حذف جميع بيانات حسابك والمحادثات الخاصة بك.
                </div>
                <p style="color: #999; font-size: 14px;">إذا لم تطلب حذف حسابك، يرجى تجاهل هذا البريد.</p>
            </div>
            <div class="footer">
                <p>© 2026 Afnan ai. جميع الحقوق محفوظة.</p>
                <p>هذا البريد تم إرساله من: afnanaiapi@gmail.com</p>
            </div>
        </div>
    </body>
    </html>
    `;
};

// Send verification email
app.post('/send-verification-email', async (req, res) => {
    try {
        const { email, code, name } = req.body;

        if (!email || !code || !name) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const mailOptions = {
            from: 'afnanaiapi@gmail.com',
            to: email,
            subject: 'رمز التحقق من حذف الحساب - Afnan ai',
            html: getEmailTemplate(code, name)
        };

        await transporter.sendMail(mailOptions);
        
        res.status(200).json({ 
            success: true, 
            message: 'Verification email sent successfully' 
        });
    } catch (error) {
        console.error('Email sending error:', error);
        res.status(500).json({ 
            error: 'Failed to send email',
            details: error.message 
        });
    }
});

// Verify code and delete account
app.post('/verify-and-delete-account', async (req, res) => {
    try {
        const { uid, code } = req.body;

        if (!uid || !code) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Get delete request from Firestore
        const deleteRequestDoc = await db.collection('deleteRequests').doc(uid).get();

        if (!deleteRequestDoc.exists) {
            return res.status(404).json({ error: 'Delete request not found' });
        }

        const deleteRequest = deleteRequestDoc.data();
        const now = new Date();

        // Check if code is expired
        if (deleteRequest.expiresAt.toDate() < now) {
            return res.status(400).json({ error: 'Verification code has expired' });
        }

        // Check if code matches
        if (deleteRequest.code !== code) {
            return res.status(400).json({ error: 'Invalid verification code' });
        }

        // Delete user from Firebase Auth
        await admin.auth().deleteUser(uid);

        // Delete user data from Firestore
        await db.collection('users').doc(uid).delete();
        await db.collection('chats').where('userId', '==', uid).get().then(snapshot => {
            snapshot.forEach(doc => doc.ref.delete());
        });

        // Delete the delete request
        await db.collection('deleteRequests').doc(uid).delete();

        res.status(200).json({ 
            success: true, 
            message: 'Account deleted successfully' 
        });
    } catch (error) {
        console.error('Account deletion error:', error);
        res.status(500).json({ 
            error: 'Failed to delete account',
            details: error.message 
        });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
