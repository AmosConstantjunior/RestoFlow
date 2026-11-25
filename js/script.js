
/* ============================================================
   1. NAVBAR
   ============================================================ */
const nav = document.getElementById('nav');
const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 12);
onScroll();
window.addEventListener('scroll', onScroll, { passive: true });

/* ============================================================
   2. MENU MOBILE
   ============================================================ */
const burger = document.getElementById('burger');
const mobileMenu = document.getElementById('mobileMenu');

burger.addEventListener('click', () => {
  const open = burger.classList.toggle('open');
  mobileMenu.classList.toggle('open', open);
  burger.setAttribute('aria-expanded', String(open));
});
mobileMenu.querySelectorAll('a, button').forEach(el => {
  el.addEventListener('click', () => {
    burger.classList.remove('open');
    mobileMenu.classList.remove('open');
    burger.setAttribute('aria-expanded', 'false');
  });
});

/* ============================================================
   3. REVEAL AU SCROLL
   ============================================================ */
const revealEls = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });
  revealEls.forEach(el => io.observe(el));
} else {
  revealEls.forEach(el => el.classList.add('in'));
}

/* ============================================================
   4. ONGLETS PRODUIT
   ============================================================ */
const tabs = document.querySelectorAll('.tab');
tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const target = tab.dataset.tab;
    tabs.forEach(t => t.classList.toggle('active', t === tab));
    document.querySelectorAll('.panel').forEach(p => {
      p.classList.toggle('active', p.id === 'panel-' + target);
    });
  });
});

/* ============================================================
   5. FAQ
   ============================================================ */
document.querySelectorAll('.faq').forEach(faq => {
  const q = faq.querySelector('.faq-q');
  const a = faq.querySelector('.faq-a');

  q.addEventListener('click', () => {
    const isOpen = faq.classList.contains('open');
    document.querySelectorAll('.faq.open').forEach(other => {
      if (other !== faq) {
        other.classList.remove('open');
        other.querySelector('.faq-a').style.maxHeight = null;
      }
    });
    faq.classList.toggle('open', !isOpen);
    a.style.maxHeight = !isOpen ? a.scrollHeight + 'px' : null;
  });
});

/* ============================================================
   6. TARIFS : bascule mensuel / annuel
   ============================================================ */
const switchBtn = document.getElementById('billingSwitch');
const lblMonth = document.getElementById('lbl-month');
const lblYear = document.getElementById('lbl-year');

let yearly = false;
switchBtn.addEventListener('click', () => {
  yearly = !yearly;
  switchBtn.classList.toggle('on', yearly);
  lblMonth.classList.toggle('on', !yearly);
  lblYear.classList.toggle('on', yearly);

  document.querySelectorAll('.plan-price .amount[data-month]').forEach(el => {
    el.textContent = yearly ? el.dataset.year : el.dataset.month;
  });
  document.querySelectorAll('.plan .per').forEach(el => {
    el.textContent = yearly ? '/ mois (annuel)' : '/ mois';
  });
});

/* ============================================================
   7. FORMULAIRE CTA → ouvre le parcours avec l'email prérempli
   ============================================================ */
const ctaForm = document.getElementById('ctaForm');
ctaForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const email = ctaForm.querySelector('input').value.trim();
  if (!email) return;
  openOnboarding('pro', email);
});

/* ============================================================
   8. ANNÉE DU FOOTER
   ============================================================ */
document.getElementById('year').textContent = new Date().getFullYear();

/* ============================================================
   9. PARCOURS D'INSCRIPTION (ONBOARDING)
   ============================================================ */
const obEl = document.getElementById('onboarding');
const obClose = document.getElementById('obClose');
const obBack = document.getElementById('obBack');
const obNext = document.getElementById('obNext');
const obStepsEls = document.querySelectorAll('.ob-step');
const obPanes = document.querySelectorAll('.ob-pane');
const obPlansEls = document.querySelectorAll('.ob-plan');
const obSwitch = document.getElementById('obSwitch');

/* --- API FastAPI : remplacer par l'URL Cloud Run déployée --- */
const RESTOFLOW_API_URL = 'https://REMPLACER-PAR-URL-API-FASTAPI';

