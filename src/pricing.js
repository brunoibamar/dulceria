import {cents} from './domain.js';
export const costKind=p=>p.costStatus??'real';
export function pricing({mode,unit='',pack='',pieces='',price='',margin='30',estimate=false}){
 const percent=Number(margin);
 if(margin===''||!Number.isFinite(percent)||percent<0||percent>=100)throw Error('El margen debe estar entre 0 y menos de 100 %.');
 let cost=null,costStatus='unknown';
 if(mode==='unit'){cost=cents(unit);costStatus='real';}
 else if(mode==='pack'){const count=Number(pieces);if(!Number.isSafeInteger(count)||count<1)throw Error('Indica al menos una pieza entera por paquete.');cost=Math.round(cents(pack)/count);costStatus='real';}
 else if(mode==='sale'){if(estimate){cost=Math.round(cents(price)*(1-percent/100));costStatus='estimated';}}
 else throw Error('Modalidad inválida.');
 return {cost,costStatus,suggested:cost===null?null:Math.ceil(cost/(1-percent/100)),margin:percent};
}
export function profits(sales){const result={real:0,estimated:0,unknown:0};for(const sale of sales){if(!sale.items.length){result.unknown+=sale.total;continue;}for(const i of sale.items){const kind=costKind(i);if(kind==='unknown')result.unknown+=i.price*i.qty;else result[kind]+=(i.price-i.cost)*i.qty;}}return result;}
