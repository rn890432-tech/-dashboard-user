// Stripe Payment Integration (Stub)
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function createSubscription(userId, creatorId) {
  // TODO: Create Stripe customer, subscription, handle webhook
  // Example: $5/month subscription
  // Return Stripe checkout URL
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: { name: `Subscription to Creator ${creatorId}` },
        unit_amount: 500,
      },
      quantity: 1,
    }],
    mode: 'subscription',
    success_url: 'https://yourapp.com/success',
    cancel_url: 'https://yourapp.com/cancel',
    metadata: { userId, creatorId }
  });
  return session.url;
}

module.exports = { createSubscription };
