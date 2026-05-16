/* ════════════════════════════════════════════════════════════════════════════
   StratLens — script.js
   Globals: toggleBilling(), setLanguage(), joinWaitlist()
   ════════════════════════════════════════════════════════════════════════════ */

/* ── Translations ─────────────────────────────────────────────────────────── */
const T = {
  en: {
    /* Nav */
    'nav.features':    'Features',
    'nav.pricing':     'Pricing',
    'nav.privacy':     'Privacy',
    'nav.terms':       'Terms',
    'nav.joinWaitlist':'Join Waitlist',

    /* Hero */
    'hero.eyebrow':    'Geopolitical Intelligence',
    'hero.headline':   "Know What's Moving the World",
    'hero.subtitle':   'StratLens aggregates public intelligence from 50+ trusted sources across 194+ countries — risk-tiered, AI-distilled, and delivered to your device.',
    'hero.stat1':      'Countries',
    'hero.stat2':      'Trusted Sources',
    'hero.stat3':      'Public Information',
    'hero.stat4':      'Plan Tiers',
    'hero.tagline':    'Start with focused access. Upgrade when your global coverage needs expand.',
    'hero.joinWaitlist':'Join the Waitlist',
    'hero.seePlans':   'See All Plans',

    /* Features */
    'feat.title':      'Built for Intelligence Professionals',
    'feat.subtitle':   'Every feature engineered around speed, clarity, and actionable signal.',
    'feat.f1.title':   '194+ Country Coverage',
    'feat.f1.desc':    'From frontier markets to G7 capitals — every sovereign state tracked, risk-scored, and categorised.',
    'feat.f2.title':   'Real-Time Risk Tiers',
    'feat.f2.desc':    'Critical, High, Medium, Low, and Info tiers updated continuously. Know the severity before you read the brief.',
    'feat.f3.title':   'AI-Distilled Briefs',
    'feat.f3.desc':    'Claude-powered summaries strip noise and surface the signal — key actors, market implications, timeline.',
    'feat.f4.title':   'Region Alerts',
    'feat.f4.desc':    'Set your watched countries and topics. Get notified the moment a relevant event breaks, not hours later.',
    'feat.f5.title':   'Market Signals',
    'feat.f5.desc':    'Live commodity, equity, FX and energy data alongside geopolitical events — context and price in one view.',
    'feat.f6.title':   'Public Sources Only',
    'feat.f6.desc':    '100% open-source intelligence. No classified data, no grey-zone providers — fully compliant by design.',

    /* Pricing */
    'price.title':     'Simple, Transparent Pricing',
    'price.subtitle':  'Coverage scales with your needs. No hidden fees, no lock-in.',
    'price.monthly':   'Monthly',
    'price.annual':    'Annual',
    'price.save20':    'SAVE 20%',
    'price.countries': 'Countries',
    'price.unlimited': 'Unlimited',
    'price.custom':    'Custom',
    'price.perMonth':  '/month',
    'price.perMo':     '/mo',
    'price.billed':    'billed annually (save 20%)',
    'price.saving':    "You're saving 20% with annual billing.",
    'price.most':      'Most Popular',
    'price.global':    'Global Coverage',
    'price.free.name': 'Free',
    'price.ess.name':  'Essential',
    'price.pro.name':  'Professional',
    'price.int.name':  'Intelligence',
    'price.ent.name':  'Enterprise',
    'price.btnFree':   'Get Started Free',
    'price.btnEss':    'Get Essential',
    'price.btnPro':    'Get Professional',
    'price.btnInt':    'Get Intelligence',
    'price.btnEnt':    'Contact Us',
    'price.disclaimer':'StratLens provides public-information summaries for informational purposes only. Not financial, investment, legal, or government advice.',

    /* CTA */
    'cta.title':       'Find Your Coverage Level',
    'cta.subtitle':    'Start free and scale your intelligence footprint as your world expands.',
    'cta.join':        'Join the Waitlist',
    'cta.plans':       'See All Plans',

    /* Footer */
    'foot.tagline':    'Intelligence · Perspective · Advantage',
    'foot.desc':       'Geopolitical intelligence aggregated from public sources across 194+ countries. Risk-tiered, AI-distilled, and designed for professionals who need clarity fast.',
    'foot.product':    'Product',
    'foot.legal':      'Legal',
    'foot.contact':    'Contact',
    'foot.features':   'Features',
    'foot.pricing':    'Pricing',
    'foot.joinList':   'Join Waitlist',
    'foot.privacy':    'Privacy Policy',
    'foot.terms':      'Terms of Service',
    'foot.copyright':  '© 2025 StratLens · stratlens.site',
    'foot.legalLink':  'Privacy',
    'foot.termsLink':  'Terms',
    'foot.support':    'Support',

    /* Waitlist */
    'wl.prompt':       'Enter your email to join the waitlist:',
    'wl.thanks':       "Thanks! You're on the list. We'll be in touch at ",

    /* Legal pages */
    'legal.privacy.h1':       'Privacy Policy',
    'legal.terms.h1':         'Terms of Service',
    'legal.contact.title':    'Privacy Contact',
    'legal.contact.email':    'Email',
    'legal.contact.domain':   'Domain',
    'legal.contact.warning':  '⚠️ Placeholder — email must be configured and tested before launch.',
    'legal.lt.title':         'Legal & Support Contact',
    'legal.lt.legal':         'Legal',
    'legal.lt.support':       'Support',
    'legal.lt.domain':        'Domain',
  },

  ar: {
    'nav.features':    'المميزات',
    'nav.pricing':     'الأسعار',
    'nav.privacy':     'الخصوصية',
    'nav.terms':       'الشروط',
    'nav.joinWaitlist':'انضم لقائمة الانتظار',

    'hero.eyebrow':    'الاستخبارات الجيوسياسية',
    'hero.headline':   'اعرف ما يُحرّك العالم',
    'hero.subtitle':   'تجمع StratLens الاستخبارات العامة من أكثر من 50 مصدراً موثوقاً عبر 194+ دولة — مُصنَّفة بالمخاطر، مُقطَّرة بالذكاء الاصطناعي، تصلك على جهازك.',
    'hero.stat1':      'دولة',
    'hero.stat2':      'مصدراً موثوقاً',
    'hero.stat3':      'معلومات عامة',
    'hero.stat4':      'مستويات خطط',
    'hero.tagline':    'ابدأ بوصول مُركَّز. طوِّر خطتك عند توسُّع احتياجاتك.',
    'hero.joinWaitlist':'انضم لقائمة الانتظار',
    'hero.seePlans':   'عرض جميع الخطط',

    'feat.title':      'مصمَّم لمحترفي الاستخبارات',
    'feat.subtitle':   'كل ميزة مُصمَّمة حول السرعة والوضوح والإشارة القابلة للتنفيذ.',
    'feat.f1.title':   'تغطية 194+ دولة',
    'feat.f1.desc':    'من الأسواق الناشئة إلى عواصم مجموعة السبع — كل دولة ذات سيادة مُتتَّبعة ومُقيَّمة بالمخاطر.',
    'feat.f2.title':   'مستويات مخاطر فورية',
    'feat.f2.desc':    'مستويات حرج وعالي ومتوسط ومنخفض ومعلوماتي تُحدَّث باستمرار. اعرف الخطورة قبل قراءة الإحاطة.',
    'feat.f3.title':   'إحاطات مُقطَّرة بالذكاء الاصطناعي',
    'feat.f3.desc':    'ملخصات مدعومة بـ Claude تُزيل الضوضاء وتكشف الإشارة — الأطراف الرئيسية، التداعيات على السوق، الجدول الزمني.',
    'feat.f4.title':   'تنبيهات المناطق',
    'feat.f4.desc':    'حدِّد دولك وموضوعاتك المراقبة. احصل على إشعار فور وقوع حدث ذي صلة.',
    'feat.f5.title':   'إشارات السوق',
    'feat.f5.desc':    'بيانات السلع والأسهم والعملات والطاقة جنباً إلى جنب مع الأحداث الجيوسياسية.',
    'feat.f6.title':   'مصادر عامة فحسب',
    'feat.f6.desc':    'استخبارات مفتوحة المصدر 100%. لا بيانات سرية، لا مزودين في المنطقة الرمادية.',

    'price.title':     'تسعير بسيط وشفاف',
    'price.subtitle':  'التغطية تتوسع مع احتياجاتك. لا رسوم خفية، لا تقييد.',
    'price.monthly':   'شهري',
    'price.annual':    'سنوي',
    'price.save20':    'وفِّر 20%',
    'price.countries': 'دول',
    'price.unlimited': 'غير محدود',
    'price.custom':    'مخصص',
    'price.perMonth':  '/شهر',
    'price.perMo':     '/ش',
    'price.billed':    'يُفوتر سنوياً (وفِّر 20%)',
    'price.saving':    'أنت توفّر 20% مع الفوترة السنوية.',
    'price.most':      'الأكثر شعبية',
    'price.global':    'تغطية عالمية',
    'price.free.name': 'مجاني',
    'price.ess.name':  'أساسي',
    'price.pro.name':  'احترافي',
    'price.int.name':  'استخباراتي',
    'price.ent.name':  'مؤسسي',
    'price.btnFree':   'ابدأ مجاناً',
    'price.btnEss':    'احصل على الأساسي',
    'price.btnPro':    'احصل على الاحترافي',
    'price.btnInt':    'احصل على الاستخباراتي',
    'price.btnEnt':    'تواصل معنا',
    'price.disclaimer':'تُقدِّم StratLens ملخصات معلومات عامة لأغراض إعلامية فحسب. ليست نصيحة مالية أو استثمارية أو قانونية أو حكومية.',

    'cta.title':       'اختر مستوى التغطية الخاص بك',
    'cta.subtitle':    'ابدأ مجاناً وطوِّر حضورك الاستخباراتي مع توسع عالمك.',
    'cta.join':        'انضم لقائمة الانتظار',
    'cta.plans':       'عرض جميع الخطط',

    'foot.tagline':    'استخبارات · منظور · ميزة',
    'foot.desc':       'استخبارات جيوسياسية مجمَّعة من مصادر عامة عبر 194+ دولة. مُصنَّفة بالمخاطر، مُقطَّرة بالذكاء الاصطناعي.',
    'foot.product':    'المنتج',
    'foot.legal':      'قانوني',
    'foot.contact':    'التواصل',
    'foot.features':   'المميزات',
    'foot.pricing':    'الأسعار',
    'foot.joinList':   'انضم لقائمة الانتظار',
    'foot.privacy':    'سياسة الخصوصية',
    'foot.terms':      'شروط الخدمة',
    'foot.copyright':  '© 2025 StratLens · stratlens.site',
    'foot.legalLink':  'الخصوصية',
    'foot.termsLink':  'الشروط',
    'foot.support':    'الدعم',

    'wl.prompt':       'أدخل بريدك الإلكتروني للانضمام إلى قائمة الانتظار:',
    'wl.thanks':       'شكراً! أنت على القائمة. سنتواصل معك على ',

    'legal.privacy.h1':      'سياسة الخصوصية',
    'legal.terms.h1':        'شروط الخدمة',
    'legal.contact.title':   'جهة اتصال الخصوصية',
    'legal.contact.email':   'البريد الإلكتروني',
    'legal.contact.domain':  'النطاق',
    'legal.contact.warning': '⚠️ عنصر مؤقت — يجب تهيئة البريد الإلكتروني واختباره قبل الإطلاق.',
    'legal.lt.title':        'التواصل القانوني والدعم',
    'legal.lt.legal':        'قانوني',
    'legal.lt.support':      'الدعم',
    'legal.lt.domain':       'النطاق',
  },

  es: {
    'nav.features':    'Características',
    'nav.pricing':     'Precios',
    'nav.privacy':     'Privacidad',
    'nav.terms':       'Términos',
    'nav.joinWaitlist':'Unirse a la lista',

    'hero.eyebrow':    'Inteligencia Geopolítica',
    'hero.headline':   'Entiende lo que mueve al mundo',
    'hero.subtitle':   'StratLens agrega inteligencia pública de más de 50 fuentes confiables en 194+ países — clasificada por riesgo, destilada con IA y entregada a tu dispositivo.',
    'hero.stat1':      'Países',
    'hero.stat2':      'Fuentes confiables',
    'hero.stat3':      'Información pública',
    'hero.stat4':      'Niveles de plan',
    'hero.tagline':    'Comienza con acceso enfocado. Actualiza cuando tus necesidades de cobertura global se expandan.',
    'hero.joinWaitlist':'Unirse a la lista de espera',
    'hero.seePlans':   'Ver todos los planes',

    'feat.title':      'Diseñado para profesionales de inteligencia',
    'feat.subtitle':   'Cada función diseñada en torno a velocidad, claridad y señal accionable.',
    'feat.f1.title':   'Cobertura de 194+ países',
    'feat.f1.desc':    'Desde mercados emergentes hasta capitales del G7 — cada estado soberano rastreado, calificado y categorizado.',
    'feat.f2.title':   'Niveles de riesgo en tiempo real',
    'feat.f2.desc':    'Niveles Crítico, Alto, Medio, Bajo e Informativo actualizados continuamente.',
    'feat.f3.title':   'Informes destilados con IA',
    'feat.f3.desc':    'Resúmenes potenciados por Claude que eliminan el ruido y revelan la señal — actores clave, implicaciones de mercado, cronología.',
    'feat.f4.title':   'Alertas por región',
    'feat.f4.desc':    'Configura tus países y temas de seguimiento. Recibe notificaciones en el momento en que ocurra un evento relevante.',
    'feat.f5.title':   'Señales de mercado',
    'feat.f5.desc':    'Datos en vivo de materias primas, renta variable, divisas y energía junto con eventos geopolíticos.',
    'feat.f6.title':   'Solo fuentes públicas',
    'feat.f6.desc':    'Inteligencia 100% de código abierto. Sin datos clasificados, sin proveedores en zona gris.',

    'price.title':     'Precios simples y transparentes',
    'price.subtitle':  'La cobertura escala con tus necesidades. Sin tarifas ocultas, sin permanencia.',
    'price.monthly':   'Mensual',
    'price.annual':    'Anual',
    'price.save20':    'AHORRA 20%',
    'price.countries': 'Países',
    'price.unlimited': 'Ilimitado',
    'price.custom':    'Personalizado',
    'price.perMonth':  '/mes',
    'price.perMo':     '/mes',
    'price.billed':    'facturado anualmente (ahorra 20%)',
    'price.saving':    'Estás ahorrando 20% con la facturación anual.',
    'price.most':      'Más popular',
    'price.global':    'Cobertura global',
    'price.free.name': 'Gratuito',
    'price.ess.name':  'Esencial',
    'price.pro.name':  'Profesional',
    'price.int.name':  'Inteligencia',
    'price.ent.name':  'Empresarial',
    'price.btnFree':   'Comenzar gratis',
    'price.btnEss':    'Obtener Esencial',
    'price.btnPro':    'Obtener Profesional',
    'price.btnInt':    'Obtener Inteligencia',
    'price.btnEnt':    'Contáctenos',
    'price.disclaimer':'StratLens ofrece resúmenes de información pública con fines informativos únicamente. No es asesoramiento financiero, de inversión, legal ni gubernamental.',

    'cta.title':       'Encuentra tu nivel de cobertura',
    'cta.subtitle':    'Comienza gratis y amplía tu huella de inteligencia a medida que tu mundo se expande.',
    'cta.join':        'Unirse a la lista de espera',
    'cta.plans':       'Ver todos los planes',

    'foot.tagline':    'Inteligencia · Perspectiva · Ventaja',
    'foot.desc':       'Inteligencia geopolítica agregada de fuentes públicas en más de 194 países. Clasificada por riesgo, destilada con IA.',
    'foot.product':    'Producto',
    'foot.legal':      'Legal',
    'foot.contact':    'Contacto',
    'foot.features':   'Características',
    'foot.pricing':    'Precios',
    'foot.joinList':   'Unirse a la lista',
    'foot.privacy':    'Política de privacidad',
    'foot.terms':      'Términos de servicio',
    'foot.copyright':  '© 2025 StratLens · stratlens.site',
    'foot.legalLink':  'Privacidad',
    'foot.termsLink':  'Términos',
    'foot.support':    'Soporte',

    'wl.prompt':       'Introduce tu correo para unirte a la lista de espera:',
    'wl.thanks':       '¡Gracias! Estás en la lista. Nos pondremos en contacto en ',

    'legal.privacy.h1':      'Política de privacidad',
    'legal.terms.h1':        'Términos de servicio',
    'legal.contact.title':   'Contacto de privacidad',
    'legal.contact.email':   'Correo',
    'legal.contact.domain':  'Dominio',
    'legal.contact.warning': '⚠️ Marcador — el correo debe configurarse y probarse antes del lanzamiento.',
    'legal.lt.title':        'Contacto legal y soporte',
    'legal.lt.legal':        'Legal',
    'legal.lt.support':      'Soporte',
    'legal.lt.domain':       'Dominio',
  },
};

