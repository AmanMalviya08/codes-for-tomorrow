// middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    console.debug('[auth middleware] authHeader:', authHeader ? 'present' : 'missing');

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'Access token is required'
      });
    }

    // Extract token from "Bearer TOKEN" format
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : authHeader;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token format'
      });
    }

    console.debug('[auth middleware] token length:', token.length);

    const secret = process.env.JWT_SECRET || 'default_jwt_secret_change_me';

    // Verify and decode the token
    const decoded = jwt.verify(token, secret);
    console.debug('[auth middleware] decoded token:', { sub: decoded.sub, exp: decoded.exp });

    if (!decoded.sub) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token payload'
      });
    }

    // Find the user
    const user = await User.findById(decoded.sub).select('-password');
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token or user not found'
      });
    }

    // Check if email is verified
    if (!user.isEmailVerified) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email to access this resource',
        requiresVerification: true,
        email: user.email
      });
    }

    console.debug('[auth middleware] user found:', user.email);

    // Attach user to request
    req.user = user;
    req.userId = user._id;

    next();
  } catch (error) {
    console.error('[auth middleware] error:', error.message);

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};

module.exports = { authenticateToken };
