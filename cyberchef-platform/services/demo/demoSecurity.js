function enforceDemoSecurity(req, res, next) {
  if (req.session.demo_user) {
    // Block access to real user data and billing
    if (req.path.startsWith('/user') || req.path.startsWith('/billing')) {
      return res.status(403).send('Demo mode cannot access real user or billing data.');
    }
  }
  next();
}

module.exports = { enforceDemoSecurity };
