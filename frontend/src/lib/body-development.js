// Body development is an observational trend, never a medical or body-fat prediction.
// Keep user-entered measurements untouched. Weight is in the profile's kg/lb unit,
// while measurement fields are stored in centimetres irrespective of profile unit.
const DAY_MS=86400000
const isoDay=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&!Number.isNaN(Date.parse(x+'T12:00:00Z'))&&new Date(x+'T12:00:00Z').toISOString().slice(0,10)===x
const at=x=>Date.parse(x+'T12:00:00Z')
const round=(x,n=1)=>Math.round(x*10**n)/10**n
const median=arr=>{const v=[...arr].sort((a,b)=>a-b);return v.length?v.length%2?v[(v.length-1)/2]:(v[v.length/2-1]+v[v.length/2])/2:null}
const addDays=(iso,days)=>new Date(at(iso)+days*DAY_MS).toISOString().slice(0,10)
const monday=iso=>{const d=new Date(at(iso)),dow=(d.getUTCDay()+6)%7;return addDays(iso,-dow)}
export function weightWeeks(entries,today,windowDays=91){
 if(!isoDay(today))return []
 const latest=at(today),floor=latest-windowDays*DAY_MS
 const unique=new Map()
 for(const v of Array.isArray(entries)?entries:[]){
  if(!isoDay(v?.d)||!(Number(v.w)>0)||!(Number(v.w)<650)||at(v.d)>latest||at(v.d)<floor)continue
  const prev=unique.get(v.d)
  if(!prev||Number(v.t||0)>=Number(prev.t||0))unique.set(v.d,v)
 }
 const weeks=new Map()
 for(const v of unique.values()){
  const key=monday(v.d)
  if(!weeks.has(key))weeks.set(key,[])
  weeks.get(key).push(Number(v.w))
 }
 return [...weeks.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([d,values])=>({
  d,t:at(d),y:values.reduce((a,b)=>a+b,0)/values.length,n:values.length,
 }))
}
// Theil-Sen median pair slopes resists single noisy readings better than a two-point extrapolation.
function trendFromPoints(points,today,{minPoints=4,minSpan=28,maxAge=21,maxAbsPerWeek=1.5,unit='kg',goal=null,validRange=[0,Infinity]}={}){
 if(!isoDay(today))return {status:'insufficient',points:[]}
 const filtered=(Array.isArray(points)?points:[]).filter(p=>isoDay(p?.d)&&Number.isFinite(p.y)&&p.y>validRange[0]&&p.y<validRange[1]&&at(p.d)<=at(today)).sort((a,b)=>a.d.localeCompare(b.d))
 const span=filtered.length>1?(at(filtered.at(-1).d)-at(filtered[0].d))/DAY_MS:0
 const base={points:filtered,n:filtered.length,spanDays:span,unit,latest:filtered.at(-1)||null}
 if(filtered.length<minPoints||span<minSpan)return {...base,status:'insufficient'}
 const age=(at(today)-at(filtered.at(-1).d))/DAY_MS
 if(age>maxAge)return {...base,status:'stale',ageDays:age}
 const slopes=[]
 for(let i=0;i<filtered.length;i++)for(let j=i+1;j<filtered.length;j++){
  const days=(at(filtered[j].d)-at(filtered[i].d))/DAY_MS
  if(days>=7)slopes.push((filtered[j].y-filtered[i].y)*7/days)
 }
 if(slopes.length<3)return {...base,status:'insufficient'}
 const perWeek=median(slopes)
 if(!Number.isFinite(perWeek)||Math.abs(perWeek)>maxAbsPerWeek)return {...base,status:'volatile',perWeek}
 const now=filtered.at(-1)
 // No claimed confidence interval: an intentionally broad scenario band around a 4-week extrapolation.
 const residuals=filtered.map(p=>Math.abs(p.y-(now.y+perWeek*(at(p.d)-at(now.d))/(7*DAY_MS))))
 const allowance=Math.max(unit==='lb'?0.9:unit==='kg'?0.4:0.6,median(residuals)*2,Math.abs(perWeek)*1.5)
 const estimate=now.y+perWeek*4
 const lower=Math.max(validRange[0],estimate-allowance),upper=Math.min(validRange[1],estimate+allowance)
 const stable=Math.abs(perWeek)<(unit==='lb'?0.22:unit==='kg'?0.10:0.15)
 let goalDate=null,goalWeeks=null
 if(goal!=null&&Number.isFinite(Number(goal))&&!stable){
  const g=Number(goal)
  const distance=g-now.y
  const weeks=distance/perWeek
  if(g>validRange[0]&&g<validRange[1]&&weeks>0&&weeks<=26){goalWeeks=weeks;goalDate=addDays(now.d,Math.ceil(weeks*7))}
 }
 return {...base,status:'ready',perWeek:round(perWeek,2),stable,projected:{d:addDays(now.d,28),y:round(estimate),lower:round(lower),upper:round(upper)},goalDate,goalWeeks}
}
export function weightForecast(bodyweight,today,{unit='kg',goal=null}={}){
 const points=weightWeeks(bodyweight,today)
 const bounds=unit==='lb'?[45,660]:[20,300]
 return trendFromPoints(points,today,{minPoints:4,minSpan:28,maxAge:21,maxAbsPerWeek:unit==='lb'?3.3:1.5,unit,goal,validRange:bounds})
}
export function circumferenceForecast(measurements,key,today,{unit='cm'}={}){
 if(!['waist','abdomen'].includes(key))return {status:'not-supported',points:[]}
 const entries=new Map()
 for(const v of Array.isArray(measurements)?measurements:[]){
  const val=Number(v?.[key])
  if(!isoDay(v?.d)||!(val>35&&val<220)||at(v.d)>at(today))continue
  const prev=entries.get(v.d)
  if(!prev||Number(v.t||0)>=Number(prev.t||0))entries.set(v.d,v)
 }
 const pts=[...entries.values()].filter(v=>at(v.d)>=at(today)-120*DAY_MS)
  .map(v=>({d:v.d,t:at(v.d),y:unit==='in'?v[key]/2.54:Number(v[key])}))
 const opts={minPoints:3,minSpan:28,maxAge:45,maxAbsPerWeek:unit==='in'?0.8:2,unit,validRange:unit==='in'?[13,87]:[35,220]}
 return trendFromPoints(pts,today,opts)
}
