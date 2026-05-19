(function() {
  'use strict';

  var SDK_VERSION = '1.0.0';
  var COLLECT_INTERVAL = 5000;
  var MAX_BATCH = 20;

  // 从 script 标签读取配置
  var scriptTag = document.currentScript || (function() {
    var scripts = document.getElementsByTagName('script');
    for (var i = 0; i < scripts.length; i++) {
      if (scripts[i].src && scripts[i].src.indexOf('tracker.js') !== -1) return scripts[i];
    }
    return null;
  })();

  function resolveApiUrl() {
    if (scriptTag && scriptTag.getAttribute('data-api-url')) {
      return scriptTag.getAttribute('data-api-url');
    }
    if (scriptTag && scriptTag.src) {
      return new URL('/api/collect', scriptTag.src).toString();
    }
    return '/api/collect';
  }

  var API_URL = resolveApiUrl();
  var SITE_ID = (scriptTag && scriptTag.getAttribute('data-site-id')) || '';

  if (!SITE_ID) {
    console.warn('[Monitor] data-site-id is missing');
    return;
  }

  // --- 工具函数 ---
  function uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }

  function getVisitorId() {
    var key = '_mon_vid';
    var id = sessionStorage.getItem(key);
    if (!id) {
      id = uuid();
      sessionStorage.setItem(key, id);
    }
    return id;
  }

  function detectDevice() {
    var ua = navigator.userAgent;
    if (/tablet|ipad|playbook|silk/i.test(ua)) return 'tablet';
    if (/mobile|iphone|ipod|android.*mobile|windows phone|opera mini|blackberry/i.test(ua)) return 'mobile';
    return 'desktop';
  }

  function detectOS() {
    var ua = navigator.userAgent;
    if (/windows/i.test(ua)) return 'Windows';
    if (/macintosh|mac os x/i.test(ua)) return 'macOS';
    if (/linux/i.test(ua)) return 'Linux';
    if (/android/i.test(ua)) return 'Android';
    if (/iphone|ipad|ipod/i.test(ua)) return 'iOS';
    return '';
  }

  function detectBrowser() {
    var ua = navigator.userAgent;
    if (/edg\//i.test(ua)) return 'Edge';
    if (/chrome/i.test(ua)) return 'Chrome';
    if (/firefox/i.test(ua)) return 'Firefox';
    if (/safari/i.test(ua)) return 'Safari';
    return '';
  }

  function getReferrer() {
    return document.referrer || '';
  }

  function getScreen() {
    return (window.screen.width || 0) + 'x' + (window.screen.height || 0);
  }

  // --- 滚动深度 & 停留时间 ---
  var maxScrollDepth = 0;
  var pageLoadTime = Date.now();
  var hasScrolled = false;

  function updateScrollDepth() {
    var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    var docHeight = Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight,
      1
    );
    var winHeight = window.innerHeight || document.documentElement.clientHeight;
    var depth = Math.round(((scrollTop + winHeight) / docHeight) * 100);
    if (depth > maxScrollDepth) maxScrollDepth = depth;
    hasScrolled = true;
  }

  window.addEventListener('scroll', updateScrollDepth, { passive: true });

  // --- 请求拦截 ---
  var pendingEvents = [];

  function addRequestEvent(evt) {
    pendingEvents.push(evt);
    if (pendingEvents.length >= MAX_BATCH) flush();
  }

  // 拦截 fetch
  if (window.fetch) {
    var originalFetch = window.fetch;
    window.fetch = function() {
      var url = '';
      var method = 'GET';
      try {
        if (typeof arguments[0] === 'string') {
          url = arguments[0];
        } else if (arguments[0] && arguments[0].url) {
          url = arguments[0].url;
        }
        if (arguments[1] && arguments[1].method) {
          method = arguments[1].method.toUpperCase();
        }
      } catch(e) {}
      var startTime = Date.now();
      return originalFetch.apply(this, arguments).then(function(response) {
        addRequestEvent({
          url: url,
          method: method,
          status: response.status,
          duration: Date.now() - startTime,
          type: 'fetch'
        });
        return response;
      }).catch(function(err) {
        addRequestEvent({
          url: url,
          method: method,
          status: 0,
          duration: Date.now() - startTime,
          type: 'fetch'
        });
        throw err;
      });
    };
  }

  // 拦截 XMLHttpRequest
  if (window.XMLHttpRequest) {
    var origOpen = XMLHttpRequest.prototype.open;
    var origSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function(method, url) {
      this._mon_url = url;
      this._mon_method = method;
      this._mon_start = Date.now();
      return origOpen.apply(this, arguments);
    };
    XMLHttpRequest.prototype.send = function() {
      var xhr = this;
      xhr.addEventListener('load', function() {
        addRequestEvent({
          url: xhr._mon_url || '',
          method: xhr._mon_method || 'GET',
          status: xhr.status,
          duration: Date.now() - (xhr._mon_start || Date.now()),
          type: 'xhr'
        });
      });
      return origSend.apply(this, arguments);
    };
  }

  // --- Performance API 资源加载 ---
  function collectPerformanceEntries() {
    if (!window.performance || !performance.getEntriesByType) return;
    var entries = performance.getEntriesByType('resource');
    for (var i = 0; i < entries.length; i++) {
      var e = entries[i];
      if (e.initiatorType === 'xmlhttprequest' || e.initiatorType === 'fetch') continue;
      addRequestEvent({
        url: e.name,
        method: '',
        status: 0,
        duration: Math.round(e.duration),
        type: 'resource'
      });
    }
  }

  // --- 上报 ---
  var flushTimer = null;
  var pageViewSent = false;

  function flush(forcePageView) {
    var hasEvents = pendingEvents.length > 0;
    if (!hasEvents && pageViewSent) return;

    var payload = {
      site_id: SITE_ID,
      ts: Math.floor(Date.now() / 1000),
      page_url: location.pathname + location.search,
      ref: getReferrer(),
      ua: navigator.userAgent,
      visitor: {
        id: getVisitorId(),
        screen: getScreen(),
        device: detectDevice(),
        os: detectOS(),
        browser: detectBrowser(),
        language: navigator.language || '',
        scroll_depth: maxScrollDepth,
        stay_time: Date.now() - pageLoadTime
      },
      events: pendingEvents.splice(0, MAX_BATCH)
    };

    pageViewSent = true;

    try {
      var body = JSON.stringify(payload);
      if (navigator.sendBeacon) {
        var blob = new Blob([body], { type: 'application/json' });
        navigator.sendBeacon(API_URL, blob);
      } else {
        var xhr = new XMLHttpRequest();
        xhr.open('POST', API_URL, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.send(body);
      }
    } catch(e) {}
  }

  function startFlushTimer() {
    if (flushTimer) return;
    flushTimer = setInterval(flush, COLLECT_INTERVAL);
  }

  // 页面离开时上报
  window.addEventListener('beforeunload', flush);
  document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'hidden') flush();
  });

  // --- 初始化 ---
  function init() {
    collectPerformanceEntries();
    startFlushTimer();
    // 首次上报页面访问
    flush();
  }

  if (document.readyState === 'complete') {
    init();
  } else {
    window.addEventListener('load', init);
  }
})();
