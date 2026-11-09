/* ========================= CONFIG ========================= */
const COLORS = ['#ff3d7f', '#22d3ee', '#39ff88', '#ffc400'];
const CNAMES = ['Rosa', 'Ciano', 'Verde', 'Âmbar'];
const DURATION = 45;
const HOLES = [[24,17],[54,15],[80,21],[38,29],[68,34],[16,41],[50,45],[84,48],
               [28,56],[62,60],[14,67],[46,71],[80,73],[26,81],[58,85]];
const PREFIX = 'cacarobo-';
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
document.documentElement.style.setProperty('--c0', COLORS[0]);

/* ========================= Robô cyber ========================= */
function moleSVG(c){
  return `<svg viewBox="0 0 100 100">
   <path d="M50 8 V-4" stroke="${c}" stroke-width="3"/><circle cx="50" cy="-6" r="3.5" fill="${c}"/>
   <polygon points="30,8 70,8 94,30 94,72 70,94 30,94 6,72 6,30" fill="#0b1224" stroke="${c}" stroke-width="4"/>
   <polygon points="30,19 70,19 83,34 83,66 70,83 30,83 17,66 17,34" fill="none" stroke="${c}" stroke-opacity=".35" stroke-width="2"/>
   <rect x="23" y="37" width="54" height="19" rx="9.5" fill="#02050c" stroke="${c}" stroke-width="2"/>
   <circle class="eye" cx="38" cy="46.5" r="5" fill="${c}"/><circle class="eye" cx="62" cy="46.5" r="5" fill="${c}"/>
   <rect x="42" y="66" width="16" height="7" rx="3" fill="${c}" opacity=".9"/>
   <path d="M10 72 l-5 13 M22 82 l-3 12 M90 72 l5 13 M78 82 l3 12" stroke="${c}" stroke-width="4" stroke-linecap="round"/>
  </svg>`;
}
$('#logoBox').innerHTML = `<div class="logo">${moleSVG('#22d3ee')}</div>`;

/* ========================= Layout responsivo ========================= */
function fit(){
  const W = innerWidth, H = innerHeight;
  const bw = Math.min(W, 840), bh = H;
  const b = $('#board'); b.style.width = bw + 'px'; b.style.height = bh + 'px';
  const s = document.documentElement.style;
  s.setProperty('--hs', Math.max(34, Math.min(bw * .19, bh * .115, 104)) + 'px');
  s.setProperty('--u', Math.max(2.2, Math.min(bw / 100, bh / 170, 5.4)) + 'px');
}
let _rt; addEventListener('resize', () => { clearTimeout(_rt); _rt = setTimeout(fit, 80); }); addEventListener('orientationchange', () => setTimeout(fit, 120)); fit();

/* ========================= MOTOR ========================= */
class Engine {
  constructor(n, emit, strict){ this.n = n; this.emit = emit; this.strict = strict; }
  start(){
    this.scores = Array(this.n).fill(0); this.moles = new Map(); this.nextId = 1; this.bag = [];
    this.t0 = performance.now(); this.nextSpawn = this.t0 + 500; this.lastSec = DURATION;
    this.emit({t:'time', v:DURATION});
    this.timer = setInterval(() => this.tick(), 80);
  }
  stop(){ clearInterval(this.timer); }
  tick(){
    const now = performance.now(), el = (now - this.t0) / 1000, f = el / DURATION;
    const left = Math.max(0, Math.ceil(DURATION - el));
    if (left !== this.lastSec){ this.lastSec = left; this.emit({t:'time', v:left}); }
    for (const [id, m] of [...this.moles]) if (now >= m.die){ this.moles.delete(id); this.emit({t:'gone', id}); }
    if (el >= DURATION){ this.stop(); this.emit({t:'end', scores:this.scores.slice()}); return; }
    if (now >= this.nextSpawn && this.moles.size < this.n + 1 && el < DURATION - 1){
      const used = new Set([...this.moles.values()].map(m => m.hole));
      const free = HOLES.map((_, i) => i).filter(i => !used.has(i));
      const hole = free[Math.floor(Math.random() * free.length)];
      if (!this.bag.length) this.bag = [...Array(this.n).keys()].sort(() => Math.random() - .5);
      const owner = this.bag.pop(), id = this.nextId++;
      this.moles.set(id, {hole, owner, die: now + (1700 - 800 * f)});
      this.emit({t:'spawn', id, hole, owner});
      this.nextSpawn = now + (850 - 450 * f) + Math.random() * 250;
    }
  }
  tap(id, by){
    const m = this.moles.get(id);
    if (!m || (this.strict && by !== m.owner)) return;
    this.moles.delete(id); this.scores[m.owner]++;
    this.emit({t:'hit', id, by:m.owner, scores:this.scores.slice()});
  }
}

