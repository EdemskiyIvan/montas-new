(function(){
'use strict';

const css=`
.lang-switch{display:flex;align-items:center;gap:5px;font-size:12px;font-weight:600;letter-spacing:.02em;margin-right:14px}
.lang-switch a{color:rgba(14,15,12,.4);transition:color .15s;text-decoration:none}
.lang-switch a:hover{color:#0e0f0c}
.lang-switch a.active{color:#1a5cff;pointer-events:none}
.lang-switch .lang-sep{color:rgba(14,15,12,.25);font-weight:400}
`;
const styleEl=document.createElement('style');
styleEl.textContent=css;
document.head.appendChild(styleEl);

const navInner=document.querySelector('.nav-inner');
if(!navInner) return;

const here=location.pathname+location.search;
const wrap=document.createElement('div');
wrap.className='lang-switch';
wrap.innerHTML=`<a href="https://montas.tech${here}">EN</a><span class="lang-sep">/</span><a href="${here}" class="active">RU</a>`;

const anchor=navInner.lastElementChild;
if(anchor) navInner.insertBefore(wrap, anchor);
else navInner.appendChild(wrap);

})();
