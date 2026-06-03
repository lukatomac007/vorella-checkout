const Stripe = require("stripe");

const PRICE_MAP = {
  "Stronger With You Intensely": "price_1TeGS6HeJndWAae873rC0ZBn",
  "Le Beau Le Parfum": "price_1TeGY9HeJndWAae849ZMG2uA",
  "Eros Flame": "price_1TeGaIHeJndWAae8JxXvf7RJ",
  "Sauvage Parfum": "price_1TeGcZHeJndWAae8SdKitPLD",
  "Spicebomb Extreme": "price_1TeGquHeJndWAae85f6YoA9Q"
};

module.exports = async function handler(req, res) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(500).send("STRIPE_SECRET_KEY is missing in Vercel.");
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    let cart = [];

    if (req.method === "GET") {
      if (!req.query.cart) {
        return res.status(400).send("Cart is missing.");
      }

      cart = JSON.parse(Buffer.from(req.query.cart, "base64").toString("utf8"));
    } else {
      return res.status(405).send("Method not allowed");
    }

    if (!cart || !Array.isArray(cart) || cart.length === 0) {
      return res.status(400).send("Cart is empty.");
    }

    const line_items = cart.map((item) => {
      const price = PRICE_MAP[item.name];

      if (!price) {
        throw new Error(`Missing Stripe Price ID for: ${item.name}`);
      }

      return {
        price: price,
        quantity: Math.max(1, Math.min(10, Number(item.qty) || 1))
      };
    });

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: line_items,
      billing_address_collection: "required",
      shipping_address_collection: {
        allowed_countries: [
          "SI", "HR", "AT", "DE", "IT", "HU", "FR", "ES", "NL", "BE",
          "PL", "CZ", "SK", "SE", "FI", "DK", "IE", "PT", "RO", "BG",
          "GR", "LT", "LV", "EE", "LU", "MT", "CY"
        ]
      },
      shipping_options: [
        {
          shipping_rate_data: {
            type: "fixed_amount",
            fixed_amount: {
              amount: 399,
              currency: "eur"
            },
            display_name: "Standard Shipping",
            delivery_estimate: {
              minimum: {
                unit: "business_day",
                value: 7
              },
              maximum: {
                unit: "business_day",
                value: 20
              }
            }
          }
        }
      ],
      success_url: "https://vorella.neocities.org/main_page.html?payment=success",
      cancel_url: "https://vorella.neocities.org/main_page.html?payment=cancelled"
    });

    return res.redirect(303, session.url);

  } catch (error) {
    console.error("Stripe checkout error:", error);
    return res.status(500).send("Checkout error: " + error.message);
  }
};