/* ========================= UI DO JOGO ========================= */
const UI = {
  mode:'local', n:2, me:0, names:[], holes:[], moles:{}, over:false, cdTimer:null, lock:null,
  show(id){ $$('.screen').forEach(s => s.classList.toggle('active', s.id === id)); },

  build(n, mode, me, names){
    this.n = n; this.mode = mode; this.me = me; this.names = names; this.moles = {}; this.over = false;
    $('#game').classList.toggle('rot', mode === 'local');
    const board = $('#board');
    board.querySelectorAll('.hole,.tab').forEach(e => e.remove());
    this.holes = HOLES.map(([x, y]) => {
      const h = document.createElement('div');
      h.className = 'hole'; h.style.left = x + '%'; h.style.top = y + '%';
      h.innerHTML = '<div class="pit"></div>'; board.appendChild(h); return h;
    });
    for (let i = 0; i < n; i++){
      const t = document.createElement('div');
      t.className = 'tab' + (mode === 'online' && i === me ? ' me' : '');
      t.dataset.p = i; t.id = 'tab' + i;
      t.innerHTML = (mode === 'online' ? `<small>${esc(names[i] || CNAMES[i])}</small>` : '') + '<span>0</span>';
      board.appendChild(t);
    }
    this.setTime(DURATION);
    fit(); this.show('game');
    try{ navigator.wakeLock && navigator.wakeLock.request('screen').then(l => this.lock = l).catch(() => {}); }catch(e){}
  },

  countdown(cb){
    const box = $('#count'), num = $('#countNum'), who = $('#countWho');
    const dot = i => `<span class="dot" style="--pc:${COLORS[i]}"></span>`;
    who.innerHTML = this.mode === 'online'
      ? `Você é ${dot(this.me)}<b style="font:inherit;color:${COLORS[this.me]};text-shadow:0 0 10px ${COLORS[this.me]}">${CNAMES[this.me]}</b><br>Toque nos robôs da sua cor!`
      : [...Array(this.n).keys()].map(i => dot(i) + CNAMES[i]).join(' &nbsp; ') + '<br>Cada um toca na sua cor!';
    box.classList.add('show');
    let c = 3; num.textContent = c; clearInterval(this.cdTimer);
    this.cdTimer = setInterval(() => {
      if (--c <= 0){ clearInterval(this.cdTimer); box.classList.remove('show'); cb && cb(); }
      else num.textContent = c;
    }, 1000);
  },

  setTime(v){
    $('#tnum').textContent = v;
    $('#timer').classList.toggle('low', v <= 10);
    $('#tfill').style.transform = 'scaleX(' + (v / DURATION) + ')';
  },

  onEvent(ev){
    if (this.over && ev.t !== 'end') return;
    switch(ev.t){
      case 'spawn': return this.spawn(ev);
      case 'gone':  return this.remove(ev.id, false);
      case 'hit':   this.setScores(ev.scores, ev.by); return this.remove(ev.id, true, ev.by);
      case 'time':  return this.setTime(ev.v);
      case 'end':   return this.end(ev.scores);
    }
  },

  spawn({id, hole, owner}){
    const old = this.holes[hole].querySelector('.mole'); if (old) old.remove();
    const el = document.createElement('div');
    el.className = 'mole'; el.style.setProperty('--mc', COLORS[owner]); el.innerHTML = moleSVG(COLORS[owner]);
    el.addEventListener('pointerdown', e => { e.preventDefault(); this.tap(id, owner, el); });
    this.holes[hole].appendChild(el);
    this.moles[id] = {el, hole, owner};
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('up')));
  },

  tap(id, owner, el){
    if (this.over) return;
    if (this.mode === 'local'){ App.engine && App.engine.tap(id, null); return; }
    if (owner !== this.me){ el.classList.remove('wrong'); void el.offsetWidth; el.classList.add('wrong'); return; }
    if (!Net.isHost) this.remove(id, true, this.me);       // resposta imediata no convidado
    Net.sendTap(id);
  },

  remove(id, hit, by){
    const m = this.moles[id]; if (!m) return;
    delete this.moles[id];
    const fx = document.createElement('div'); fx.className = 'fx'; this.holes[m.hole].appendChild(fx);
    if (hit){
      fx.style.setProperty('--fc', COLORS[by]);
      let h = '<div class="ring"></div><div class="plus">+1</div>';
      for (let i = 0; i < 6; i++) h += `<div class="shard" style="--a:${i * 60 + Math.random() * 20}deg"></div>`;
      fx.innerHTML = h;
      if (navigator.vibrate && this.mode === 'online' && by === this.me) navigator.vibrate(25);
    } else {
      let h = '';
      for (let i = 0; i < 5; i++){
        const a = Math.random() * 6.28, d = 18 + Math.random() * 26;
        h += `<div class="px" style="--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d}px"></div>`;
      }
      fx.innerHTML = h;
    }
    m.el.classList.remove('up'); m.el.classList.add('down');
    setTimeout(() => { m.el.remove(); fx.remove(); }, 600);
  },

  setScores(sc, by){
    sc.forEach((v, i) => { const t = $('#tab' + i); if (t) t.querySelector('span').textContent = v; });
    if (by != null){
      const t = $('#tab' + by);
      if (t){ t.classList.add('pop'); setTimeout(() => t.classList.remove('pop'), 130); }
    }
  },

  end(scores){
    this.over = true; this.setScores(scores);
    try{ this.lock && this.lock.release(); }catch(e){}
    Object.values(this.moles).forEach(m => m.el.remove()); this.moles = {};
    const order = scores.map((s, i) => ({i, s})).sort((a, b) => b.s - a.s);
    const best = order[0].s, win = order.filter(o => o.s === best);
    const nm = i => esc(this.names[i] || CNAMES[i]);
    $('#resTitle').innerHTML = win.length > 1 ? 'Empate!' :
      (this.mode === 'online' && win[0].i === this.me ? '🏆 Você venceu!' : `🏆 ${nm(win[0].i)} venceu!`);
    $('#rank').innerHTML = order.map((o, k) =>
      `<div class="rk ${o.s === best ? 'win' : ''}" style="--pc:${COLORS[o.i]}"><span>${k + 1}º</span><i></i><span>${nm(o.i)}</span><span class="n">${o.s}</span></div>`).join('');
    const online = this.mode === 'online';
    $('#again').style.display = (!online || Net.isHost) ? '' : 'none';
    $('#again').textContent = online ? 'Voltar para a sala' : 'Jogar de novo';
    setTimeout(() => { if (this.over) this.show('result'); }, 600);
  }
};

