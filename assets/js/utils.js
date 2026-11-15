export const TZ='Asia/Kathmandu';
export const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const asDate=v=>v?.toDate?v.toDate():new Date(v?.seconds?v.seconds*1000:v??Date.now());
export const dayKey=(v=new Date())=>new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'}).format(asDate(v));
export const displayDate=v=>v?new Intl.DateTimeFormat('en-GB',{timeZone:TZ,dateStyle:'medium',timeStyle:'short'}).format(asDate(v)):'—';
export function addDays(key,n){const d=new Date(key+'T00:00:00+05:45');d.setTime(d.getTime()+n*86400000);return dayKey(d);}
export const nepalMidnight=key=>new Date(key+'T00:00:00+05:45');
export const pct=(a,b)=>b?Math.round(a/b*100):0;
export const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
export const uid=()=>crypto.randomUUID();
export const normalize=s=>String(s).normalize('NFC').toLocaleLowerCase().replace(/[^\p{L}\p{N}\p{M}]+/gu,' ').trim();
export const tokens=s=>[...new Set(normalize(s).split(/\s+/).filter(Boolean))].slice(0,120);
export function shuffle(items,rng=Math.random){const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
export const debounce=(fn,ms=300)=>{let t;return(...a)=>{clearTimeout(t);t=setTimeout(()=>fn(...a),ms);};};
export function friendly(error){const code=error?.code||'';if(code.includes('permission'))return 'You do not have access. Verify your email or contact the administrator.';if(code.includes('network')||!navigator.onLine)return 'Connection unavailable. Please reconnect and retry.';if(code.includes('invalid-credential'))return 'Email or password is incorrect.';if(code.includes('email-already'))return 'This email already has an account.';if(code.includes('popup-closed'))return 'Google sign-in was closed. Please try again.';if(code.includes('too-many'))return 'Too many requests. Please wait and retry.';if(code.includes('failed-precondition'))return 'This query needs a database index. Please contact the administrator.';if(code.includes('resource-exhausted'))return 'The daily service quota has been reached. Please try later.';return error?.safe?error.message:'The action could not be completed. Please retry.';}
export function fail(message){const e=new Error(message);e.safe=true;throw e;}
export function requireOnline(){if(!navigator.onLine)fail('Offline reading is available. Reconnect to save changes.');}
export const sleep=ms=>new Promise(r=>setTimeout(r,ms));
export function download(name,content,type='application/json'){const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
export const csv=rows=>'\ufeff'+rows.map(row=>row.map(v=>'"'+String(v??'').replace(/^([\s]*[=+@-])/,"'$1").replaceAll('"','""')+'"').join(',')).join('\r\n');
export function validateQuestion(q){const e=[];if(!q.questionText?.trim())e.push('Question text is required');if(!Array.isArray(q.options)||q.options.length<2||q.options.length>6||q.options.some(x=>typeof x!=='string'||!x.trim()))e.push('Provide 2–6 non-empty options');if(!Number.isInteger(q.correctOption)||q.correctOption<0||q.correctOption>=q.options?.length)e.push('Correct option is invalid');if(![1,2,3].includes(q.level))e.push('Level must be 1, 2 or 3');if(!['low','medium','high'].includes(q.importance))e.push('Invalid importance');for(const k of ['examId','subjectId','chapterId','topicId'])if(!q[k])e.push(k+' is required');if(q.questionText?.length>12000)e.push('Question is too long');if((q.tags||[]).length>30)e.push('At most 30 tags');return e;}
export const timeText=s=>`${String(Math.floor(Math.max(0,s)/60)).padStart(2,'0')}:${String(Math.max(0,Math.floor(s))%60).padStart(2,'0')}`;
