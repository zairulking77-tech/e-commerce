const API_BASE = '';

let currentFilter = 'All';
let currentModalProduct = null;
let currentModalQty = 1;
let currentUser = null;

function getToken() {
  return localStorage.getItem('kedaikuSession') || '';
}

function setToken(token) {
  localStorage.setItem('kedaikuSession', token);
}

function removeToken() {
  localStorage.removeItem('kedaikuSession');
}

async function apiFetch(endpoint, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

async function fetchProducts() {
  const data = await apiFetch(`/api/products?category=${encodeURIComponent(currentFilter)}`);
  renderProducts(data);
}

function renderProducts(products) {
  const grid = document.getElementById('productGrid');
  grid.innerHTML = products.map(p => `
    <div class="prod-card" onclick="openProductModal(${p.id})">
      <div class="prod-img">
        <img src="${p.image}" alt="${p.name}">
      </div>
      <div class="prod-info">
        ${p.badge === 'sale' ? '<span class="prod-badge badge-sale">Sale</span>' : ''}
        ${p.badge === 'new' ? '<span class="prod-badge badge-new">New</span>' : ''}
        <div class="prod-name">${p.name}</div>
        <div class="prod-desc">${p.desc}</div>
        <div class="prod-bottom">
          <div>
            <div class="prod-price">RM${p.price}</div>
            ${p.oldPrice ? `<div class="prod-price-old">RM${p.oldPrice}</div>` : ''}
          </div>
          <button class="add-btn" onclick="event.stopPropagation(); addToCart(${p.id})">+ Add</button>
        </div>
      </div>
    </div>
  `).join('');
}

function filterCategory(cat) {
  currentFilter = cat;
  fetchProducts();
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.textContent.trim() === cat);
  });
  if (cat !== 'All') {
    document.getElementById('produk').scrollIntoView({ behavior: 'smooth' });
  }
}

async function addToCart(id, qty = 1) {
  try {
    const data = await apiFetch('/api/cart', {
      method: 'POST',
      body: JSON.stringify({ productId: id, qty })
    });
    updateCart(data);
    showToast(data.message || 'Added to cart');
  } catch (error) {
    showToast(error.message);
  }
}

async function removeFromCart(id) {
  try {
    const data = await apiFetch(`/api/cart/${id}`, { method: 'DELETE' });
    updateCart(data);
  } catch (error) {
    showToast(error.message);
  }
}

function updateCart(data) {
  const count = data.count || 0;
  const total = data.total || 0;
  const items = data.items || [];

  document.getElementById('cartCount').textContent = count;
  document.getElementById('cartTotal').textContent = 'RM' + total;
  const itemsEl = document.getElementById('cartItems');
  const footer = document.getElementById('cartFooter');

  if (items.length === 0) {
    itemsEl.innerHTML = '<p class="cart-empty">Your cart is empty. Start shopping!</p>';
    footer.style.display = 'none';
  } else {
    footer.style.display = 'block';
    itemsEl.innerHTML = items.map(c => `
      <div class="cart-item">
        <div>
          <div class="cart-item-name">${c.name} x${c.qty}</div>
          <div class="cart-item-price">RM${c.price * c.qty}</div>
        </div>
        <button class="cart-item-remove" onclick="removeFromCart(${c.id})">
          <i class="ti ti-trash"></i>
        </button>
      </div>
    `).join('');
  }
}

function toggleCart() {
  document.getElementById('cartSidebar').classList.toggle('open');
  document.getElementById('cartOverlay').classList.toggle('open');
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

function openAuthModal(mode = 'login') {
  switchAuthTab(mode);
  document.getElementById('authModalOverlay').classList.add('open');
  document.getElementById('authModal').classList.add('open');
  document.getElementById('authMessage').textContent = '';
  document.getElementById('authMessage').className = 'auth-message';
}

function closeAuthModal() {
  document.getElementById('authModalOverlay').classList.remove('open');
  document.getElementById('authModal').classList.remove('open');
}

function switchAuthTab(tab) {
  document.getElementById('loginTab').classList.toggle('active', tab === 'login');
  document.getElementById('signupTab').classList.toggle('active', tab === 'signup');
  document.getElementById('loginForm').style.display = tab === 'login' ? 'flex' : 'none';
  document.getElementById('signupForm').style.display = tab === 'signup' ? 'flex' : 'none';
  document.getElementById('authMessage').textContent = '';
  document.getElementById('authMessage').className = 'auth-message';
  document.getElementById('authModalTitle').textContent = tab === 'login' ? 'Sign In' : 'Create Account';
  document.getElementById('authModalSubtitle').textContent = tab === 'login' ? 'Welcome back to KedaiKu' : 'Join KedaiKu today';
}

function showAuthMessage(message, type = 'success') {
  const el = document.getElementById('authMessage');
  el.textContent = message;
  el.className = `auth-message ${type}`;
}

async function handleSignup() {
  const name = document.getElementById('signupName').value.trim();
  const email = document.getElementById('signupEmail').value.trim().toLowerCase();
  const password = document.getElementById('signupPassword').value;

  try {
    const data = await apiFetch('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ name, email, password })
    });
    currentUser = data.user;
    setToken(data.sessionId);
    updateAuthUI();
    closeAuthModal();
    showToast(`Welcome ${name}! Your account is ready.`);
    document.getElementById('signupForm').reset();
  } catch (error) {
    showAuthMessage(error.message, 'error');
  }
}

