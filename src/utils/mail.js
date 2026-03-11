const nodemailer = require('nodemailer');
const env = require('../config/env');

const transporter = nodemailer.createTransport({
  host: env.smtp.host,
  port: env.smtp.port,
  secure: env.smtp.port === 465, // true for 465, false for other ports
  auth: {
    user: env.smtp.user,
    pass: env.smtp.pass,
  },
});

/**
 * Send email
 * @param {string} to
 * @param {string} subject
 * @param {string} text
 * @param {string} html
 */
const sendMail = async (to, subject, text, html) => {
  try {
    const info = await transporter.sendMail({
      from: env.smtp.from,
      to,
      subject,
      text,
      html,
    });
    console.log('Email sent: %s', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    // Don't throw error to avoid breaking the request if email fails
    // But in production you might want to log this to a monitoring service
    return null;
  }
};

/**
 * Send password reset email
 * @param {string} email
 * @param {string} token
 */
const sendResetPasswordEmail = async (email, token) => {
  const resetUrl = `${env.app.frontendUrl}/reset-password?token=${token}`;
  const subject = 'Khôi phục mật khẩu - 3HSTATION';
  const text = `Chào bạn,\n\nBạn nhận được email này vì bạn (hoặc ai đó) đã yêu cầu khôi phục mật khẩu cho tài khoản của mình.\n\nVui lòng nhấp vào liên kết sau hoặc dán vào trình duyệt của bạn để hoàn tất quy trình:\n\n${resetUrl}\n\nNếu bạn không yêu cầu điều này, vui lòng bỏ qua email này và mật khẩu của bạn sẽ không thay đổi.\n\nTrân trọng,\nĐội ngũ 3HSTATION`;
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
      <h2 style="color: #007bff; text-align: center;">Khôi phục mật khẩu</h2>
      <p>Chào bạn,</p>
      <p>Bạn nhận được email này vì bạn (hoặc ai đó) đã yêu cầu khôi phục mật khẩu cho tài khoản của mình tại <strong>3HSTATION</strong>.</p>
      <p>Vui lòng nhấp vào nút dưới đây để thiết lập mật khẩu mới:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" style="background-color: #007bff; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Thiết lập lại mật khẩu</a>
      </div>
      <p>Hoặc bạn có thể sao chép và dán liên kết này vào trình duyệt:</p>
      <p style="word-break: break-all; color: #007bff;">${resetUrl}</p>
      <p><em>Lưu ý: Liên kết này sẽ hết hạn sau 1 giờ.</em></p>
      <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
      <p style="font-size: 0.9em; color: #777;">Nếu bạn không yêu cầu điều này, vui lòng bỏ qua email này. Mật khẩu của bạn vẫn sẽ được giữ nguyên.</p>
      <p style="font-size: 0.9em; color: #777;">Trân trọng,<br>Đội ngũ 3HSTATION</p>
    </div>
  `;

  return sendMail(email, subject, text, html);
};

module.exports = {
  sendMail,
  sendResetPasswordEmail
};
