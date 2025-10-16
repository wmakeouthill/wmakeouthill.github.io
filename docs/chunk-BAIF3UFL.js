import{a as A}from"./chunk-Y7WCWWHC.js";import{a as W}from"./chunk-HZNHJZCF.js";import"./chunk-KMQHU3M2.js";import"./chunk-ITUFL7DW.js";import"./chunk-DT42VEOS.js";import"./chunk-HECWZZLQ.js";import"./chunk-EUGV4A2R.js";import"./chunk-ZQGSJEFI.js";import"./chunk-GW77NSP3.js";import"./chunk-TPU37LAH.js";import{a as F}from"./chunk-5K5UJSFT.js";import"./chunk-BYZEYO7O.js";import"./chunk-MOFZY53X.js";import{l as v}from"./chunk-K73A3GOM.js";import"./chunk-P5U4QCVI.js";import{L as B,P as C,Q as S,R as D,S as T,T as P,U as z,V as E,q as y,y as $}from"./chunk-ZOBOIQH4.js";import"./chunk-2FSENJOC.js";import{b as h,d as w}from"./chunk-GKVXYTML.js";import{a as u,m as x}from"./chunk-A3ZZXC42.js";var Y=y.packet,m,_=(m=class{constructor(){this.packet=[],this.setAccTitle=S,this.getAccTitle=D,this.setDiagramTitle=z,this.getDiagramTitle=E,this.getAccDescription=P,this.setAccDescription=T}getConfig(){let t=v(u(u({},Y),$().packet));return t.showBits&&(t.paddingY+=10),t}getPacket(){return this.packet}pushWord(t){t.length>0&&this.packet.push(t)}clear(){C(),this.packet=[]}},h(m,"PacketDB"),m),I=1e4,O=h((e,t)=>{A(e,t);let a=-1,o=[],n=1,{bitsPerRow:l}=t.getConfig();for(let{start:r,end:s,bits:d,label:c}of e.blocks){if(r!==void 0&&s!==void 0&&s<r)throw new Error(`Packet block ${r} - ${s} is invalid. End must be greater than start.`);if(r??=a+1,r!==a+1)throw new Error(`Packet block ${r} - ${s??r} is not contiguous. It should start from ${a+1}.`);if(d===0)throw new Error(`Packet block ${r} is invalid. Cannot have a zero bit field.`);for(s??=r+(d??1)-1,d??=s-r+1,a=s,w.debug(`Packet block ${r} - ${a} with label ${c}`);o.length<=l+1&&t.getPacket().length<I;){let[p,i]=j({start:r,end:s,bits:d,label:c},n,l);if(o.push(p),p.end+1===n*l&&(t.pushWord(o),o=[],n++),!i)break;({start:r,end:s,bits:d,label:c}=i)}}t.pushWord(o)},"populate"),j=h((e,t,a)=>{if(e.start===void 0)throw new Error("start should have been set during first phase");if(e.end===void 0)throw new Error("end should have been set during first phase");if(e.start>e.end)throw new Error(`Block start ${e.start} is greater than block end ${e.end}.`);if(e.end+1<=t*a)return[e,void 0];let o=t*a-1,n=t*a;return[{start:e.start,end:o,label:e.label,bits:o-e.start},{start:n,end:e.end,label:e.label,bits:e.end-n}]},"getNextFittingBlock"),N={parser:{yy:void 0},parse:h(e=>x(null,null,function*(){let t=yield W("packet",e),a=N.parser?.yy;if(!(a instanceof _))throw new Error("parser.parser?.yy was not a PacketDB. This is due to a bug within Mermaid, please report this issue at https://github.com/mermaid-js/mermaid/issues.");w.debug(t),O(t,a)}),"parse")},G=h((e,t,a,o)=>{let n=o.db,l=n.getConfig(),{rowHeight:r,paddingY:s,bitWidth:d,bitsPerRow:c}=l,p=n.getPacket(),i=n.getDiagramTitle(),f=r+s,g=f*(p.length+1)-(i?0:r),k=d*c+2,b=F(t);b.attr("viewbox",`0 0 ${k} ${g}`),B(b,g,k,l.useMaxWidth);for(let[L,M]of p.entries())H(b,M,L,l);b.append("text").text(i).attr("x",k/2).attr("y",g-f/2).attr("dominant-baseline","middle").attr("text-anchor","middle").attr("class","packetTitle")},"draw"),H=h((e,t,a,{rowHeight:o,paddingX:n,paddingY:l,bitWidth:r,bitsPerRow:s,showBits:d})=>{let c=e.append("g"),p=a*(o+l)+l;for(let i of t){let f=i.start%s*r+1,g=(i.end-i.start+1)*r-n;if(c.append("rect").attr("x",f).attr("y",p).attr("width",g).attr("height",o).attr("class","packetBlock"),c.append("text").attr("x",f+g/2).attr("y",p+o/2).attr("class","packetLabel").attr("dominant-baseline","middle").attr("text-anchor","middle").text(i.label),!d)continue;let k=i.end===i.start,b=p-2;c.append("text").attr("x",f+(k?g/2:0)).attr("y",b).attr("class","packetByte start").attr("dominant-baseline","auto").attr("text-anchor",k?"middle":"start").text(i.start),k||c.append("text").attr("x",f+g).attr("y",b).attr("class","packetByte end").attr("dominant-baseline","auto").attr("text-anchor","end").text(i.end)}},"drawWord"),K={draw:G},R={byteFontSize:"10px",startByteColor:"black",endByteColor:"black",labelColor:"black",labelFontSize:"12px",titleColor:"black",titleFontSize:"14px",blockStrokeColor:"black",blockStrokeWidth:"1",blockFillColor:"#efefef"},U=h(({packet:e}={})=>{let t=v(R,e);return`
	.packetByte {
		font-size: ${t.byteFontSize};
	}
	.packetByte.start {
		fill: ${t.startByteColor};
	}
	.packetByte.end {
		fill: ${t.endByteColor};
	}
	.packetLabel {
		fill: ${t.labelColor};
		font-size: ${t.labelFontSize};
	}
	.packetTitle {
		fill: ${t.titleColor};
		font-size: ${t.titleFontSize};
	}
	.packetBlock {
		stroke: ${t.blockStrokeColor};
		stroke-width: ${t.blockStrokeWidth};
		fill: ${t.blockFillColor};
	}
	`},"styles"),tt={parser:N,get db(){return new _},renderer:K,styles:U};export{tt as diagram};
