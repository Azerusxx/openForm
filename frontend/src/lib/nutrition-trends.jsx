import React from 'react'
import { dayTotals } from './nutrition.js'
import { analyzeWeightTrend } from './nutrition-analysis.js'
const shift=(day,n)=>{const [y,m,d]=day.split('-').map(Number);return new Date(Date.UTC(y,m-1,d+n)).toISOString().slice(0,10)}
const round=x=>Math.round(x*10)/10
export function trendSeries(entries=[],weights=[],anchor,window='30',unit='kg') {
 const end=anchor, first=window==='all'?null:shift(end,1-Number(window))
 const dates=[...(entries||[]).map(e=>e.date),...(weights||[]).map(w=>w.d)].filter(x=>typeof x==='string'&&x<=end&&(!first||x>=first))
 const start=first||[...dates].sort()[0]||shift(end,-29)
 const dayCount=Math.max(1,Math.min(1500,Math.round((new Date(end+'T12:00:00Z')-new Date(start+'T12:00:00Z'))/86400000)+1))
 const dayList=Array.from({length:dayCount},(_,i)=>shift(start,i))
 const weightReport=analyzeWeightTrend(weights,end,window,unit)
 const byWeight=new Map(weightReport.weights.map(x=>[x.date,x.weight]))
 const stored=new Set(entries.filter(e=>e.date>=start&&e.date<=end).map(e=>e.date))
 const daily=dayList.map(date=>({date,weight:byWeight.get(date)??null,
   ...stored.has(date)?dayTotals(entries,date):{kcal:null,protein:null,carbs:null,fat:null}}))
 const weeks=new Map()
 for(const day of daily){
   const dt=new Date(day.date+'T12:00:00Z');dt.setUTCDate(dt.getUTCDate()-(dt.getUTCDay()+6)%7)
   const key=dt.toISOString().slice(0,10)
   const group=weeks.get(key)||[];group.push(day);weeks.set(key,group)
 }
 const weekly=[...weeks].map(([date,days])=>{
   const logged=days.filter(x=>x.kcal!==null),w=days.filter(x=>x.weight!==null)
   const avg=k=>logged.length?round(logged.reduce((s,d)=>s+d[k],0)/logged.length):null
   return {date,kcal:avg('kcal'),protein:avg('protein'),weight:w.length?round(w.reduce((s,d)=>s+d.weight,0)/w.length):null,
     coverage:logged.length,days:days.length,weightCount:w.length}
 })
 return {daily,weekly,start,end,weight:weightReport}
}
function Line({points,min,max,width,height,color,drawDots=true}) {
 let path='',prev=false
 points.forEach((p,i)=>{if(p.value===null){prev=false;return}
   const x=(i/Math.max(1,points.length-1))*width
   const y=height-((p.value-min)/Math.max(.01,max-min))*height
   path+=(prev?' L':' M')+round(x)+' '+round(y);prev=true})
 return <><path d={path} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
 {drawDots&&points.length<=75&&points.map((p,i)=>p.value===null?null:<circle key={i} cx={i/Math.max(1,points.length-1)*width} cy={height-((p.value-min)/Math.max(.01,max-min))*height} r="2.5" fill={color}/>)}</>
}
export default function NutritionTrendChart({data=[],field='weight',target=null,title='',bars=false,color='#ff443c',unit='kg',minZero=false}) {
 const active=data.filter(x=>Number.isFinite(x[field])).map(x=>Number(x[field]))
 if(!active.length)return <div className="of-dim">Noch keine Daten im gewählten Zeitraum.</div>
 const values=target!=null?[...active,target]:active
 let min=minZero?0:Math.min(...values),max=Math.max(...values)
 if(max===min){min-=minZero?0:1;max+=1}
 const pad=minZero?0:(max-min)*.13
 min-=pad;max+=pad
 const w=520,h=155,pts=data.map(x=>({value:Number.isFinite(x[field])?x[field]:null}))
 return <div className="of-chart-wrap"><strong>{title}</strong>
  <svg viewBox="0 0 560 205" role="img" aria-label={title+', '+active.length+' Datenpunkte'} style={{width:'100%',height:'auto'}}>
   {[0,.5,1].map(v=><g key={v}><line x1="30" x2="550" y1={20+(1-v)*h} y2={20+(1-v)*h} stroke="currentColor" opacity=".15" strokeDasharray="4 5"/><text x="25" textAnchor="end" y={24+(1-v)*h} fill="currentColor" fontSize="11" opacity=".65">{round(min+(max-min)*v)}</text></g>)}
   <g transform="translate(30 20)">{target!=null&&<line x1="0" x2={w} y1={h-(target-min)/(max-min)*h} y2={h-(target-min)/(max-min)*h} stroke="#facc15" strokeDasharray="7 5" strokeWidth="2"/>}
   {bars?data.map((p,i)=>!Number.isFinite(p[field])?null:<rect key={i} x={i*w/data.length+1} width={Math.max(1,w/data.length-2)} y={h-(p[field]-min)/(max-min)*h} height={(p[field]-min)/(max-min)*h} fill={color} opacity=".85" rx="2"/>)
   :<Line points={pts} min={min} max={max} width={w} height={h} color={color} drawDots={data.length<85}/>}</g>
   <text x="30" y="196" fill="currentColor" fontSize="11" opacity=".65">{data[0]?.date?.slice(5)}</text>
   <text x="550" y="196" textAnchor="end" fill="currentColor" fontSize="11" opacity=".65">{data.at(-1)?.date?.slice(5)}</text>
  </svg>
  <small>{active.length} erfasste Werte · {unit}{target!=null?' · gelb = Ziel':''}. Leere Tage bleiben ohne Wert.</small>
 </div>
}
