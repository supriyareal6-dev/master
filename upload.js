(function(){
  const LS_KEY = 'shoplite_products_v1';
  const SUBMIT_KEY = 'shoplite_submissions_v1';

  function readProducts(){ try { const raw = localStorage.getItem(LS_KEY); const arr = raw ? JSON.parse(raw) : []; return Array.isArray(arr) ? arr : []; } catch { return []; } }
  function readSubmissions(){ try { const raw = localStorage.getItem(SUBMIT_KEY); const arr = raw ? JSON.parse(raw) : []; return Array.isArray(arr) ? arr : []; } catch { return []; } }
  function writeSubmissions(list){ localStorage.setItem(SUBMIT_KEY, JSON.stringify(list)); }

  const params = new URLSearchParams(location.search);
  const productId = params.get('id');

  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  const products = readProducts();
  const product = products.find(p => p.id === productId);
  const productMeta = document.getElementById('productMeta');
  const viewProductBtn = document.getElementById('viewProductBtn');

  if (productMeta) {
    if (product) {
      const priceINR = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(product.price||0));
      productMeta.textContent = `Submitting for: ${product.title} • ${priceINR}`;
      viewProductBtn.href = `./product.html?id=${encodeURIComponent(product.id)}`;
    } else {
      productMeta.textContent = 'Unknown product';
      viewProductBtn.href = './index.html';
    }
  }

  const uploadForm = document.getElementById('uploadForm');
  const proofFile = document.getElementById('proofFile');
  const previewWrap = document.getElementById('previewWrap');
  const previewImage = document.getElementById('previewImage');
  const noteInput = document.getElementById('noteInput');
  const successState = document.getElementById('successState');
  const countdownEl = document.getElementById('countdown');
  const redirectModal = document.getElementById('redirectModal');
  const redirectCountdownEl = document.getElementById('redirectCountdown');
  const redirectNowBtn = document.getElementById('redirectNowBtn');

  function readFileAsDataURL(file){
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = reject;
      fr.readAsDataURL(file);
    });
  }

  proofFile.addEventListener('change', async () => {
    const file = proofFile.files && proofFile.files[0];
    if (!file) { previewWrap.style.display = 'none'; return; }
    const url = await readFileAsDataURL(file);
    previewImage.src = url;
    previewWrap.style.display = 'block';
  });

  uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const file = proofFile.files && proofFile.files[0];
    if (!file) { alert('Please select an image.'); return; }
    const dataUrl = await readFileAsDataURL(file);

    const submissions = readSubmissions();
    submissions.push({
      id: Math.random().toString(36).slice(2),
      productId: productId || null,
      note: noteInput.value || '',
      image: dataUrl,
      createdAt: Date.now(),
    });
    writeSubmissions(submissions);

    uploadForm.hidden = true;
    successState.hidden = false;

    // Countdown and redirect in popup modal
    let remaining = 3;
    const redirectUrl = (product && product.redirectLink) ? product.redirectLink : (product ? `./product.html?id=${encodeURIComponent(product.id)}` : './index.html');

    function openRedirectModal() {
      if (!redirectModal) return;
      redirectModal.classList.add('show');
      redirectModal.setAttribute('aria-hidden', 'false');
    }
    function closeRedirectModal() {
      if (!redirectModal) return;
      redirectModal.classList.remove('show');
      redirectModal.setAttribute('aria-hidden', 'true');
    }

    // Initialize countdown values in both places (in-page and modal)
    if (countdownEl) countdownEl.textContent = String(remaining);
    if (redirectCountdownEl) redirectCountdownEl.textContent = String(remaining);
    openRedirectModal();

    const timer = setInterval(() => {
      remaining -= 1;
      if (countdownEl) countdownEl.textContent = String(remaining);
      if (redirectCountdownEl) redirectCountdownEl.textContent = String(remaining);
      if (remaining <= 0) {
        clearInterval(timer);
        window.location.href = redirectUrl;
      }
    }, 1000);

    redirectNowBtn?.addEventListener('click', () => {
      window.location.href = redirectUrl;
    });

    redirectModal?.addEventListener('click', (e) => {
      const t = e.target;
      if (t && (t.hasAttribute('data-close') || t.classList.contains('modal-backdrop'))) {
        closeRedirectModal();
      }
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeRedirectModal();
    });
  });
})();
