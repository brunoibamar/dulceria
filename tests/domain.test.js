import {test} from 'node:test';
import assert from 'node:assert/strict';
import {empty,cents,sum,sell,pay,balance,validate} from '../src/domain.js';
test('sumas exactas sin evaluar código',()=>{assert.equal(sum('5+5+2+2'),1400);assert.equal(sum('0.10 + 0.20+'),30);assert.throws(()=>sum('2*9'));assert.throws(()=>sum('alert(1)'));assert.throws(()=>sum('2++3'));assert.throws(()=>cents('-1'));});
const setup=()=>({...empty(),products:[{id:'p',name:'Paleta',price:500,cost:200,stock:3}],people:[{id:'u',name:'Ana',phone:'',notes:''}]});
test('fiado, abono parcial y saldo cero',()=>{let d=setup();sell(d,{expression:'5+2',person:'u'});assert.equal(balance(d,'u'),700);pay(d,'u',200);assert.equal(balance(d,'u'),500);assert.throws(()=>pay(d,'u',501));pay(d,'u',500);assert.equal(balance(d,'u'),0);validate(d);});
test('catálogo descuenta stock y conserva costos',()=>{let d=setup();sell(d,{cart:[{product:'p',qty:2}]});assert.equal(d.products[0].stock,1);assert.equal(d.sales[0].total,1000);d.products[0].cost=400;assert.equal(d.sales[0].items[0].cost,200);assert.throws(()=>sell(d,{cart:[{product:'p',qty:2}]}));assert.equal(d.products[0].stock,1);validate(d);});
test('restauración y referencias inválidas',()=>{const d=setup();sell(d,{expression:'2'});assert.deepEqual(validate(JSON.parse(JSON.stringify(d))),d);assert.throws(()=>validate({...d,schema:2}));assert.throws(()=>validate({...d,products:[{...d.products[0],stock:-1}]}));assert.throws(()=>validate({...d,people:[],sales:[{...d.sales[0],person:'missing'}]}));});
