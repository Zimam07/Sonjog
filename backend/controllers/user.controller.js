import { User } from "../models/user.model.js";
import nodemailer from 'nodemailer';
import { sendVerificationEmail } from '../utils/email.js';
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import getDataUri from "../utils/datauri.js";
import cloudinary from "../utils/cloudinary.js";
import { Post } from "../models/post.model.js";
export const register = async (req, res) => {
    try {
        const { username, email, password } = req.body;
        if (!username || !email || !password) {
            return res.status(401).json({
                message: "Something is missing, please check!",
                success: false,
            });
        }
        // Email domain restriction (optional)
        // By default the project enforced BRACU domains. To allow other domains or allow all
        // set environment variables:
        // - ALLOW_ALL_EMAILS=true  -> skip domain checks
        // - ALLOWED_EMAIL_DOMAINS=",@bracu.ac.bd,@g.bracu.ac.bd" -> comma-separated domains to allow (must include leading '@')
        const lowerEmail = String(email).toLowerCase();
        const allowAll = String(process.env.ALLOW_ALL_EMAILS || '').toLowerCase() === 'true';
        if (!allowAll) {
            const envList = process.env.ALLOWED_EMAIL_DOMAINS || '@bracu.ac.bd,@g.bracu.ac.bd';
            const allowedDomains = envList.split(',').map(d => d.trim()).filter(Boolean);
            const hasAllowedDomain = allowedDomains.some((d) => lowerEmail.endsWith(d));
            if (!hasAllowedDomain) {
                return res.status(400).json({
                    message: 'Registration is restricted by email domain. Use a permitted email address or update server configuration.',
                    success: false,
                });
            }
        }

    const user = await User.findOne({ email: lowerEmail });
        if (user) {
            return res.status(401).json({
                message: "Try different email",
                success: false,
            });
        };
        const hashedPassword = await bcrypt.hash(password, 10);
        // create user with isVerified=false
        const createdUser = await User.create({
            username,
            email: lowerEmail,
            password: hashedPassword,
            isVerified: false,
        });

        // generate a verification token
        const verifyToken = jwt.sign({ userId: createdUser._id, purpose: 'verify' }, process.env.SECRET_KEY, { expiresIn: '1d' });
        const verifyUrl = `${req.protocol}://${req.get('host')}/api/v1/user/verify?token=${verifyToken}`;

        // try to send verification email (helper will no-op if SMTP not configured)
        try {
            await sendVerificationEmail(createdUser.email, createdUser.username, verifyUrl);
        } catch (e) {
            console.log('Failed to send verification email', e);
        }

        return res.status(201).json({
            message: "Account created successfully. Please verify your email.",
            success: true,
            verifyUrl // returned for dev/testing; in production this may not be returned
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ success: false, message: error.message });
    }
}
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(401).json({
                message: "Something is missing, please check!",
                success: false,
            });
        }
    const lowerEmail = String(email).toLowerCase();
    let user = await User.findOne({ email: lowerEmail });
        if (!user) {
            return res.status(401).json({
                message: "Incorrect email or password",
                success: false,
            });
        }
        const isPasswordMatch = await bcrypt.compare(password, user.password);
        if (!isPasswordMatch) {
            return res.status(401).json({
                message: "Incorrect email or password",
                success: false,
            });
        };

        const token = await jwt.sign({ userId: user._id }, process.env.SECRET_KEY, { expiresIn: '1d' });

        // populate each post if in the posts array
        const populatedPosts = await Promise.all(
            user.posts.map( async (postId) => {
                try {
                    const post = await Post.findById(postId);
                    if (post && post.author && post.author.equals && post.author.equals(user._id)){
                        return post;
                    }
                } catch (e) {
                    // ignore individual post lookup errors
                }
                return null;
            })
        );

        // filter out any null entries to avoid frontend render errors
        const filteredPosts = populatedPosts.filter(Boolean);

        user = {
            _id: user._id,
            username: user.username,
            email: user.email,
            profilePicture: user.profilePicture,
            bio: user.bio,
            followers: user.followers,
            following: user.following,
            posts: filteredPosts
        };
        // Cookie options: use secure, SameSite='none' in production (for cross-site requests),
        // and a more permissive setting during development for local testing.
        const isProd = String(process.env.NODE_ENV || '').toLowerCase() === 'production';
        const cookieOptions = {
            httpOnly: true,
            sameSite: isProd ? 'none' : 'lax',
            secure: isProd,
            maxAge: 1 * 24 * 60 * 60 * 1000,
        };

        return res.cookie('token', token, cookieOptions).json({
            message: `Welcome back ${user.username}`,
            success: true,
            user
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({ success: false, message: error.message });
    }
};
export const logout = async (_, res) => {
    try {
        const isProd = String(process.env.NODE_ENV || '').toLowerCase() === 'production';
        const cookieOptions = {
            httpOnly: true,
            sameSite: isProd ? 'none' : 'lax',
            secure: isProd,
            maxAge: 0,
        };
        return res.cookie("token", "", cookieOptions).json({
            message: 'Logged out successfully.',
            success: true
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ success: false, message: error.message });
    }
};
export const getProfile = async (req, res) => {
    try {
        const userId = req.params.id;
        let user = await User.findById(userId).populate({path:'posts', createdAt:-1}).populate('bookmarks');
        return res.status(200).json({
            user,
            success: true
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const editProfile = async (req, res) => {
    try {
        const userId = req.id;
        const { bio, gender } = req.body;
        const profilePicture = req.file;
        let cloudResponse;

        if (profilePicture) {
            const fileUri = getDataUri(profilePicture);
            cloudResponse = await cloudinary.uploader.upload(fileUri);
        }

        const user = await User.findById(userId).select('-password');
        if (!user) {
            return res.status(404).json({
                message: 'User not found.',
                success: false
            });
        };
    if (bio) user.bio = bio;
    // normalize gender server-side to avoid enum validation issues
    if (gender) user.gender = String(gender).toLowerCase();
        if (profilePicture) user.profilePicture = cloudResponse.secure_url;

        await user.save();

        return res.status(200).json({
            message: 'Profile updated.',
            success: true,
            user
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({ success: false, message: error.message });
    }
};
export const getSuggestedUsers = async (req, res) => {
    try {
        const suggestedUsers = await User.find({ _id: { $ne: req.id } }).select("-password");
        if (!suggestedUsers) {
            return res.status(400).json({
                message: 'Currently do not have any users',
            })
        };
        return res.status(200).json({
            success: true,
            users: suggestedUsers
        })
    } catch (error) {
        console.log(error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const verifyEmail = async (req, res) => {
    try {
        const { token } = req.query;
        if (!token) return res.status(400).json({ success: false, message: 'Verification token missing' });

        let payload;
        try {
            payload = jwt.verify(token, process.env.SECRET_KEY);
        } catch (e) {
            return res.status(400).json({ success: false, message: 'Invalid or expired token' });
        }

        if (payload.purpose !== 'verify' || !payload.userId) {
            return res.status(400).json({ success: false, message: 'Invalid token payload' });
        }

        const user = await User.findById(payload.userId);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        user.isVerified = true;
        await user.save();

        return res.status(200).json({ success: true, message: 'Email verified successfully' });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ success: false, message: error.message });
    }
}

export const searchUsers = async (req, res) => {
    try {
        const q = req.query.q || '';
        if (!q.trim()) {
            return res.status(200).json({ success: true, users: [] });
        }
        // case-insensitive partial match on username or email
        const regex = new RegExp(q, 'i');
        const users = await User.find({
            $or: [{ username: regex }, { email: regex }],
            _id: { $ne: req.id }
        }).select('-password');

        return res.status(200).json({ success: true, users });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ success: false, message: error.message });
    }
};
export const followOrUnfollow = async (req, res) => {
    try {
        const Je_follow_korbe = req.id;
        const jake_follow_korbe = req.params.id;
        if (Je_follow_korbe === jake_follow_korbe) {
            return res.status(400).json({
                message: 'You cannot follow/unfollow yourself',
                success: false
            });
        }

        const user = await User.findById(Je_follow_korbe);
        const targetUser = await User.findById(jake_follow_korbe);

        if (!user || !targetUser) {
            return res.status(400).json({
                message: 'User not found',
                success: false
            });
        }
        
        const isFollowing = user.following.includes(jake_follow_korbe);
        if (isFollowing) {
            // unfollow
            await Promise.all([
                User.updateOne({ _id: Je_follow_korbe }, { $pull: { following: jake_follow_korbe } }),
                User.updateOne({ _id: jake_follow_korbe }, { $pull: { followers: Je_follow_korbe } }),
            ])
            return res.status(200).json({ message: 'Unfollowed successfully', success: true });
        } else {
            // follow
            await Promise.all([
                User.updateOne({ _id: Je_follow_korbe }, { $push: { following: jake_follow_korbe } }),
                User.updateOne({ _id: jake_follow_korbe }, { $push: { followers: Je_follow_korbe } }),
            ])
            // persist a follow notification
            try {
                const { Notification } = await import('../models/notification.model.js');
                await Notification.create({
                    type: 'follow',
                    user: jake_follow_korbe,
                    fromUser: Je_follow_korbe,
                    message: 'You have a new follower'
                });
            } catch (e) {
                console.log('Failed to persist follow notification', e);
            }
            return res.status(200).json({ message: 'followed successfully', success: true });
        }
    } catch (error) {
        console.log(error);
        return res.status(500).json({ success: false, message: error.message });
    }
}