// Activity energy is an approximation, NOT measured energy. Values from
// Compendium-style MET ranges. Gross and extra-above-rest are distinct.
export const ACTIVITY_CATALOG = [
 {id:'walk',label:'Spazierengehen',levels:[['Gemütlich',2.8],['Normal (ca. 5 km/h)',3.5],['Zügig',4.3]]},
 {id:'hike',label:'Wandern',levels:[['Leicht',4.5],['Mittel',5.5],['Anstrengend',6.5]]},
 {id:'bike',label:'Radfahren',levels:[['Locker',4],['Moderat',6],['Sportlich',8]]},
 {id:'run',label:'Laufen',levels:[['Locker',7],['Normal',8.3],['Schnell',10]]},
 {id:'strength',label:'Krafttraining',levels:[['Locker',3],['Normal (inkl. Pausen)',3.5],['Intensiv',5]]},
 {id:'clean',label:'Putzen',levels:[['Leicht',2.5],['Normal',3],['Anstrengend',3.5]]},
 {id:'garden',label:'Gartenarbeit',levels:[['Leicht',3],['Normal',4],['Anstrengend',5]]},
 {id:'carry',label:'Tragen und Schleppen',levels:[['Leicht',3.5],['Normal',5],['Anstrengend',6]]}
]
export const activityType = id => ACTIVITY_CATALOG.find(a=>a.id===id)
export function latestWeightKg(bodyweight=[],date,unit='kg',fallback=null) {
 const valid=(Array.isArray(bodyweight)?bodyweight:[])
  .filter(w=>typeof w?.d==='string' && w.d<=date && Number.isFinite(Number(w.w)) && Number(w.w)>0)
  .sort((a,b)=>b.d.localeCompare(a.d))
 const raw=valid[0]?.w ?? fallback
 const kg=Number(raw)*(unit==='lb'?0.45359237:1)
 return Number.isFinite(kg)&&kg>=25&&kg<=300 ? Math.round(kg*10)/10 : null
}
export function activityEnergy({type,level=1,minutes,weightKg,distanceKm=null,steps=null}) {
 const item=activityType(type)
 const met=item?.levels[Number(level)]?.[1]
 const duration=Number(minutes),weight=Number(weightKg)
 if(!met||!(duration>=1&&duration<=720)||!(weight>=25&&weight<=300)) return null
 const gross=Math.round(met*weight*duration/60)
 const net=Math.round((met-1)*weight*duration/60)
 const distance=distanceKm==null||distanceKm===''?null:Number(distanceKm)
 const stepCount=steps==null||steps===''?null:Number(steps)
 if(distance!==null&&(!Number.isFinite(distance)||distance<0||distance>500))return null
 if(stepCount!==null&&(!Number.isInteger(stepCount)||stepCount<0||stepCount>150000))return null
 return {name:item.label,type,level:Number(level),minutes:duration,met,weightUsed:weight,
   kcalGross:gross,kcalNet:net,kcal:net,unit:'kg',
   distanceKm:distance,steps:stepCount,source:'met_estimate',
   estimate:true}
}
export function normalizeActivity(a) {
 if(!a||typeof a.id!=='string'||typeof a.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(a.date)) return null
 const kcal=Number(a.kcalNet??a.kcal)
 if(!Number.isFinite(kcal)||kcal<0||kcal>10000||!String(a.name||'').trim())return null
 const modern=a.source==='met_estimate'||a.source==='health_connect'
 const numeric=(v,max)=>v===null||v===undefined||v===''?null:Number.isFinite(Number(v))&&Number(v)>=0&&Number(v)<=max?Number(v):null
 return {id:a.id,date:a.date,name:String(a.name).slice(0,120),
   kcal:Math.round(kcal),createdAt:Number(a.createdAt)||0,
   source:modern?a.source:'manual_legacy',type:modern?a.type||null:null,
   minutes:modern?numeric(a.minutes,720):null,met:modern?numeric(a.met,30):null,
   weightUsed:modern?numeric(a.weightUsed,300):null,
   kcalNet:modern?Math.round(kcal):null,
   kcalGross:modern?numeric(a.kcalGross,10000):null,
   distanceKm:modern?numeric(a.distanceKm,500):null,
   steps:modern?numeric(a.steps,150000):null,
   externalId:a.source==='health_connect'?String(a.externalId||''):null}
}
// Steps from another device, manually logged exercise, and gym sessions can
// overlap: only distinct explicit activities count. Imported records are
// deduplicated by provider ID, never accumulated on every sync.
export function mergeImportedActivities(existing=[],incoming=[]) {
 const ids=new Set(existing.filter(a=>a.externalId).map(a=>a.externalId))
 const out=[...existing]
 for(const item of incoming) if(item.externalId&&!ids.has(item.externalId)){
   const clean=normalizeActivity(item)
   if(clean){out.push(clean);ids.add(item.externalId)}
 }
 return out
}
export function activityDaySummary(activities=[],date,workouts=[]) {
 const todays=activities.filter(a=>a.date===date)
 const hasStrength=workouts.some(w=>w.date===date||w.d===date)
 const counted=todays.filter(a=>!(hasStrength&&a.type==='strength'))
 return {net:counted.reduce((v,a)=>v+Number(a.kcalNet??a.kcal??0),0),
   skipped:todays.length-counted.length,
   sessions:counted,
   legacy:counted.filter(x=>x.source==='manual_legacy').length}
}