async function handleLogin() {
  const email = document.getElementById('loginEmail').value.trim().toLowerCase();
  const password = document.getElementById('loginPassword').value;

  try {
    const data = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    currentUser = data.user;
    setToken(data.sessionId);
    updateAuthUI();
    closeAuthModal();
    showToast(`Welcome back, ${data.user.name}!`);
    document.getElementById('loginForm').reset();
  } catch (error) {
    showAuthMessage(error.message, 'error');
  }
}

async function logout() {
  try {
    await apiFetch('/api/auth/logout', { method: 'POST' });
  } catch (e) {
  }
  removeToken();
  currentUser = null;
  updateAuthUI();
  closeAuthModal();
  showToast('You have been logged out.');
}

function updateAuthUI() {
  const authBtn = document.getElementById('authBtn');
  const userBadge = document.getElementById('userBadge');
  const userNameText = document.getElementById('userNameText');

  if (currentUser) {
    authBtn.style.display = 'none';
    userBadge.style.display = 'flex';
    userNameText.textContent = currentUser.name || currentUser.email;
  } else {
    authBtn.style.display = 'inline-flex';
    userBadge.style.display = 'none';
  }
}

async function openProductModal(id) {
  try {
    const product = await apiFetch(`/api/products/${id}`);
    if (!product) return;
    currentModalProduct = product;
    currentModalQty = 1;

    document.getElementById('productModalImg').src = product.image;
    document.getElementById('productModalImg').alt = product.name;
    document.getElementById('productModalName').textContent = product.name;
    document.getElementById('productModalCategory').textContent = product.category;
    document.getElementById('productModalDesc').textContent = product.desc;
    document.getElementById('productModalPrice').textContent = `RM${product.price}`;
    document.getElementById('productModalOldPrice').textContent = product.oldPrice ? `RM${product.oldPrice}` : '';
    document.getElementById('productModalSKU').textContent = `SKU: ${product.sku}`;
    document.getElementById('productModalRating').textContent = `Rating: ${product.rating} ★`;
    document.getElementById('productModalStock').textContent = `Stock: ${product.stock} available`;

    const featuresList = document.getElementById('productModalFeatures');
    featuresList.innerHTML = product.features.map(feature => `<li>${feature}</li>`).join('');

    const badgeEl = document.getElementById('productModalBadge');
    badgeEl.textContent = product.badge ? product.badge.toUpperCase() : '';
    badgeEl.style.display = product.badge ? 'inline-block' : 'none';

    document.getElementById('productModalQty').textContent = currentModalQty;
    updateModalButtonText(product, currentModalQty);

    const addBtn = document.getElementById('productModalAddBtn');
    addBtn.onclick = async function() {
      await addToCart(product.id, currentModalQty);
      closeProductModal();
    };
    const buyBtn = document.getElementById('productModalBuyBtn');
    buyBtn.onclick = async function() {
      await addToCart(product.id, currentModalQty);
      closeProductModal();
      const cartOpen = document.getElementById('cartSidebar').classList.contains('open');
      if (!cartOpen) toggleCart();
    };

    document.getElementById('productModalOverlay').classList.add('open');
    document.getElementById('productModal').classList.add('open');
  } catch (error) {
    showToast(error.message);
  }
}

function updateModalButtonText(product, qty) {
  const addBtn = document.getElementById('productModalAddBtn');
  const buyBtn = document.getElementById('productModalBuyBtn');
  addBtn.textContent = `Add ${qty} to Cart`;
  buyBtn.textContent = `Buy ${qty} Now`;
}

function closeProductModal() {
  document.getElementById('productModalOverlay').classList.remove('open');
  document.getElementById('productModal').classList.remove('open');
}

function changeModalQty(delta) {
  if (!currentModalProduct) return;
  currentModalQty = Math.max(1, Math.min(currentModalProduct.stock, currentModalQty + delta));
  document.getElementById('productModalQty').textContent = currentModalQty;
  updateModalButtonText(currentModalProduct, currentModalQty);
}

async function checkout() {
  try {
    const data = await apiFetch('/api/checkout', { method: 'POST' });
    updateCart({ items: [], total: 0, count: 0 });
    closeProductModal();
    if (document.getElementById('cartSidebar').classList.contains('open')) {
      toggleCart();
    }
    showToast(data.message);
  } catch (error) {
    showToast(error.message);
  }
}

async function loadCart() {
  try {
    const data = await apiFetch('/api/cart');
    updateCart(data);
  } catch (e) {
    updateCart({ items: [], total: 0, count: 0 });
  }
}

async function init() {
  const token = getToken();
  if (token) {
    try {
      const data = await apiFetch('/api/auth/me');
      currentUser = data.user;
    } catch (e) {
      removeToken();
    }
  }
  updateAuthUI();
  await fetchProducts();
  await loadCart();
}

init();
