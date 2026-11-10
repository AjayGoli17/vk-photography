(function () {
  var pin = document.getElementById('custPincode');
  var city = document.getElementById('custCity');
  var state = document.getElementById('custState');
  var phone = document.getElementById('custPhone');
  if (!pin || !city || !state) return;

  // State suggestions (still a normal text field, so validation is unchanged)
  var states = ['Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Andaman and Nicobar Islands','Chandigarh','Dadra and Nagar Haveli and Daman and Diu','Delhi','Jammu and Kashmir','Ladakh','Lakshadweep','Puducherry'];
  var dl = document.createElement('datalist');
  dl.id = 'stateList';
  states.forEach(function (s) { var o = document.createElement('option'); o.value = s; dl.appendChild(o); });
  document.body.appendChild(dl);
  state.setAttribute('list', 'stateList');

  // Small status line under the pincode field
  var hint = document.createElement('p');
  hint.style.cssText = 'font-size:13px;color:#7a7364;margin:2px 0 0;min-height:0;';
  pin.insertAdjacentElement('afterend', hint);

  function setVal(el, v) {
    el.value = v;
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }

  var last = '';
  pin.addEventListener('input', function () {
    var v = pin.value.replace(/\D/g, '').slice(0, 6);
    if (v !== pin.value) pin.value = v;
    if (v.length < 6) { hint.textContent = ''; last = ''; return; }
    if (v === last) return;
    last = v;
    hint.textContent = 'Finding your city and state…';
    fetch('https://api.postalpincode.in/pincode/' + v)
      .then(function (r) { return r.json(); })
      .then(function (d) {
        var ok = d && d[0] && d[0].Status === 'Success' && d[0].PostOffice && d[0].PostOffice[0];
        if (!ok) { hint.textContent = ''; return; }
        var po = d[0].PostOffice[0];
        setVal(city, po.District || po.Block || '');
        setVal(state, po.State || '');
        hint.textContent = 'City and state filled in — please check they are right.';
      })
      .catch(function () { hint.textContent = ''; });
  });

  // Phone: keep digits, spaces, + and - only
  if (phone) phone.addEventListener('input', function () {
    var c = phone.value.replace(/[^\d+\s-]/g, '');
    if (c !== phone.value) phone.value = c;
  });
})();
