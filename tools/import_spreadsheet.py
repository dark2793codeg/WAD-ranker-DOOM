import json, re, sys, datetime
from pyxlsb import open_workbook
src, out = sys.argv[1], sys.argv[2]
def num(v):
    return v if isinstance(v,(int,float)) and not isinstance(v,bool) else None
def s(v):
    if v is None or v=='' : return ''
    if isinstance(v,float): return str(int(v)) if v.is_integer() else str(v)
    return str(v).strip()
def date(v):
    if not isinstance(v,(int,float)): return ''
    return (datetime.date(1899,12,30)+datetime.timedelta(days=int(v))).isoformat()
def secs(v):
    return round(v*86400) if isinstance(v,(int,float)) and v>0 else None
def slug(t):
    return re.sub(r'[^a-z0-9]+','-',t.lower()).strip('-') or 'wad'
IW={'doom','doom 2','thy flesh consumed','tnt: evilution (w/ midi pack)','plutonia (w/ midi pack)','no rest for the living','legacy of rust','sigil','sigil ii'}
wads=[];byname={};used=set()
with open_workbook(src) as wb:
    with wb.get_sheet('WAD_Catalog') as sh:
        for i,r in enumerate(sh.rows()):
            v=[c.v for c in r]+[None]*25
            if i<2 or not v[2]: continue
            t=s(v[2]); sid=slug(t); k=sid; n=2
            while k in used: k=f'{sid}-{n}'; n+=1
            used.add(k)
            w=dict(id=k,title=t,authors=s(v[3]),mapCount=int(v[4]) if num(v[4]) else None,release=date(v[5]),
                   iwad=s(v[6]),comp=s(v[7]),kills=num(v[8]),items=num(v[9]),secrets=num(v[10]),
                   q=num(v[11]),d=num(v[13]) if num(v[13]) is not None else num(v[12]),m=num(v[14]),
                   casual=s(v[18]),demo=s(v[19]),isIWAD=t.lower() in IW,review='',titlepic='',links='',
                   demoAttempts=None,maps=[])
            wads.append(w); byname[t]=w
    miss=set()
    with wb.get_sheet('Map_Catalog') as sh:
        for i,r in enumerate(sh.rows()):
            v=[c.v for c in r]+[None]*25
            if i<6 or not v[2] or not v[3]: continue
            w=byname.get(s(v[2]))
            if not w: miss.add(s(v[2])); continue
            w['maps'].append(dict(slot=s(v[7]),name=s(v[3]),authors=s(v[4]),midi=s(v[5]),midiBy=s(v[6]),
                q=num(v[8]),d=num(v[9]),m=num(v[10]),kills=num(v[11]),items=num(v[12]),secrets=num(v[13]),
                casual=s(v[14]),demo=s(v[15]),attempts=num(v[16]),rank=s(v[17]),uvTime=secs(v[19]),review='',shots=[]))
print('wads',len(wads),'maps',sum(len(w['maps']) for w in wads),'unmatched',sorted(miss)[:20], len(miss))
print('iwads',[w['title'] for w in wads if w['isIWAD']])
print('casual vals',sorted({m['casual'] for w in wads for m in w['maps']}))
print('demo vals',sorted({m['demo'] for w in wads for m in w['maps']}))
print('rank vals',sorted({m['rank'] for w in wads for m in w['maps']}))
print('no maps',[w['title'] for w in wads if not w['maps']][:30])
open(out,'w').write('window.SEED='+json.dumps(dict(version=1,wads=wads),separators=(',',':'))+';')
