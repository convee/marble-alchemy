/* Parent gate for optional support / premium links. It prevents accidental
   child taps while keeping the site compatible with static hosting. */
(function () {
  'use strict';
  function gate(url) {
    var a = Math.floor(Math.random() * 8) + 2;
    var b = Math.floor(Math.random() * 8) + 2;
    var answer = window.prompt('家长确认：请计算 ' + a + ' + ' + b + ' =');
    if (String(answer).trim() === String(a + b)) window.open(url, '_blank', 'noopener');
  }
  window.KidsParentGate = gate;
  document.addEventListener('click', function (event) {
    var link = event.target.closest && event.target.closest('[data-parent-url]');
    if (!link) return;
    var url = link.getAttribute('data-parent-url');
    if (!url) return;
    event.preventDefault(); gate(url);
  });
}());
