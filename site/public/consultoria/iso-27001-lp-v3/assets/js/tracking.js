/*
 * Rastreamento da LP ISO 27001 (Google Ads).
 * Mesmos IDs e a mesma ordem do site: Meta PageView, GA4, Google Ads e Clarity.
 * O Lead do Meta sai em LP_TRACK.onLeadSaved, depois do /api/lead confirmar o Supabase.
 * Google Ads e GA4 saem na página /consultoria/iso-27001-obrigado.
 */
(function () {
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { dataLayer.push(arguments); };

  window.TRACKING_CONFIG = {
    client: { name: "Templum", debug: false, shadow: false },
    business: {
      type: "lead-gen-form",
      hasWhatsApp: true, hasForm: true, hasScheduling: false,
      hasEcommerce: false, hasRegistration: false, hasNewsletter: true,
      primaryConversion: "Lead"
    },
    meta: { pixelId: "", capi: false, advancedMatching: false, ctwa: false },
    googleAds: { conversionId: "AW-17896226473", leadLabel: "aPsvCKnw27kcEKn9ytVC", enhancedConversions: true, offlineConversions: false },
    ga4: { measurementId: "G-2BW8QTYLB5", apiSecret: "", engagementTracking: true },
    tiktok: { pixelId: "", eventsApi: false },
    clarity: { projectId: "" },
    server: {
      endpoint: "/api/track",
      sendOnEvents: ["Lead", "PageView", "Contact", "Schedule", "ViewContent", "CompleteRegistration", "Subscribe", "CTAClick", "FormStart"],
      retryOnFail: 3
    },
    capture: {
      firstTouch: true, referrerMapping: true, geo: true,
      journeyMaxTouches: 20, deviceFingerprint: true, ctwaCapture: true,
      leadStorageKey: "__wl_lead"
    },
    engagement: {
      scroll: true, heartbeat: 30, sections: true, sectionVisibleMs: 2000,
      ctaTracking: true, formAnalytics: true, videoTracking: true
    },
    consent: { required: false, defaultGranted: false, cookieName: "trk_consent" },
    helpers: { whatsappNumber: "5519993521270", whatsappMessage: "Olá! Vim pelo site da Templum e quero saber sobre a ISO 27001." },
    integrations: { calendly: false, typeform: false, tally: false },
    crossDomain: { enabled: false, domains: [] }
  };
  window.TRACKING_KIT_VERSION = "1.0.0";

  window.__loadTrackingKit = function () {
    if (window.__trkLoaded) return;
    window.__trkLoaded = true;
    var BASE = "/js/tracking-kit/";
    function load(file, cb) {
      var s = document.createElement("script");
      s.async = false;
      s.src = BASE + file + "?v=20261013b";
      if (cb) s.onload = cb;
      s.onerror = function () { if (typeof window.__gtagFallback === "function") window.__gtagFallback(); };
      document.head.appendChild(s);
    }
    load("01-capture.js", function () {
      load("02-dispatch.js", function () {
        load("03-engagement.js", function () {
          load("trk-helpers.js");
        });
      });
    });
  };

  window.__tplSetAdsUser = function (data) {
    data = data || {};
    var email = String(data.email || "").trim().toLowerCase();
    var digits = String(data.phone || data.telefone || "").replace(/\D/g, "");
    if (digits.indexOf("00") === 0) digits = digits.slice(2);
    if (digits.charAt(0) === "0") digits = digits.replace(/^0+/, "");
    var phone = "";
    if (digits.indexOf("55") === 0 && (digits.length === 12 || digits.length === 13)) phone = "+" + digits;
    else if (digits.length === 10 || digits.length === 11) phone = "+55" + digits;
    if (!email && !phone) return;
    if (typeof window.gtag !== "function") return;
    var user = {};
    if (email) user.email = email;
    if (phone) user.phone_number = phone;
    try { window.gtag("set", "user_data", user); } catch (e) {}
  };

  window.__tplUuid = function () {
    try { return crypto.randomUUID(); }
    catch (e) { return "x" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10); }
  };

  window.fireMetaLead = function (data, contentName, eventId) {
    if (!window.fbq) return;
    data = data || {};
    var email = (data.email || "").trim().toLowerCase().replace(/\s+/g, "");
    var digits = (data.phone || data.telefone || "").replace(/\D/g, "");
    var phone = digits ? (digits.indexOf("55") === 0 ? digits : "55" + digits) : "";
    try {
      ["1265191353683807", "4177249519256900"].forEach(function (id) {
        fbq("init", id, { em: email || undefined, ph: phone || undefined });
      });
      fbq("track", "Lead", { content_name: contentName || "iso-27001" }, { eventID: eventId || window.__tplUuid() });
    } catch (e) {}
  };

  if (!window.fbq) {
    !function (f, b, e, v, n, t, s) {
      if (f.fbq) return;
      n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
      if (!f._fbq) f._fbq = n;
      n.push = n; n.loaded = true; n.version = "2.0"; n.queue = [];
    }(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
    fbq("init", "1265191353683807");
    fbq("init", "4177249519256900");
    fbq("track", "PageView");
  }
  window.__loadMetaPixel = function () {
    if (window.__metaPixelLoaded) return;
    window.__metaPixelLoaded = true;
    var t = document.createElement("script");
    t.async = true;
    t.src = "https://connect.facebook.net/en_US/fbevents.js";
    var s = document.getElementsByTagName("script")[0];
    if (s && s.parentNode) s.parentNode.insertBefore(t, s);
    else (document.head || document.documentElement).appendChild(t);
  };

  if (!window.oaiq) {
    !function (w, d, s, u) {
      if (w.oaiq) return;
      var q = function () { q.q.push(arguments); };
      q.q = [];
      w.oaiq = q;
      var j = d.createElement(s);
      j.async = 1;
      j.src = u;
      var f = d.getElementsByTagName(s)[0];
      f.parentNode.insertBefore(j, f);
    }(window, document, "script", "https://bzrcdn.openai.com/sdk/oaiq.min.js");
    oaiq("init", { pixelId: "YQQb4HvF2y3zkKZNbiuMNT", debug: false });
  }

  (function () {
    var done = false;
    function boot() {
      if (done) return;
      done = true;
      (function (c, l, a, r, i, t, y) {
        c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
        t = l.createElement(r); t.async = 1; t.src = "https://www.clarity.ms/tag/" + i;
        y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
      })(window, document, "clarity", "script", "sr5nwfj8jc");
      var g = document.createElement("script");
      g.async = true;
      g.src = "https://www.googletagmanager.com/gtag/js?id=G-2BW8QTYLB5";
      document.head.appendChild(g);
      gtag("js", new Date());
      gtag("config", "G-FV41GWD427", { send_page_view: false });
      window.__gtagFallback = function () {
        if (window.__gtagFbDone) return;
        window.__gtagFbDone = true;
        gtag("config", "G-2BW8QTYLB5", { send_page_view: false });
        gtag("config", "AW-17896226473");
      };
      if (typeof window.__loadTrackingKit === "function") window.__loadTrackingKit();
      else window.__gtagFallback();
      if (typeof window.__loadMetaPixel === "function") window.__loadMetaPixel();
    }
    window.__tplBootTracking = boot;
    var evs = ["pointerdown", "touchstart", "keydown", "scroll", "mousemove"];
    var opts = { once: true, passive: true, capture: true };
    function once() { evs.forEach(function (e) { window.removeEventListener(e, once, opts); }); boot(); }
    evs.forEach(function (e) { window.addEventListener(e, once, opts); });
    window.addEventListener("load", function () {
      var idle = window.requestIdleCallback || function (cb) { return setTimeout(cb, 6000); };
      idle(function () { setTimeout(boot, 6000); });
    });
  })();

  document.addEventListener("click", function (e) {
    var a = e.target && e.target.closest && e.target.closest("[data-cta]");
    if (!a || typeof window.gtag !== "function") return;
    try { window.gtag("event", a.getAttribute("data-cta"), { page: location.pathname }); } catch (err) {}
  });

  window.LP_TRACK = {
    uuid: window.__tplUuid,
    onLeadSaved: function (data) {
      data = data || {};
      var already = false;
      try { already = sessionStorage.getItem("tpl_lead_sent") === "1"; } catch (e) {}
      if (already) return;
      try {
        sessionStorage.setItem("tpl_lead_sent", "1");
        sessionStorage.setItem("tpl_lead_pending", JSON.stringify({
          email: data.email || "",
          phone: data.phone || "",
          name: data.name || "",
          norma: "ISO 27001",
          event_id: data.eventId || ""
        }));
      } catch (e) {}

      if (typeof window.__tplBootTracking === "function") window.__tplBootTracking();
      if (typeof window.__loadMetaPixel === "function") window.__loadMetaPixel();
      window.fireMetaLead({ email: data.email, phone: data.phone }, "iso-27001", data.eventId);
    }
  };
})();