/* --- Firebase : configuration à renseigner depuis Firebase Console --- */
const firebaseConfig = {
  apiKey: "REMPLACER_PAR_API_KEY",
  authDomain: "REMPLACER_PAR_AUTH_DOMAIN",
  projectId: "REMPLACER_PAR_PROJECT_ID",
  storageBucket: "REMPLACER_PAR_STORAGE_BUCKET",
  messagingSenderId: "REMPLACER_PAR_MESSAGING_SENDER_ID",
  appId: "REMPLACER_PAR_APP_ID"
};

let firebaseReady = false;
let auth = null;
let db = null;
try {
  if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
  auth = firebase.auth();
  db = firebase.firestore();
  firebaseReady = true;
} catch (error) {
  console.error("Firebase n'est pas configuré :", error);
}

const planMeta = {
  essentiel:  { name: 'Essentiel',  month: 29, year: 23 },
  pro:        { name: 'Pro',        month: 59, year: 47 },
  entreprise: { name: 'Entreprise', month: null, year: null }
};

const obState = { step: 1, plan: null, billing: 'monthly' };
let obYearly = false;
let toastTimer;

/* --- Ouverture --- */
function openOnboarding(plan = null, prefillEmail = '') {
  // Synchronise la facturation avec le toggle de la section Tarifs
  obYearly = yearly;
  obState.billing = obYearly ? 'yearly' : 'monthly';
  obSwitch.classList.toggle('on', obYearly);
  document.getElementById('obLblMonth').classList.toggle('on', !obYearly);
  document.getElementById('obLblYear').classList.toggle('on', obYearly);
  document.querySelectorAll('.ob-plan-price .amount').forEach(el => {
    if (el.dataset.month) el.textContent = obYearly ? el.dataset.year : el.dataset.month;
  });

  // Reset des formulaires et de l'état
  obState.step = 1;
  obState.plan = plan;
  document.getElementById('obFormResto').reset();
  document.getElementById('obFormAccount').reset();
  document.querySelectorAll('.ob-field input, .ob-field select').forEach(el => el.classList.remove('err'));
  document.querySelectorAll('.ob-error').forEach(el => el.classList.remove('show'));
  if (prefillEmail) document.getElementById('obEmail').value = prefillEmail;

  obPlansEls.forEach(p => p.classList.toggle('selected', p.dataset.plan === plan));

  obEl.classList.add('open');
  document.body.style.overflow = 'hidden';
  updateObStep();
  obEl.scrollTop = 0;
}

function closeOnboarding() {
  obEl.classList.remove('open');
  document.body.style.overflow = '';
}

/* --- Navigation --- */
function updateObStep() {
  obStepsEls.forEach(el => {
    const n = parseInt(el.dataset.step);
    el.classList.toggle('active', n === obState.step);
    el.classList.toggle('done', n < obState.step);
  });
  obPanes.forEach(p => {
    p.classList.toggle('active', parseInt(p.dataset.pane) === obState.step);
  });
  obBack.style.visibility = obState.step === 1 ? 'hidden' : 'visible';
  obNext.textContent = obState.step === 4 ? 'Terminer' : 'Continuer';
  if (obState.step === 4) buildDownloadSummary();
  obEl.scrollTo({ top: 0, behavior: 'smooth' });
}

