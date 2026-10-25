// Rule-based optional recommendations, not recovery measurements. Never rewrite workout data.
const compound = /kniebeuge|beinpresse|kreuzheben|bankdrücken|bankdruecken|rudern|latzug|schulterdrücken|schulterdruecken|squat|deadlift|bench press|leg press|chest press|row|pulldown|shoulder press|hack squat/i
export function suggestRestSeconds({exercise='', previousSeconds=90, reps=null, intensity=null, userSeconds=null}={}){
 const manual=Number(userSeconds)
 if(userSeconds!=null&&Number.isFinite(manual)&&manual>0)return {seconds:manual,reason:'Eigene Pausenzeit',source:'manual'}
 const fallback=Number(previousSeconds)
 if(!(Number.isFinite(fallback)&&fallback>0))return {seconds:0,reason:'Timer ausgeschaltet',source:'off'}
 const name=String(exercise||'').trim()
 if(!name)return {seconds:fallback,reason:'Bisherige Standardpause',source:'default'}
 const heavy=compound.test(name)
 let sec=heavy?150:90
 if(reps!=null&&Number.isFinite(Number(reps))&&Number(reps)>0&&Number(reps)<=5)sec+=30
 if(intensity!=null&&Number.isFinite(Number(intensity))&&Number(intensity)>=9)sec+=30
 return {seconds:Math.max(45,Math.min(240,sec)),reason:heavy?'Mehrgelenkige Übung':'Moderate Belastung',source:'suggested'}
}
export function smartRestForSet({enabled=false,seconds=0,defaultSeconds=90,exercise='',reps=null,mode='reps',superset=false,warmup=false,customRest=false,specializedRest=false}={}){
 const unchanged={seconds,reason:'',source:'unchanged'}
 if(!enabled||!(seconds>0)||!(defaultSeconds>0)||mode!=='reps'||superset||warmup||customRest||specializedRest)return unchanged
 return suggestRestSeconds({exercise,reps,previousSeconds:seconds})
}
