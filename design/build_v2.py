import math
OWL_D='M24 14.6L45 2.476L41 9.404L41 28L24 45L7 28L7 9.404L3 2.476Z M26.151 21.758A6 6 0 1 0 36.082 16.024Z M21.849 21.758A6 6 0 1 1 11.918 16.024Z M29.1 22.321A2.6 2.6 0 1 0 34.3 22.321A2.6 2.6 0 1 0 29.1 22.321Z M13.7 22.321A2.6 2.6 0 1 0 18.9 22.321A2.6 2.6 0 1 0 13.7 22.321Z M24 24.299L27.985 26.599L24 37.913L20.015 26.599Z'
BEAK='M24 25.8L26.4 27.186L24 34L21.6 27.186Z'
def owl(s,f='var(--t1)'): return f'<svg width="{s}" height="{s}" viewBox="0 0 48 48"><path fill="{f}" fill-rule="evenodd" d="{OWL_D}"/><path fill="var(--a)" d="{BEAK}"/></svg>'
# chart
W,H,PT,PB=342,118,14,20
lo,hi=3600,6400
X=lambda d:8+(d-1)/29*(W-16)
Y=lambda v:PT+(hi-v)/(hi-lo)*(H-PT-PB)
past=[(1,6200),(1,6200),(2,6000),(4,5900),(5,5850),(7,5600),(8,5520),(10,5300),(11,5120),(12,5000)]
fut=[(12,5000),(15,5000),(15,4650),(20,4650),(20,4500),(30,4500),(30,4000)]
def pts(L): return ' '.join(f'{X(d):.1f},{Y(v):.1f}' for d,v in L)
area='M'+pts(past)+f' L{X(12):.1f},{H-PB} L0,{H-PB} Z'
farea='M'+pts(fut)+f' L{X(30):.1f},{H-PB} L{X(12):.1f},{H-PB} Z'
marks=''.join(f'<circle cx="{X(d):.1f}" cy="{Y(v):.1f}" r="3.5" fill="var(--bg)" stroke="var(--a)" stroke-width="1.5"/>' for d,v in [(15,4650),(20,4500),(30,4000)])
ticks=''.join(f'<text x="{X(d):.1f}" y="{H-6}" text-anchor="middle">{d}</text>' for d in [1,8,15,22,30])
chart=f'''<svg width="{W}" height="{H}" viewBox="0 0 {W} {H}" class="ch">
<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--t1)" stop-opacity=".16"/><stop offset="1" stop-color="var(--t1)" stop-opacity="0"/></linearGradient>
<linearGradient id="g2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--a)" stop-opacity=".18"/><stop offset="1" stop-color="var(--a)" stop-opacity="0"/></linearGradient></defs>
<line x1="0" x2="{W}" y1="{Y(4000):.1f}" y2="{Y(4000):.1f}" stroke="var(--a)" stroke-opacity=".35" stroke-dasharray="2 4"/>
<path d="{area}" fill="url(#g)"/><path d="{farea}" fill="url(#g2)"/>
<polyline points="{pts(past)}" fill="none" stroke="var(--t1)" stroke-width="2" stroke-linejoin="round"/>
<polyline points="{pts(fut)}" fill="none" stroke="var(--a)" stroke-width="2" stroke-dasharray="5 4" stroke-linejoin="round"/>
<line x1="{X(12):.1f}" x2="{X(12):.1f}" y1="{PT}" y2="{H-PB}" stroke="var(--b2)"/>
{marks}<circle cx="{X(12):.1f}" cy="{Y(5000):.1f}" r="5" fill="var(--t1)"/><circle cx="{X(12):.1f}" cy="{Y(5000):.1f}" r="10" fill="var(--t1)" opacity=".12"/>
<text x="{X(12)+8:.1f}" y="{PT+8}" class="lb">Aujourd'hui</text>
<text x="{W-8}" y="{Y(4000)+14:.1f}" text-anchor="end" class="lb a">4 000 au 30</text>
<g class="tk">{ticks}</g></svg>'''
# icons
I={'home':'<path d="M4 11l8-7 8 7v9h-5v-6H9v6H4z"/>','cal':'<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>','chart':'<path d="M5 20V10M12 20V4M19 20v-7"/>','set':'<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/>'}
def nav(on):
    labs=[('home','Accueil'),('cal','Échéances'),('chart','Analyse'),('set','Réglages')]
    return '<div class="nav">'+''.join(f'<div class="ni{" on" if k==on else ""}"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">{I[k]}</svg><span>{l}</span></div>' for k,l in labs)+'</div>'
