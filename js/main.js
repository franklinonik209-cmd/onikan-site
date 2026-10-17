// Onikan Global Solutions LLC: mobile navigation toggle, footer year,
// reveal-on-scroll, and the Books shelf filter. No libraries, no tracking.
(function () {
  document.documentElement.classList.add("js");

  var toggle = document.querySelector(".nav-toggle");
  var nav = document.querySelector(".main-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  var year = document.querySelector("[data-year]");
  if (year) { year.textContent = String(new Date().getFullYear()); }

  // Reveal on scroll. Content is visible by default; the hidden state is
  // only applied by CSS when the js class is present (set above).
  var reveals = document.querySelectorAll(".reveal");
  if (reveals.length) {
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            io.unobserve(entry.target);
          }
        });
      }, { threshold: 0.1 });
      reveals.forEach(function (el) { io.observe(el); });
    } else {
      reveals.forEach(function (el) { el.classList.add("in"); });
    }
  }

  // Books shelf filter: instant, client-side, real catalogue data only.
  var bar = document.querySelector(".filter-bar");
  if (bar) {
    var buttons = bar.querySelectorAll(".fbtn");
    var cards = document.querySelectorAll(".book[data-type]");
    var count = bar.querySelector("[data-fcount]");
    buttons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var f = btn.getAttribute("data-filter");
        buttons.forEach(function (b) {
          b.setAttribute("aria-pressed", b === btn ? "true" : "false");
        });
        var shown = 0;
        cards.forEach(function (card) {
          var match = f === "all" || card.getAttribute("data-type") === f;
          card.hidden = !match;
          if (match) { shown += 1; }
        });
        if (count) {
          count.textContent = "Showing " + shown + " of " + cards.length + " titles";
        }
      });
    });
  }

  // House numbers: count up when they scroll into view. The HTML already
  // carries the final figures, so no-JS and reduced-motion readers see
  // the true numbers with no animation.
  var counters = document.querySelectorAll("[data-count]");
  if (counters.length && "IntersectionObserver" in window &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) { return; }
        var el = entry.target;
        cio.unobserve(el);
        var target = parseInt(el.getAttribute("data-count"), 10);
        var start = null;
        var step = function (ts) {
          if (!start) { start = ts; }
          var p = Math.min((ts - start) / 900, 1);
          el.textContent = String(Math.round(target * (1 - Math.pow(1 - p, 3))));
          if (p < 1) { window.requestAnimationFrame(step); }
        };
        window.requestAnimationFrame(step);
      });
    }, { threshold: 0.4 });
    counters.forEach(function (el) { cio.observe(el); });
  }

  // Page band: on band pages the header floats over the image band and
  // turns solid once the band has scrolled past, so the wordmark stays
  // legible against the page below.
  var band = document.querySelector(".page-band");
  var header = document.querySelector(".site-header");
  if (band && header) {
    var onScroll = function () {
      var past = window.scrollY > band.offsetTop + band.offsetHeight - header.offsetHeight;
      header.classList.toggle("solid", past);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    onScroll();
  }
})();