/* ========================= REDE (PeerJS) ========================= */
const Net = {
  peer:null, conn:null, isHost:false, code:'', started:false, players:[], myName:'', myIdx:0,

  genCode(){
    const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    return Array.from({length:4}, () => abc[Math.floor(Math.random() * abc.length)]).join('');
  },
  reset(){
    const p = this.peer; this.peer = null;
    try{ p && p.destroy(); }catch(e){}
    this.conn = null; this.players = []; this.started = false; this.isHost = false; App.stopEngine();
  },
  msg(t){ $('#onMsg').textContent = t || ''; },
  link(){ return location.origin === 'null' ? location.href.split('?')[0] + '?sala=' + this.code : location.origin + location.pathname + '?sala=' + this.code; },

  /* --- anfitrião --- */
  create(name, tries = 0){
    this.reset(); this.isHost = true; this.myName = name; this.myIdx = 0;
    this.code = this.genCode(); this.players = [{name, conn:null}];
    if (typeof Peer === 'undefined'){ this.msg('Sem internet ou biblioteca bloqueada.'); return; }
    this.msg('Criando sala...');
    const p = this.peer = new Peer(PREFIX + this.code);
    p.on('open', () => { this.msg(''); this.showLobby(); });
    p.on('disconnected', () => { try{ p.reconnect(); }catch(e){} });
    p.on('error', e => {
      if (e.type === 'unavailable-id' && tries < 5) return this.create(name, tries + 1);
      this.msg('Erro de conexão. Tente novamente.');
    });
    p.on('connection', c => this.hostAccept(c));
  },
  hostAccept(c){
    c.on('data', d => {
      if (d.t === 'join'){
        if (this.started || this.players.length >= 4){ c.send({t:'full'}); setTimeout(() => c.close(), 400); return; }
        this.players.push({name:String(d.name || 'Jogador').slice(0, 12), conn:c});
        c.send({t:'welcome', idx:this.players.length - 1});
        this.broadcastLobby();
      } else if (d.t === 'tap'){
        const i = this.players.findIndex(p => p.conn === c);
        if (i >= 0 && App.engine) App.engine.tap(d.id, i);
      }
    });
    c.on('close', () => {
      const i = this.players.findIndex(p => p.conn === c);
      if (i < 0) return;
      if (!this.started){
        this.players.splice(i, 1);
        this.players.forEach((p, k) => p.conn && p.conn.send({t:'welcome', idx:k}));
        this.broadcastLobby();
      } else this.players[i].name += ' (saiu)';
    });
  },
  broadcast(m){ this.players.forEach(p => p.conn && p.conn.open && p.conn.send(m)); },
  broadcastLobby(){
    const names = this.players.map(p => p.name);
    this.broadcast({t:'lobby', names}); this.renderLobby(names);
  },
  startOnline(){
    if (this.players.length < 2) return;
    this.started = true;
    const names = this.players.map(p => p.name), n = names.length;
    this.broadcast({t:'start', n, names});
    this.beginGame(n, names, 0);
    App.stopEngine();
    const eng = App.engine = new Engine(n, ev => { this.broadcast(ev); UI.onEvent(ev); }, true);
    setTimeout(() => { if (App.engine === eng) eng.start(); }, 3200);
  },
  backToLobby(){
    this.started = false; App.stopEngine();
    this.broadcast({t:'lobbyback'}); this.broadcastLobby(); UI.show('lobby');
  },

  /* --- convidado --- */
  join(name, code){
    this.reset(); this.myName = name; this.code = code;
    if (typeof Peer === 'undefined'){ this.msg('Sem internet ou biblioteca bloqueada.'); return; }
    this.msg('Conectando...');
    const p = this.peer = new Peer();
    p.on('error', e => this.msg(e.type === 'peer-unavailable' ? 'Sala não encontrada.' : 'Erro de conexão. Tente novamente.'));
    p.on('open', () => {
      const c = this.conn = p.connect(PREFIX + code, {reliable:true});
      let ok = false;
      c.on('open', () => c.send({t:'join', name}));
      c.on('data', d => { ok = true; this.guestMsg(d); });
      c.on('close', () => { if (this.peer !== p) return; alert('A conexão com a sala foi encerrada.'); App.toMenu(); });
      setTimeout(() => { if (!ok && this.peer === p) this.msg('Não foi possível entrar. Confira o código.'); }, 10000);
    });
  },
  guestMsg(d){
    switch(d.t){
      case 'full': { this.msg('Sala cheia ou partida já iniciada.'); const p = this.peer; this.peer = null; try{ p.destroy(); }catch(e){} break; }
      case 'welcome': this.myIdx = d.idx; break;
      case 'lobby': if (!$('#lobby').classList.contains('active') && !this.started) this.showLobby(); this.renderLobby(d.names); break;
      case 'start': this.started = true; this.beginGame(d.n, d.names, this.myIdx); break;
      case 'lobbyback': this.started = false; UI.show('lobby'); break;
      default: UI.onEvent(d);
    }
  },
  sendTap(id){
    if (this.isHost){ App.engine && App.engine.tap(id, 0); }
    else if (this.conn && this.conn.open) this.conn.send({t:'tap', id});
  },

  /* --- telas --- */
  beginGame(n, names, me){ UI.build(n, 'online', me, names); UI.countdown(); },
  showLobby(){
    $('#roomCode').textContent = this.code;
    $('#startOnline').style.display = this.isHost ? '' : 'none';
    this.renderLobby(this.isHost ? this.players.map(p => p.name) : []);
    this.msg(''); UI.show('lobby');
  },
  renderLobby(names){
    $('#plist').innerHTML = [0, 1, 2, 3].map(i => names[i]
      ? `<div class="pl" style="--pc:${COLORS[i]}"><i></i>${esc(names[i])}${i === this.myIdx ? '<small>VOCÊ</small>' : ''}</div>`
      : `<div class="pl empty" style="--pc:#456"><i></i>Aguardando jogador...</div>`).join('');
    const n = names.length;
    $('#lobbyMsg').textContent = this.isHost
      ? (n < 2 ? 'Envie o código ou o link para seus amigos (mín. 2).' : `${n} jogadores prontos!`)
      : 'Aguardando o anfitrião iniciar...';
    $('#startOnline').disabled = n < 2;
  }
};