/* ── Language state ───────────────────────────────────────────────────────── */
let _currentLang = 'en';

function t(key) {
  return (T[_currentLang] && T[_currentLang][key]) || T['en'][key] || key;
}

function detectBrowserLanguage() {
  const lang = navigator.language?.slice(0, 2).toLowerCase();
  return ['en', 'ar', 'es'].includes(lang) ? lang : 'en';
}

/** Public: switch site language. lang = 'en' | 'ar' | 'es' */
function setLanguage(lang) {
  if (!['en', 'ar', 'es'].includes(lang)) return;
  _currentLang = lang;
  localStorage.setItem('sl_lang', lang);

  // RTL handling
  const isRTL = lang === 'ar';
  document.documentElement.dir  = isRTL ? 'rtl' : 'ltr';
  document.documentElement.lang = lang;
  document.body.classList.toggle('rtl', isRTL);

  // Update active button state
  document.querySelectorAll('.lang-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.lang === lang);
  });

  translatePage();

  // Re-apply billing notes in new language
  if (_billingIsAnnual) {
    document.querySelectorAll('.plan-billing-note').forEach((el) => {
      el.textContent = t('price.billed');
    });
    const gn = document.getElementById('billing-global-note');
    if (gn) gn.textContent = t('price.saving');
    document.querySelectorAll('.price-period').forEach((el) => {
      el.textContent = t('price.perMo');
    });
    const tl = document.getElementById('toggle-annual-label');
    if (tl) {
      const badge = tl.querySelector('.save-badge');
      tl.childNodes[0].textContent = t('price.annual') + ' ';
      if (badge) badge.textContent = t('price.save20');
    }
  } else {
    document.querySelectorAll('.price-period').forEach((el) => {
      el.textContent = t('price.perMonth');
    });
    const ml = document.getElementById('toggle-month-label');
    if (ml) ml.textContent = t('price.monthly');
  }
}

