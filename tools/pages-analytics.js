(() => {
  const path = '/parallel-parking-lab/';
  const origin = 'https://ntustray.github.io';
  const measurementId = 'G-RGBJR3XSSC';
  const { search, hash, pathname } = location;
  if (
    location.origin !== origin ||
    pathname !== path ||
    search ||
    hash ||
    navigator.doNotTrack === '1' ||
    ('globalPrivacyControl' in navigator &&
      navigator.globalPrivacyControl === true) ||
    document.getElementById('site-analytics-tag')
  ) {
    return;
  }

  const page = { page_location: origin + path, page_referrer: '' };
  const dataLayer = [];
  Object.assign(window, { dataLayer });
  function gtag(..._parameters) {
    dataLayer.push(arguments);
  }

  gtag('js', new Date());
  gtag('config', measurementId, {
    ...page,
    send_page_view: false,
    cookie_path: path,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
  });
  gtag('event', 'page_view', { ...page, send_to: measurementId });

  const script = document.createElement('script');
  script.id = 'site-analytics-tag';
  script.async = true;
  script.referrerPolicy = 'no-referrer';
  script.src = 'https://www.googletagmanager.com/gtag/js?id=' + measurementId;
  document.head.append(script);
})();
