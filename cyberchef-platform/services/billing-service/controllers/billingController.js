const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.createSubscription = async (req, res) => {
  try {
    const { plan, paymentMethodId } = req.body;
    // Plans: free, pro, creator
    const priceId = {
      free: process.env.STRIPE_PRICE_FREE,
      pro: process.env.STRIPE_PRICE_PRO,
      creator: process.env.STRIPE_PRICE_CREATOR
    }[plan];
    if (!priceId) return res.status(400).json({ error: 'Invalid plan' });
    const customer = await stripe.customers.create({
      email: req.user.email,
      payment_method: paymentMethodId,
      invoice_settings: { default_payment_method: paymentMethodId }
    });
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: priceId }],
      expand: ['latest_invoice.payment_intent']
    });
    res.json({ subscription });
  } catch (err) {
    res.status(400).json({ error: 'Subscription failed', details: err.message });
  }
};

exports.getPlans = (req, res) => {
  res.json({
    plans: [
      { name: 'Free', price: 0 },
      { name: 'Pro', price: 'pro_price' },
      { name: 'Creator', price: 'creator_price' }
    ]
  });
};
