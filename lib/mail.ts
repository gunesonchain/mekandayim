
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

export async function sendVerificationEmail(email: string, token: string) {
    const confirmLink = `${process.env.NEXTAUTH_URL}/auth/verify?token=${token}`;

    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.log("----------------------------------------------------");
        console.log("⚠️ SMTP Configuration Missing (TEST MODE)");
        console.log(`📨 Email to: ${email}`);
        console.log(`🔗 Link: ${confirmLink}`);
        console.log("----------------------------------------------------");
        return;
    }

    try {
        await transporter.sendMail({
            from: `"Mekan İtirafları" <${process.env.SMTP_USER}>`,
            to: email,
            subject: "Hesabınızı Onaylayın - Mekan İtirafları",
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                    <h2 style="color: #333;">Hoş Geldiniz! 👋</h2>
                    <p>Mekan İtirafları'na kayıt olduğunuz için teşekkürler. Hesabınızı aktif etmek için lütfen aşağıdaki butona tıklayın:</p>
                    
                    <a href="${confirmLink}" style="display: inline-block; background-color: #8b5cf6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0;">
                        Hesabımı Onayla
                    </a>
                    
                    <p style="color: #666; font-size: 14px;">Veya bu linki tarayıcınıza yapıştırın:</p>
                    <p style="color: #666; font-size: 12px; word-break: break-all;">${confirmLink}</p>
                    
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                    <p style="color: #999; font-size: 12px;">Bu maili siz istemediyseniz dikkate almayınız.</p>
                </div>
            `,
        });
        console.log(`Verification email sent to ${email}`);
    } catch (error) {
        console.error("Failed to send verification email:", error);
    }
}
