// Tela falsa para rodar o carreira.js FORA do navegador (plano "sem página
// escondida", etapa A). Imita o mínimo do DOM que o jogo toca: elementos
// por id (sempre o mesmo objeto), classes, atributos, eventos (inclusive
// .click() chamando os ouvintes), conteúdo em texto e o window básico
// (location, localStorage, timers, matchMedia...). Nada é desenhado.
//
// `sinais` conta o que a LÓGICA leu da tela (valor de campo, classe,
// atributo), para achar onde o jogo depende da tela para decidir algo.
// Uso: const { criarJanela } = require("./_tela_falsa");
//      const win = criarJanela({ base, pathname: "/carreira/motor", cookie });
const nodeFetch = globalThis.fetch;

function criarJanela({ base, pathname = "/carreira/motor", search = "", cookie = () => "", setCookie = () => {} } = {}) {
  const sinais = { leituras: new Map(), cliques: [] };
  const conta = (k) => sinais.leituras.set(k, (sinais.leituras.get(k) || 0) + 1);
  const porId = new Map();
  const porSeletor = new Map();

  class ClassList {
    constructor(el) { this.el = el; this.set = new Set(); }
    add(...c) { c.forEach((x) => this.set.add(x)); }
    remove(...c) { c.forEach((x) => this.set.delete(x)); }
    toggle(c, force) { const on = force === undefined ? !this.set.has(c) : !!force; on ? this.set.add(c) : this.set.delete(c); return on; }
    contains(c) { conta(`classe:${this.el.id || this.el.tagName}.${c}`); return this.set.has(c); }
    replace(a, b) { if (this.set.has(a)) { this.set.delete(a); this.set.add(b); } }
    get length() { return this.set.size; }
    get value() { return [...this.set].join(" "); }
    forEach(f) { [...this.set].forEach(f); }
    [Symbol.iterator]() { return this.set[Symbol.iterator](); }
  }
  class Elemento {
    constructor(tag = "div", id = "") {
      this.tagName = String(tag).toUpperCase(); this.nodeName = this.tagName; this.nodeType = 1;
      this._id = id; this.classList = new ClassList(this); this.style = new Proxy({ setProperty() {}, removeProperty() {}, getPropertyValue: () => "" }, { set: (o, k, v) => { o[k] = v; return true; } });
      this.dataset = {}; this._attrs = new Map(); this._ouvintes = new Map(); this.children = []; this.childNodes = this.children;
      this._html = ""; this._valor = ""; this.checked = false; this.disabled = false; this.hidden = false;
      this.parentNode = null; this.parentElement = null; this.scrollTop = 0; this.scrollLeft = 0; this.scrollHeight = 0; this.scrollWidth = 0;
      this.clientHeight = 0; this.clientWidth = 0; this.offsetWidth = 0; this.offsetHeight = 0; this.offsetTop = 0; this.offsetLeft = 0;
      this.tabIndex = -1; this.title = ""; this.href = ""; this.src = ""; this.type = ""; this.name = ""; this.placeholder = ""; this.open = false;
      this.selectedIndex = 0; this.options = []; this.files = []; this.files.item = () => null;
    }
    get id() { return this._id; } set id(v) { this._id = v; }
    get className() { return this.classList.value; } set className(v) { this.classList.set = new Set(String(v).split(/\s+/).filter(Boolean)); }
    get innerHTML() { return this._html; } set innerHTML(v) { this._html = String(v); this.children.length = 0; }
    get outerHTML() { return this._html; }
    get textContent() { return this._html.replace(/<[^>]*>/g, ""); } set textContent(v) { this._html = String(v == null ? "" : v); }
    get innerText() { return this.textContent; } set innerText(v) { this.textContent = v; }
    get value() { conta(`valor:${this.id || this.tagName}`); return this._valor; } set value(v) { this._valor = String(v); }
    get valueAsNumber() { return Number(this.value); }
    get firstChild() { return this.children[0] || null; } get lastChild() { return this.children[this.children.length - 1] || null; }
    get firstElementChild() { return this.firstChild; } get lastElementChild() { return this.lastChild; }
    get nextElementSibling() { return null; } get previousElementSibling() { return null; } get childElementCount() { return this.children.length; }
    get isConnected() { return true; } get ownerDocument() { return documento; }
    setAttribute(k, v) { this._attrs.set(k, String(v)); if (k === "id") this._id = String(v); if (k === "class") this.className = v; }
    getAttribute(k) { conta(`atributo:${this.id || this.tagName}.${k}`); return this._attrs.has(k) ? this._attrs.get(k) : null; }
    removeAttribute(k) { this._attrs.delete(k); } hasAttribute(k) { return this._attrs.has(k); }
    toggleAttribute(k, f) { const on = f === undefined ? !this._attrs.has(k) : !!f; on ? this._attrs.set(k, "") : this._attrs.delete(k); return on; }
    addEventListener(t, f) { if (!this._ouvintes.has(t)) this._ouvintes.set(t, []); this._ouvintes.get(t).push(f); }
    removeEventListener(t, f) { const l = this._ouvintes.get(t); if (l) this._ouvintes.set(t, l.filter((x) => x !== f)); }
    dispatchEvent(ev) { ev.target = ev.target || this; ev.currentTarget = this; (this._ouvintes.get(ev.type) || []).slice().forEach((f) => f.call(this, ev)); const h = this[`on${ev.type}`]; if (typeof h === "function") h.call(this, ev); return true; }
    click() { sinais.cliques.push(this.id || this.tagName); this.dispatchEvent(new Evento("click")); }
    focus() {} blur() {} select() {} scrollTo() {} scrollBy() {} scrollIntoView() {} showModal() { this.open = true; } close() { this.open = false; }
    animate() { return { finished: Promise.resolve(), cancel() {}, onfinish: null }; }
    getBoundingClientRect() { return { top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0 }; }
    getClientRects() { return []; }
    appendChild(c) { if (c && typeof c === "object") { c.parentNode = this; c.parentElement = this; this.children.push(c); } return c; }
    append(...cs) { cs.forEach((c) => this.appendChild(c)); } prepend(...cs) { cs.forEach((c) => this.appendChild(c)); }
    insertBefore(c) { return this.appendChild(c); } removeChild(c) { const i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); return c; }
    replaceChildren(...cs) { this.children.length = 0; cs.forEach((c) => this.appendChild(c)); } replaceWith() {}
    remove() { if (this.parentNode) this.parentNode.removeChild(this); }
    insertAdjacentHTML(_, html) { this._html += String(html); } insertAdjacentElement(_, el) { return this.appendChild(el); } insertAdjacentText() {}
    querySelector(sel) { conta(`seletor:${sel}`); const k = `${this.id || this.tagName} ${sel}`; if (!porSeletor.has(k)) porSeletor.set(k, new Elemento("div")); return porSeletor.get(k); } querySelectorAll(sel) { conta(`seletor:${sel}`); return []; }
    getElementsByClassName() { return []; } getElementsByTagName() { return []; }
    closest() { return null; } matches() { return false; } contains(o) { return o === this; }
    cloneNode() { return new Elemento(this.tagName); }
    setPointerCapture() {} releasePointerCapture() {} requestFullscreen() { return Promise.resolve(); }
    checkValidity() { return true; } reportValidity() { return true; } setCustomValidity() {}
    play() { return Promise.resolve(); } pause() {} load() {}
    getContext() { return null; } toDataURL() { return ""; }
  }
  class Evento { constructor(type, init = {}) { this.type = type; Object.assign(this, init); this.defaultPrevented = false; } preventDefault() { this.defaultPrevented = true; } stopPropagation() {} stopImmediatePropagation() {} }
  class EventoCustom extends Evento { constructor(t, init = {}) { super(t, init); this.detail = init.detail; } }

  const body = new Elemento("body"), head = new Elemento("head"), html = new Elemento("html");
  const documento = {
    nodeType: 9, readyState: "complete", visibilityState: "visible", hidden: false, title: "", referrer: "", cookie: "",
    body, head, documentElement: html, activeElement: body, fonts: { ready: Promise.resolve() },
    getElementById(id) { if (!porId.has(id)) { const e = new Elemento("div", id); e.parentNode = body; e.parentElement = body; porId.set(id, e); } return porId.get(id); },
    // Como numa página completa: todo seletor acha um elemento (o mesmo
    // objeto para o mesmo seletor); listas vêm vazias.
    querySelector(sel) { conta(`seletor:${sel}`); const m = /^#([\w-]+)$/.exec(sel); if (m) return documento.getElementById(m[1]); if (!porSeletor.has(sel)) porSeletor.set(sel, new Elemento("div")); return porSeletor.get(sel); },
    querySelectorAll(sel) { conta(`seletor:${sel}`); return []; },
    getElementsByClassName() { return []; }, getElementsByTagName() { return []; },
    createElement(t) { return new Elemento(t); }, createElementNS(_, t) { return new Elemento(t); },
    createTextNode(t) { const e = new Elemento("#text"); e.textContent = t; return e; },
    createDocumentFragment() { return new Elemento("#fragment"); },
    _ouvintes: new Map(),
    addEventListener(t, f) { if (!this._ouvintes.has(t)) this._ouvintes.set(t, []); this._ouvintes.get(t).push(f); },
    removeEventListener() {}, dispatchEvent(ev) { (this._ouvintes.get(ev.type) || []).forEach((f) => f(ev)); return true; },
    execCommand() { return false; }, hasFocus() { return true; },
  };

  const armazenamento = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), clear: () => m.clear(), key: (i) => [...m.keys()][i] || null, get length() { return m.size; } }; };
  const ouvintesJanela = new Map();
  const vazioObs = class { observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } };
  const win = {
    document: documento,
    location: { href: `${base}${pathname}${search}`, origin: base, protocol: "http:", host: new URL(base).host, hostname: new URL(base).hostname, pathname, search, hash: "", assign() {}, replace() {}, reload() {} },
    history: { length: 1, state: null, pushState() {}, replaceState() {}, back() {}, forward() {}, go() {} },
    navigator: { userAgent: "node-sem-tela", language: "pt-BR", languages: ["pt-BR"], onLine: true, vibrate() { return false; }, clipboard: { writeText: () => Promise.resolve() } },
    localStorage: armazenamento(), sessionStorage: armazenamento(),
    innerWidth: 390, innerHeight: 844, devicePixelRatio: 1, scrollX: 0, scrollY: 0, pageYOffset: 0,
    screen: { width: 390, height: 844 },
    matchMedia: () => ({ matches: false, media: "", addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }),
    getComputedStyle: () => new Proxy({ getPropertyValue: () => "" }, { get: (o, k) => (k in o ? o[k] : "") }),
    requestAnimationFrame: (cb) => setTimeout(() => cb(Date.now()), 0), cancelAnimationFrame: (h) => clearTimeout(h),
    requestIdleCallback: (cb) => setTimeout(() => cb({ timeRemaining: () => 10, didTimeout: false }), 0), cancelIdleCallback: (h) => clearTimeout(h),
    scrollTo() {}, scrollBy() {}, focus() {}, blur() {}, print() {}, open() { return null; },
    alert() {}, confirm() { return true; }, prompt() { return null; },
    addEventListener(t, f) { if (!ouvintesJanela.has(t)) ouvintesJanela.set(t, []); ouvintesJanela.get(t).push(f); },
    removeEventListener() {}, dispatchEvent(ev) { (ouvintesJanela.get(ev.type) || []).forEach((f) => f(ev)); return true; },
    setTimeout, clearTimeout, setInterval, clearInterval, queueMicrotask, structuredClone,
    URL, URLSearchParams, TextEncoder, TextDecoder, AbortController, Blob: globalThis.Blob, FormData: globalThis.FormData,
    Headers: globalThis.Headers, Request: globalThis.Request, Response: globalThis.Response, crypto: globalThis.crypto, performance: globalThis.performance,
    Event: Evento, CustomEvent: EventoCustom, KeyboardEvent: Evento, MouseEvent: Evento, PointerEvent: Evento,
    HTMLElement: Elemento, Element: Elemento, Node: Elemento, HTMLInputElement: Elemento,
    IntersectionObserver: vazioObs, MutationObserver: vazioObs, ResizeObserver: vazioObs,
    Audio: class { play() { return Promise.resolve(); } pause() {} }, Image: class extends Elemento { constructor() { super("img"); } },
    console,
    // fetch com a origem do servidor e o cookie da sessão (como no navegador).
    async fetch(url, opts = {}) {
      const alvo = /^https?:/.test(url) ? url : base + url;
      const headers = new Headers(opts.headers || {});
      const c = cookie(); if (c) headers.set("cookie", c);
      const res = await nodeFetch(alvo, { ...opts, headers, redirect: "manual" });
      const sc = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
      sc.forEach(setCookie);
      return res;
    },
  };
  win.window = win; win.self = win; win.globalThis = win; win.top = win; win.parent = win;
  return { win, documento, sinais, porId };
}

module.exports = { criarJanela };
