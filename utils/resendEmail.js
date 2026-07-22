// import { Resend } from "resend"

// const resend = new Resend(process.env.RESEND_API_KEY)

// export async function sendRecruiterEmail(email, username, password) {
//   try {
//     await resend.emails.send({
//       from: "MouldMakingTech <no-reply@toolingtrends.com>", 
//       to: email,
//       subject: "Your Supplier Account is Ready 🚀",
//       html: `
//         <div style="font-family:Arial;padding:20px">
//           <h2>Welcome to MouldMakingTech</h2>
//           <p>Your supplier account has been created successfully.</p>
//           <p><strong>Email:</strong> ${email}</p>
//           <p><strong>Username:</strong> ${username}</p>
//           <p><strong>Password:</strong> ${password}</p>
//           <br/>
//           <p>Please login and change your password.</p>
//         </div>
//       `,
//     })
//   } catch (error) {
//     console.error("Email failed:", error)
//   }
// }


import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendRecruiterEmail(email, username, password) {
  try {
    await resend.emails.send({
      from: "Tooling Trends <no-reply@fitnessfest.in>", // Change to no-reply@toolingtrends.com if verified
      to: email,
      subject: "Your Supplier Account is Ready 🚀",
      html: `
      <div style="margin:0;padding:20px;background-color:#f4f6f9;font-family:Arial,sans-serif;">

        <!-- EMAIL CONTAINER -->
        <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 8px 20px rgba(0,0,0,0.08);">

          <!-- HEADER -->
          <div style="background:#0F5B78;padding:8px 12px;">
            <img
              src="https://res.cloudinary.com/dlkuk7rok/image/upload/v1771244281/mould-tech/xoskdfqbu9ihxzzyhd9e.jpg"
              alt="Tooling Trends"
              style="display:block;width:100%;max-height:120px;object-fit:cover;border-radius:6px;margin:0 auto;"
            />
          </div>

          <!-- BODY -->
          <div style="padding:32px;">

            <h2 style="margin:0 0 12px;color:#0F5B78;font-size:28px;">
              Welcome to Tooling Trends 🚀
            </h2>

            <p style="margin:0 0 20px;color:#555;font-size:15px;line-height:1.7;">
              Your supplier account has been created successfully. Please use the credentials below to access your account.
            </p>

            <!-- CREDENTIALS -->
            <div style="background:#f8fafc;border-left:4px solid #B30F24;border-radius:6px;padding:18px;margin:25px 0;">

              <p style="margin:8px 0;font-size:15px;">
                <strong>Email:</strong> ${email}
              </p>

              <p style="margin:8px 0;font-size:15px;">
                <strong>Username:</strong> ${username}
              </p>

              <p style="margin:8px 0;font-size:15px;">
                <strong>Password:</strong> ${password}
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
                  font-size:15px;
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
          </div>

        </div>

      </div>
      `,
    })
  } catch (error) {
    console.error("Email failed:", error)
  }
}