/* Sends contact / quotation enquiries to the server and tells the page honestly whether it worked.
   Gets a signed form token when the page loads, waits for it if needed, retries once, and never
   hangs. Exposes window.VKLead.send(payload) -> { ok: true|false } and window.VKLead.prefetch(). */
(function () {
  var tokenPromise = null;

  function getToken(force) {
    if (!tokenPromise || force) {
      tokenPromise = fetch('/.netlify/functions/form-token', { cache: 'no-store' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (d) { return (d && d.token) || ''; })
        .catch(function () { return ''; });
    }
    return tokenPromise;
  }

  function postOnce(payload, token) {
    var ctrl = new AbortController();
    var timer = setTimeout(function () { ctrl.abort(); }, 10000);
    return fetch('/.netlify/functions/save-lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.assign({}, payload, { formToken: token })),
      signal: ctrl.signal
    }).then(function (res) { clearTimeout(timer); return res; },
            function (err) { clearTimeout(timer); throw err; });
  }

  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  async function send(payload) {
    for (var attempt = 0; attempt < 2; attempt++) {
      var token = await getToken(attempt > 0);
      try {
        var res = await postOnce(payload, token);
        if (res.ok) return { ok: true };
        if (res.status === 429) return { ok: false, reason: 'rate' };
      } catch (e) { /* network problem: fall through to the retry */ }
      if (attempt === 0) await wait(3500);
    }
    return { ok: false };
  }

  window.VKLead = { send: send, prefetch: getToken };
  getToken();
})();