/* ========================= APP ========================= */
const App = {
  engine:null, localN:2,
  stopEngine(){ if (this.engine){ this.engine.stop(); this.engine = null; } },
  toMenu(){
    Net.reset(); this.stopEngine(); clearInterval(UI.cdTimer);
    $('#count').classList.remove('show'); UI.over = true; UI.show('menu');
  },
  startLocal(){
    const n = this.localN; this.stopEngine();
    UI.build(n, 'local', 0, []);
    UI.countdown(() => { this.engine = new Engine(n, ev => UI.onEvent(ev), false); this.engine.start(); });
  }
};

$$('[data-go]').forEach(b => b.addEventListener('click', () => { Net.msg(''); UI.show(b.dataset.go); }));
function legend(){
  $('#localLegend').innerHTML = [...Array(App.localN).keys()]
    .map(i => `<span><span class="dot" style="--pc:${COLORS[i]}"></span>${CNAMES[i]}</span>`).join('');
}
$$('#localPick .pick').forEach(b => b.addEventListener('click', () => {
  $$('#localPick .pick').forEach(x => x.classList.remove('sel')); b.classList.add('sel');
  App.localN = +b.dataset.n; legend();
}));
legend();
$('#localStart').addEventListener('click', () => App.startLocal());

try{ $('#nick').value = localStorage.getItem('ct_nick') || ''; }catch(e){}
const nick = () => {
  const v = $('#nick').value.trim() || 'Jogador';
  try{ localStorage.setItem('ct_nick', v); }catch(e){}
  return v;
};
function tryJoin(){
  const code = $('#joinCode').value.trim().toUpperCase();
  if (code.length !== 4){ Net.msg('Digite o código de 4 caracteres.'); return; }
  Net.join(nick(), code);
}
$('#createRoom').addEventListener('click', () => Net.create(nick()));
$('#joinRoom').addEventListener('click', tryJoin);
$('#joinCode').addEventListener('input', e => e.target.value = e.target.value.toUpperCase());
$('#joinCode').addEventListener('keydown', e => { if (e.key === 'Enter') tryJoin(); });
$('#nick').addEventListener('keydown', e => { if (e.key === 'Enter') $('#createRoom').click(); });
$('#startOnline').addEventListener('click', () => Net.startOnline());
$('#leaveRoom').addEventListener('click', () => App.toMenu());

