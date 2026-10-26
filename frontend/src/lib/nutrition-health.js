// Opt-in Health Connect step totals. Steps are informational, not a second
// activity-calorie entry: gym sessions and walking may cover the same steps.
import { isAndroid } from './mobile.js'
let native=null
async function api(){
 if(!(await isAndroid()))return null
 if(native)return native
 const {registerPlugin}=await import('@capacitor/core')
 native=registerPlugin('HealthConnect')
 return native
}
export async function healthStepStatus(){
 const p=await api()
 if(!p)return {status:'unsupported',granted:false}
 const st=await p.status()
 if(st.status!=='available')return {status:st.status,granted:false}
 const perms=await p.stepPermission()
 return {status:'available',granted:!!perms.granted,exerciseGranted:!!perms.exerciseGranted}
}
export async function healthStepsForDay(date,{ask=false}={}){
 const p=await api()
 if(!p)return {ok:false,reason:'unsupported'}
 const current=await healthStepStatus()
 if(current.status!=='available')return {ok:false,reason:current.status}
 let granted=current.granted
 if(!granted && ask)granted=!!(await p.requestStepPermission({scope:'steps'})).granted
 if(!granted)return {ok:false,reason:'permission'}
 const res=await p.readSteps({date})
 return {ok:true,date,steps:Number(res.steps)||0,source:'health_connect_aggregated'}
}

export async function healthWalkingSessionsForDay(date,{ask=false}={}){
 const p=await api()
 if(!p)return {ok:false,reason:'unsupported'}
 const current=await healthStepStatus()
 if(current.status!=='available')return {ok:false,reason:current.status}
 let granted=current.exerciseGranted
 if(!granted&&ask)granted=!!(await p.requestStepPermission({scope:'exercise'})).exerciseGranted
 if(!granted)return {ok:false,reason:'permission'}
 const res=await p.readWalkingSessions({date})
 return {ok:true,date,sessions:Array.isArray(res.sessions)?res.sessions:[],
   more:!!res.more,source:'health_connect'}
}

export async function requestHealthExercisePermission(){
 const p=await api()
 if(!p)return {ok:false,reason:'unsupported'}
 try {
  const result=await p.requestExercisePermission()
  return {ok:!!result.exerciseGranted,reason:result.exerciseGranted?'granted':'permission'}
 }catch(e){return {ok:false,reason:e?.message||'failed'}}
}
export async function healthConnectDiagnostic(date){
 const status=await healthStepStatus()
 if(status.status!=='available')return {...status,steps:null,error:status.status}
 if(!status.granted)return {...status,steps:null,error:'READ_STEPS nicht freigegeben'}
 try {
  const steps=await healthStepsForDay(date)
  return {...status,steps:steps.ok?steps.steps:null,error:steps.ok?null:steps.reason}
 }catch(e){return {...status,steps:null,error:e?.message||'Unbekannter Fehler'}}
}

export function describeHealthFailure(error) {
 const code=String(error?.code||error?.reason||'failed')
 if(code==='permission'||code==='permission_launch')return 'Berechtigung nicht erteilt oder Android-Berechtigungsdialog konnte nicht geöffnet werden.'
 if(code==='unavailable'||code==='unsupported')return 'Health Connect ist auf diesem Gerät nicht verfügbar.'
 return 'Health Connect Fehler: '+String(error?.message||code)
}
