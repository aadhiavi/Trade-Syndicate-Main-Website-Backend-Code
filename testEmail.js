const { sendOtpEmail } = require("./config/emailService");

(async () => {
  try {
    const res = await sendOtpEmail('aadhiavi57@gmail.com', '123456');
    console.log('Email sent successfully!', res);
  } catch (err) {
    console.error('Error sending email:', err);
  }
})();