async function goNext() {
  if (obState.step === 1 && !obState.plan) {
    const plansEl = document.getElementById('obPlans');
    plansEl.classList.remove('shake');
    void plansEl.offsetWidth;
    plansEl.classList.add('shake');
    return;
  }
  if (obState.step === 2 && !validateRestoForm()) return;
  if (obState.step === 3) {
    if (!validateAccountForm()) return;
    obNext.disabled = true;
    obNext.textContent = 'Création du compte…';
    try {
      const registration = await saveRegistrationToFirebase();
      if (obState.plan !== 'entreprise') {
        const currentUser = auth.currentUser;
        if (!currentUser) throw new Error('Utilisateur Firebase non connecté.');
        const idToken = await currentUser.getIdToken();
        const checkoutResponse = await fetch(`${RESTOFLOW_API_URL}/api/stripe/checkout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
          body: JSON.stringify({ restaurantId: registration.restaurantId, plan: obState.plan, billingCycle: obState.billing })
        });
        const checkout = await checkoutResponse.json();
        if (!checkoutResponse.ok) throw new Error(checkout.detail || 'Impossible de créer la session Stripe.');
        if (!checkout.url) throw new Error('Stripe n’a pas retourné de lien de paiement.');
        window.location.assign(checkout.url);
        return;
      }
      obState.step = 4;
      updateObStep();
    } catch (error) {
      console.error('Erreur inscription Firebase:', error);
      showToast(getRegistrationErrorMessage(error));
    } finally {
      obNext.disabled = false;
      obNext.textContent = 'Continuer';
    }
    return;
  }
  if (obState.step === 4) { closeOnboarding(); return; }
  obState.step++;
  updateObStep();
}

async function saveRegistrationToFirebase() {
  if (!firebaseReady || !auth || !db) {
    throw new Error('Firebase non configuré. Ajoutez les paramètres Firebase.');
  }

  const email = document.getElementById('obEmail').value.trim();
  const password = document.getElementById('obPassword').value;
  const firstName = document.getElementById('obFirstName').value.trim();
  const lastName = document.getElementById('obLastName').value.trim();
  const restaurantName = document.getElementById('obRestoName').value.trim();
  const restaurantType = document.getElementById('obRestoType').value || null;
  const address = document.getElementById('obRestoAddr').value.trim();
  const postalCode = document.getElementById('obRestoZip').value.trim();
  const city = document.getElementById('obRestoCity').value.trim();
  const phone = document.getElementById('obRestoPhone').value.trim();
  const tables = Number(document.getElementById('obRestoTables').value) || null;
  const terminals = Number(document.getElementById('obRestoTerm').value) || null;
  const plan = planMeta[obState.plan];
  const now = new Date();
  const trialEnd = new Date(now);
  trialEnd.setDate(trialEnd.getDate() + 14);

  // Création / récupération du compte Firebase Authentication.
  // Le mot de passe n'est jamais stocké dans Firestore.
  let user;
  try {
    const credential = await auth.createUserWithEmailAndPassword(email, password);
    user = credential.user;
  } catch (error) {
    if (error.code === 'auth/email-already-in-use') {
      // Permet de reprendre une inscription si Auth a réussi mais que Firestore
      // a échoué lors d'une tentative précédente.
      const existing = await auth.signInWithEmailAndPassword(email, password);
      user = existing.user;
    } else {
      throw error;
    }
  }

  const uid = user.uid;
  await user.updateProfile({ displayName: `${firstName} ${lastName}`.trim() });

  const usersRef = db.collection('users').doc(uid);
  const userDoc = await usersRef.get();
  let restaurantId = null;
  let restaurantCode = null;

  // Reprise idempotente : si le restaurant correspondant a déjà été créé,
  // on le réutilise au lieu d'en créer un second lors d'une nouvelle tentative.
  if (userDoc.exists && userDoc.data().current) {
    const existingRid = userDoc.data().current;
    const existingRestaurant = await db.collection('restaurants').doc(existingRid).get();
    if (existingRestaurant.exists && existingRestaurant.data().ownerUid === uid &&
        existingRestaurant.data().name === restaurantName) {
      restaurantId = existingRid;
      restaurantCode = existingRestaurant.data().code || null;
    }
  }

  if (!restaurantId) {
    // Génère un code restaurant et vérifie qu'il n'est pas déjà utilisé.
    async function newRestaurantCode() {
      const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      for (let attempt = 0; attempt < 12; attempt++) {
        let code = '';
        for (let i = 0; i < 6; i++) {
          code += alphabet[Math.floor(Math.random() * alphabet.length)];
        }
        const codeDoc = await db.collection('restaurantCodes').doc(code).get();
        if (!codeDoc.exists) return code;
      }
      throw new Error('restaurant/code-generation-failed');
    }

    restaurantCode = await newRestaurantCode();
    const restaurantRef = db.collection('restaurants').doc();
    restaurantId = restaurantRef.id;
    const codeRef = db.collection('restaurantCodes').doc(restaurantCode);
    const memberRef = restaurantRef.collection('members').doc(uid);
    const userRestaurantRef = usersRef.collection('restaurants').doc(restaurantId);
    const registrationRef = db.collection('registrations').doc(uid);
    const batch = db.batch();

    // Même structure principale que l'application Flutter :
    // restaurants/{rid}, restaurantCodes/{code}, members/{uid},
    // users/{uid}.current et users/{uid}/restaurants/{rid}.
    batch.set(restaurantRef, {
      name: restaurantName,
      ownerUid: uid,
      code: restaurantCode,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      // Informations complémentaires venant du formulaire web.
      restaurantType,
      address,
      postalCode,
      city,
      phone,
      tables,
      terminals,
      plan: obState.plan,
      planName: plan.name,
      billingCycle: obState.billing,
      monthlyPrice: obYearly ? plan.year : plan.month,
      status: 'pending',
      trialStart: firebase.firestore.Timestamp.fromDate(now),
      trialEnd: firebase.firestore.Timestamp.fromDate(trialEnd),
      setupStatus: 'pending'
    });
    batch.set(codeRef, { rid: restaurantId, name: restaurantName });
    batch.set(memberRef, { role: 'admin', email });
    batch.set(usersRef, { current: restaurantId }, { merge: true });
    batch.set(userRestaurantRef, { name: restaurantName, code: restaurantCode });

    const registration = {
      uid,
      restaurantId,
      restaurantCode,
      firstName,
      lastName,
      email,
      restaurantName,
      restaurantType,
      address,
      postalCode,
      city,
      phone,
      tables,
      terminals,
      plan: obState.plan,
      planName: plan.name,
      billingCycle: obState.billing,
      monthlyPrice: obYearly ? plan.year : plan.month,
      status: 'pending',
      trialStart: firebase.firestore.Timestamp.fromDate(now),
      trialEnd: firebase.firestore.Timestamp.fromDate(trialEnd),
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      source: 'restoflow_website',
      termsAccepted: document.getElementById('obCgu').checked
    };
    batch.set(registrationRef, registration);
    await batch.commit();
  } else {
    // Le restaurant existe déjà : complète/actualise les documents de liaison
    // et la fiche d'inscription sans recréer le restaurant ni son code.
    const batch = db.batch();
    batch.set(db.collection('restaurantCodes').doc(restaurantCode), {
      rid: restaurantId,
      name: restaurantName
    }, { merge: true });
    batch.set(db.collection('restaurants').doc(restaurantId).collection('members').doc(uid), {
      role: 'admin', email
    }, { merge: true });
    batch.set(usersRef, { current: restaurantId }, { merge: true });
    batch.set(usersRef.collection('restaurants').doc(restaurantId), {
      name: restaurantName,
      code: restaurantCode
    }, { merge: true });
    batch.set(db.collection('registrations').doc(uid), {
      uid,
      restaurantId,
      restaurantCode,
      firstName,
      lastName,
      email,
      restaurantName,
      restaurantType,
      address,
      postalCode,
      city,
      phone,
      tables,
      terminals,
      plan: obState.plan,
      planName: plan.name,
      billingCycle: obState.billing,
      monthlyPrice: obYearly ? plan.year : plan.month,
      status: 'pending',
      trialStart: firebase.firestore.Timestamp.fromDate(now),
      trialEnd: firebase.firestore.Timestamp.fromDate(trialEnd),
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      source: 'restoflow_website',
      termsAccepted: document.getElementById('obCgu').checked
    }, { merge: true });
    await batch.commit();
  }

  // Le formulaire web ne dispose pas encore du même configurateur RoomSpec
  // que Flutter. Le nombre de tables est enregistré, et la configuration
  // physique des salles/tables pourra être finalisée depuis l'application.
  window.restoFlowRegistration = {
    uid,
    restaurantId,
    restaurantCode,
    email,
    restaurantName,
    planName: plan.name
  };
  return window.restoFlowRegistration;
}

function getRegistrationErrorMessage(error) {
  const code = error?.code || '';
  if (code === 'auth/email-already-in-use') return 'Cette adresse email possède déjà un compte. Connectez-vous ou utilisez une autre adresse.';
  if (code === 'auth/weak-password') return 'Le mot de passe est trop faible.';
  if (code === 'auth/invalid-email') return 'Adresse email invalide.';
  if (code === 'permission-denied' || code === 'firestore/permission-denied') return 'Firebase refuse l’enregistrement. Vérifiez les règles Firestore.';
  if (!firebaseReady) return 'Firebase n’est pas encore configuré. Renseignez la configuration Firebase dans le code.';
  return 'Inscription impossible pour le moment. Vérifiez votre connexion puis réessayez.';
}

function goBack() {
  if (obState.step > 1) {
    obState.step--;
    updateObStep();
  }
}

/* --- Validation --- */
function validateRestoForm() {
  const form = document.getElementById('obFormResto');
  let ok = true;
  form.querySelectorAll('[required]').forEach(el => {
    const empty = !el.value.trim();
    el.classList.toggle('err', empty);
    if (empty) ok = false;
  });
  return ok;
}

function validateAccountForm() {
  const form = document.getElementById('obFormAccount');
  let ok = true;

  form.querySelectorAll('[required]').forEach(el => {
    if (el.type === 'checkbox') {
      const err = document.getElementById('obCguErr');
      if (!el.checked) { err.classList.add('show'); ok = false; }
      else err.classList.remove('show');
      return;
    }
    const empty = !el.value.trim();
    el.classList.toggle('err', empty);
    if (empty) ok = false;
  });

  const email = document.getElementById('obEmail');
  if (email.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
    email.classList.add('err');
    ok = false;
  }

  const pwd = document.getElementById('obPassword');
  const pwd2 = document.getElementById('obPassword2');
  const passErr = document.getElementById('obPassErr');

  if (pwd.value && pwd.value.length < 8) {
    pwd.classList.add('err');
    ok = false;
  }
  if (pwd.value !== pwd2.value) {
    pwd2.classList.add('err');
    passErr.classList.add('show');
    ok = false;
  } else {
    pwd2.classList.remove('err');
    passErr.classList.remove('show');
  }

  return ok;
}

/* --- Récapitulatif étape 4 --- */
function buildDownloadSummary() {
  const resto = document.getElementById('obRestoName').value.trim() || 'Votre restaurant';
  const email = document.getElementById('obEmail').value.trim() || '—';
  const plan = planMeta[obState.plan] || planMeta.pro;
  const price = obYearly ? plan.year : plan.month;
  const priceStr = price ? price + ' € / mois' : 'Sur devis';
  const planLabel = plan.name + ' · ' + (obYearly ? 'annuel' : 'mensuel');

  document.getElementById('obEmailOut').textContent = email;

  const summary = document.getElementById('obSummary');
  summary.innerHTML = '';

  [
    ['Formule', planLabel],
    ['Restaurant', resto],
    ['Compte', email],
    ['Tarif', priceStr]
  ].forEach(([label, value]) => {
    const row = document.createElement('div');
    row.className = 'ob-summary-row';
    const l = document.createElement('span');
    l.textContent = label;
    const v = document.createElement('strong');
    v.textContent = value;
    row.append(l, v);
    summary.appendChild(row);
  });
}

/* --- Écouteurs du parcours --- */
obClose.addEventListener('click', closeOnboarding);
obBack.addEventListener('click', goBack);
obNext.addEventListener('click', goNext);

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && obEl.classList.contains('open')) closeOnboarding();
});

obPlansEls.forEach(p => {
  p.addEventListener('click', () => {
    obState.plan = p.dataset.plan;
    obPlansEls.forEach(o => o.classList.toggle('selected', o === p));
  });
});

obSwitch.addEventListener('click', () => {
  obYearly = !obYearly;
  obState.billing = obYearly ? 'yearly' : 'monthly';
  obSwitch.classList.toggle('on', obYearly);
  document.getElementById('obLblMonth').classList.toggle('on', !obYearly);
  document.getElementById('obLblYear').classList.toggle('on', obYearly);
  document.querySelectorAll('.ob-plan-price .amount').forEach(el => {
    if (el.dataset.month) el.textContent = obYearly ? el.dataset.year : el.dataset.month;
  });
});

/* Effacement des erreurs à la saisie */
document.querySelectorAll('.ob-field input, .ob-field select').forEach(el => {
  el.addEventListener('input', () => el.classList.remove('err'));
  el.addEventListener('change', () => el.classList.remove('err'));
});

/* Déclencheurs d'ouverture (boutons du site) */
document.querySelectorAll('[data-open-plan]').forEach(btn => {
  btn.addEventListener('click', e => {
    e.preventDefault();
    openOnboarding(btn.dataset.openPlan);
  });
});

/* Boutons de téléchargement */
document.querySelectorAll('.dl-btn').forEach(btn => {
  btn.addEventListener('click', e => {
    e.preventDefault();
    const labels = { android: 'Android', ios: 'iOS', desktop: 'ordinateur', web: 'navigateur' };
    showToast('Téléchargement de RestoFlow pour ' + (labels[btn.dataset.dl] || 'votre appareil') + '…');
  });
});

/* Toast */
function showToast(msg) {
  let t = document.getElementById('rfToast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'rfToast';
    t.className = 'rf-toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  requestAnimationFrame(() => t.classList.add('show'));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
}
