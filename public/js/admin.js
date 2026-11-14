/* Paste your project values. The anon key is public by design; row level security protects the data. */
const SUPABASE_URL='https://dhqlykgyzpypacgozriw.supabase.co',SUPABASE_ANON_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRocWx5a2d5enB5cGFjZ296cml3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQyMTQwNDYsImV4cCI6MjEwOTc5MDA0Nn0.VzIVYDNw9oPMO3MoNExuRFZMXL019m0cWVEgVBQbD8w',BUCKET='order-photos';
const cfg=!/YOUR_/.test(SUPABASE_URL+SUPABASE_ANON_KEY),sb=cfg?supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY):null;
let orders=[],leads=[],products=[],pm={},rev=[],hook={n:0,last:null},store=true,me='',busy=false;
const dk=d=>new Date(d).toLocaleDateString('en-CA');
const tel=p=>'tel:'+String(p||'').replace(/[^\d+]/g,'');
const itemDesc=i=>{const n=id=>pm[id]?.name||id||'Item';return i.kind=='gift'?`${n(i.product_id)} × ${i.quantity}`:[n(i.frame_id)+' frame',i.size_label,i.quality_id,i.mounting_id&&'mounting: '+i.mounting_id,'qty '+i.quantity].filter(Boolean).join(', ')};
const mapOrder=r=>({id:r.id,ref:r.order_ref,name:r.customer_name,phone:r.customer_phone,email:r.customer_email,city:r.city,addr:[r.address,r.city,r.state].filter(Boolean).join(', ')+(r.pincode?' '+r.pincode:''),total:r.total,status:r.status,date:dk(r.created_at),paidAt:r.paid_at||r.created_at,pay:r.razorpay_payment_id||'',track:r.tracking_number||'',shippedAt:r.shipped_at,lines:(r.order_items||[]).map(i=>({...i,desc:itemDesc(i)})),items:(r.order_items||[]).map(itemDesc)});
const mapLead=r=>({id:r.id,src:r.source,name:r.name,phone:r.phone||'',service:r.service||'',date:r.event_date||'',loc:r.location||'',guests:r.guests||0,total:r.estimated_total||0,msg:r.message||'',status:r.status,details:r.details});
async function loadAll(){
const[o,l,p,w,st]=await Promise.all([sb.from('orders').select('*, order_items(*)').order('created_at',{ascending:false}).limit(1000),sb.from('leads').select('*').order('created_at',{ascending:false}).limit(1000),sb.from('products').select('*').order('sort_order'),sb.from('webhook_events').select('received_at',{count:'exact'}).order('received_at',{ascending:false}).limit(1),sb.storage.from(BUCKET).list('',{limit:1})]);
for(const r of[o,l,p])if(r.error)throw r.error;
products=p.data.map(r=>({id:r.id,n:r.name,k:r.kind,p:r.price??r.price_modifier??0,on:r.active}));pm=Object.fromEntries(p.data.map(r=>[r.id,r]));
orders=o.data.map(mapOrder);leads=l.data.map(mapLead);hook={n:w.error?0:w.count,last:w.data?.[0]?.received_at};store=!st.error;
rev=Array.from({length:14},(_,i)=>{const k=dk(Date.now()-(13-i)*864e5);return orders.filter(x=>sold(x)&&dk(x.paidAt)==k).reduce((a,x)=>a+x.total,0)})}
const det=o=>typeof o!='object'?esc(o):`<dl>${Object.entries(o).map(([k,v])=>`<dt>${esc(lab(k))}</dt><dd>${esc(v&&typeof v=='object'?JSON.stringify(v):v)}</dd>`).join('')}</dl>`;
const conn=()=>`<div class="row"><span>Razorpay webhook${hook.last?`<small>Last event ${esc(new Date(hook.last).toLocaleString('en-IN'))}</small>`:''}</span>${hook.n?badge('connected',hook.n+' events'):badge('pending','no events yet')}</div><div class="row"><span>Photo storage</span>${store?badge('connected','private bucket'):badge('pending','unreachable')}</div>`;
const OS=['paid','processing','shipped','delivered','awaiting_payment','payment_failed','cancelled','refunded'];
const LS=['new','contacted','booked','lost'];
const FLOW=['paid','processing','shipped','delivered'];
const NEXT={paid:['processing','Start packing'],processing:['shipped','Mark as shipped'],shipped:['delivered','Mark as delivered']};
const ICON={overview:'<path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z"/>',orders:'<path d="M21 8l-9-5-9 5v8l9 5 9-5zM3 8l9 5 9-5M12 13v8"/>',payments:'<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>',quotes:'<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6M8 13h8M8 17h5"/>',enquiries:'<path d="M21 12a8 8 0 0 1-11.600 7.100L3 21l1.900-5.400A8 8 0 1 1 21 12z"/>',customers:'<circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0M17 4a4 4 0 0 1 0 8M22 21a7 7 0 0 0-4-6"/>',products:'<path d="M3 12V3h9l9 9-9 9z"/><circle cx="7.500" cy="7.500" r="1.500"/>',settings:'<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>'};
const $=s=>document.querySelector(s),inr=n=>'₹'+Math.round(n).toLocaleString('en-IN');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const lab=s=>s.replaceAll('_',' ');
const cap=s=>s[0].toUpperCase()+s.slice(1);
const badge=(s,t)=>`<span class="b s-${s}">${esc(t||lab(s))}</span>`;
const sold=o=>FLOW.includes(o.status);
const waNum=p=>{const d=String(p).replace(/\D/g,'');return d.length==10?'91'+d:d};
const wa=(phone,msg)=>!phone?'':`<a class="wa" href="https://wa.me/${waNum(phone)}?text=${encodeURIComponent(msg)}" target="_blank" rel="noopener" aria-label="WhatsApp ${esc(phone)}"><svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.500 15.200L2 22l4.900-1.500A10 10 0 1 0 12 2zm5.200 14.100c-.2.600-1.300 1.200-1.800 1.200-.5.100-1 .2-3.300-.7-2.800-1.100-4.600-4-4.700-4.200-.1-.2-1.100-1.500-1.100-2.800 0-1.300.7-1.900.9-2.200.2-.3.500-.3.700-.3h.5c.2 0 .4 0 .6.500l.8 2c.1.200.1.400 0 .5l-.4.600c-.1.200-.3.300-.1.600.2.300.8 1.300 1.700 2.100 1.100 1 2 1.300 2.300 1.400.3.100.5.100.6-.1l.9-1.100c.2-.3.400-.2.600-.1l1.900.9c.3.100.5.200.5.300.1.200.1.800-.1 1.400z"/></svg>WhatsApp</a>`;
const NAV=[['overview','Overview'],['orders','Orders'],['payments','Payments'],['quotes','Quotes'],['enquiries','Enquiries'],['customers','Customers'],['products','Products'],['settings','Settings']];
let view='overview',tab='all',q='',sort=null,cur=null,opener=null;

