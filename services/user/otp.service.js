export function generateOtp() {
    let digits = "1234567890";
    let otp = "";
    for (let i = 0; i < 6; i++) {
        otp += digits[Math.floor(Math.random() * 10)];
    }
    return otp;
}

export function verifyOtp(sessionOtp, enteredOtp) {
    if (!sessionOtp) return false;
    return sessionOtp.toString() === enteredOtp;
}
