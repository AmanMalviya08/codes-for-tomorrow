// routes/profile.js
const express = require('express');
const router = express.Router();

// import the actual middleware function (destructured)
const { authenticateToken } = require('../middleware/auth');

// GET /api/profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    // auth middleware attaches req.user (selected without password)
    const user = req.user;
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.json({
      success: true,
      data: {
        id: user.id || user._id,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email,
        fullName: user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        isEmailVerified: !!user.isEmailVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });
  } catch (err) {
    console.error('[profile] error', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
