import jwt from 'jsonwebtoken';
import { User } from '../models/user.model.js';

export const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email required' });

    const user = await User.findOne({ email: String(email).toLowerCase() });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.isVerified) return res.status(400).json({ success: false, message: 'Already verified' });

    const verifyToken = jwt.sign({ userId: user._id, purpose: 'verify' }, process.env.SECRET_KEY, { expiresIn: '1d' });
    const verifyUrl = `${req.protocol}://${req.get('host')}/api/v1/user/verify?token=${verifyToken}`;
    // send email using util (no-op if not configured)
    try {
      const { sendVerificationEmail } = await import('../utils/email.js');
      await sendVerificationEmail(user.email, user.username, verifyUrl);
    } catch (e) {
      console.log('Failed to resend verification', e);
    }

    return res.status(200).json({ success: true, verifyUrl });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
