(function(){
  const LS_KEY = 'shoplite_products_v1';

  function readProducts(){
    try { const raw = localStorage.getItem(LS_KEY); const arr = raw ? JSON.parse(raw) : []; return Array.isArray(arr) ? arr : []; } catch { return []; }
  }

  function getQuery(key){
    const params = new URLSearchParams(location.search);
    return params.get(key);
  }

  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  const id = getQuery('id');
  const products = readProducts();
  const product = products.find(p => p.id === id);

  const mainImage = document.getElementById('mainImage');
  const thumbRow = document.getElementById('thumbRow');
  const embedContainer = document.getElementById('embedContainer');
  const pTitle = document.getElementById('pTitle');
  const pPrice = document.getElementById('pPrice');
  const pDesc = document.getElementById('pDesc');
  const buyTop = document.getElementById('buyTop');
  const buyButton = document.getElementById('buyButton');
  const qrModal = document.getElementById('qrModal');
  const qrImageModal = document.getElementById('qrImageModal');
  const qrSubmitBtn = document.getElementById('qrSubmitBtn');

  function fmtPrice(n){
    try { return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(n||0)); }
    catch { return `₹${Number(n||0).toFixed(2)}`; }
  }

  function renderNotFound(){
    const container = document.getElementById('productDetail');
    if (!container) return;
    container.innerHTML = '<div class="card" style="padding:16px"><h2>Product not found</h2><p class="muted">This product may have been removed or the link is invalid.</p><div style="margin-top:10px"><a class="btn" href="./index.html">Back to Home</a></div></div>';
  }

  if (!product){
    renderNotFound();
    return;
  }

  const images = Array.isArray(product.images) && product.images.length ? product.images
    : (product.imageUrl ? [product.imageUrl] : ['./assets/brand-image.svg']);

  // Populate info
  if (pTitle) pTitle.textContent = product.title || '';
  if (pPrice) pPrice.textContent = fmtPrice(product.price);
  if (pDesc) pDesc.textContent = product.description || '';
  function openQrModal(src){
    if (!qrModal || !qrImageModal) return;
    qrImageModal.src = src || './assets/brand-image.svg';
    qrModal.classList.add('show');
    qrModal.setAttribute('aria-hidden','false');
  }
  function closeQrModal(){
    if (!qrModal) return;
    qrModal.classList.remove('show');
    qrModal.setAttribute('aria-hidden','true');
  }

  function handleBuyClick(e){
    e.preventDefault();
    if (product.qrImage) {
      openQrModal(product.qrImage);
    } else {
      alert('No QR code available for this product.');
    }
  }

  if (buyTop) { buyTop.href = '#'; buyTop.addEventListener('click', handleBuyClick); }
  if (buyButton) { buyButton.href = '#'; buyButton.addEventListener('click', handleBuyClick); }

  // Gallery
  const hasEmbed = !!(product && (product.embedCode || '').trim());

  function showImage(src){
    if (!mainImage) return;
    const mainEmbed = document.getElementById('mainEmbed');
    if (mainEmbed) { mainEmbed.style.display = 'none'; mainEmbed.innerHTML = ''; }
    mainImage.style.display = '';
    mainImage.src = src;
    mainImage.alt = product.title || 'Product image';
  }

  function showEmbed(){
    const mainEmbed = document.getElementById('mainEmbed');
    if (!mainEmbed) return;
    // Hide image
    if (mainImage) { mainImage.style.display = 'none'; }
    // Render embed
    const code = (product.embedCode || '').trim();
    mainEmbed.innerHTML = code;
    // Ensure iframe responsive
    const ifr = mainEmbed.querySelector('iframe');
    if (ifr) {
      ifr.setAttribute('width', '100%');
      if (!ifr.getAttribute('height')) ifr.style.height = 'auto';
      ifr.style.border = '0';
    }
    mainEmbed.style.display = '';
    // Hide standalone embed container below thumbs if present
    if (embedContainer) embedContainer.style.display = 'none';
  }

  function renderThumbs(){
    if (!thumbRow) return;
    thumbRow.innerHTML = '';
    // Image thumbs
    images.forEach((src, idx) => {
      const t = document.createElement('button');
      t.type = 'button';
      t.className = 'thumb';
      const im = document.createElement('img');
      im.src = src;
      im.alt = (product.title || 'Product') + ' thumbnail ' + (idx+1);
      t.append(im);
      t.addEventListener('click', () => {
        showImage(src);
        // mark active
        Array.from(thumbRow.children).forEach(el => el.classList.remove('active'));
        t.classList.add('active');
      });
      if (idx === 0) t.classList.add('active');
      thumbRow.append(t);
    });
    // Embed thumb
    if (hasEmbed) {
      const t = document.createElement('button');
      t.type = 'button';
      t.className = 'thumb video-thumb';
      const label = document.createElement('div');
      label.className = 'video-thumb-label';
      label.textContent = 'VIDEO';
      t.append(label);
      t.addEventListener('click', () => {
        showEmbed();
        Array.from(thumbRow.children).forEach(el => el.classList.remove('active'));
        t.classList.add('active');
      });
      thumbRow.append(t);
    }
  }

  // Initial main media: prefer Image 1 URL (second slot) if present, else thumbnail, else embed
  let initialType = 'image';
  let initialSrc = '';
  if (images[1]) {
    initialSrc = images[1];
    showImage(initialSrc);
  } else if (images[0]) {
    initialSrc = images[0];
    showImage(initialSrc);
  } else if (hasEmbed) {
    initialType = 'embed';
    showEmbed();
  }
  renderThumbs();
  // Set the correct active thumbnail based on the initial selection
  if (thumbRow) {
    const children = Array.from(thumbRow.children);
    // Clear any default active set during render
    children.forEach(el => el.classList.remove('active'));
    if (initialType === 'image' && initialSrc) {
      const match = children.find(el => el.querySelector('img')?.src === initialSrc);
      if (match) match.classList.add('active');
    } else if (initialType === 'embed') {
      const vid = children.find(el => el.classList.contains('video-thumb'));
      if (vid) vid.classList.add('active');
    }
  }

  // Keep the old embed container hidden (we now use main embed)
  if (embedContainer) embedContainer.style.display = 'none';

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
    window.location.href = `./upload.html?id=${encodeURIComponent(product.id)}`;
  });
})();
