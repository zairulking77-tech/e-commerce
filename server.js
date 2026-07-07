const express = require('express');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(__dirname));

const products = [
  {
    id: 1, name: "Wireless Headphones", desc: "Premium sound quality, 30-hour battery life",
    price: 189, oldPrice: 250, category: "Electronics", badge: "sale",
    color: "#EBF4FD", icon: "ti-headphones", image: "images/pic9.webp",
    sku: "WH-01", rating: 4.8, stock: 24,
    features: ["Bluetooth 5.2", "Noise reduction", "Foldable design"]
  },
  {
    id: 2, name: "Smart Watch", desc: "Health tracking and real-time notifications",
    price: 499, oldPrice: 699, category: "Electronics", badge: "sale",
    color: "#EEEDFE", icon: "ti-watch", image: "images/pic13.webp",
    sku: "SW-02", rating: 4.7, stock: 18,
    features: ["Heart rate monitor", "Sleep tracking", "Water resistant"]
  },
  {
    id: 3, name: "Mini Coffee Machine", desc: "Delicious coffee every morning, compact and lightweight",
    price: 320, oldPrice: null, category: "Kitchen", badge: null,
    color: "#FAEEDA", icon: "ti-coffee", image: "images/pic2.webp",
    sku: "CM-03", rating: 4.6, stock: 12,
    features: ["Fast brewing", "Easy to clean", "Perfect for small kitchens"]
  },
  {
    id: 4, name: "LED Desk Lamp", desc: "Adjustable brightness and energy-saving performance",
    price: 79, oldPrice: null, category: "Home", badge: "new",
    color: "#FBEAF0", icon: "ti-lamp", image: "images/pic3.jpg",
    sku: "DL-04", rating: 4.5, stock: 29,
    features: ["Adjustable color temperature", "USB charging port", "Touch controls"]
  },
  {
    id: 5, name: "Laptop Backpack", desc: "Water-resistant design that fits a 15-inch laptop",
    price: 135, oldPrice: 180, category: "Fashion", badge: "sale",
    color: "#E1F5EE", icon: "ti-backpack", image: "images/pic4.webp",
    sku: "LB-05", rating: 4.7, stock: 31,
    features: ["Laptop sleeve", "Multiple pockets", "Padded shoulder straps"]
  },
  {
    id: 6, name: "Sports Shoes", desc: "Lightweight and comfortable for daily workouts",
    price: 220, oldPrice: null, category: "Sports", badge: "new",
    color: "#EAF3DE", icon: "ti-run", image: "images/pic5.webp",
    sku: "SS-06", rating: 4.6, stock: 16,
    features: ["Breathable mesh", "Cushioned sole", "Secure lace system"]
  },
  {
    id: 7, name: "Indoor Decorative Plant", desc: "Stylish and easy to care for, perfect for home",
    price: 45, oldPrice: null, category: "Home", badge: "new",
    color: "#E1F5EE", icon: "ti-plant", image: "images/pic6.webp",
    sku: "PL-07", rating: 4.4, stock: 42,
    features: ["Low maintenance", "Decorative pot included", "Great air purifier"]
  },
  {
    id: 8, name: "Premium T-Shirt", desc: "100% cotton, available in multiple colors",
    price: 59, oldPrice: 89, category: "Fashion", badge: "sale",
    color: "#FAECE7", icon: "ti-shirt", image: "images/pic7.webp",
    sku: "TS-08", rating: 4.5, stock: 55,
    features: ["Soft fabric", "Regular fit", "Machine washable"]
  },
  {
    id: 9, name: "Dumbbell Set", desc: "Perfect for home workouts",
    price: 180, oldPrice: null, category: "Sports", badge: null,
    color: "#F1EFE8", icon: "ti-barbell", image: "images/pic8.webp",
    sku: "DB-09", rating: 4.6, stock: 20,
    features: ["Durable steel", "Ergonomic grip", "Easy storage"]
  }
];

const users = [];
const sessions = {};
const carts = {};

function generateSessionId() {
  return crypto.randomBytes(32).toString('hex');
}

function findUserByEmail(email) {
  return users.find(u => u.email === email);
}

