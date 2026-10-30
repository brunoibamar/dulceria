export const money=n=>new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'}).format(n/100);

export const empty=()=>({schema:1,products:[],people:[],sales:[],payments:[],stock:[]});

export function cents(s){if(!/^\d+(\.\d{1,2})?$/.test(String(s)))throw Error('Usa un importe positivo con hasta dos decimales.');const n=Math.round(Number(s)*100);if(!Number.isSafeInteger(n)||n>1e10)throw Error('Importe demasiado grande.');return n;}

export function sum(expression){if(!expression.trim())return 0;const terms=expression.trim().replace(/\+\s*$/,'').split('+');return terms.reduce((n,t)=>n+cents(t.trim()),0);}

export const balance=(d,id)=>d.sales.filter(s=>s.person===id).reduce((n,s)=>n+s.total,0)-d.payments.filter(p=>p.person===id).reduce((n,p)=>n+p.amount,0);

export const uid=()=>Array.from(crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,'0')).join('');

const id=uid;

const integer=n=>Number.isSafeInteger(n)&&n>=0;

const validCost=p=>p.costStatus==='unknown'?p.cost===null:(p.costStatus===undefined||p.costStatus==='real'||p.costStatus==='estimated')&&integer(p.cost);

export function editPerson(d,id,fields){const p=d.people.find(p=>p.id===id);if(!p)throw Error('La cuenta ya no existe.');const name=String(fields.name??'').trim();if(!name||name.length>80)throw Error('Escribe un nombre de hasta 80 caracteres.');Object.assign(p,{name,phone:String(fields.phone??'').trim().slice(0,30),notes:String(fields.notes??'').trim().slice(0,500)});return d;}

export function archivePerson(d,id,archived){const p=d.people.find(p=>p.id===id);if(!p)throw Error('La cuenta ya no existe.');if(typeof archived!=='boolean')throw Error('Estado de cuenta inválido.');p.archived=archived;return d;}

export function validate(d){

 if(!d||d.schema!==1||!['products','people','sales','payments','stock'].every(k=>Array.isArray(d[k])))throw Error('Respaldo incompatible.');

 const ids=new Set();for(const k of ['products','people','sales','payments','stock'])for(const x of d[k]){if(!x||typeof x.id!=='string'||ids.has(x.id))throw Error('Identificadores inválidos.');ids.add(x.id);}

 for(const p of d.products)if(typeof p.name!=='string'||!p.name.trim()||![p.price,p.stock].every(integer)||!validCost(p))throw Error('Producto inválido.');

 for(const p of d.people)if(typeof p.name!=='string'||!p.name.trim()||typeof p.phone!=='string'||typeof p.notes!=='string'||(p.archived!==undefined&&typeof p.archived!=='boolean'))throw Error('Persona inválida.');

 for(const s of d.sales){if(!integer(s.total)||s.total<=0||!Number.isFinite(Date.parse(s.at))||!(s.person===null||d.people.some(p=>p.id===s.person))||!Array.isArray(s.items)||typeof s.note!=='string')throw Error('Venta inválida.');for(const i of s.items)if(!d.products.some(p=>p.id===i.product)||!integer(i.qty)||i.qty<1||!integer(i.price)||!validCost(i))throw Error('Detalle inválido.');if(s.items.length&&s.items.reduce((n,i)=>n+i.qty*i.price,0)!==s.total)throw Error('Total inconsistente.');}

 for(const p of d.payments)if(!integer(p.amount)||p.amount<=0||!d.people.some(x=>x.id===p.person)||!Number.isFinite(Date.parse(p.at)))throw Error('Abono inválido.');

 for(const p of d.people)if(balance(d,p.id)<0)throw Error('Un abono supera la deuda.');

 for(const x of d.stock)if(!d.products.some(p=>p.id===x.product)||!Number.isSafeInteger(x.delta)||!Number.isFinite(Date.parse(x.at))||typeof x.note!=='string')throw Error('Movimiento inválido.');

 return d;

}

export function sell(d,{expression='',cart=[],person=null}){

 if(person&&!d.people.some(p=>p.id===person&&!p.archived))throw Error('Elige una persona activa válida.');

 const items=cart.map(c=>{const p=d.products.find(p=>p.id===c.product);if(!p||!integer(c.qty)||!c.qty||c.qty>p.stock)throw Error('No hay existencias suficientes.');return {...c,price:p.price,cost:p.cost,costStatus:p.costStatus??'real'};});

 if(new Set(items.map(i=>i.product)).size!==items.length)throw Error('Producto duplicado.');

 const total=items.length?items.reduce((n,i)=>n+i.price*i.qty,0):sum(expression);if(!integer(total)||total<=0)throw Error('Agrega un importe mayor a cero.');

 const at=new Date().toISOString();for(const i of items){d.products.find(p=>p.id===i.product).stock-=i.qty;d.stock.push({id:id(),product:i.product,delta:-i.qty,at,note:'Venta'});}

 d.sales.push({id:id(),at,total,person,items,note:items.length?'Catálogo':expression});return d;

}

export function pay(d,person,amount){if(!d.people.some(p=>p.id===person)||!integer(amount)||amount<=0||amount>balance(d,person))throw Error('El abono debe ser mayor a cero y no superar el saldo.');d.payments.push({id:id(),person,amount,at:new Date().toISOString()});return d;}

