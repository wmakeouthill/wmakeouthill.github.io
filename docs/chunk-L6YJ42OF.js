import{a as _}from"./chunk-PGCIYXVQ.js";import{a as D}from"./chunk-X6DVQTJY.js";import"./chunk-ZHXBRV26.js";import"./chunk-TT3O2PM2.js";import"./chunk-JAQMG2FV.js";import"./chunk-PNHIKR7X.js";import"./chunk-PQ5IGVWL.js";import"./chunk-MMAPXRQ3.js";import{a as F}from"./chunk-OGDVUDP2.js";import{l as y}from"./chunk-LSQUL7P6.js";import"./chunk-5WEKHKPQ.js";import{P as T,Q as O,R as S,S as k,T as R,U as I,V as E,o as A,q as L,y as w}from"./chunk-RRJCAFWN.js";import{b as o,d as M}from"./chunk-QVIQCWJJ.js";import"./chunk-PI3ZNEQN.js";import"./chunk-7IHKWOSV.js";import"./chunk-BYZEYO7O.js";import"./chunk-MOFZY53X.js";import"./chunk-2FSENJOC.js";import{a as C,g as b}from"./chunk-7IQ7MVDA.js";var h={showLegend:!0,ticks:5,max:null,min:0,graticule:"circle"},G={axes:[],curves:[],options:h},m=structuredClone(G),N=L.radar,U=o(()=>y(C(C({},N),w().radar)),"getConfig"),P=o(()=>m.axes,"getAxes"),X=o(()=>m.curves,"getCurves"),Y=o(()=>m.options,"getOptions"),Z=o(a=>{m.axes=a.map(t=>({name:t.name,label:t.label??t.name}))},"setAxes"),q=o(a=>{m.curves=a.map(t=>({name:t.name,label:t.label??t.name,entries:J(t.entries)}))},"setCurves"),J=o(a=>{if(a[0].axis==null)return a.map(e=>e.value);let t=P();if(t.length===0)throw new Error("Axes must be populated before curves for reference entries");return t.map(e=>{let r=a.find(n=>n.axis?.$refText===e.name);if(r===void 0)throw new Error("Missing entry for axis "+e.label);return r.value})},"computeCurveEntries"),K=o(a=>{let t=a.reduce((e,r)=>(e[r.name]=r,e),{});m.options={showLegend:t.showLegend?.value??h.showLegend,ticks:t.ticks?.value??h.ticks,max:t.max?.value??h.max,min:t.min?.value??h.min,graticule:t.graticule?.value??h.graticule}},"setOptions"),Q=o(()=>{T(),m=structuredClone(G)},"clear"),$={getAxes:P,getCurves:X,getOptions:Y,setAxes:Z,setCurves:q,setOptions:K,getConfig:U,clear:Q,setAccTitle:O,getAccTitle:S,setDiagramTitle:I,getDiagramTitle:E,getAccDescription:R,setAccDescription:k},tt=o(a=>{_(a,$);let{axes:t,curves:e,options:r}=a;$.setAxes(t),$.setCurves(e),$.setOptions(r)},"populate"),et={parse:o(a=>b(null,null,function*(){let t=yield D("radar",a);M.debug(t),tt(t)}),"parse")},at=o((a,t,e,r)=>{let n=r.db,i=n.getAxes(),l=n.getCurves(),s=n.getOptions(),c=n.getConfig(),d=n.getDiagramTitle(),p=F(t),u=rt(p,c),g=s.max??Math.max(...l.map(f=>Math.max(...f.entries))),x=s.min,v=Math.min(c.width,c.height)/2;nt(u,i,v,s.ticks,s.graticule),st(u,i,v,c),z(u,i,l,x,g,s.graticule,c),B(u,l,s.showLegend,c),u.append("text").attr("class","radarTitle").text(d).attr("x",0).attr("y",-c.height/2-c.marginTop)},"draw"),rt=o((a,t)=>{let e=t.width+t.marginLeft+t.marginRight,r=t.height+t.marginTop+t.marginBottom,n={x:t.marginLeft+t.width/2,y:t.marginTop+t.height/2};return a.attr("viewbox",`0 0 ${e} ${r}`).attr("width",e).attr("height",r),a.append("g").attr("transform",`translate(${n.x}, ${n.y})`)},"drawFrame"),nt=o((a,t,e,r,n)=>{if(n==="circle")for(let i=0;i<r;i++){let l=e*(i+1)/r;a.append("circle").attr("r",l).attr("class","radarGraticule")}else if(n==="polygon"){let i=t.length;for(let l=0;l<r;l++){let s=e*(l+1)/r,c=t.map((d,p)=>{let u=2*p*Math.PI/i-Math.PI/2,g=s*Math.cos(u),x=s*Math.sin(u);return`${g},${x}`}).join(" ");a.append("polygon").attr("points",c).attr("class","radarGraticule")}}},"drawGraticule"),st=o((a,t,e,r)=>{let n=t.length;for(let i=0;i<n;i++){let l=t[i].label,s=2*i*Math.PI/n-Math.PI/2;a.append("line").attr("x1",0).attr("y1",0).attr("x2",e*r.axisScaleFactor*Math.cos(s)).attr("y2",e*r.axisScaleFactor*Math.sin(s)).attr("class","radarAxisLine"),a.append("text").text(l).attr("x",e*r.axisLabelFactor*Math.cos(s)).attr("y",e*r.axisLabelFactor*Math.sin(s)).attr("class","radarAxisLabel")}},"drawAxes");function z(a,t,e,r,n,i,l){let s=t.length,c=Math.min(l.width,l.height)/2;e.forEach((d,p)=>{if(d.entries.length!==s)return;let u=d.entries.map((g,x)=>{let v=2*Math.PI*x/s-Math.PI/2,f=V(g,r,n,c),H=f*Math.cos(v),j=f*Math.sin(v);return{x:H,y:j}});i==="circle"?a.append("path").attr("d",W(u,l.curveTension)).attr("class",`radarCurve-${p}`):i==="polygon"&&a.append("polygon").attr("points",u.map(g=>`${g.x},${g.y}`).join(" ")).attr("class",`radarCurve-${p}`)})}o(z,"drawCurves");function V(a,t,e,r){let n=Math.min(Math.max(a,t),e);return r*(n-t)/(e-t)}o(V,"relativeRadius");function W(a,t){let e=a.length,r=`M${a[0].x},${a[0].y}`;for(let n=0;n<e;n++){let i=a[(n-1+e)%e],l=a[n],s=a[(n+1)%e],c=a[(n+2)%e],d={x:l.x+(s.x-i.x)*t,y:l.y+(s.y-i.y)*t},p={x:s.x-(c.x-l.x)*t,y:s.y-(c.y-l.y)*t};r+=` C${d.x},${d.y} ${p.x},${p.y} ${s.x},${s.y}`}return`${r} Z`}o(W,"closedRoundCurve");function B(a,t,e,r){if(!e)return;let n=(r.width/2+r.marginRight)*3/4,i=-(r.height/2+r.marginTop)*3/4,l=20;t.forEach((s,c)=>{let d=a.append("g").attr("transform",`translate(${n}, ${i+c*l})`);d.append("rect").attr("width",12).attr("height",12).attr("class",`radarLegendBox-${c}`),d.append("text").attr("x",16).attr("y",0).attr("class","radarLegendText").text(s.label)})}o(B,"drawLegend");var ot={draw:at},it=o((a,t)=>{let e="";for(let r=0;r<a.THEME_COLOR_LIMIT;r++){let n=a[`cScale${r}`];e+=`
		.radarCurve-${r} {
			color: ${n};
			fill: ${n};
			fill-opacity: ${t.curveOpacity};
			stroke: ${n};
			stroke-width: ${t.curveStrokeWidth};
		}
		.radarLegendBox-${r} {
			fill: ${n};
			fill-opacity: ${t.curveOpacity};
			stroke: ${n};
		}
		`}return e},"genIndexStyles"),lt=o(a=>{let t=A(),e=w(),r=y(t,e.themeVariables),n=y(r.radar,a);return{themeVariables:r,radarOptions:n}},"buildRadarStyleOptions"),ct=o(({radar:a}={})=>{let{themeVariables:t,radarOptions:e}=lt(a);return`
	.radarTitle {
		font-size: ${t.fontSize};
		color: ${t.titleColor};
		dominant-baseline: hanging;
		text-anchor: middle;
	}
	.radarAxisLine {
		stroke: ${e.axisColor};
		stroke-width: ${e.axisStrokeWidth};
	}
	.radarAxisLabel {
		dominant-baseline: middle;
		text-anchor: middle;
		font-size: ${e.axisLabelFontSize}px;
		color: ${e.axisColor};
	}
	.radarGraticule {
		fill: ${e.graticuleColor};
		fill-opacity: ${e.graticuleOpacity};
		stroke: ${e.graticuleColor};
		stroke-width: ${e.graticuleStrokeWidth};
	}
	.radarLegendText {
		text-anchor: start;
		font-size: ${e.legendFontSize}px;
		dominant-baseline: hanging;
	}
	${it(t,e)}
	`},"styles"),xt={parser:et,db:$,renderer:ot,styles:ct};export{xt as diagram};