/** Walk all [data-i18n] elements and apply current-language text. */
function translatePage() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key  = el.dataset.i18n;
    const val  = t(key);
    if (val && val !== key) el.textContent = val;
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    const val = t(el.dataset.i18nPlaceholder);
    if (val) el.setAttribute('placeholder', val);
  });
}

/* ── Billing toggle ─────────────────────────────────────────────────────────
   Switches .price-val between data-monthly and data-annual.
────────────────────────────────────────────────────────────────────────────── */
let _billingIsAnnual = false;

function toggleBilling() {
  _billingIsAnnual = !_billingIsAnnual;

  const track       = document.getElementById('billing-track');
  const monthLabel  = document.getElementById('toggle-month-label');
  const annualLabel = document.getElementById('toggle-annual-label');

  if (track) track.classList.toggle('annual', _billingIsAnnual);
  if (monthLabel)  monthLabel.classList.toggle('active', !_billingIsAnnual);
  if (annualLabel) annualLabel.classList.toggle('active',  _billingIsAnnual);

  document.querySelectorAll('.price-val').forEach((el) => {
    const val = _billingIsAnnual ? el.dataset.annual : el.dataset.monthly;
    if (val !== undefined) el.textContent = val;
  });

  document.querySelectorAll('.price-period').forEach((el) => {
    el.textContent = _billingIsAnnual ? t('price.perMo') : t('price.perMonth');
  });

  document.querySelectorAll('.plan-billing-note').forEach((el) => {
    el.textContent = _billingIsAnnual ? t('price.billed') : '';
  });

  const globalNote = document.getElementById('billing-global-note');
  if (globalNote) globalNote.textContent = _billingIsAnnual ? t('price.saving') : '';
}

/* ── Waitlist stub ──────────────────────────────────────────────────────────
   Replace with real form submission before launch.
────────────────────────────────────────────────────────────────────────────── */
function joinWaitlist() {
  const email = prompt(t('wl.prompt'));
  if (email && email.includes('@')) {
    alert(t('wl.thanks') + email);
  }
}

/* ── Init ─────────────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  // Restore saved language or detect from browser
  const saved = localStorage.getItem('sl_lang');
  const lang  = (saved && ['en', 'ar', 'es'].includes(saved)) ? saved : detectBrowserLanguage();
  setLanguage(lang);

  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (e) => {
      const target = document.querySelector(link.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // Set initial billing toggle label state
  const monthLabel = document.getElementById('toggle-month-label');
  if (monthLabel) monthLabel.classList.add('active');
});