function flash(btn, txt, orig){ btn.textContent = txt; setTimeout(() => btn.textContent = orig, 1600); }
$('#copyCode').addEventListener('click', () => {
  const b = $('#copyCode');
  (navigator.clipboard ? navigator.clipboard.writeText(Net.code) : Promise.reject())
    .then(() => flash(b, 'Copiado!', 'Copiar código'), () => flash(b, Net.code, 'Copiar código'));
});
$('#shareLink').addEventListener('click', () => {
  const b = $('#shareLink'), url = Net.link();
  if (navigator.share){ navigator.share({title:'Caça Robô', text:'Entre na minha sala: ' + Net.code, url}).catch(() => {}); return; }
  (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject())
    .then(() => flash(b, 'Link copiado!', 'Enviar link'), () => flash(b, 'Use o código', 'Enviar link'));
});
$('#quit').addEventListener('click', () => { if (confirm('Sair da partida?')) App.toMenu(); });
addEventListener('keydown', e => { if (e.key === 'Escape' && $('#game').classList.contains('active') && confirm('Sair da partida?')) App.toMenu(); });
$('#again').addEventListener('click', () => {
  if (UI.mode === 'local') App.startLocal(); else if (Net.isHost) Net.backToLobby();
});
$('#toMenu').addEventListener('click', () => App.toMenu());

/* link de convite: ?sala=ABCD abre direto o modo online com o código preenchido */
const inv = new URLSearchParams(location.search).get('sala');
if (inv){ $('#joinCode').value = inv.slice(0, 4).toUpperCase(); UI.show('onlineMenu'); }
