// Offline, privacy-preserving QR hints. Do not request arbitrary URLs printed on gym devices.
// Unknown QR content is untrusted: names are only suggestions, never saved automatically.
const LABEL_KEYS = ['exercise','exercise_name','exercisename','machine','machine_name','machinename','equipment','name','title','workout'];
const WEAK_SEGMENTS = new Set(['qr','code','device','devices','equipment','exercise','exercises','machine','machines','workout','training','gym','app','view','details','en','de','com','www','html','php','index','id','go','scan','fit','fitness']);
const nonName = value => /^(?:\d+|[0-9a-f]{8,}|[0-9a-f]{8}-[0-9a-f-]{12,})$/i.test(value);
const norm = value => String(value||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim().replace(/\s+/g,' ');

export function qrExerciseHints(raw) {
  const value=String(raw||'').trim();
  if(!value || value.length>4096)return [];
  const hints=[];
  const add=(text,kind)=>{
    const decoded=String(text||'').replace(/[+_-]/g,' ').trim();
    const normalized=norm(decoded);
    if(!normalized||normalized.length<4||normalized.length>90||nonName(normalized)||WEAK_SEGMENTS.has(normalized))return;
    if(!hints.some(h=>h.normalized===normalized))hints.push({name:decoded,normalized,kind});
  };
  try{
    const url=new URL(value);
    // Only supported URL shapes, never fetch. Ignore query arguments like id, token, ref.
    if(!['https:','http:'].includes(url.protocol))return [];
    const q=url.searchParams;
    for(const key of LABEL_KEYS)if(q.has(key))add(q.get(key),'explicit');
    const segments=url.pathname.split('/').filter(Boolean).map(s=>decodeURIComponent(s));
    for(let i=1;i<segments.length;i++){
      if(WEAK_SEGMENTS.has(norm(segments[i-1])) && !nonName(segments[i]))add(segments[i],'path');
    }
  }catch{
    // Explicit plaintext 'Exercise: Leg Press' is usable, opaque manufacturer IDs are not.
    const match=value.match(/^(?:exercise|exercise name|machine|gerät|übung)\s*[:=]\s*(.{4,90})$/i);
    if(match)add(match[1],'explicit');
  }
  return hints.slice(0,5);
}

export function suggestQrExercises(raw, exercises, limit=4) {
  const hints=qrExerciseHints(raw);
  if(!hints.length)return [];
  const found=new Map();
  const matches=(name,hint)=>{
    const n=norm(name);
    if(!n)return 0;
    if(n===hint.normalized)return hint.kind==='explicit'?100:88;
    // For an unambiguous full-name substring, leave as a suggestion, never an auto-match.
    if(hint.normalized.length>=8 && (n.includes(hint.normalized)||hint.normalized.includes(n)))return 60;
    return 0;
  };
  for(const ex of exercises||[]){
    if(!ex?.id)continue;
    const name=String(ex.n||'');
    const score=Math.max(0,...hints.map(h=>matches(name,h)));
    if(score>0)found.set(ex.id,{id:ex.id,name,score,reason:score>=88?'Name im QR-Code':'Namensähnlichkeit'});
  }
  return [...found.values()].sort((a,b)=>b.score-a.score||a.name.localeCompare(b.name)).slice(0,Math.min(6,Math.max(0,limit)));
}