def head(right='Novembre'):
    return f'<div class="top"><div class="brand">{owl(22)}</div><div class="pill">{right}</div></div>'
up=[('15','Assurance','Prélèvement','−350'),('20','Téléphone','Prélèvement','−150')]
rows=''.join(f'<div class="row"><div class="d"><b>{d}</b>nov</div><div class="n">{n}<span>{s}</span></div><div class="m">{m}</div></div>' for d,n,s,m in up)
def home(cls=''):
    return f'''<div class="p {cls}">{head()}
<div class="k">Libre jusqu'à la paie</div>
<div class="big">4 000<small>MAD</small></div>
<div class="sub">Solde 5 000 · <b>1 000 déjà réservés</b> pour 3 sorties</div>
<div class="stats"><div><span class="k">Par jour</span><b>222</b></div><div><span class="k">Paie</span><b>18 j</b></div><div><span class="k">Dépensé</span><b>45</b></div></div>
<div class="card chc"><div class="h"><span class="k">Projection du mois</span><span class="lg"><i></i>réel <i class="a"></i>prévu</span></div>{chart}</div>
<div class="card"><div class="h"><span class="k">Prochaines sorties</span><a>+1 autre</a></div>{rows}</div>
<button class="fab" aria-label="Ajouter une dépense">+</button>{nav('home')}<div class="ex">Données d'exemple</div></div>'''
# calendar
bills={1:'in',5:'',15:'o',20:'o',30:'o'}
cal='<div class="cal">'+''.join(f'<span class="wd">{w}</span>' for w in 'LMMJVSD')
start=6 # Nov 1 2026 is Sunday -> index 6
cal+='<span></span>'*start
for d in range(1,31):
    c=['day']
    if d==12:c.append('today')
    if d<12:c.append('past')
    dot=''
    if d==1: dot='<i class="in"></i>'
    if d in (15,20,30): dot='<i></i>'
    cal+=f'<span class="{" ".join(c)}">{d}{dot}</span>'
cal+='</div>'
fixed=[('01','Salaire','Si week-end, jour ouvré avant','+6 000',True),('01','Loyer','Virement','−800',False),('15','Assurance','Prélèvement','−350',False),('20','Téléphone','Prélèvement','−150',False),('31','Abonnement','Mois courts, dernier jour','−500',False)]
frows=''.join(f'<div class="row"><div class="d"><b>{d}</b></div><div class="n">{n}<span>{s}</span></div><div class="m{" pos" if p else ""}">{m}</div></div>' for d,n,s,m,p in fixed)
ech=f'''<div class="p">{head('+ Ajouter')}
<div class="k">Chaque mois</div><div class="t">Échéances</div>
<div class="sub">Entrées <b class="wt">6 000</b> · Sorties <b>1 800</b> · Reste <b class="wt">4 200</b></div>
<div class="card">{cal}</div>
<div class="card">{frows}</div>
{nav('cal')}<div class="ex">Données d'exemple</div></div>'''
# donut
cats=[('Logement',800,'var(--t1)'),('Cafés & sorties',640,'var(--a)'),('Abonnements',500,'var(--t2)'),('Transport',310,'var(--b2)')]
tot=sum(c[1] for c in cats);R=58;C=2*math.pi*R;off=0;seg=''
for n,v,col in cats:
    L=v/tot*C; seg+=f'<circle r="{R}" cx="80" cy="80" fill="none" stroke="{col}" stroke-width="16" stroke-dasharray="{L-3:.1f} {C:.1f}" stroke-dashoffset="{-off:.1f}" transform="rotate(-90 80 80)"/>'; off+=L
