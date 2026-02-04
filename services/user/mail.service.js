import nodemailer from "nodemailer";

export async function sendVerificationEmail(email, otp, subject) {
    try {
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.NODEMAILER_EMAIL,
                pass: process.env.NODEMAILER_PASSWORD
            }
        });

        await transporter.sendMail({
            from: process.env.NODEMAILER_EMAIL,
            to: email,
            subject,
            html: `<h3>Your OTP is: <b>${otp}</b></h3>`
        });
        return true;
    } catch (error) {
        console.log("Email sending error:", error);
        return false;
    }
}
