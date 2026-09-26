(function () {
  const config = window.CHAOSCHEMY_MONETIZATION || {};
  const stripePaymentLink = typeof config.stripePaymentLink === 'string' ? config.stripePaymentLink : '';
  const paddlePaymentLink = typeof config.paddlePaymentLink === 'string' ? config.paddlePaymentLink : '';
  const paymentLink = [
    [stripePaymentLink, (value) => value.startsWith('https://buy.stripe.com/')],
    [paddlePaymentLink, (value) => value.startsWith('https://pay.paddle.io/checkout/')],
  ].find(([value, isAllowed]) => isAllowed(value))?.[0] || '';
  const adClient = typeof config.adsenseClient === 'string' ? config.adsenseClient : '';
  const adSlot = typeof config.adsenseSlot === 'string' ? config.adsenseSlot : '';

  if (paymentLink) {
    document.querySelectorAll('[data-support-slot]').forEach((slot) => {
      slot.hidden = false;
      slot.innerHTML = `<p><strong>Keep the lab open</strong><br><span>Support the workshop if today’s experiment earned a replay.</span></p><a class="btn support" href="${paymentLink}" data-track="support_click">Support the lab</a>`;
    });
  }

  if (adClient.startsWith('ca-pub-') && adSlot) {
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(adClient)}`;
    script.crossOrigin = 'anonymous';
    document.head.append(script);
    document.querySelectorAll('[data-ad-slot]').forEach((slot) => {
      slot.hidden = false;
      slot.innerHTML = `<ins class="adsbygoogle" style="display:block" data-ad-client="${adClient}" data-ad-slot="${adSlot}" data-ad-format="auto" data-full-width-responsive="true"></ins>`;
      window.adsbygoogle = window.adsbygoogle || [];
      window.adsbygoogle.push({});
    });
  }
})();
