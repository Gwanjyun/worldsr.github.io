  // ---------- Tabs (tables + gallery share the same behavior) ----------
  document.querySelectorAll('.tabs').forEach(function (group) {
    // Scope the panel lookup to the whole section container instead of the
    // DOM node right after the tab bar: the first gallery panel sits directly
    // after its tab bar, which made nextElementSibling-based lookup miss it.
    var scope = group.closest('.container') || group.parentElement;
    var panels = scope.querySelectorAll('.tab-panel');
    var buttons = group.querySelectorAll('.tab-btn');
    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        buttons.forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        var target = btn.getAttribute('data-tab');
        panels.forEach(function (p) {
          p.classList.toggle('active', p.id === target);
        });
      });
    });
  });

  // ---------- Gallery carousel (prev / next within a dataset) ----------
  document.querySelectorAll('.carousel').forEach(function (car) {
    var items = car.querySelectorAll('.gallery-item');
    var counter = car.parentElement.querySelector('.car-counter');
    var idx = 0;
    var show = function (i) {
      idx = (i + items.length) % items.length; // wrap around
      items.forEach(function (it, j) { it.classList.toggle('active', j === idx); });
      if (counter) counter.innerHTML = 'Case <b>' + (idx + 1) + '</b> / ' + items.length;
    };
    car.querySelector('.prev').addEventListener('click', function () { show(idx - 1); });
    car.querySelector('.next').addEventListener('click', function () { show(idx + 1); });
  });

  // ---------- Before / After comparison sliders (divider + zoom & pan) ----------
  document.querySelectorAll('.ba-slider').forEach(function (s) {
    var after = s.querySelector('.ba-after');
    var before = s.querySelector('.ba-before');
    var st = { z: 1, tx: 0, ty: 0 };   // zoom & pan state (synced across layers)
    var mode = null;                   // 'divider' | 'pan'
    var last = { x: 0, y: 0 };

    function clampPan() {
      var mx = s.clientWidth * (st.z - 1) / 2;
      var my = s.clientHeight * (st.z - 1) / 2;
      st.tx = Math.max(-mx, Math.min(mx, st.tx));
      st.ty = Math.max(-my, Math.min(my, st.ty));
    }

    function render() {
      clampPan();
      var t = 'translate(' + st.tx + 'px,' + st.ty + 'px) scale(' + st.z + ')';
      after.style.transform = t;
      before.style.transform = t;
      s.classList.toggle('zoomed', st.z > 1.01);
    }

    // zoom keeping the point under (mx,my) fixed (origin: center)
    function zoomAt(mx, my, factor) {
      var k = Math.min(10, Math.max(1, st.z * factor));
      if (k === st.z) return;
      var r = s.getBoundingClientRect();
      var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      var px = (mx - cx - st.tx) / st.z;
      var py = (my - cy - st.ty) / st.z;
      st.tx = mx - (cx - st.tx) - k * px;
      st.ty = my - (cy - st.ty) - k * py;
      st.z = k;
      if (k === 1) { st.tx = 0; st.ty = 0; }
      render();
    }

    function setDiv(clientX) {
      var r = s.getBoundingClientRect();
      var pct = ((clientX - r.left) / r.width) * 100;
      pct = Math.min(100, Math.max(0, pct));
      s.style.setProperty('--pos', pct + '%');
    }

    // wheel: zoom anchored at the cursor
    s.addEventListener('wheel', function (e) {
      e.preventDefault();
      zoomAt(e.clientX, e.clientY, e.deltaY < 0 ? 1.15 : 1 / 1.15);
    }, { passive: false });

    s.addEventListener('pointerdown', function (e) {
      if (e.target.closest('.ba-grip')) {
        mode = 'divider';            // dragging the round grip moves the wipe line
      } else if (st.z > 1.01) {
        mode = 'pan';                // zoomed: dragging pans both layers in sync
        s.classList.add('panning');
        last.x = e.clientX;
        last.y = e.clientY;
      } else {
        mode = 'divider';            // at 1x: dragging anywhere wipes the divider
      }
      if (s.setPointerCapture) {
        try { s.setPointerCapture(e.pointerId); } catch (err) { /* noop */ }
      }
      e.preventDefault();
    });

    s.addEventListener('pointermove', function (e) {
      if (!mode) return;
      if (mode === 'divider') {
        setDiv(e.clientX);
      } else {
        st.tx += e.clientX - last.x;
        st.ty += e.clientY - last.y;
        last.x = e.clientX;
        last.y = e.clientY;
        render();
      }
    });

    function end() { mode = null; s.classList.remove('panning'); }
    s.addEventListener('pointerup', end);
    s.addEventListener('pointercancel', end);

    // double-click: toggle 2.5x at the click point
    s.addEventListener('dblclick', function (e) {
      e.preventDefault();
      if (st.z > 1.01) { st.z = 1; st.tx = 0; st.ty = 0; render(); }
      else zoomAt(e.clientX, e.clientY, 2.5);
    });
  });

  // ---------- App example carousels ----------
  document.querySelectorAll('.app-carousel').forEach(function (car) {
    var slides = car.querySelectorAll('.app-slide');
    var panel = car.closest('.app-card');
    var counter = panel ? panel.querySelector('.app-nav .car-counter') : null;
    var idx = 0;
    var show = function (i) {
      idx = (i + slides.length) % slides.length;
      slides.forEach(function (sl, j) {
        sl.classList.toggle('active', j === idx);
        if (j !== idx) {
          sl.querySelectorAll('video').forEach(function (v) { v.pause(); });
        }
      });
      if (counter) counter.innerHTML = 'Example <b>' + (idx + 1) + '</b> / ' + slides.length;
    };
    var prev = panel ? panel.querySelector('.app-nav .prev') : null;
    var next = panel ? panel.querySelector('.app-nav .next') : null;
    if (prev) prev.addEventListener('click', function () { show(idx - 1); });
    if (next) next.addEventListener('click', function () { show(idx + 1); });
  });

  // ---------- Video pair sync (input & result play together) ----------
  document.querySelectorAll('.app-slide').forEach(function (slide) {
    var vids = Array.prototype.slice.call(slide.querySelectorAll('video'));
    if (vids.length < 2) return;
    vids.forEach(function (v) {
      v.addEventListener('play', function () {
        vids.forEach(function (o) {
          if (o === v) return;
          if (Math.abs(o.currentTime - v.currentTime) > 0.15) {
            try { o.currentTime = v.currentTime; } catch (err) { /* noop */ }
          }
          o.play();
        });
      });
      v.addEventListener('pause', function () {
        vids.forEach(function (o) { if (o !== v) o.pause(); });
      });
      v.addEventListener('seeked', function () {
        vids.forEach(function (o) {
          if (o !== v && Math.abs(o.currentTime - v.currentTime) > 0.15) {
            try { o.currentTime = v.currentTime; } catch (err) { /* noop */ }
          }
        });
      });
    });
  });

  // ---------- Lightbox (zoom & pan) ----------
  var lightbox = document.getElementById('lightbox');
  var lightboxImg = document.getElementById('lightbox-img');
  var lbState = { scale: 1, x: 0, y: 0 };
  var LB_MIN = 1, LB_MAX = 10;
  var lbPointers = new Map();
  var lbPan = null;   // { id, x, y }
  var lbPinch = null; // start distance of the two pointers

  function lbClamp() {
    if (lbState.scale <= 1) { lbState.x = 0; lbState.y = 0; return; }
    var r = lightboxImg.getBoundingClientRect();
    var baseW = r.width / lbState.scale;
    var baseH = r.height / lbState.scale;
    var mx = Math.max(0, (baseW * lbState.scale - lightbox.clientWidth) / 2 + 60);
    var my = Math.max(0, (baseH * lbState.scale - lightbox.clientHeight) / 2 + 60);
    lbState.x = Math.max(-mx, Math.min(mx, lbState.x));
    lbState.y = Math.max(-my, Math.min(my, lbState.y));
  }

  function lbRender() {
    lbClamp();
    lightboxImg.style.transform =
      'translate(' + lbState.x + 'px,' + lbState.y + 'px) scale(' + lbState.scale + ')';
  }

  function lbReset() { lbState = { scale: 1, x: 0, y: 0 }; lbRender(); }

  // Zoom keeping the point under (mx,my) fixed (transform-origin: center).
  function lbZoomAt(mx, my, factor) {
    var k = Math.min(LB_MAX, Math.max(LB_MIN, lbState.scale * factor));
    if (k === lbState.scale) return;
    var r = lightboxImg.getBoundingClientRect();
    var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    var s = lbState.scale;
    var px = (mx - cx - lbState.x) / s;   // point in untransformed image coords
    var py = (my - cy - lbState.y) / s;
    var layCx = cx - lbState.x, layCy = cy - lbState.y;
    lbState.x = mx - layCx - k * px;
    lbState.y = my - layCy - k * py;
    lbState.scale = k;
    if (k === LB_MIN) lbReset(); else lbRender();
  }

  function lbOpen(src) {
    lbReset();
    lightboxImg.src = src;
    lightbox.classList.add('open');
    lightbox.setAttribute('aria-hidden', 'false');
  }

  function lbClose() {
    lightbox.classList.remove('open');
    lightbox.setAttribute('aria-hidden', 'true');
  }

  document.querySelectorAll('img[data-lightbox]').forEach(function (img) {
    img.addEventListener('click', function (e) {
      e.stopPropagation();
      lbOpen(img.src);
    });
  });

  // wheel: zoom towards the cursor
  lightbox.addEventListener('wheel', function (e) {
    e.preventDefault();
    lbZoomAt(e.clientX, e.clientY, e.deltaY < 0 ? 1.15 : 1 / 1.15);
  }, { passive: false });

  // pointer down/move: single-finger pan, two-finger pinch zoom
  lightbox.addEventListener('pointerdown', function (e) {
    if (e.target.closest('.lb-controls')) return;
    lbPointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (lbPointers.size === 2) {
      var pts = Array.from(lbPointers.values());
      lbPinch = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      lbPan = null;
      lightbox.classList.remove('dragging');
    } else if (lbPointers.size === 1 && lbState.scale > 1) {
      lbPan = { id: e.pointerId, x: e.clientX, y: e.clientY };
      lightbox.classList.add('dragging');
    }
    if (lightbox.setPointerCapture) {
      try { lightbox.setPointerCapture(e.pointerId); } catch (err) { /* noop */ }
    }
  });

  lightbox.addEventListener('pointermove', function (e) {
    if (!lbPointers.has(e.pointerId)) return;
    lbPointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (lbPointers.size === 2 && lbPinch) {
      var pts = Array.from(lbPointers.values());
      var d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      var mid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
      if (d > 0) lbZoomAt(mid.x, mid.y, d / lbPinch);
      lbPinch = d;
    } else if (lbPan && e.pointerId === lbPan.id && lbState.scale > 1) {
      lbState.x += e.clientX - lbPan.x;
      lbState.y += e.clientY - lbPan.y;
      lbPan.x = e.clientX;
      lbPan.y = e.clientY;
      lbRender();
    }
  });

  function lbPointerEnd(e) {
    lbPointers.delete(e.pointerId);
    if (lbPointers.size < 2) lbPinch = null;
    if (lbPan && e.pointerId === lbPan.id) {
      lbPan = null;
      lightbox.classList.remove('dragging');
    }
  }
  lightbox.addEventListener('pointerup', lbPointerEnd);
  lightbox.addEventListener('pointercancel', lbPointerEnd);

  // click background (at 1x) closes; double-click toggles 3x
  lightbox.addEventListener('click', function (e) {
    if (e.target.closest('.lb-controls')) return;
    if (e.target === lightbox && lbState.scale === 1) lbClose();
  });
  lightboxImg.addEventListener('dblclick', function (e) {
    e.preventDefault();
    if (lbState.scale > 1.01) lbReset();
    else lbZoomAt(e.clientX, e.clientY, 3);
  });

  // control buttons
  document.getElementById('lb-zoom-in').addEventListener('click', function () {
    lbZoomAt(window.innerWidth / 2, window.innerHeight / 2, 1.3);
  });
  document.getElementById('lb-zoom-out').addEventListener('click', function () {
    lbZoomAt(window.innerWidth / 2, window.innerHeight / 2, 1 / 1.3);
  });
  document.getElementById('lb-reset').addEventListener('click', lbReset);
  document.getElementById('lb-close').addEventListener('click', lbClose);

  // keyboard: Esc close, +/- zoom, 0 reset, arrows pan
  document.addEventListener('keydown', function (e) {
    if (!lightbox.classList.contains('open')) return;
    if (e.key === 'Escape') lbClose();
    else if (e.key === '+' || e.key === '=') lbZoomAt(window.innerWidth / 2, window.innerHeight / 2, 1.25);
    else if (e.key === '-') lbZoomAt(window.innerWidth / 2, window.innerHeight / 2, 1 / 1.25);
    else if (e.key === '0') lbReset();
    else if (lbState.scale > 1) {
      var step = 60;
      if (e.key === 'ArrowLeft') { lbState.x += step; lbRender(); }
      else if (e.key === 'ArrowRight') { lbState.x -= step; lbRender(); }
      else if (e.key === 'ArrowUp') { lbState.y += step; lbRender(); }
      else if (e.key === 'ArrowDown') { lbState.y -= step; lbRender(); }
    }
  });

  // ---------- Copy BibTeX ----------
  var copyBtn = document.getElementById('copy-bibtex');
  copyBtn.addEventListener('click', function () {
    var text = document.getElementById('bibtex-code').textContent;
    var done = function () {
      copyBtn.textContent = 'Copied!';
      copyBtn.classList.add('copied');
      setTimeout(function () {
        copyBtn.textContent = 'Copy';
        copyBtn.classList.remove('copied');
      }, 1600);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text, done); });
    } else {
      fallbackCopy(text, done);
    }
  });
  function fallbackCopy(text, done) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); done(); } catch (e) { /* noop */ }
    document.body.removeChild(ta);
  }