function toast(t,undo){const e=document.createElement('div');e.className='toast';e.setAttribute('role','status');e.append(t);
if(undo){const b=document.createElement('button');b.textContent='Undo';b.onclick=()=>{undo();e.remove()};e.append(b)}
$('#toasts').append(e);setTimeout(()=>e.remove(),undo?5000:2200)}

function nav(){const todo=orders.filter(o=>['paid','processing'].includes(o.status)).length,nl=k=>leads.filter(l=>l.src==k&&l.status=='new').length;
const c={orders:todo,quotes:nl('quotation'),enquiries:nl('contact')};
$('#nav').innerHTML=NAV.map(([k,t])=>`<button data-v="${k}" class="${k==view?'on':''}" ${k==view?'aria-current="page"':''}><svg viewBox="0 0 24 24" aria-hidden="true">${ICON[k]}</svg>${t}${c[k]?`<i>${c[k]}</i>`:''}</button>`).join('')}

function sortRows(cols,rows){if(!sort)return rows;const c=cols[sort.i];if(!c||!c.v)return rows;
return[...rows].sort((a,b)=>{const x=c.v(a),y=c.v(b),r=typeof x=='number'?x-y:String(x).localeCompare(String(y));return sort.d*r})}

function table(cols,rows,rowAttr){
if(!rows.length)return`<div class="card empty"><b>${q?'No matches for “'+esc(q)+'”':'Nothing here yet'}</b>${q?'Try a different name, phone number or order ID.':'New items will appear here as they come in.'}${q?'<br><button class="btn" data-act="clear">Clear search</button>':(tab!='all'?'<br><button class="btn" data-t="all">Show all</button>':'')}</div>`;
rows=sortRows(cols,rows);
return`<div class="tw"><table><thead><tr>${cols.map((c,i)=>c.v?`<th scope="col" ${sort&&sort.i==i?`aria-sort="${sort.d>0?'ascending':'descending'}"`:''}><button data-sort="${i}">${c.h}<span class="ar" aria-hidden="true">${sort&&sort.i==i?(sort.d>0?'▲':'▼'):'↕'}</span></button></th>`:`<th scope="col" class="plain">${c.h}</th>`).join('')}</tr></thead>
<tbody>${rows.map(r=>{const a=rowAttr?rowAttr(r):'';return`<tr ${a?`class="c" tabindex="0" ${a}`:''}>${cols.map(c=>`<td>${c.r(r)}</td>`).join('')}</tr>`}).join('')}</tbody></table></div>`}

