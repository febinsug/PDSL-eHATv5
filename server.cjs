const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');

const app = express();
const port = 3001;

// Use CORS to allow requests from your frontend
app.use(cors());
app.use(express.json());

// Configure Nodemailer with your Gmail credentials
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'fsugathan@pdsl.com',
    pass: 'hjkiosmjcdsluhup', // Your App Password
  },
});

// API endpoint to send a test email
app.post('/send-test-email', async (req, res) => {
  const { to, subject, text, html } = req.body;

  try {
    await transporter.sendMail({
      from: 'fsugathan@pdsl.com', // Your verified Gmail address
      to,
      subject,
      text,
      html,
    });
    console.log(`Test email sent to ${to}`);
    res.status(200).json({ message: 'Test email sent successfully!' });
  } catch (error) {
    console.error('Error sending test email:', error);
    res.status(500).json({ message: 'Failed to send test email', error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Backend server listening at http://localhost:${port}`);
});
