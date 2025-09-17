// ShopLite - Simple Product Catalog with Admin CRUD (localStorage)
// Author: Cascade

(function () {
  const LS_KEY = 'shoplite_products_v1';
  const AUTH_KEY = 'shoplite_admin_session_v1';
  const SUBMIT_KEY = 'shoplite_submissions_v1';
  const DEFAULT_ADMIN = { password: 'qw' };

  // Elements
  const tabs = document.querySelectorAll('.tab');
  const catButtons = document.querySelectorAll('.tabs [data-cat]');
  const panels = document.querySelectorAll('.panel');
  // Category filter state
  let currentCategory = null; // null means all
  const yearEl = document.getElementById('year');
  const productGrid = document.getElementById('productGrid');
  const emptyState = document.getElementById('emptyState');
  const searchInput = document.getElementById('searchInput');

  const adminTableBody = document.getElementById('adminTableBody');
  const productForm = document.getElementById('productForm');
  const productIdInput = document.getElementById('productId');
  const thumbUrlInput = document.getElementById('thumbUrl');
  const image1UrlInput = document.getElementById('image1Url');
  const embedCodeInput = document.getElementById('embedCode');
  const titleInput = document.getElementById('title');
  const descriptionInput = document.getElementById('description');
  const priceInput = document.getElementById('price');
  const categorySelect = document.getElementById('category');
  const redirectLinkInput = document.getElementById('redirectLink');
  const qrFileInput = document.getElementById('qrFile');
  const btnReset = document.getElementById('btnReset');
  const btnSeed = document.getElementById('btnSeed');
  const btnClear = document.getElementById('btnClear');

  const btnOpenImage = document.getElementById('btnOpenImage');
  const btnAdminPanel = document.getElementById('btnAdminPanel');
  const menuToggle = document.getElementById('menuToggle');
  const headerActions = document.getElementById('headerActions');
  const adminLoginModal = document.getElementById('adminLoginModal');
  const adminLoginForm = document.getElementById('adminLoginForm');
  const adminPasswordInput = document.getElementById('adminPasswordInput');
  const btnLogout = document.getElementById('btnLogout');

  // QR Modal elements
  const qrModal = document.getElementById('qrModal');
  const qrImageModal = document.getElementById('qrImageModal');
  const qrSubmitBtn = document.getElementById('qrSubmitBtn');
  let currentPayProductId = null;

  // Proofs modal elements
  const proofsModal = document.getElementById('proofsModal');
  const proofsGrid = document.getElementById('proofsGrid');
  const proofsInfo = document.getElementById('proofsInfo');
  const btnDeleteProofs = document.getElementById('btnDeleteProofs');
  const btnDownloadProofsZip = document.getElementById('btnDownloadProofsZip');
  let currentProofsProductId = null;

  // Admin global proofs table elements
  const proofsTableBody = document.getElementById('proofsTableBody');
  const btnProofsClearAll = document.getElementById('btnProofsClearAll');
  const btnProofsDownloadAll = document.getElementById('btnProofsDownloadAll');

  // Utilities
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const fmtPrice = (n) => {
    try { return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(n || 0)); }
    catch { return `₹${Number(n || 0).toFixed(2)}`; }
  };

  function uid() { return Math.random().toString(36).slice(2, 9); }

  function readProducts() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(arr)) return [];
      return arr;
    } catch {
      return [];
    }

  // Proofs modal logic
  function openProofsModal(productId) {
    currentProofsProductId = productId;
    if (!proofsModal || !proofsGrid) return;
    const products = readProducts();
    const product = products.find(p => p.id === productId);
    const subs = readSubmissions().filter(s => s.productId === productId);
    if (proofsInfo) proofsInfo.textContent = product ? `${product.title} • ${subs.length} proof(s)` : `${subs.length} proof(s)`;

    proofsGrid.innerHTML = '';
    if (!subs.length) {
      const empty = document.createElement('div');
      empty.className = 'empty';
      empty.textContent = 'No proofs uploaded yet.';
      proofsGrid.append(empty);
    } else {
      const frag = document.createDocumentFragment();
      subs.forEach((s, i) => {
        const card = document.createElement('article');
        card.className = 'card product-card';
        const img = document.createElement('img');
        img.className = 'product-media';
        img.alt = `Proof ${i+1}`;
        img.src = s.image;
        card.append(img);
        frag.append(card);
      });

  // Admin global proofs table controls
  btnProofsClearAll?.addEventListener('click', () => {
    if (!confirm('Clear ALL payment proofs?')) return;
    writeSubmissions([]);
    renderProofsTable();
    renderAdminTable();
  });
  btnProofsDownloadAll?.addEventListener('click', async () => {
    const subs = readSubmissions();
    if (!subs.length) { alert('No proofs to download.'); return; }
    if (typeof JSZip === 'undefined') { alert('ZIP support not available.'); return; }
    const zip = new JSZip();
    const folder = zip.folder('Payment Proofs');
    subs.forEach((s, i) => {
      const base64 = (s.image || '').split(',')[1] || s.image || '';
      folder.file(`proof_${i+1}.png`, base64, { base64: true });
    });
    const blob = await zip.generateAsync({ type: 'blob' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'Payment Proofs.zip';
    document.body.appendChild(a);
    a.click();
    a.remove();
  });
      proofsGrid.append(frag);
    }
    proofsModal.classList.add('show');
    proofsModal.setAttribute('aria-hidden', 'false');
  }
  function closeProofsModal() {
    if (!proofsModal) return;
    proofsModal.classList.remove('show');
    proofsModal.setAttribute('aria-hidden', 'true');
  }
  proofsModal?.addEventListener('click', (e) => {
    const t = e.target;
    if (t && (t.hasAttribute('data-close') || t.classList.contains('modal-backdrop'))) {
      closeProofsModal();
    }
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeProofsModal(); });
  btnDeleteProofs?.addEventListener('click', () => {
    if (!currentProofsProductId) return;
    if (!confirm('Delete all proofs for this product?')) return;
    const subs = readSubmissions().filter(s => s.productId !== currentProofsProductId);
    writeSubmissions(subs);
    openProofsModal(currentProofsProductId); // refresh
    renderAdminTable();
  });
  btnDownloadProofsZip?.addEventListener('click', async () => {
    if (!currentProofsProductId) return;
    const subs = readSubmissions().filter(s => s.productId === currentProofsProductId);
    if (!subs.length) { alert('No proofs to download.'); return; }
    if (typeof JSZip === 'undefined') { alert('ZIP support not available.'); return; }
    const zip = new JSZip();
    const folder = zip.folder('Upload Payment Proof');
    subs.forEach((s, i) => {
      // Convert dataURL to binary
      const base64 = s.image.split(',')[1] || s.image;
      folder.file(`proof_${i+1}.png`, base64, { base64: true });
    });
    const blob = await zip.generateAsync({ type: 'blob' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'Upload Payment Proof.zip';
    document.body.appendChild(a);
    a.click();
    a.remove();
  });
  }

  function writeProducts(list) {
    localStorage.setItem(LS_KEY, JSON.stringify(list));
  }

  // Submissions ("Upload Payment Proof" virtual folder via localStorage)
  function readSubmissions() {
    try {
      const raw = localStorage.getItem(SUBMIT_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }
  function writeSubmissions(list) {
    localStorage.setItem(SUBMIT_KEY, JSON.stringify(list));
  }

  // Render all proofs in admin table
  function renderProofsTable() {
    if (!proofsTableBody) return;
    const subs = readSubmissions().sort((a,b) => b.createdAt - a.createdAt);
    const products = readProducts();
    proofsTableBody.innerHTML = '';
    if (!subs.length) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 5;
      td.style.color = 'var(--muted)';
      td.textContent = 'No payment proofs yet.';
      tr.append(td);
      proofsTableBody.append(tr);
      return;
    }
    const frag = document.createDocumentFragment();
    subs.forEach((s) => {
      const tr = document.createElement('tr');

      const tdPrev = document.createElement('td');
      const im = document.createElement('img');
      im.src = s.image;
      im.alt = 'Proof';
      tdPrev.append(im);

      const tdProd = document.createElement('td');
      const p = products.find(x => x.id === s.productId);
      tdProd.textContent = p ? (p.title || p.id) : 'Unknown';

      const tdNote = document.createElement('td');
      tdNote.textContent = s.note || '';

      const tdDate = document.createElement('td');
      try {
        const d = new Date(s.createdAt);
        tdDate.textContent = d.toLocaleString();
      } catch { tdDate.textContent = String(s.createdAt); }

      const tdActions = document.createElement('td');
      const del = document.createElement('button');
      del.className = 'btn btn-outline danger small';
      del.textContent = 'Delete';
      del.addEventListener('click', () => {
        if (!confirm('Delete this proof?')) return;
        const rest = readSubmissions().filter(x => x.id !== s.id);
        writeSubmissions(rest);
        renderProofsTable();
        renderAdminTable();
      });
      tdActions.append(del);

      tr.append(tdPrev, tdProd, tdNote, tdDate, tdActions);
      frag.append(tr);
    });
    proofsTableBody.append(frag);
  }

  // Auth helpers
  function isAuthed() {
    try { return sessionStorage.getItem(AUTH_KEY) === '1'; } catch { return false; }
  }
  function setAuthed(val) {
    if (val) sessionStorage.setItem(AUTH_KEY, '1'); else sessionStorage.removeItem(AUTH_KEY);
  }

  function openModal() {
    if (!adminLoginModal) return;
    adminLoginModal.classList.add('show');
    adminLoginModal.setAttribute('aria-hidden', 'false');
    setTimeout(() => adminPasswordInput?.focus(), 0);
  }
  function closeModal() {
    if (!adminLoginModal) return;
    adminLoginModal.classList.remove('show');
    adminLoginModal.setAttribute('aria-hidden', 'true');
    adminLoginForm?.reset();
  }

  // QR Modal helpers
  function openQrModal(src) {
    if (!qrModal || !qrImageModal) return;
    qrImageModal.src = src || './assets/brand-image.svg';
    qrModal.classList.add('show');
    qrModal.setAttribute('aria-hidden', 'false');
  }
  function closeQrModal() {
    if (!qrModal) return;
    qrModal.classList.remove('show');
    qrModal.setAttribute('aria-hidden', 'true');
  }

  function upsertProduct(p) {
    const list = readProducts();
    const idx = list.findIndex((x) => x.id === p.id);
    if (idx >= 0) list[idx] = p; else list.push(p);
    writeProducts(list);
  }

  function deleteProduct(id) {
    const list = readProducts().filter((x) => x.id !== id);
    writeProducts(list);
  }

  function clearAll() { writeProducts([]); }

  // Rendering - User Panel
  function renderProducts(filterText = '') {
    const products = readProducts();
    const q = (filterText || '').trim().toLowerCase();
    let filtered = products;
    // Category filter
    if (currentCategory) {
      filtered = filtered.filter((p) => (p.category || '').toLowerCase() === currentCategory);
    }
    // Text filter
    if (q) {
      filtered = filtered.filter((p) => [p.title, p.description]
        .some((t) => (t || '').toLowerCase().includes(q)));
    }
    // Sort by most recent (createdAt desc)
    filtered.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    productGrid.innerHTML = '';

    if (!filtered.length) {
      emptyState.hidden = false;
      return;
    }
    emptyState.hidden = true;

    const frag = document.createDocumentFragment();

    filtered.forEach((p) => {
      const card = document.createElement('article');
      card.className = 'card product-card';

      const img = document.createElement('img');
      img.className = 'product-media';
      img.alt = p.title || 'Product image';
      img.loading = 'lazy';
      img.src = (Array.isArray(p.images) && p.images[0]) || p.imageUrl || './assets/brand-image.svg';

      const body = document.createElement('div');
      body.className = 'product-body';

      const title = document.createElement('div');
      title.className = 'product-title';
      title.textContent = p.title || '';

      const desc = document.createElement('div');
      desc.className = 'product-desc';
      desc.textContent = p.description || '';

      const footer = document.createElement('div');
      footer.className = 'product-footer';

      const price = document.createElement('div');
      price.className = 'price';
      price.textContent = fmtPrice(p.price);

      const buy = document.createElement('a');
      buy.className = 'btn btn-primary small';
      buy.href = '#';
      buy.target = '_blank';
      buy.rel = 'noopener noreferrer';
      buy.textContent = 'Buy Now';
      // Prevent navigating to details when clicking buy
      buy.addEventListener('click', (ev) => {
        ev.stopPropagation();
        ev.preventDefault();
        if (p.qrImage) {
          currentPayProductId = p.id;
          openQrModal(p.qrImage);
        } else {
          alert('No QR code available for this product.');
        }
      });

      footer.append(price, buy);
      body.append(title, desc, footer);
      card.append(img, body);
      // Navigate to product details on card click
      card.style.cursor = 'pointer';
      card.addEventListener('click', () => {
        window.location.href = `./product.html?id=${encodeURIComponent(p.id)}`;
      });
      frag.append(card);
    });

    productGrid.append(frag);
  }

  // Rendering - Admin Table
  function renderAdminTable() {
    const products = readProducts();
    const subs = readSubmissions();
    adminTableBody.innerHTML = '';

    if (!products.length) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 4;
      td.style.color = 'var(--muted)';
      td.textContent = 'No products yet.';
      tr.append(td);
      adminTableBody.append(tr);
      return;
    }

    const frag = document.createDocumentFragment();

    products.forEach((p) => {
      const tr = document.createElement('tr');

      const tdImg = document.createElement('td');
      const im = document.createElement('img');
      im.src = (Array.isArray(p.images) && p.images[0]) || p.imageUrl || './assets/brand-image.svg';
      im.alt = p.title || 'Product image';
      tdImg.append(im);

      const tdTitle = document.createElement('td');
      tdTitle.textContent = p.title || '';

      const tdPrice = document.createElement('td');
      tdPrice.textContent = fmtPrice(p.price);

      const tdProofs = document.createElement('td');
      const proofsCount = subs.filter(s => s.productId === p.id).length;
      const viewBtn = document.createElement('button');
      viewBtn.className = 'btn small';
      viewBtn.textContent = `View (${proofsCount})`;
      viewBtn.addEventListener('click', () => openProofsModal(p.id));
      tdProofs.append(viewBtn);

      const tdActions = document.createElement('td');
      tdActions.className = 'row-actions';

      const btnEdit = document.createElement('button');
      btnEdit.className = 'btn small';
      btnEdit.textContent = 'Edit';
      btnEdit.addEventListener('click', () => fillFormForEdit(p));

      const btnDelete = document.createElement('button');
      btnDelete.className = 'btn btn-outline danger small';
      btnDelete.textContent = 'Delete';
      btnDelete.addEventListener('click', () => {
        if (confirm('Delete this product?')) {
          deleteProduct(p.id);
          renderAdminTable();
          renderProducts(searchInput.value);
        }
      });

      tdActions.append(btnEdit, btnDelete);
      tr.append(tdImg, tdTitle, tdPrice, tdProofs, tdActions);
      frag.append(tr);
    });

    adminTableBody.append(frag);
  }

  // Form helpers
  function clearForm() {
    productIdInput.value = '';
    if (thumbUrlInput) thumbUrlInput.value = '';
    if (image1UrlInput) image1UrlInput.value = '';
    if (embedCodeInput) embedCodeInput.value = '';
    titleInput.value = '';
    descriptionInput.value = '';
    priceInput.value = '';
    if (categorySelect) categorySelect.value = 'telegram';
    if (redirectLinkInput) redirectLinkInput.value = '';
    document.getElementById('formTitle').textContent = 'Add Product';
  }

  function fillFormForEdit(p) {
    productIdInput.value = p.id;
    const imgs = Array.isArray(p.images) ? p.images : [];
    if (thumbUrlInput) thumbUrlInput.value = imgs[0] || p.imageUrl || '';
    if (image1UrlInput) image1UrlInput.value = imgs[1] || '';
    if (embedCodeInput) embedCodeInput.value = p.embedCode || '';
    titleInput.value = p.title || '';
    descriptionInput.value = p.description || '';
    priceInput.value = p.price || '';
    if (categorySelect) categorySelect.value = p.category || 'telegram';
    if (redirectLinkInput) redirectLinkInput.value = p.redirectLink || '';
    document.getElementById('formTitle').textContent = 'Edit Product';
    // switch to admin panel for convenience
    switchTo('#adminPanel');
  }

  // Tabs
  function switchTo(selector) {
    panels.forEach((p) => p.classList.remove('active'));
    tabs.forEach((t) => t.classList.remove('active'));

    const targetPanel = document.querySelector(selector);
    if (targetPanel) targetPanel.classList.add('active');

    const targetTab = $$(`.tab[data-target='${selector}']`)[0];
    if (targetTab) targetTab.classList.add('active');
  }

  tabs.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      // If this is a category button, handle filtering instead of tab switch
      if (btn.hasAttribute('data-cat')) {
        e.preventDefault();
        setCategory(btn.getAttribute('data-cat'));
        return;
      }
      const target = btn.getAttribute('data-target');
      if (target === '#adminPanel' && !isAuthed()) {
        openModal();
        return;
      }
      if (target) {
        // If Home is clicked, clear category filter so all recent products show
        if (target === '#home') setCategory(null);
        switchTo(target);
      }
    });
  });

  function setCategory(cat) {
    currentCategory = cat || null;
    // Clear active from all tabs (including Home)
    tabs.forEach((t) => t.classList.remove('active'));
    // Update active styles for category buttons
    catButtons.forEach((b) => {
      if (b.getAttribute('data-cat') === cat) b.classList.add('active');
      else b.classList.remove('active');
    });
    renderProducts(searchInput.value);
  }

  // Header buttons
  if (btnOpenImage) {
    btnOpenImage.addEventListener('click', () => {
      const url = './assets/brand-image.svg';
      // Attempt a download first
      const a = document.createElement('a');
      a.href = url;
      a.download = 'promo-image.svg';
      document.body.appendChild(a);
      a.click();
      a.remove();
      // Also open in a new tab for preview
      window.open(url, '_blank');
    });
  }

  // Admin Panel button in header menu
  if (btnAdminPanel) {
    btnAdminPanel.addEventListener('click', (e) => {
      e.preventDefault();
      if (!isAuthed()) {
        openModal();
      } else {
        switchTo('#adminPanel');
      }
      // Close the mobile menu after action
      closeMenu();
    });
  }

  // Mobile menu toggle
  function closeMenu() {
    if (!menuToggle || !headerActions) return;
    headerActions.classList.remove('open');
    menuToggle.setAttribute('aria-expanded', 'false');
  }
  function toggleMenu() {
    if (!menuToggle || !headerActions) return;
    const isOpen = headerActions.classList.toggle('open');
    menuToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  }
  menuToggle?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleMenu();
  });
  document.addEventListener('click', (e) => {
    const t = e.target;
    if (!headerActions?.contains(t) && t !== menuToggle) closeMenu();
  });
  window.addEventListener('resize', () => { if (window.innerWidth > 720) closeMenu(); });

  // Form submit
  productForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = productIdInput.value || uid();
    const images = [
      thumbUrlInput?.value || '',
      image1UrlInput?.value || ''
    ].map(s => String(s).trim()).filter(Boolean);

    // Preserve existing product if editing
    const existing = readProducts().find(x => x.id === id) || {};

    async function readFileAsDataURL(file) {
      if (!file) return null;
      return new Promise((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve(fr.result);
        fr.onerror = reject;
        fr.readAsDataURL(file);
      });
    }

    const qrFile = qrFileInput?.files && qrFileInput.files[0] ? qrFileInput.files[0] : null;
    const qrImage = qrFile ? await readFileAsDataURL(qrFile) : existing.qrImage || null;

    const product = {
      id,
      // Keep legacy imageUrl for backwards compatibility
      imageUrl: images[0] || existing.imageUrl || '',
      images: images.length ? images : (existing.images || []),
      title: titleInput.value.trim(),
      description: descriptionInput.value.trim(),
      price: Number(priceInput.value || 0),
      category: (categorySelect?.value || existing.category || 'telegram'),
      createdAt: existing.createdAt || Date.now(),
      qrImage,
      redirectLink: (redirectLinkInput?.value || '').trim() || existing.redirectLink || '',
      buyLink: existing.buyLink || '', // legacy; not used now
      embedCode: (embedCodeInput?.value || '').trim()
    };

    upsertProduct(product);
    renderAdminTable();
    renderProducts(searchInput.value);
    clearForm();
    if (qrFileInput) qrFileInput.value = '';
  });

  btnReset.addEventListener('click', clearForm);

  // Admin auth events
  adminLoginForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const pw = (adminPasswordInput?.value || '');
    const ok = pw === DEFAULT_ADMIN.password;
    if (!ok) {
      alert('Invalid Password');
      return;
    }
    setAuthed(true);
    closeModal();
    switchTo('#adminPanel');
  });

  adminLoginModal?.addEventListener('click', (e) => {
    const t = e.target;
    if (t && (t.hasAttribute('data-close') || t.classList.contains('modal-backdrop'))) {
      closeModal();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  btnLogout?.addEventListener('click', () => {
    if (!isAuthed()) return;
    setAuthed(false);
    switchTo('#home');
  });

  // QR modal events
  qrModal?.addEventListener('click', (e) => {
    const t = e.target;
    if (t && (t.hasAttribute('data-close') || t.classList.contains('modal-backdrop'))) {
      closeQrModal();
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeQrModal();
  });
  qrSubmitBtn?.addEventListener('click', () => {
    if (currentPayProductId) {
      window.location.href = `./upload.html?id=${encodeURIComponent(currentPayProductId)}`;
    } else {
      alert('No product selected.');
    }
  });

  // Seed sample data
  function sampleProducts() {
    const now = Date.now();
    return [
      {
        id: uid(),
        images: [
          'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?q=80&w=800&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1518441902113-c1d4c7a1bd5e?q=80&w=800&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1518441787923-6b6adf67f1d2?q=80&w=800&auto=format&fit=crop'
        ],
        title: 'Wireless Headphones',
        description: 'Noise-cancelling over-ear headphones with 30h battery life.',
        price: 89.99,
        category: 'video',
        createdAt: now - 1000 * 60 * 60 * 4, // 4 hours ago
        buyLink: 'https://example.com/buy/headphones'
      },
      {
        id: uid(),
        images: [
          'https://images.unsplash.com/photo-1585386959984-a41552231658?q=80&w=800&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1517433456452-f9633a875f6f?q=80&w=800&auto=format&fit=crop'
        ],
        title: 'Smart Watch',
        description: 'Health tracking, notifications, and 7-day battery.',
        price: 129.00,
        category: 'telegram',
        createdAt: now - 1000 * 60 * 60 * 6, // 6 hours ago
        buyLink: 'https://example.com/buy/smartwatch'
      },
      {
        id: uid(),
        images: [
          'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=800&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1526178611549-7fe70bd63e49?q=80&w=800&auto=format&fit=crop'
        ],
        title: 'Bluetooth Speaker',
        description: 'Compact design with rich bass and water resistance.',
        price: 49.50,
        category: 'images',
        createdAt: now - 1000 * 60 * 60 * 12, // 12 hours ago
        buyLink: 'https://example.com/buy/speaker'
      },
      {
        id: uid(),
        images: [
          'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?q=80&w=800&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1520975916090-3105956dac38?q=80&w=800&auto=format&fit=crop'
        ],
        title: 'Backpack',
        description: 'Minimal everyday backpack with padded laptop sleeve.',
        price: 59.99,
        category: 'telegram',
        createdAt: now - 1000 * 60 * 60 * 24, // 1 day ago
        buyLink: 'https://example.com/buy/backpack'
      }
    ];
  }

  btnSeed.addEventListener('click', () => {
    writeProducts(sampleProducts());
    renderAdminTable();
    renderProducts(searchInput.value);
    switchTo('#home');
  });

  // Clear all
  btnClear.addEventListener('click', () => {
    if (confirm('This will remove all products. Continue?')) {
      clearAll();
      renderAdminTable();
      renderProducts(searchInput.value);
    }
  });

  // Search
  searchInput.addEventListener('input', (e) => {
    renderProducts(e.target.value);
  });

  // Init
  yearEl.textContent = new Date().getFullYear();
  // Auto-seed on first load if empty
  if (readProducts().length === 0) {
    writeProducts(sampleProducts());
  }
  renderProducts();
  renderAdminTable();
  renderProofsTable();
})();