donut=f'<svg width="160" height="160">{seg}<text x="80" y="78" text-anchor="middle" class="dn">2 250</text><text x="80" y="98" text-anchor="middle" class="dl">MAD en octobre</text></svg>'
leg=''.join(f'<div class="li"><i style="background:{col}"></i><span>{n}</span><b>{v}</b></div>' for n,v,col in cats)
ana=f'''<div class="p">{head('Octobre')}
<div class="k">Analyse</div><div class="t">Où est allé<br>ton argent</div>
<div class="card dc">{donut}<div class="leg2">{leg}</div></div>
<div class="ins"><div class="ic">↗</div><div><b>Cafés &amp; sorties +38 %</b><p>À ce rythme, 880 MAD fin novembre. Plafond conseillé : 600.</p></div></div>
<div class="ins"><div class="ic">?</div><div><b>Abonnement oublié ?</b><p>89 MAD chaque mois, aucune utilisation depuis 3 mois.</p></div></div>
<div class="ins"><div class="ic">◎</div><div><b>Objectif épargne</b><p>1 200 / 3 000 MAD. 300 par mois et c'est atteint en mai.</p><div class="pb"><i style="width:40%"></i></div></div></div>
{nav('chart')}<div class="ex">Données d'exemple</div></div>'''
tg=f'''<div class="p tg"><div class="tgh"><div class="av">{owl(24)}</div><div><div style="font-weight:500">Dynamogic Money</div><div style="font-size:12px;color:var(--t2)">bot privé · toi seul</div></div></div>
<div class="dt">Aujourd'hui</div>
<div class="bub"><span class="bk">Bonjour</span><span class="bn">4 000 MAD</span>libres jusqu'à la paie, soit <b>222 / jour</b>.<span class="tm">08:00</span></div>
<div class="bub me">45 café<span class="tm">10:12</span></div>
<div class="bub">Noté dans <b>Cafés &amp; sorties</b>. Libre : <b>3 955 MAD</b>.<span class="tm">10:12</span></div>
<div class="bub"><span class="bk">Demain</span>Assurance <b>−350 MAD</b>. Déjà réservée, rien ne change.<span class="tm">19:00</span></div>
<div class="bub warn"><span class="bk a">Attention</span>À ce rythme, ton libre passe sous <b>1 000 MAD</b> le 24.<span class="tm">19:00</span></div>
<div class="kb"><span>Solde libre</span><span>À venir</span><span>Analyse</span></div>
<div class="ex">Données d'exemple · jamais le solde complet</div></div>'''
screens=[('01 · Accueil',home()),('02 · Échéances',ech),('03 · Analyse',ana),('04 · Telegram',tg),('05 · Accueil, clair',home('light'))]
css=open('v2.css').read()
head = (
    '<!doctype html><html lang="fr"><head><meta charset="utf-8">'
    '<meta name="viewport" content="width=device-width, initial-scale=1">'
    '<meta name="referrer" content="no-referrer">'
    '<meta name="theme-color" content="#0E0F11">'
    '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'none\'; style-src \'self\' \'unsafe-inline\'; font-src \'self\'; img-src \'self\' data:; connect-src \'none\'; object-src \'none\'; base-uri \'none\'; form-action \'none\'; frame-ancestors \'none\'">'
    '<title>Money Tracker — écrans</title>'
    '<link rel="icon" href="../favicon.ico" sizes="48x48">'
    '<link rel="icon" href="../favicon.svg" type="image/svg+xml">'
    '<link rel="apple-touch-icon" href="../apple-touch-icon-180.png">'
    '<link rel="stylesheet" href="../fonts/fonts.css"><style>'
)
html = head + css + '</style></head><body><a class="demo-back" href="../index.html">Démo</a>' + ''.join(f'<div class="w"><div class="cap">{c}</div>{s}</div>' for c,s in screens) + '</body></html>' 
open('screens-v2.html','w').write(html)
