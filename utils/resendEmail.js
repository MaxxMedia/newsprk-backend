// C:\Users\Dell\OneDrive\Desktop\tooling\newsprk-backend\utils\resendEmail.js

import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

// Get from email from env, fallback to a default
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || process.env.MAIL_FROM || "no-reply@fitnessfest.in"
const FROM_NAME = "Tooling Trends"

export async function sendRecruiterEmail(email, username, password) {
  try {
    const result = await resend.emails.send({
      // ✅ Use environment variable for from address
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      
      // ✅ Add reply-to (use a real email if you have one)
      reply_to: "support@toolingtrends.com",
      
      to: email,
      
      subject: "Your Supplier Account is Ready 🚀",
      
      // ✅ Plain text version
      text: `
Welcome to Tooling Trends

Your supplier account has been created successfully. Please use the credentials below to access your account.

Email: ${email}
Username: ${username}
Password: ${password}

Login to Your Account: https://toolingtrends.com/login

Security Tip: Please change your password immediately after your first login to keep your account secure.

© ${new Date().getFullYear()} Tooling Trends. All rights reserved.
      `,
      
      html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Tooling Trends</title>
      </head>
      <body style="margin:0;padding:20px;background-color:#f4f6f9;font-family:Arial,sans-serif;">
        <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 8px 20px rgba(0,0,0,0.08);">

          <!-- HEADER -->
          <div style="background:#0F5B78;padding:8px 12px;text-align:center;">
            <img
              src="https://toolingtrends.com/images/logo.jpg"
              alt="Tooling Trends"
              style="display:block;width:100%;max-width:200px;height:auto;margin:0 auto;border-radius:6px;"
            />
          </div>

          <!-- BODY -->
          <div style="padding:32px;">

            <h2 style="margin:0 0 12px;color:#0F5B78;font-size:28px;font-weight:700;">
              Welcome to Tooling Trends 🚀
            </h2>

            <p style="margin:0 0 20px;color:#555;font-size:15px;line-height:1.7;">
              Your supplier account has been created successfully. Please use the credentials below to access your account.
            </p>

            <!-- CREDENTIALS -->
            <div style="background:#f8fafc;border-left:4px solid #B30F24;border-radius:6px;padding:18px;margin:25px 0;">

              <p style="margin:8px 0;font-size:15px;color:#333;">
                <strong style="color:#0F5B78;">Email:</strong> ${email}
              </p>

              <p style="margin:8px 0;font-size:15px;color:#333;">
                <strong style="color:#0F5B78;">Username:</strong> ${username}
              </p>

              <p style="margin:8px 0;font-size:15px;color:#333;">
                <strong style="color:#0F5B78;">Password:</strong> ${password}
              </p>

            </div>

            <!-- LOGIN BUTTON -->
            <div style="text-align:center;margin:30px 0;">
              <a
                href="https://toolingtrends.com/login"
                style="
                  display:inline-block;
                  background:#B30F24;
                  color:#ffffff;
                  text-decoration:none;
                  padding:14px 28px;
                  border-radius:6px;
                  font-weight:bold;
                  font-size:16px;
                  transition: background 0.3s ease;
                "
              >
                Login to Your Account
              </a>
            </div>

            <p style="margin:0;color:#666;font-size:13px;line-height:1.6;">
              <strong>Security Tip:</strong> Please change your password immediately after your first login to keep your account secure.
            </p>

          </div>

          <!-- FOOTER -->
          <div style="background:#083A54;padding:18px;text-align:center;">
            <p style="margin:0;color:#ffffff;font-size:12px;">
              © ${new Date().getFullYear()} Tooling Trends. All rights reserved.
            </p>
            <p style="margin:5px 0 0;color:#8aa9b9;font-size:11px;">
              This is an automated message. Please do not reply to this email.
            </p>
          </div>

        </div>
      </body>
      </html>
      `,
    })

    console.log("✅ Email sent successfully to:", email)
    console.log("📧 Email ID:", result?.id)
    return result

  } catch (error) {
    console.error("❌ Email failed:", error)
    throw error
  }
}