const match=o=>!q||JSON.stringify(o).toLowerCase().includes(q);
function tabs(list,counts){return`<div class="tabs" role="tablist">${['all',...list].map(t=>`<button role="tab" aria-selected="${t==tab}" data-t="${t}" class="${t==tab?'on':''}">${t=='all'?'All':cap(lab(t))}<span>${counts(t)}</span></button>`).join('')}</div>`}
function head(t,s){return`<h1>${t}</h1><p class="sub">${s}</p>`}
const orderAttr=o=>`data-id="${esc(o.ref)}" aria-label="Open order ${esc(o.ref)}"`;

function overview(){const paid=orders.filter(sold),sum=a=>a.reduce((x,o)=>x+o.total,0);const mk=dk(new Date()).slice(0,7),mo=paid.filter(o=>dk(o.paidAt).startsWith(mk));
const todo=orders.filter(o=>['paid','processing'].includes(o.status)),fails=orders.filter(o=>o.status=='payment_failed'),nl=leads.filter(l=>l.status=='new');
const max=Math.max(...rev,1),h=new Date().getHours(),hi=h<12?'Good morning':h<17?'Good afternoon':'Good evening';
const day=i=>{const d=new Date();d.setDate(d.getDate()-(13-i));return d.toLocaleDateString('en-IN',{day:'numeric',month:'short'})};
const att=[...todo.map(o=>`<div class="row" tabindex="0" data-open="${esc(o.ref)}"><span>${esc(o.name)}<small>${esc(o.ref)} · ${o.status=='paid'?'ready to pack':'packing in progress'}</small></span>${badge(o.status)}</div>`),
...fails.map(o=>`<div class="row" tabindex="0" data-open="${esc(o.ref)}"><span>${esc(o.name)}<small>Payment failed · call ${esc(o.phone)}</small></span>${badge(o.status)}</div>`),
...nl.map(l=>`<div class="row" tabindex="0" data-go="${l.src=='quotation'?'quotes':'enquiries'}"><span>${esc(l.name)}<small>${esc(l.service)}</small></span>${badge('new')}</div>`)];
const bm={};paid.forEach(o=>o.lines.forEach(i=>{const k=i.kind=='gift'?i.product_id:i.frame_id;bm[k]=(bm[k]||0)+i.quantity}));const best=Object.entries(bm).map(([k,c])=>[pm[k]?.name||k,c]).sort((a,b)=>b[1]-a[1]).slice(0,4);
return head(hi,'Here’s what needs you today · '+new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long'}))+`<div class="grid g4">
<button class="card stat hot" data-go="orders"><span>Orders to fulfil</span><b>${todo.length}</b><em>View orders →</em></button>
<button class="card stat" data-go="payments" data-tab="paid"><span>Revenue this month</span><b>${inr(sum(mo))}</b><em>${mo.length} paid orders</em></button>
<button class="card stat" data-go="quotes"><span>New quotes and enquiries</span><b>${nl.length}</b><em>Reply within a day</em></button>
<div class="card stat"><span>Average order value</span><b>${paid.length?inr(sum(paid)/paid.length):'–'}</b></div></div>
<div class="grid g2" style="margin-top:16px">
<div class="card"><h2>Revenue, last 14 days<small>${inr(rev.reduce((a,b)=>a+b,0))}</small></h2><div class="bars" role="img" aria-label="Daily revenue bar chart">${rev.map((v,i)=>`<div style="height:${v/max*100}%" data-v="${inr(v)}"><small>${i%3==0?day(i):''}</small></div>`).join('')}</div></div>
<div class="card"><h2>Needs attention<small>${att.length} items</small></h2>${att.join('')||'<div class="empty">All caught up 🎉</div>'}</div></div>
<div class="grid g2" style="margin-top:16px">
<div class="card"><h2>Latest orders</h2>${[...orders].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5).map(o=>`<div class="row" tabindex="0" data-open="${esc(o.ref)}"><span>${esc(o.name)}<small>${esc(o.ref)} · ${esc(o.date)}</small></span><b>${inr(o.total)}</b></div>`).join('')}</div>
<div class="card"><h2>Best sellers</h2>${best.map(([n,c])=>`<div class="row" style="display:block"><div style="display:flex;justify-content:space-between"><span>${esc(n)}</span><b>${esc(c)} sold</b></div><div class="meter"><i style="width:${c/best[0][1]*100}%"></i></div></div>`).join('')}</div></div>`}

function ordersV(){const rows=orders.filter(o=>(tab=='all'||o.status==tab)&&match(o));
return head('Orders','Pack, ship and track every shop order.')+tabs(OS,t=>orders.filter(o=>t=='all'||o.status==t).length)+
table([{h:'Order',r:o=>`<b>${esc(o.ref)}</b>`,v:o=>o.ref},{h:'Customer',r:o=>esc(o.name),v:o=>o.name},{h:'City',r:o=>esc(o.city),v:o=>o.city},{h:'Items',r:o=>o.items.length,v:o=>o.items.length},{h:'Total',r:o=>inr(o.total),v:o=>o.total},{h:'Status',r:o=>badge(o.status),v:o=>o.status},{h:'Date',r:o=>esc(o.date),v:o=>o.date},{h:'Contact',r:o=>wa(o.phone,`Hi ${o.name}, this is VK Photography about your order ${o.ref}.`)}],rows,orderAttr)}

function paymentsV(){const s=a=>a.reduce((x,o)=>x+o.total,0),by=t=>orders.filter(o=>o.status==t);
const rows=orders.filter(o=>(tab=='all'||(tab=='paid'?sold(o):o.status==tab))&&match(o));
return head('Payments','Money in, and payments that need a follow-up.')+`<div class="grid g4" style="margin-bottom:18px">
<div class="card stat"><span>Collected</span><b>${inr(s(orders.filter(sold)))}</b></div><div class="card stat"><span>Awaiting payment</span><b>${inr(s(by('awaiting_payment')))}</b></div>
<div class="card stat"><span>Failed</span><b>${by('payment_failed').length}</b></div><div class="card stat"><span>Refunded</span><b>${by('refunded').length}</b></div></div>`+
tabs(['paid','payment_failed','awaiting_payment','refunded'],t=>orders.filter(o=>t=='all'||(t=='paid'?sold(o):o.status==t)).length)+
table([{h:'Order',r:o=>`<b>${esc(o.ref)}</b>`,v:o=>o.ref},{h:'Customer',r:o=>esc(o.name),v:o=>o.name},{h:'Amount',r:o=>inr(o.total),v:o=>o.total},{h:'Razorpay payment',r:o=>o.pay?`<code>${esc(o.pay)}</code>`:'–',v:o=>o.pay},{h:'Status',r:o=>badge(sold(o)?'paid':o.status),v:o=>sold(o)?'paid':o.status},{h:'Contact',r:o=>wa(o.phone,o.status=='payment_failed'||o.status=='awaiting_payment'?`Hi ${o.name}, your payment for order ${o.ref} (${inr(o.total)}) is pending. Can we help you complete it?`:`Hi ${o.name}, thank you for your payment for order ${o.ref}.`)}],rows,orderAttr)}

function leadsV(src){const rows=leads.filter(l=>l.src==src&&(tab=='all'||l.status==tab)&&match(l));
const nm=src=='quotation'?'Quotes':'Enquiries',qt=src=='quotation';
return head(nm,qt?'People who sent a quote request.':'People who used the contact form.')+tabs(LS,t=>leads.filter(l=>l.src==src&&(t=='all'||l.status==t)).length)+
table([{h:'Name',r:l=>`<b>${esc(l.name)}</b>`,v:l=>l.name},{h:'Phone',r:l=>l.phone?`<a href="${tel(l.phone)}">${esc(l.phone)}</a>`:'–'},{h:'Service',r:l=>esc(l.service),v:l=>l.service},{h:'Event date',r:l=>esc(l.date),v:l=>l.date},{h:'Location',r:l=>esc(l.loc),v:l=>l.loc},
qt?{h:'Estimate',r:l=>inr(l.total),v:l=>l.total}:{h:'Message',r:l=>esc(l.msg.length>28?l.msg.slice(0,28)+'…':l.msg)},
{h:'Status',r:l=>`<select class="lead s-${l.status}" data-lead="${esc(l.id)}" aria-label="Status for ${esc(l.name)}">${LS.map(s=>`<option ${s==l.status?'selected':''}>${s}</option>`).join('')}</select>`,v:l=>l.status},
{h:'Contact',r:l=>wa(l.phone,`Hi ${l.name}, this is VK Photography regarding your ${l.service.toLowerCase()} ${qt?'quote':'enquiry'}.`)}],rows,l=>`data-lid="${esc(l.id)}" aria-label="Open ${esc(l.name)}"`)}

function customersV(){const m={};orders.forEach(o=>{const c=m[o.phone]||(m[o.phone]={name:o.name,phone:o.phone,city:o.city,n:0,spent:0,last:o.date});c.n++;if(sold(o))c.spent+=o.total;if(o.date>c.last)c.last=o.date});
return head('Customers','Everyone who has ordered, grouped by phone number.')+table([{h:'Name',r:c=>`<b>${esc(c.name)}</b>`,v:c=>c.name},{h:'Phone',r:c=>esc(c.phone)},{h:'City',r:c=>esc(c.city),v:c=>c.city},{h:'Orders',r:c=>c.n,v:c=>c.n},{h:'Total spent',r:c=>inr(c.spent),v:c=>c.spent},{h:'Last order',r:c=>esc(c.last),v:c=>c.last},{h:'Contact',r:c=>wa(c.phone,`Hi ${c.name}, this is VK Photography.`)}],Object.values(m).filter(match))}

function productsV(){const rows=products.map((p,i)=>({...p,i})).filter(p=>!q||p.n.toLowerCase().includes(q));
return head('Products','Read-only for now. The shop still prices from js/shop-pricing.js. Frame prices are add-ons.')+table([{h:'Name',r:p=>`<b>${esc(p.n)}</b>`,v:p=>p.n},{h:'Type',r:p=>cap(p.k),v:p=>p.k},{h:'Price',r:p=>(p.k=='frame'?'+':'')+inr(p.p),v:p=>p.p},{h:'Status',r:p=>badge(p.on?'paid':'cancelled',p.on?'Active':'Hidden'),v:p=>p.on?1:0}],rows)}

function settingsV(){return head('Settings','Account, exports and connections.')+`<div class="grid g2">
<div class="card"><h2>Export</h2><p class="sub">Download all orders as a spreadsheet file.</p><button class="btn pri" data-act="csv">Export orders (CSV)</button></div>
<div class="card"><h2>Connections</h2>${conn()}</div>
<div class="card"><h2>Account</h2><p class="sub">Signed in as ${esc(me)}</p><button class="btn" data-act="out">Sign out</button></div></div>`}

function render(){nav();const v={overview,orders:ordersV,payments:paymentsV,quotes:()=>leadsV('quotation'),enquiries:()=>leadsV('contact'),customers:customersV,products:productsV,settings:settingsV};
$('#view').innerHTML=v[view]();$('#sw').classList.toggle('has',!!q)}

function go(v,t){view=v;tab=t||'all';sort=null;render();window.scrollTo({top:0})}

/* drawer */
function openDrawer(html,from){opener=from||document.activeElement;const d=$('#drawer');d.innerHTML=html;d.classList.add('open');$('#scrim').classList.add('open');setTimeout(()=>d.querySelector('.x')?.focus(),50)}
function closeDrawer(){$('#drawer').classList.remove('open');$('#scrim').classList.remove('open');cur=null;opener&&opener.isConnected&&opener.focus()}
function copyBtn(v,l){return`<button class="btn" data-act="copy" data-copy="${esc(v)}">${l}</button>`}
function openOrder(ref,from){const o=orders.find(x=>x.ref==ref);cur=ref;const ix=FLOW.indexOf(o.status),nx=NEXT[o.status];
openDrawer(`<div class="dh"><div><h2>${esc(o.name)}</h2><p class="sub">${esc(o.ref)} · ${esc(o.date)}</p>${badge(o.status)}</div><button class="btn x" data-act="close" aria-label="Close">×</button></div>
<div class="acts">${wa(o.phone,`Hi ${o.name}, this is VK Photography about your order ${o.ref}.`)}<a class="btn" href="${tel(o.phone)}">Call</a>${copyBtn(o.addr,'Copy address')}</div>
${ix>=0?`<h3>Progress</h3><div class="steps">${FLOW.map((s,i)=>`<div class="${i<=ix?'done':''} ${i==ix?'cur':''}">${cap(s)}</div>`).join('')}</div>`:''}
${nx?`<button class="btn pri full" style="margin-top:16px" data-act="next" data-to="${nx[0]}">${nx[1]}</button>`:''}
<h3>Details</h3><dl><dt>Phone</dt><dd><a href="${tel(o.phone)}">${esc(o.phone)}</a></dd><dt>Email</dt><dd>${esc(o.email)}</dd><dt>Address</dt><dd>${esc(o.addr)}</dd><dt>Items</dt><dd>${o.items.map(esc).join('<br>')}</dd><dt>Total</dt><dd><b>${inr(o.total)}</b></dd><dt>Payment</dt><dd>${o.pay?`<code>${esc(o.pay)}</code>`:'Not paid yet'}</dd></dl>
<h3>Photos</h3><div id="photos">Loading…</div>
<h3>Update</h3><label>Status<select id="st">${OS.map(s=>`<option value="${s}" ${s==o.status?'selected':''}>${cap(lab(s))}</option>`).join('')}</select></label>
<label>Tracking number<input class="field" id="tr" value="${esc(o.track||'')}" placeholder="Add a tracking number"></label>
<button class="btn pri full" data-act="save">Save changes</button>`,from);loadPhotos(o)}
function openLead(id,from){const l=leads.find(x=>x.id==id);cur=id;
openDrawer(`<div class="dh"><div><h2>${esc(l.name)}</h2><p class="sub">${l.src=='quotation'?'Quote request':'Contact enquiry'}</p>${badge(l.status)}</div><button class="btn x" data-act="close" aria-label="Close">×</button></div>
<div class="acts">${wa(l.phone,`Hi ${l.name}, this is VK Photography regarding your ${l.service.toLowerCase()}.`)}<a class="btn" href="${tel(l.phone)}">Call</a></div>
<h3>Message</h3><div class="msg">${esc(l.msg)}</div>
<h3>Details</h3><dl><dt>Phone</dt><dd>${esc(l.phone)}</dd><dt>Service</dt><dd>${esc(l.service)}</dd><dt>Event date</dt><dd>${esc(l.date)}</dd><dt>Location</dt><dd>${esc(l.loc)}</dd>${l.guests?`<dt>Guests</dt><dd>${esc(l.guests)}</dd>`:''}${l.total?`<dt>Estimate</dt><dd><b>${inr(l.total)}</b></dd>`:''}</dl>
${l.details?`<h3>Request details</h3>${det(l.details)}`:''}<h3>Status</h3><select id="ls" data-lead="${esc(l.id)}">${LS.map(s=>`<option ${s==l.status?'selected':''}>${s}</option>`).join('')}</select>`,from)}

async function save(o,p){const{data,error}=await sb.from('orders').update(p).eq('id',o.id).select('id');
if(error||!data.length){toast('Couldn’t save: '+(error?.message||'not allowed'));return false}
if('status'in p)o.status=p.status;if('tracking_number'in p)o.track=p.tracking_number||'';if('shipped_at'in p)o.shippedAt=p.shipped_at;return true}
async function setStatus(o,s,msg,x={}){const pv={status:o.status,tracking_number:o.track||null,shipped_at:o.shippedAt||null},p={status:s,...x};
if(s=='shipped'&&!o.shippedAt)p.shipped_at=new Date().toISOString();
if(!await save(o,p))return false;render();
toast(msg||`Order ${o.ref} marked ${lab(s)}`,async()=>{if(await save(o,pv)){render();if(cur==o.ref)openOrder(o.ref,opener);toast('Change undone')}});return true}
async function loadPhotos(o){const box=$('#photos'),ls=o.lines.filter(l=>l.photo_path);
if(!ls.length){box.textContent='No photos attached.';return}
const ps=ls.map(l=>l.photo_path),bk=sb.storage.from(BUCKET),[a,b]=await Promise.all([bk.createSignedUrls(ps,900),bk.createSignedUrls(ps,900,{download:true})]);
if(cur!=o.ref||!$('#photos'))return;if(a.error){box.textContent='Couldn’t load photos: '+a.error.message;return}
const u=(r,p)=>r.data?.find(x=>x.path==p)?.signedUrl||'';
box.innerHTML=ls.map(l=>`<figure class="ph"><div class="photo"><img src="${esc(u(a,l.photo_path))}" alt="Customer photo" loading="lazy"></div><figcaption>${esc(l.desc)}${l.photo_width?` · ${l.photo_width}×${l.photo_height}px`:''}</figcaption><a class="btn full" href="${esc(u(b,l.photo_path))}">Download original</a></figure>`).join('')}

document.addEventListener('click',e=>{
if(e.target.closest('a,select,input,label'))return;
const t=e.target.closest('[data-v],[data-t],[data-id],[data-lid],[data-open],[data-go],[data-sort],[data-act]');if(!t)return;const d=t.dataset;
if(d.act){const a=d.act;
if(a=='close')closeDrawer();
else if(a=='clear'){q='';$('#q').value='';render();$('#q').focus()}
else if(a=='theme')setTheme(document.documentElement.dataset.theme!='dark');
else if(a=='dismiss')$('#note').hidden=true;
else if(a=='refresh')refresh().then(()=>toast('Updated'));
else if(a=='out')signOut();
else if(a=='copy'){try{navigator.clipboard.writeText(d.copy).then(()=>toast('Copied'),()=>toast('Couldn’t copy'))}catch(_){toast('Couldn’t copy')}}
else if(a=='next'){const o=orders.find(x=>x.ref==cur);setStatus(o,d.to).then(k=>k&&openOrder(o.ref,opener))}
else if(a=='save'){const o=orders.find(x=>x.ref==cur),s=$('#st').value,tr=$('#tr').value.trim(),x=tr!=o.track?{tracking_number:tr||null}:{};
(s!=o.status?setStatus(o,s,'Changes saved',x):Object.keys(x).length?save(o,x).then(r=>r&&(render(),toast('Changes saved'),true)):Promise.resolve(true)).then(r=>r&&closeDrawer())}
else if(a=='csv'){const f=v=>{let t=String(v??'');if(/^[=+\-@\t\r]/.test(t))t="'"+t;return`"${t.replace(/"/g,'""')}"`},r=['Order,Name,Phone,Email,Address,Total,Status,Tracking,Payment,Date',...orders.map(o=>[o.ref,o.name,o.phone,o.email,o.addr,o.total,o.status,o.track,o.pay,o.date].map(f).join(','))];const x=document.createElement('a');x.href=URL.createObjectURL(new Blob(['\ufeff'+r.join('\n')],{type:'text/csv'}));x.download='orders.csv';x.click();toast('Orders exported')}
return}
if(d.sort!==undefined){const i=+d.sort;sort=sort&&sort.i==i?(sort.d>0?{i,d:-1}:null):{i,d:1};render()}
else if(d.v||d.go)go(d.v||d.go,d.tab);
else if(d.t){tab=d.t;sort=null;render()}
else if(d.id||d.open)openOrder(d.id||d.open,t);
else if(d.lid)openLead(d.lid,t)});

