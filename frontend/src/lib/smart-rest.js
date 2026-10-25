// Optional rest recommendations, not physiological recovery measurements.
const compound=/kniebeuge|beinpresse|kreuzheben|bankdrücken|bankdruecken|rudern|latzug|schulterdrücken|schulterdruecken|squat|deadlift|bench press|leg press|chest press|row|pulldown|shoulder press|hack squat/i
const number=x=>x==null||x===''?null:Number.isFinite(Number(x))?Number(x):null
export const REST_CAP_SECONDS=210
export function repDropAtSameWeight(sets,index){
 if(!Array.isArray(sets)||!Number.isInteger(index)||index<=0||index>=sets.length)return false
 const curr=sets[index]
 if(!curr?.done||curr.phase==='warmup'||curr.warmup===true)return false
 const cw=number(curr.w),cr=number(curr.r)
 if(cw===null||cw<0||cr===null||cr<=0)return false
 for(let i=index-1;i>=0;i--){
   const prev=sets[i]
   if(!prev?.done||prev.phase==='warmup'||prev.warmup===true)continue
   const pw=number(prev.w),pr=number(prev.r)
   if(pw===null||pr===null||pr<=0)return false
   if(Math.abs(pw-cw)>0.001)return false
   return (pr-cr)/pr>0.15+1e-9
 }
 return false
}
export function suggestRestSeconds({exercise='',previousSeconds=90,reps=null,rir=null,rpe=null,failure=false,performanceDrop=false,userSeconds=null}={}){
 const manual=number(userSeconds)
 if(manual!==null&&manual>0)return {seconds:manual,reason:'Eigene Pausenzeit',source:'manual'}
 const previous=number(previousSeconds)
 if(previous===null||previous<=0)return {seconds:0,reason:'Timer ausgeschaltet',source:'off'}
 const name=String(exercise||'').trim()
 if(!name)return {seconds:previous,reason:'Bisherige Standardpause',source:'default'}
 const heavy=compound.test(name)
 let seconds=heavy?150:90
 const reasons=[heavy?'Mehrgelenkübung':'Isolationsübung']
 const count=number(reps)
 if(count!==null&&count>=1&&count<=5){seconds+=30;reasons.push('1–5 Wdh.')}
 const reserve=number(rir),effort=number(rpe)
 if(failure===true||(reserve!==null&&reserve>=0&&reserve<=1)||(reserve===null&&effort!==null&&effort>=9&&effort<=10)){
   seconds+=30;reasons.push('Nahe am Muskelversagen')
 }
 if(performanceDrop===true){seconds+=30;reasons.push('Wiederholungen −15 %')}
 return {seconds:Math.min(REST_CAP_SECONDS,seconds),reason:reasons.join(' · '),source:'suggested'}
}
export function smartRestForSet({enabled=false,seconds=0,defaultSeconds=90,exercise='',reps=null,rir=null,rpe=null,failure=false,performanceDrop=false,mode='reps',superset=false,warmup=false,customRest=false,specializedRest=false}={}){
 const unchanged={seconds,reason:'',source:'unchanged'}
 if(!enabled||!(seconds>0)||!(defaultSeconds>0)||mode!=='reps'||superset||warmup||customRest||specializedRest)return unchanged
 return suggestRestSeconds({exercise,reps,rir,rpe,failure,performanceDrop,previousSeconds:seconds})
}
export function suggestedRestForBand(context,band){
 const rir=band==='hard'?0:band==='normal'?2:band==='easy'?4:null
 if(rir===null)return null
 return suggestRestSeconds({...context,rir,rpe:null,failure:false})
}
