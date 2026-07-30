/*
  Ahead — payment placeholder page.

  This page never talks to a payment provider. It only displays order
  context passed in by whichever page links here, so it can be dropped in
  before a real gateway exists without any dependency on queue-engine.

  Link to it like:
    payment.html?subtotal=120&pickup=2026-07-30T12:45:00.000Z&token=A-018
  Any parameter can be omitted; sensible placeholders are shown instead.

  There is no platform fee in this version, so the total is simply the
  subtotal. When a real gateway is integrated, this file is the only thing
  that needs to change — the markup and styling in payment.html can stay
  as-is.
*/

const $ = (selector) => document.querySelector(selector);
const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;

function readOrderContext() {
  const params = new URLSearchParams(window.location.search);
  const subtotal = params.has('subtotal') ? Number(params.get('subtotal')) : null;
  const pickup = params.get('pickup');
  const token = params.get('token');
  return { subtotal, pickup, token };
}

function renderSummary({ subtotal, pickup, token }) {
  const hasSubtotal = typeof subtotal === 'number' && !Number.isNaN(subtotal);
  const total = hasSubtotal ? subtotal : null;

  $('#summary-subtotal').textContent = hasSubtotal ? money(subtotal) : '—';
  $('#summary-total').textContent = total !== null ? money(total) : '—';

  let pickupText = '—';
  if (pickup) {
    if (pickup === 'squad') pickupText = 'Calculated at checkout';
    else {
      const d = new Date(pickup);
      pickupText = isNaN(d.getTime()) ? pickup : d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
    }
  }
  $('#summary-pickup').textContent = pickupText;
  
  let tokenText = '—';
  if (token) {
    if (token === 'squad') tokenText = 'Shared in Squad Cart';
    else tokenText = token;
  }
  $('#summary-token').textContent = tokenText;
}

function goBack() {
  const params = new URLSearchParams(window.location.search);
  if (params.has('returnUrl')) {
    window.location.href = params.get('returnUrl');
  } else {
    window.location.href = '../../student-app/index.html';
  }
}

renderSummary(readOrderContext());
$('#continue-button').addEventListener('click', goBack);
