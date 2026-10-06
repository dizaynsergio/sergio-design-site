/* Interactive demo inside #demo. All data is fake; strings are [ru, en] pairs. */
(function () {
    'use strict';

    var d = document, root = d.documentElement, dash = d.getElementById('demo');
    if (!dash) return;

    var en = function () { return root.lang === 'en'; };
    var t = function (p) { return typeof p === 'string' ? p : p[en() ? 1 : 0]; };
    var esc = function (s) {
        return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
    };
    var num = function (n, f) { return n.toLocaleString(en() ? 'en-US' : 'ru-RU', { maximumFractionDigits: f || 0 }); };
    var money = function (n) { return (n >= 1e6 ? num(n / 1e6, 1) + 'M' : num(Math.round(n))) + ' ₸'; };
    var pane = function (k) { return dash.querySelector('[data-pane="' + k + '"]'); };
    var put = function (p, k, v) { p.querySelector('[data-k="' + k + '"]').textContent = v; };
    var ico = function (id) { return '<svg class="ico" aria-hidden="true"><use href="#i-' + id + '"/></svg>'; };
    var av = function (name, cls) { return '<span class="av' + (cls || '') + '">' + esc(name.charAt(0).toUpperCase()) + '</span>'; };
    var sw = function (a, on, label, off) {
        return '<label class="sw"><input type="checkbox" data-a="' + a + '"' + (on ? ' checked' : '') + (off ? ' disabled' : '') + ' aria-label="' + esc(label) + '"><i></i></label>';
    };
    var seg = function (a, items, cur) {
        return '<span class="seg">' + items.map(function (x) {
            return '<button type="button" data-a="' + a + ':' + x[0] + '"' + (x[0] === cur ? ' class="on"' : '') + '>' + t(x[1]) + '</button>';
        }).join('') + '</span>';
    };
    // re-render a block, keeping keyboard focus on the same control
    function draw(el, html) {
        var a = d.activeElement, k = a && el.contains(a) && a.getAttribute('data-a');
        el.innerHTML = html;
        var f = k && el.querySelector('[data-a="' + k + '"]');
        if (f) f.focus();
    }

    /* ---------- charts: values 0..1 → smooth path in a 600×200 box ---------- */
    function line(v) {
        var s = 600 / (v.length - 1), y = function (x) { return Math.round(190 - x * 165); }, p = 'M0 ' + y(v[0]);
        for (var i = 1; i < v.length; i++) p += ' C' + (i - .5) * s + ' ' + y(v[i - 1]) + ' ' + (i - .5) * s + ' ' + y(v[i]) + ' ' + i * s + ' ' + y(v[i]);
        return p;
    }
    function chart(a, b) {
        var p = line(a), n = a.length - 2;
        return '<svg class="area" viewBox="0 0 600 200" preserveAspectRatio="none"><g class="area__grid"><path d="M0 50H600M0 100H600M0 150H600"/></g>' +
            '<path class="area__fill" d="' + p + ' L600 200 L0 200Z"/><path class="area__line" pathLength="1" d="' + p + '"/>' +
            '<path class="area__line2" pathLength="1" d="' + line(b) + '"/>' +
            '<circle class="area__dot" cx="' + n * 600 / (n + 1) + '" cy="' + Math.round(190 - a[n] * 165) + '" r="5"/></svg>';
    }

    /* ---------- tabs ---------- */
    var TABS = [
        ['overview', ['Обзор', 'Overview']], ['ads', ['Реклама', 'Ads']], ['inbox', ['Инбокс', 'Inbox']],
        ['team', ['Команда', 'Team']], ['auto', ['Автоматизации', 'Automations']]
    ];
    var tab = 'overview', tabsEl = dash.querySelector('.dtabs');
    function tabs() {
        var unread = 0;
        ACC.forEach(function (a) { a.th.forEach(function (x) { if (x.unread) unread++; }); });
        draw(tabsEl, TABS.map(function (x) {
            return '<button type="button" role="tab" data-a="tab:' + x[0] + '" aria-selected="' + (x[0] === tab) + '">' + t(x[1]) +
                (x[0] === 'inbox' && unread ? '<em>' + unread + '</em>' : '') + '</button>';
        }).join(''));
        TABS.forEach(function (x) { pane(x[0]).hidden = x[0] !== tab; });
        var b = tabsEl.querySelector('[aria-selected="true"]');
        tabsEl.scrollLeft = b.offsetLeft - tabsEl.offsetLeft - 40; // keep the active tab visible on phones
    }

    /* ---------- overview ---------- */
    var OV = {
        w: { k: [2.9e6, 312, 8.4, 1870], dl: ['+6%', '+11%', ['+0,4', '+0.4'], '−5%'], pipe: [31, 16, 8, 5],
            a: [.35, .5, .42, .6, .55, .78, .7], b: [.2, .28, .25, .33, .3, .42, .4] },
        m: { k: [12.4e6, 1284, 7.9, 1950], dl: ['+18%', '+32%', ['+2,1', '+2.1'], '−21%'], pipe: [128, 64, 31, 22],
            a: [.18, .3, .26, .45, .6, .5, .72, .9, .86, .95], b: [.08, .14, .12, .2, .3, .27, .38, .46, .5, .55] },
        y: { k: [138e6, 14920, 7.2, 2140], dl: ['+41%', '+57%', ['+1,6', '+1.6'], '−17%'], pipe: [1490, 760, 372, 268],
            a: [.1, .16, .22, .2, .34, .42, .4, .55, .63, .6, .8, .92], b: [.05, .09, .12, .14, .2, .24, .27, .33, .38, .4, .5, .56] }
    };
    var ov = 'm';
    function overview() {
        var o = OV[ov], p = pane('overview'), k = [money(o.k[0]), num(o.k[1]), num(o.k[2], 1) + '%', money(o.k[3])];
        [].forEach.call(p.querySelectorAll('.dkpi'), function (el, i) {
            el.querySelector('b').textContent = k[i];
            el.querySelector('i').textContent = t(o.dl[i]);
        });
        [].forEach.call(p.querySelectorAll('.pipe__st b'), function (el, i) { el.textContent = num(o.pipe[i]); });
        p.querySelector('[data-k="chart"]').innerHTML = chart(o.a, o.b);
    }

    /* ---------- Meta Ads ---------- */
    // per-day spend / leads / revenue of each campaign
    var CAMP = [
        { n: ['Лиды — Алматы, 25–45', 'Leads — Almaty, 25–45'], s: 42000, l: 24, r: 168000, on: true },
        { n: ['Ретаргетинг — посетители сайта', 'Retargeting — site visitors'], s: 18000, l: 11, r: 112000, on: true },
        { n: ['Reels — новая коллекция', 'Reels — new collection'], s: 27000, l: 13, r: 81000, on: true },
        { n: ['Lookalike 1% — покупатели', 'Lookalike 1% — buyers'], s: 22000, l: 9, r: 52000, on: true },
        { n: ['Сообщения в Direct', 'Direct messages'], s: 12000, l: 8, r: 26000, on: false }
    ];
    var ads = { days: 30, b: 100 };
    var SH_R = [.62, .7, .66, .78, .74, .85, .8, .92, .88, 1, .95, 1], SH_S = [.9, .92, .95, .93, .97, .96, 1, .98, 1, .99, 1, 1];
    // ponytail: toy forecast — spend scales linearly with budget, results with budget^0.8 (diminishing returns)
    function adsCalc() {
        var k = ads.b / 100, g = Math.pow(k, .8), o = { s: 0, l: 0, r: 0 };
        o.rows = CAMP.map(function (c) {
            var x = { s: c.s * k * ads.days, l: Math.round(c.l * g * ads.days), r: c.r * g * ads.days };
            if (c.on) { o.s += x.s; o.l += x.l; o.r += x.r; }
            return x;
        });
        return o;
    }
    console.assert(adsCalc().s === 109000 * 30 && adsCalc().l === 57 * 30, 'demo: adsCalc baseline');
    var MAX_R = CAMP.reduce(function (a, c) { return a + c.r; }, 0) * Math.pow(2, .8);

    function adsDraw() {
        var kpi = function (label, k, chip) {
            return '<div class="dkpi dkpi--flat"><span>' + t(label) + '</span><b data-k="' + k + '"></b>' + (chip ? '<i data-k="' + chip + '"></i>' : '') + '</div>';
        };
        draw(pane('ads'),
            '<div class="dash__kpis">' + kpi(['Расходы', 'Spend'], 's') + kpi(['Доход', 'Revenue'], 'r', 'roas') + kpi(['Лиды', 'Leads'], 'l') + kpi(['Цена лида', 'Cost per lead'], 'cpl') + '</div>' +
            '<div class="dash__grid"><div class="panel panel--chart"><div class="panel__head"><b>' + t(['Доход и расходы', 'Revenue & spend']) + '</b>' +
            seg('days', [[7, ['7 дней', '7 days']], [30, ['30 дней', '30 days']], [90, ['90 дней', '90 days']]], ads.days) + '</div><div data-k="chart"></div>' +
            '<p class="legend"><span><i></i>' + t(['Доход', 'Revenue']) + '</span><span><i></i>' + t(['Расходы', 'Spend']) + '</span></p></div>' +
            '<div class="panel"><div class="panel__head"><b>' + t(['Прогноз бюджета', 'Budget forecast']) + '</b></div>' +
            '<label class="rng"><span>' + t(['Дневной бюджет', 'Daily budget']) + '<output data-k="bud"></output></span>' +
            '<input type="range" data-a="bud" min="50" max="200" step="5" value="' + ads.b + '"></label>' +
            '<p class="muted">' + t(['Двигайте ползунок и отключайте кампании — расходы, лиды и доход пересчитаются сразу.', 'Drag the slider and pause campaigns — spend, leads and revenue update instantly.']) + '</p></div>' +
            '<div class="panel panel--wide"><div class="panel__head"><b>' + t(['Кампании', 'Campaigns']) + '</b><span class="muted">' + t(['Meta Ads · обновлено минуту назад', 'Meta Ads · updated a minute ago']) + '</span></div>' +
            '<div class="camps"><div class="camp camp--head"><span></span><span>' + t(['Кампания', 'Campaign']) + '</span><span>' + t(['Расход', 'Spend']) + '</span><span class="wide">' + t(['Лиды', 'Leads']) + '</span><span class="wide">' + t(['Цена лида', 'CPL']) + '</span><span>ROAS</span></div>' +
            CAMP.map(function (c, i) {
                return '<div class="camp">' + sw('camp:' + i, c.on, t(c.n)) + '<span>' + t(c.n) + '</span><span data-k="s' + i + '"></span><span class="wide" data-k="l' + i + '"></span><span class="wide" data-k="c' + i + '"></span><span data-k="x' + i + '"></span></div>';
            }).join('') + '</div></div></div>');
        adsUpd();
    }
    function adsUpd() {
        var o = adsCalc(), p = pane('ads'), x = function (r, s) { return s ? '×' + num(r / s, 1) : '—'; };
        put(p, 's', money(o.s)); put(p, 'r', money(o.r)); put(p, 'roas', 'ROAS ' + x(o.r, o.s));
        put(p, 'l', num(o.l)); put(p, 'cpl', o.l ? money(o.s / o.l) : '—');
        put(p, 'bud', money(o.s / ads.days) + ' · ' + ads.b + '%');
        o.rows.forEach(function (r, i) {
            put(p, 's' + i, money(r.s)); put(p, 'l' + i, num(r.l)); put(p, 'c' + i, money(r.s / r.l)); put(p, 'x' + i, x(r.r, r.s));
        });
        var fr = o.r / ads.days / MAX_R, fs = o.s / ads.days / MAX_R;
        p.querySelector('[data-k="chart"]').innerHTML = chart(SH_R.map(function (v) { return v * fr; }), SH_S.map(function (v) { return v * fs; }));
    }

    /* ---------- inbox ---------- */
    var ACC = [
        { h: 'aura.store', th: [
            { who: ['Дана М.', 'Dana M.'], type: 'dm', time: ['2 мин', '2 min'],
                msgs: [{ t: ['Здравствуйте! Есть ли пальто из рилса в размере M?', 'Hi! Do you have the coat from the reel in size M?'] }],
                ai: ['Здравствуйте, Дана! Да, размер M в наличии. Цена 48 900 ₸, доставка по Алматы — завтра. Оформить заказ?', 'Hi Dana! Yes, size M is in stock. It’s 48,900 ₸ with next-day delivery in Almaty. Shall I place the order?'] },
            { who: ['Ерлан К.', 'Yerlan K.'], type: 'comment', time: ['14 мин', '14 min'], unread: true, post: ['Новая коллекция — осень', 'New collection — autumn'],
                msgs: [{ t: ['Сколько стоит доставка в Астану?', 'How much is delivery to Astana?'] }],
                ai: ['Ерлан, доставка в Астану — 1 500 ₸, 2–3 дня. Подробности написали вам в Direct 🙌', 'Yerlan, delivery to Astana is 1,500 ₸ and takes 2–3 days. We’ve sent you the details in Direct 🙌'] },
            { who: ['Мадина А.', 'Madina A.'], type: 'dm', time: ['1 ч', '1 h'], unread: true,
                msgs: [{ t: ['Можно оплатить через Kaspi?', 'Can I pay with Kaspi?'] }, { me: 1, t: ['Да, конечно! Отправим счёт в Kaspi.', 'Of course! We’ll send you a Kaspi invoice.'] }, { t: ['Отлично, жду счёт', 'Great, waiting for the invoice'] }],
                ai: ['Мадина, счёт на 32 400 ₸ отправили в Kaspi. После оплаты сразу передадим заказ в доставку.', 'Madina, the 32,400 ₸ invoice is in your Kaspi app. We’ll ship the order as soon as it’s paid.'] }
        ] },
        { h: 'aura.kids', th: [
            { who: ['Асель Т.', 'Assel T.'], type: 'comment', time: ['5 мин', '5 min'], unread: true, post: ['Скидки −20% на школьную форму', '−20% on school uniforms'],
                msgs: [{ t: ['А на рост 128 есть?', 'Do you have it for height 128?'] }],
                ai: ['Асель, да, рост 128 есть в синем и сером цвете. Забронировать для вас?', 'Assel, yes — 128 is available in blue and grey. Shall we reserve one for you?'] },
            { who: ['Руслан Б.', 'Ruslan B.'], type: 'dm', time: ['40 мин', '40 min'],
                msgs: [{ t: ['Добрый день, до скольки вы работаете?', 'Hello, what are your opening hours?'] }],
                ai: ['Добрый день! Работаем ежедневно с 10:00 до 21:00.', 'Hello! We’re open daily from 10:00 to 21:00.'] }
        ] },
        { h: 'aura.almaty', th: [
            { who: ['Камила Ж.', 'Kamila Zh.'], type: 'dm', time: ['9 мин', '9 min'], unread: true,
                msgs: [{ t: ['Хочу записаться на примерку в субботу', 'I’d like to book a fitting on Saturday'] }],
                ai: ['Камила, с радостью! В субботу свободно 12:00 и 15:30 — какое время удобнее?', 'We’d love to, Kamila! Saturday has 12:00 and 15:30 free — which suits you better?'] },
            { who: ['Тимур С.', 'Timur S.'], type: 'comment', time: ['3 ч', '3 h'], post: ['Открытие шоурума на Абая', 'Showroom opening on Abay Ave'],
                msgs: [{ t: ['Парковка есть?', 'Is there parking?'] }],
                ai: ['Тимур, да — бесплатная парковка для гостей со двора.', 'Yes, Timur — free guest parking in the courtyard.'] }
        ] }
    ];
    var FLT = [['all', ['Все', 'All']], ['dm', ['Директ', 'Direct']], ['comment', ['Комментарии', 'Comments']]];
    var ib = { acc: 0, flt: 'all', th: null, draft: '' };
    function cur() {
        var l = ACC[ib.acc].th.filter(function (x) { return ib.flt === 'all' || x.type === ib.flt; });
        return l.indexOf(ib.th) < 0 ? l[0] : ib.th;
    }
    function inbox() {
        var A = ACC[ib.acc], c = cur(), p = pane('inbox'), dm = c.type === 'dm';
        c.unread = false;
        draw(p,
            '<div class="inbox__accs">' + ACC.map(function (a, i) {
                var n = a.th.filter(function (x) { return x.unread; }).length;
                return '<button type="button" data-a="acc:' + i + '" aria-pressed="' + (i === ib.acc) + '">' + av(a.h, ' av--ig') + '<span>@' + a.h + '</span>' + (n ? '<em>' + n + '</em>' : '') + '</button>';
            }).join('') + '</div>' +
            '<div class="inbox__body"><div class="panel inbox__list">' + seg('flt', FLT, ib.flt) + '<div class="threads">' +
            A.th.map(function (x, i) {
                if (ib.flt !== 'all' && x.type !== ib.flt) return '';
                var last = x.msgs[x.msgs.length - 1];
                return '<button type="button" class="thread" data-a="th:' + i + '" aria-pressed="' + (x === c) + '">' + av(t(x.who)) +
                    '<span class="thread__tx"><b>' + t(x.who) + '<i class="tag tag--' + x.type + '">' + t(FLT[x.type === 'dm' ? 1 : 2][1]) + '</i><small>' + t(x.time) + '</small></b>' +
                    '<span>' + (last.me ? t(['Вы: ', 'You: ']) : '') + esc(t(last.t)) + '</span></span>' + (x.unread ? '<em></em>' : '') + '</button>';
            }).join('') + '</div></div>' +
            '<div class="panel chat"><div class="chat__head">' + av(t(c.who)) + '<span><b>' + t(c.who) + '</b><small>' +
            (dm ? 'Instagram Direct · @' + A.h : t(['Комментарий к посту «', 'Comment on “']) + t(c.post) + t(['»', '”'])) + '</small></span></div>' +
            '<div class="chat__msgs">' + c.msgs.map(function (m) { return '<p class="msg' + (m.me ? ' msg--me' : '') + '">' + esc(t(m.t)) + '</p>'; }).join('') + '</div>' +
            '<button type="button" class="chat__ai" data-a="ai">' + ico('ai') + t(['Предложить ответ AI', 'Suggest an AI reply']) + '</button>' +
            '<form class="chat__form"><input type="text" data-a="draft" autocomplete="off" value="' + esc(ib.draft) + '" placeholder="' +
            t(dm ? ['Ответить в Direct…', 'Reply in Direct…'] : ['Ответить на комментарий…', 'Reply to the comment…']) + '" aria-label="' + t(['Ваш ответ', 'Your reply']) + '">' +
            '<button class="chat__send" aria-label="' + t(['Отправить', 'Send']) + '">' + ico('arrow') + '</button></form></div></div>');
        var m = p.querySelector('.chat__msgs'), i = p.querySelector('.chat__form input');
        m.scrollTop = m.scrollHeight;
        if (d.activeElement === i) i.setSelectionRange(i.value.length, i.value.length);
        tabs();
    }
    function send() {
        var th = cur(), txt = ib.draft.trim();
        if (!txt) return;
        th.msgs.push({ me: 1, t: txt });
        ib.draft = '';
        inbox();
        pane('inbox').querySelector('.chat__form input').focus();
        if (th.thanked) return;
        th.thanked = true;
        setTimeout(function () {
            th.msgs.push({ t: ['Спасибо! Очень быстро ответили 🙌', 'Thank you! That was fast 🙌'] });
            if (cur() !== th) th.unread = true;
            inbox();
        }, 1600);
    }

    /* ---------- team ---------- */
    var ROLES = [['Владелец', 'Owner'], ['Администратор', 'Admin'], ['Маркетолог', 'Marketer'], ['Менеджер продаж', 'Sales manager'], ['Оператор инбокса', 'Inbox operator']];
    var PERM = [['Финансы и выручка', 'Finance & revenue'], ['Реклама Meta Ads', 'Meta Ads'], ['Инбокс: Direct и комментарии', 'Inbox: Direct & comments'], ['CRM и сделки', 'CRM & deals'], ['Команда и настройки', 'Team & settings']];
    var CAN = ['11111', '01111', '01100', '00110', '00100']; // role → PERM flags
    var TEAM = [
        { n: ['Сергей К.', 'Sergey K.'], r: 0, on: true }, { n: ['Айгерим Н.', 'Aigerim N.'], r: 1, on: true },
        { n: ['Данияр С.', 'Daniyar S.'], r: 2, on: true }, { n: ['Алина Т.', 'Alina T.'], r: 3, on: true },
        { n: ['Тимур Б.', 'Timur B.'], r: 4, on: false }
    ];
    var sel = 1;
    function team() {
        var m = TEAM[sel], can = m.on ? CAN[m.r] : '00000';
        draw(pane('team'),
            '<div class="dash__grid dash__grid--even"><div class="panel"><div class="panel__head"><b>' + t(['Команда', 'Team']) + '</b><span class="muted">' +
            TEAM.filter(function (x) { return x.on; }).length + t([' из ', ' of ']) + TEAM.length + t([' активны', ' active']) + '</span></div><div class="members">' +
            TEAM.map(function (x, i) {
                return '<div class="member' + (i === sel ? ' is-sel' : '') + (x.on ? '' : ' is-out') + '"><button type="button" data-a="mem:' + i + '">' + av(t(x.n)) + '<span>' + t(x.n) + '</span></button>' +
                    '<select data-a="role:' + i + '" aria-label="' + t(['Роль: ', 'Role: ']) + t(x.n) + '"' + (i ? '' : ' disabled') + '>' +
                    ROLES.map(function (r, j) { return j || !i ? '<option value="' + j + '"' + (j === x.r ? ' selected' : '') + '>' + t(r) + '</option>' : ''; }).join('') + '</select>' +
                    sw('live:' + i, x.on, t(['Доступ: ', 'Access: ']) + t(x.n), !i) + '</div>';
            }).join('') + '</div></div>' +
            '<div class="panel"><div class="panel__head"><b>' + t(['Доступы · ', 'Access · ']) + t(m.n) + '</b><span class="muted">' + t(m.on ? ROLES[m.r] : ['доступ отключён', 'access disabled']) + '</span></div><ul class="perms">' +
            PERM.map(function (x, j) { var ok = can[j] === '1'; return '<li' + (ok ? ' class="ok"' : '') + '>' + ico(ok ? 'check' : 'lock') + '<span>' + t(x) + '</span></li>'; }).join('') + '</ul>' +
            '<p class="muted">' + t(['Смените роль или отключите сотрудника — доступы изменятся сразу. Каждый видит только свои разделы.', 'Change a role or disable a teammate — access updates instantly. Everyone sees only their own sections.']) + '</p></div></div>');
    }

    /* ---------- automations ---------- */
    // h = hours saved per month
    var RULES = [
        { n: ['Meta Ads → amoCRM', 'Meta Ads → amoCRM'], d: ['Новый лид сразу становится сделкой, клиенту уходит сообщение в WhatsApp', 'A new lead instantly becomes a deal and the customer gets a WhatsApp message'], h: 18, on: true },
        { n: ['Контроль скорости ответа', 'Response-time control'], d: ['Клиенту не ответили за {n} — руководитель получает уведомление в Telegram', 'No reply within {n} — the manager gets a Telegram alert'], h: 6, on: true },
        { n: ['Kaspi → 1С', 'Kaspi → 1C'], d: ['Оплата в Kaspi переводит сделку в «Оплачено» и создаёт счёт в 1С', 'A Kaspi payment marks the deal as “Paid” and creates an invoice in 1C'], h: 14, on: true },
        { n: ['AI-ассистент в инбоксе', 'AI assistant in the inbox'], d: ['Отвечает на типовые вопросы в Direct и комментариях, сложные передаёт менеджеру', 'Answers common questions in Direct and comments, hands complex ones to a manager'], h: 32, on: false },
        { n: ['Ежедневный отчёт', 'Daily report'], d: ['Выручка, лиды и расходы на рекламу — руководителю в WhatsApp в 9:00', 'Revenue, leads and ad spend — sent to the owner on WhatsApp at 9:00'], h: 5, on: true }
    ];
    var sla = 15;
    function autoDraw() {
        draw(pane('auto'),
            '<div class="dash__grid"><div class="panel"><div class="panel__head"><b>' + t(['Правила', 'Rules']) + '</b><span class="muted" data-k="cnt"></span></div><div class="rules">' +
            RULES.map(function (r, i) {
                return '<div class="rule">' + sw('rule:' + i, r.on, t(r.n)) + '<span><b>' + t(r.n) + '</b><small>' + t(r.d).replace('{n}', '<span data-k="sla"></span>') + '</small></span><i>' + r.h + t([' ч', ' h']) + '</i></div>';
            }).join('') + '</div></div>' +
            '<div class="panel"><div class="panel__head"><b>' + t(['Экономия времени', 'Time saved']) + '</b></div>' +
            '<p class="big"><b data-k="hrs"></b><span>' + t(['часов в месяц', 'hours a month']) + '</span></p>' +
            '<label class="rng"><span>' + t(['Допустимое время ответа', 'Allowed response time']) + '<output data-k="slaOut"></output></span>' +
            '<input type="range" data-a="sla" min="1" max="60" value="' + sla + '"></label>' +
            '<p class="muted">' + t(['Включайте и выключайте правила — увидите, сколько рутины система снимает с команды.', 'Switch rules on and off to see how much routine the system takes off your team.']) + '</p></div></div>');
        autoUpd();
    }
    function autoUpd() {
        var p = pane('auto'), on = RULES.filter(function (r) { return r.on; }), min = sla + t([' мин', ' min']);
        put(p, 'hrs', on.reduce(function (a, r) { return a + r.h; }, 0));
        put(p, 'cnt', on.length + t([' из ', ' of ']) + RULES.length + t([' включено', ' on']));
        put(p, 'sla', min); put(p, 'slaOut', min);
    }

    /* ---------- events: clicks drive buttons, input drives form controls ---------- */
    var ACT = {
        tab: function (v) { tab = v; tabs(); },
        ov: function (v) { ov = v; overview(); },
        days: function (v) { ads.days = +v; adsUpd(); },
        bud: function (v, el) { ads.b = +el.value; adsUpd(); },
        camp: function (v, el) { CAMP[v].on = el.checked; adsUpd(); },
        acc: function (v) { ib.acc = +v; ib.th = null; ib.draft = ''; inbox(); },
        flt: function (v) { ib.flt = v; inbox(); },
        th: function (v) { ib.th = ACC[ib.acc].th[v]; ib.draft = ''; inbox(); },
        ai: function () { var i = pane('inbox').querySelector('.chat__form input'); i.value = ib.draft = t(cur().ai); i.focus(); },
        draft: function (v, el) { ib.draft = el.value; },
        mem: function (v) { sel = +v; team(); },
        role: function (v, el) { TEAM[v].r = +el.value; sel = +v; team(); },
        live: function (v, el) { TEAM[v].on = el.checked; sel = +v; team(); },
        rule: function (v, el) { RULES[v].on = el.checked; autoUpd(); },
        sla: function (v, el) { sla = +el.value; autoUpd(); }
    };
    function on(e) {
        var el = e.target.closest('[data-a]');
        if (!el || /^(INPUT|SELECT)$/.test(el.tagName) === (e.type === 'click')) return;
        var a = el.getAttribute('data-a').split(':');
        if (el.parentNode.className === 'seg') [].forEach.call(el.parentNode.children, function (c) { c.classList.toggle('on', c === el); });
        ACT[a[0]](a[1], el);
    }
    dash.addEventListener('click', on);
    dash.addEventListener('input', on);
    dash.addEventListener('submit', function (e) { e.preventDefault(); send(); });

    function all() { overview(); adsDraw(); inbox(); team(); autoDraw(); }
    all();
    tabsEl.hidden = false;
    // main.js switches the language by setting <html lang>
    new MutationObserver(all).observe(root, { attributes: true, attributeFilter: ['lang'] });
})();