function getUserBySession(sessionId) {
  const session = sessions[sessionId];
  if (!session) return null;
  const user = users.find(u => u.id === session.userId);
  if (!user) return null;
  if (session.expires < Date.now()) {
    delete sessions[sessionId];
    delete carts[sessionId];
    return null;
  }
  return { id: user.id, name: user.name, email: user.email };
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const sessionId = authHeader.slice(7);
  const user = getUserBySession(sessionId);
  if (!user) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
  req.user = user;
  req.sessionId = sessionId;
  next();
}

app.get('/api/products', (req, res) => {
  const { category } = req.query;
  let filtered = products;
  if (category && category !== 'All') {
    filtered = products.filter(p => p.category === category);
  }
  res.json(filtered);
});

app.get('/api/products/:id', (req, res) => {
  const product = products.find(p => p.id === parseInt(req.params.id));
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }
  res.json(product);
});

app.post('/api/auth/signup', (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password || password.length < 4) {
    return res.status(400).json({ error: 'Please complete the form correctly.' });
  }
  if (findUserByEmail(email)) {
    return res.status(409).json({ error: 'This email is already registered.' });
  }
  const user = { id: Date.now(), name, email, password };
  users.push(user);
  const sessionId = generateSessionId();
  sessions[sessionId] = { userId: user.id, expires: Date.now() + 7 * 24 * 60 * 60 * 1000 };
  carts[sessionId] = [];
  res.status(201).json({ user: { id: user.id, name, email }, sessionId });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = findUserByEmail(email);
  if (!user || user.password !== password) {
    return res.status(401).json({ error: 'Email or password is incorrect.' });
  }
  const sessionId = generateSessionId();
  sessions[sessionId] = { userId: user.id, expires: Date.now() + 7 * 24 * 60 * 60 * 1000 };
  if (!carts[sessionId]) carts[sessionId] = [];
  res.json({ user: { id: user.id, name: user.name, email: user.email }, sessionId });
});

app.post('/api/auth/logout', authMiddleware, (req, res) => {
  delete sessions[req.sessionId];
  delete carts[req.sessionId];
  res.json({ message: 'Logged out' });
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

app.get('/api/cart', authMiddleware, (req, res) => {
  const cart = carts[req.sessionId] || [];
  const total = cart.reduce((sum, c) => sum + c.price * c.qty, 0);
  const count = cart.reduce((sum, c) => sum + c.qty, 0);
  res.json({ items: cart, total, count });
});

app.post('/api/cart', authMiddleware, (req, res) => {
  const { productId, qty = 1 } = req.body;
  const product = products.find(p => p.id === productId);
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }
  const cart = carts[req.sessionId] || [];
  const exist = cart.find(c => c.id === productId);
  const currentQty = exist ? exist.qty : 0;
  const maxQty = product.stock ?? 999;
  const available = Math.max(0, maxQty - currentQty);
  const quantityToAdd = Math.min(qty, available);

  if (quantityToAdd <= 0) {
    return res.status(400).json({ error: `${product.name} stock limit reached.` });
  }

  if (exist) {
    exist.qty += quantityToAdd;
  } else {
    cart.push({ ...product, qty: quantityToAdd });
  }
  carts[req.sessionId] = cart;
  const total = cart.reduce((sum, c) => sum + c.price * c.qty, 0);
  const count = cart.reduce((sum, c) => sum + c.qty, 0);
  res.json({ items: cart, total, count, message: `${product.name} added (${quantityToAdd})` });
});

app.delete('/api/cart/:productId', authMiddleware, (req, res) => {
  const productId = parseInt(req.params.productId);
  carts[req.sessionId] = (carts[req.sessionId] || []).filter(c => c.id !== productId);
  const cart = carts[req.sessionId] || [];
  const total = cart.reduce((sum, c) => sum + c.price * c.qty, 0);
  const count = cart.reduce((sum, c) => sum + c.qty, 0);
  res.json({ items: cart, total, count });
});

app.post('/api/checkout', authMiddleware, (req, res) => {
  const cart = carts[req.sessionId] || [];
  if (cart.length === 0) {
    return res.status(400).json({ error: 'Your cart is empty.' });
  }
  const total = cart.reduce((sum, c) => sum + c.price * c.qty, 0);
  carts[req.sessionId] = [];
  res.json({ message: `Order complete! Total RM${total}. Thank you.`, total });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});
