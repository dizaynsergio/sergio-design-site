(function () {
    'use strict';

    var d = document, root = d.documentElement;
    var WA_NUMBER = '77055557142';
    var DICT = window.SD_I18N || { en: {}, wa: { ru: {}, en: {} } };
    var fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
    var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    var lang = root.lang === 'en' && window.SD_I18N ? 'en' : 'ru';
    var $ = function (s, c) { return (c || d).querySelector(s); };
    var $$ = function (s, c) { return Array.prototype.slice.call((c || d).querySelectorAll(s)); };

    /* ---------- i18n: RU lives in the HTML, EN comes from i18n.js ---------- */
    var textEls = $$('[data-i18n]');
    var attrEls = $$('[data-i18n-attr]');
    var ru = {};
    textEls.forEach(function (el) {
        var k = el.getAttribute('data-i18n');
        if (!(k in ru)) ru[k] = el.innerHTML;
    });
    function attrPairs(el) {
        return el.getAttribute('data-i18n-attr').split(';').map(function (p) { return p.split(':'); });
    }
    attrEls.forEach(function (el) {
        attrPairs(el).forEach(function (p) {
            if (!(('@' + p[1]) in ru)) ru['@' + p[1]] = el.getAttribute(p[0]);
        });
    });

    function waHref(key) {
        var msgs = DICT.wa[lang] || {};
        var m = msgs[key] || msgs.nav || '';
        return 'https://wa.me/' + WA_NUMBER + (m ? '?text=' + encodeURIComponent(m) : '');
    }
    function updateWa() {
        $$('[data-wa]').forEach(function (a) { a.href = waHref(a.getAttribute('data-wa')); });
    }

    function setLang(l, save) {
        lang = l;
        var en = DICT.en;
        textEls.forEach(function (el) {
            var k = el.getAttribute('data-i18n');
            var v = l === 'en' ? en[k] : ru[k];
            if (v != null) el.innerHTML = v;
        });
        attrEls.forEach(function (el) {
            attrPairs(el).forEach(function (p) {
                var v = l === 'en' ? en[p[1]] : ru['@' + p[1]];
                if (v != null) el.setAttribute(p[0], v);
            });
        });
        root.lang = l;
        $$('[data-lang]').forEach(function (b) {
            b.setAttribute('aria-pressed', String(b.getAttribute('data-lang') === l));
        });
        updateWa();
        if (save) {
            try { localStorage.setItem('sd-lang', l); } catch (e) {}
            try {
                var u = new URL(location.href);
                if (l === 'en') u.searchParams.set('lang', 'en'); else u.searchParams.delete('lang');
                history.replaceState(null, '', u);
            } catch (e) {}
        }
        root.classList.remove('i18n-wait');
        requestAnimationFrame(layoutWires);
    }

    $$('[data-lang]').forEach(function (b) {
        b.addEventListener('click', function () {
            var l = b.getAttribute('data-lang');
            if (l !== lang) setLang(l, true);
        });
    });
    if (lang === 'en') setLang('en', false);
    else { root.lang = 'ru'; root.classList.remove('i18n-wait'); updateWa(); }

    /* ---------- header ---------- */
    var nav = $('#nav');
    function onScroll() { nav.classList.toggle('is-scrolled', window.scrollY > 8); }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    var burger = $('#burger'), menu = $('#menu');
    function setMenu(open) {
        menu.classList.toggle('is-open', open);
        burger.setAttribute('aria-expanded', String(open));
        menu.setAttribute('aria-hidden', String(!open));
        menu.inert = !open;
        ['main', '.footer', '#fab'].forEach(function (sel) { var el = $(sel); if (el) el.inert = open; });
        root.classList.toggle('menu-open', open);
    }
    setMenu(false);
    burger.addEventListener('click', function () { setMenu(!menu.classList.contains('is-open')); });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
    d.addEventListener('keydown', function (e) {
        if (e.key !== 'Escape' || !menu.classList.contains('is-open')) return;
        var hadFocus = menu.contains(d.activeElement);
        setMenu(false);
        if (hadFocus) burger.focus();
    });
    var mqDesk = matchMedia('(min-width: 1024px)');
    var onDesk = function (e) { if (e.matches) setMenu(false); };
    if (mqDesk.addEventListener) mqDesk.addEventListener('change', onDesk); else if (mqDesk.addListener) mqDesk.addListener(onDesk);

    var navLinks = $$('.nav__links a');
    var secObs = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
            if (!e.isIntersecting) return;
            navLinks.forEach(function (a) {
                a.classList.toggle('is-active', a.getAttribute('href') === '#' + e.target.id);
            });
        });
    }, { rootMargin: '-45% 0px -50% 0px' });
    $$('main > section[id]').forEach(function (s) { secObs.observe(s); });

    /* ---------- reveal on scroll ---------- */
    var revealEls = $$('.reveal');
    revealEls.forEach(function (el) {
        var sibs = Array.prototype.filter.call(el.parentElement.children, function (c) { return c.classList.contains('reveal'); });
        if (sibs.length > 1) el.style.setProperty('--d', Math.min(sibs.indexOf(el), 6) * 70 + 'ms');
    });
    var revObs = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
            if (!e.isIntersecting) return;
            var el = e.target;
            el.classList.add('is-in');
            revObs.unobserve(el);
            // drop the stagger so later hover transitions aren't delayed
            setTimeout(function () { el.style.removeProperty('--d'); }, 1400);
        });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
    revealEls.forEach(function (el) { revObs.observe(el); });
    window.SD_OK = true;

    /* pause decorative loops in sections that are off-screen */
    var offObs = new IntersectionObserver(function (en) {
        en.forEach(function (e) { e.target.classList.toggle('is-off', !e.isIntersecting); });
    });
    $$('.hero, #clients, #integrations, #dashboard, #cases, #contact').forEach(function (sct) { offObs.observe(sct); });

    /* ---------- count-up ---------- */
    if (!reduce) {
        $$('[data-count]').forEach(function (el) {
            var target = parseInt(el.getAttribute('data-count'), 10);
            el.textContent = '0';
            var o = new IntersectionObserver(function (en) {
                if (!en[0].isIntersecting) return;
                o.disconnect();
                var t0 = performance.now(), dur = 1400;
                (function tick(now) {
                    var p = Math.min((now - t0) / dur, 1);
                    el.textContent = String(Math.round(target * (1 - Math.pow(1 - p, 4))));
                    if (p < 1) requestAnimationFrame(tick);
                })(t0);
            }, { threshold: 0.4 });
            o.observe(el);
        });
    }

    /* ---------- automation card: cycle steps ---------- */
    var steps = $$('#flow .flow__step');
    if (steps.length && !reduce) {
        var k = 0;
        var stepTick = function () {
            steps.forEach(function (s, i) {
                s.classList.toggle('is-done', i < k);
                s.classList.toggle('is-active', i === k);
            });
            k = (k + 1) % (steps.length + 1);
        };
        stepTick();
        setInterval(stepTick, 1300);
    }

    /* ---------- wires between the orb and the cards ---------- */
    var stage = $('#stage'), wires = $('#wires'), orbEl = stage && $('[data-orb]', stage);
    var cards = stage ? $$('[data-card]', stage) : [];
    function f(n) { return Math.round(n * 10) / 10; }
    function layoutWires() {
        if (!stage || !wires || !orbEl) return;
        var sr = stage.getBoundingClientRect();
        if (!sr.width) return;
        var or = orbEl.getBoundingClientRect();
        var cx = or.left + or.width / 2 - sr.left;
        var cy = or.top + or.height / 2 - sr.top;
        var R = or.width * 0.34;
        var desktop = window.innerWidth >= 1024;
        var out = '';
        cards.forEach(function (c, i) {
            var r = c.getBoundingClientRect();
            var L = r.left - sr.left, T = r.top - sr.top, W = r.width, H = r.height;
            var isLeft = L + W / 2 < cx;
            var s = isLeft ? -1 : 1;
            var x0, y0, x3, y3, path;
            if (desktop) {
                x0 = isLeft ? L + W + 3 : L - 3;
                y0 = T + H / 2;
                var ang = Math.atan2(y0 - cy, x0 - cx);
                x3 = cx + Math.cos(ang) * R * 0.97;
                y3 = cy + Math.sin(ang) * R * 0.97;
                var k1 = Math.abs(x3 - x0) * 0.55;
                path = 'M' + f(x0) + ' ' + f(y0) +
                    ' C' + f(x0 - s * k1) + ' ' + f(y0) + ' ' +
                    f(x3 + Math.cos(ang) * 46) + ' ' + f(y3 + Math.sin(ang) * 46) + ' ' +
                    f(x3) + ' ' + f(y3);
            } else {
                // mobile: every wire runs up the gap between the two card columns into the orb's base
                x0 = isLeft ? L + W + 3 : L - 3;
                y0 = T + 24;
                var gx = cx + s * 3;
                x3 = cx + s * R * 0.16;
                y3 = cy + Math.sqrt(Math.max(R * R - (x3 - cx) * (x3 - cx), 0)) * 0.97;
                path = 'M' + f(x0) + ' ' + f(y0) +
                    ' C' + f(gx) + ' ' + f(y0) + ' ' + f(gx) + ' ' + f(y0) + ' ' + f(gx) + ' ' + f(y0 - 12) +
                    ' L' + f(gx) + ' ' + f(y3 + 26) +
                    ' C' + f(gx) + ' ' + f(y3 + 10) + ' ' + f(x3) + ' ' + f(y3 + 10) + ' ' + f(x3) + ' ' + f(y3);
            }
            out += '<path class="wire-glow" d="' + path + '"/>' +
                '<path class="wire" d="' + path + '"/>' +
                '<path class="wire-pulse" pathLength="1" style="--wd:' + (-i * 0.8) + 's" d="' + path + '"/>' +
                '<circle class="node-halo" cx="' + f(x0) + '" cy="' + f(y0) + '" r="6"/>' +
                '<circle class="node" cx="' + f(x0) + '" cy="' + f(y0) + '" r="2.6"/>' +
                '<circle class="node" cx="' + f(x3) + '" cy="' + f(y3) + '" r="2"/>';
        });
        wires.setAttribute('viewBox', '0 0 ' + f(sr.width) + ' ' + f(sr.height));
        wires.innerHTML = out;
    }
    if (stage) {
        var wireRaf = 0;
        var queueWires = function () {
            if (wireRaf) return;
            wireRaf = requestAnimationFrame(function () { wireRaf = 0; layoutWires(); });
        };
        if ('ResizeObserver' in window) new ResizeObserver(queueWires).observe(stage);
        window.addEventListener('resize', queueWires);
        if (d.fonts && d.fonts.ready) d.fonts.ready.then(queueWires);
        layoutWires();
    }

    /* ---------- integrations: rotating particle globe ---------- */
    var globe = $('[data-globe]');
    var gctx = globe && globe.getContext && globe.getContext('2d');
    if (gctx) {
        var GN = window.innerWidth < 768 ? 1100 : 2600;
        var GP = ['#3b7bff', '#5b95ff', '#8fb8ff', '#dce8ff', '#59c2ff', '#ffffff', '#ff9a4d'];
        var GW = [0.40, 0.20, 0.13, 0.12, 0.08, 0.05, 0.02];
        var groups = GP.map(function () { return []; });
        var golden = Math.PI * (3 - Math.sqrt(5));
        for (var gi = 0; gi < GN; gi++) {
            var gy = 1 - (gi / (GN - 1)) * 2, gr = Math.sqrt(1 - gy * gy), gth = golden * gi;
            var jit = 1 + (Math.random() - 0.5) * 0.05;
            var u = Math.random(), c = 0, acc = GW[0];
            while (u > acc && c < GW.length - 1) acc += GW[++c];
            groups[c].push(Math.cos(gth) * gr * jit, gy * jit, Math.sin(gth) * gr * jit);
        }
        var gw = 0, gh = 0, gdpr = 1, gRaf = 0, gOn = false, gVis = false, gT0 = performance.now();
        var gSize = function () {
            var r = globe.getBoundingClientRect();
            gdpr = Math.min(window.devicePixelRatio || 1, 2);
            gw = r.width; gh = r.height;
            globe.width = Math.round(gw * gdpr); globe.height = Math.round(gh * gdpr);
        };
        var gDraw = function (now) {
            var t = (now - gT0) / 1000, a = t * 0.14, ca = Math.cos(a), sa = Math.sin(a);
            var ct = Math.cos(-0.32), st = Math.sin(-0.32);
            var cx = gw / 2, cy = gh / 2, R = gw * 0.47, F = 2.8;
            gctx.setTransform(gdpr, 0, 0, gdpr, 0, 0);
            gctx.clearRect(0, 0, gw, gh);
            for (var g = 0; g < groups.length; g++) {
                var pts = groups[g];
                gctx.fillStyle = GP[g];
                for (var q = 0; q < pts.length; q += 3) {
                    var x = pts[q], y = pts[q + 1], z = pts[q + 2];
                    var x1 = x * ca + z * sa, z1 = z * ca - x * sa;
                    var y2 = y * ct - z1 * st, z2 = y * st + z1 * ct;
                    var k = F / (F - z2);
                    var sy = cy - y2 * R * k;
                    if (sy > cy + 1) continue; // lower half is below the section edge
                    var depth = (z2 + 1) * 0.5;
                    var sz = 0.7 + depth * 1.3;
                    gctx.globalAlpha = 0.12 + depth * 0.88;
                    gctx.fillRect(cx + x1 * R * k - sz / 2, sy - sz / 2, sz, sz);
                }
            }
            gctx.globalAlpha = 1;
        };
        var gLoop = function (now) { gDraw(now); gRaf = gOn ? requestAnimationFrame(gLoop) : 0; };
        gSize();
        gDraw(performance.now());
        if ('ResizeObserver' in window) new ResizeObserver(function () { gSize(); gDraw(performance.now()); }).observe(globe);
        if (!reduce) {
            var gSync = function () {
                gOn = gVis && !d.hidden;
                if (gOn && !gRaf) gRaf = requestAnimationFrame(gLoop);
            };
            new IntersectionObserver(function (en) { gVis = en[0].isIntersecting; gSync(); }).observe(globe);
            d.addEventListener('visibilitychange', gSync);
        }
    }

    /* ---------- orb energy on hover / tap ---------- */
    function energy(v) { if (window.SDOrb && window.SDOrb.setEnergy) window.SDOrb.setEnergy(v); }
    $$('[data-energy]').forEach(function (el) {
        if (fine) {
            el.addEventListener('pointerenter', function () { energy(1); });
            el.addEventListener('pointerleave', function () { energy(0); });
        } else {
            el.addEventListener('pointerdown', function () {
                energy(1);
                setTimeout(function () { energy(0); }, 800);
            });
        }
    });

    /* ---------- pointer-driven effects (mouse only) ---------- */
    if (fine) {
        var grid = $('#logoGrid');
        d.addEventListener('pointermove', function (e) {
            if (e.pointerType !== 'mouse' || !e.target.closest) return;
            var t = e.target.closest('.glass, .btn');
            if (t) {
                var r = t.getBoundingClientRect();
                t.style.setProperty('--mx', (e.clientX - r.left) + 'px');
                t.style.setProperty('--my', (e.clientY - r.top) + 'px');
            }
            if (grid && e.target.closest('#logoGrid')) {
                var g = grid.getBoundingClientRect();
                grid.style.setProperty('--mx', (e.clientX - g.left) + 'px');
                grid.style.setProperty('--my', (e.clientY - g.top) + 'px');
            }
        }, { passive: true });

        if (!reduce) {
            $$('.card, .tile').forEach(function (el) {
                el.addEventListener('pointermove', function (e) {
                    var r = el.getBoundingClientRect();
                    var x = (e.clientX - r.left) / r.width - 0.5;
                    var y = (e.clientY - r.top) / r.height - 0.5;
                    el.style.transition = 'transform .18s ease-out';
                    el.style.transform = 'perspective(900px) rotateX(' + f(-y * 5) + 'deg) rotateY(' + f(x * 6) + 'deg) translateY(-3px)';
                });
                el.addEventListener('pointerleave', function () {
                    el.style.transition = '';
                    el.style.transform = '';
                });
            });

            $$('.btn--lg, .btn--xl').forEach(function (btn) {
                btn.addEventListener('pointermove', function (e) {
                    var r = btn.getBoundingClientRect();
                    var x = (e.clientX - r.left - r.width / 2) * 0.16;
                    var y = (e.clientY - r.top - r.height / 2) * 0.28;
                    btn.style.transform = 'translate(' + f(x) + 'px,' + f(y - 2) + 'px)';
                });
                btn.addEventListener('pointerleave', function () { btn.style.transform = ''; });
            });
        }

        /* custom cursor: a small orb that grows over clickable things */
        var cur = $('.cursor');
        if (cur) {
            var HOVER = 'a, button, summary, label, [data-demo], .logo-cell';
            var cx = -100, cy = -100, tx = cx, ty = cy, craf = 0, shown = false;
            var loop = function () {
                var kk = reduce ? 1 : 0.24;
                cx += (tx - cx) * kk;
                cy += (ty - cy) * kk;
                cur.style.transform = 'translate3d(' + f(cx) + 'px,' + f(cy) + 'px,0)';
                craf = (Math.abs(tx - cx) + Math.abs(ty - cy) > 0.2) ? requestAnimationFrame(loop) : 0;
            };
            d.addEventListener('pointermove', function (e) {
                if (e.pointerType !== 'mouse') return;
                tx = e.clientX; ty = e.clientY;
                if (!shown) {
                    shown = true; cx = tx; cy = ty;
                    root.classList.add('has-cursor');
                }
                cur.classList.add('is-visible');
                cur.classList.toggle('is-hover', !!(e.target.closest && e.target.closest(HOVER)));
                if (!craf) craf = requestAnimationFrame(loop);
            }, { passive: true });
            d.addEventListener('pointerdown', function () { cur.classList.add('is-down'); });
            d.addEventListener('pointerup', function () { cur.classList.remove('is-down'); });
            d.addEventListener('mouseout', function (e) { if (!e.relatedTarget) cur.classList.remove('is-visible'); });
        }
    }

    /* ---------- demo dashboard dialog ---------- */
    var modal = $('#demoModal');
    $$('[data-demo]').forEach(function (b) {
        b.addEventListener('click', function () {
            if (modal && typeof modal.showModal === 'function') {
                modal.showModal();
                root.classList.add('modal-open');
            } else {
                window.open(waHref('demo'), '_blank', 'noopener');
            }
        });
    });
    if (modal) {
        modal.addEventListener('click', function (e) {
            var r = modal.getBoundingClientRect();
            var outside = e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
            if (outside || e.target.closest('[data-close]')) modal.close();
        });
        modal.addEventListener('close', function () { root.classList.remove('modal-open'); });
    }

    /* ---------- floating WhatsApp: appears once the hero CTAs scroll away ---------- */
    var fab = $('#fab'), heroCta = $('.hero__cta'), contact = $('#contact');
    if (fab && heroCta) {
        var heroGone = false, atContact = false;
        var fabObs = new IntersectionObserver(function (en) {
            en.forEach(function (e) {
                if (e.target === heroCta) heroGone = !e.isIntersecting && e.boundingClientRect.top < 0;
                else atContact = e.isIntersecting;
            });
            fab.classList.toggle('is-on', heroGone && !atContact);
        });
        fabObs.observe(heroCta);
        if (contact) fabObs.observe(contact);
    }
})();