document.addEventListener('keydown',e=>{
if(e.key=='Escape'){if($('#drawer').classList.contains('open'))closeDrawer();else if(document.activeElement==$('#q')&&q){q='';$('#q').value='';render()}}
else if(e.key=='/'&&!e.target.matches('input,select,textarea')){e.preventDefault();$('#q').focus()}
else if(e.key=='Enter'&&e.target.matches('tr.c,.row[tabindex]'))e.target.click()});

document.addEventListener('change',async e=>{const t=e.target;if(!t.dataset.lead)return;
const l=leads.find(x=>x.id==t.dataset.lead),prev=l.status,set=async s=>{const{data,error}=await sb.from('leads').update({status:s}).eq('id',l.id).select('id');
if(error||!data.length){toast('Couldn’t save: '+(error?.message||'not allowed'));return false}l.status=s;render();if(cur==l.id)openLead(l.id,opener);return true};
if(await set(t.value))toast(`${l.name} marked ${l.status}`,()=>set(prev));else render()});

$('#q').oninput=e=>{q=e.target.value.trim().toLowerCase();if(!['orders','payments','quotes','enquiries','customers','products'].includes(view)){view='orders';tab='all'}render()};

function setTheme(dark){document.documentElement.dataset.theme=dark?'dark':'light';$('#theme').textContent=dark?'Light mode':'Dark mode';try{localStorage.setItem('vk-theme',dark?'dark':'light')}catch(_){}}
let saved=null;try{saved=localStorage.getItem('vk-theme')}catch(_){}
setTheme(saved?saved=='dark':matchMedia('(prefers-color-scheme:dark)').matches);
function showLogin(m){$('#app').hidden=true;$('#login').hidden=false;$('#lerr').textContent=m||'';$('#lpw').value=''}
async function enter(user){const{data,error}=await sb.rpc('is_admin');
if(error||data!==true){await sb.auth.signOut();return showLogin(error?'Couldn’t verify access: '+error.message:'This account isn’t an admin. Add its user id to the admins table.')}
me=user.email;$('#me').textContent=me;$('#login').hidden=true;$('#app').hidden=false;$('#view').innerHTML='<div class="empty">Loading…</div>';await refresh()}
async function refresh(){if(busy)return;busy=true;
try{await loadAll();$('#note').hidden=true;render()}
catch(e){if(/JWT|401|PGRST30/.test((e.code||'')+(e.message||'')+(e.status||''))){await sb.auth.signOut();showLogin('Session expired. Please sign in again.')}
else{$('#notet').textContent='Couldn’t load data: '+(e.message||e);$('#note').hidden=false;if(!orders.length&&!leads.length)$('#view').innerHTML=''}}
finally{busy=false}}
async function signOut(){await sb.auth.signOut();orders=[];leads=[];showLogin()}
$('#lf').onsubmit=async e=>{e.preventDefault();const b=$('#lgo');b.disabled=true;$('#lerr').textContent='';
const{data,error}=await sb.auth.signInWithPassword({email:$('#lem').value.trim(),password:$('#lpw').value});b.disabled=false;
if(error){$('#lerr').textContent=error.status==400?'Incorrect email or password.':error.message;return}await enter(data.user)};
if(!cfg){showLogin('Add your Supabase URL and anon key at the top of the script in admin.html.');$('#lgo').disabled=true}
else{sb.auth.onAuthStateChange(ev=>{if(ev=='SIGNED_OUT'&&!$('#app').hidden){orders=[];leads=[];showLogin()}});
sb.auth.getSession().then(({data})=>data.session?enter(data.session.user):showLogin());
setInterval(()=>{if(!$('#app').hidden&&!document.hidden&&!$('#drawer').classList.contains('open'))refresh()},120000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!$('#app').hidden)refresh()})}

/* Auto sign-out after 20 minutes without activity (shared or stolen laptop protection). */
(function(){var IDLE=20*60*1000,last=Date.now();
['click','keydown','pointerdown','touchstart','scroll'].forEach(function(t){document.addEventListener(t,function(){last=Date.now()},{passive:true})});
setInterval(function(){if(!$('#app').hidden&&Date.now()-last>IDLE){signOut().then(function(){setTimeout(function(){$('#lerr').textContent='Signed out after 20 minutes of inactivity.'},400)})}},30000)})();
