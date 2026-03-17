function demoRestriction(req, res, next) {
  if (req.session.demo_user) {
    // Block real account creation, paid plans, production edits
    if (req.path.startsWith('/signup') || req.path.startsWith('/billing') || req.path.startsWith('/edit')) {
      return res.status(403).send('Demo users cannot perform this action.');
    }
  }
  next();
}

module.exports = { demoRestriction };
