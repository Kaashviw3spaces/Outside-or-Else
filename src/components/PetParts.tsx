import type { AccessoryId, Breed } from '../pets/catalog'
export function TailShape({breed,fur,stripe}: {breed: Breed;fur: string;stripe: string}) {
  const paths = {cat:'M205 238C271 239 268 181 245 188c-16 5 9 37-34 36',curl:'M201 229c67 6 67-56 33-53-29 3-22 31-4 23',straight:'M207 233q32-20 45-61 12-17 16-2-4 48-52 77Z',plume:'M205 238q37-18 47-70l8 15 11-9-3 23 12-1-9 20 9 5q-14 31-65 30Z'}
  const pointed = breed.pattern === 'points' || breed.pattern === 'siamese'
  return <><path data-tail-shape={breed.tail} d={paths[breed.tail]} fill={pointed ? stripe : fur} />{breed.tail === 'cat' && ['classic','tabby'].includes(breed.pattern) && <path d="m246 197 11 4m-11 10 10 6" stroke={stripe} strokeWidth="8" />}</>
}
export function CoatRuff({coat,fur,body=false}: {coat: Breed['coat'];fur:string;body?:boolean}) {
  if (coat === 'smooth') return null
  const d = coat === 'fluffy' ? body ? 'M92 171Q68 160 73 184Q49 179 63 201Q42 212 63 228Q51 251 80 251Q79 270 105 254Q149 277 192 254Q223 270 221 249Q251 254 237 228Q260 212 239 198Q254 177 228 180Q232 157 208 171Z' : 'M88 100Q67 83 67 109Q45 110 60 133Q37 146 62 159Q50 186 80 185Q79 209 108 196Q151 217 194 196Q223 208 222 185Q249 188 235 160Q263 147 240 135Q253 111 231 110Q232 86 210 99Z' : body ? 'M91 168 75 165l3 16-17 6 8 13-16 13 18 11-8 15 21 3-4 15 25-6q43 21 83 0l23 7-3-19 22-3-9-15 18-12-17-13 8-14-17-7 2-18-23 6Z' : 'M84 100 66 104l7 20-16 10 10 12-13 14 17 10-5 17 23 1 3 19 22-7q36 17 72 0l24 7 2-19 22-1-5-17 18-10-12-14 8-12-17-10 7-20-20-5Z'
  return <path data-coat-shape={coat} d={d} fill={fur} stroke="#76574b" strokeWidth="3.5" strokeLinejoin="round" />
}
export function FurMarkings({pattern,part,color,cat}: {pattern:Breed['pattern'];part:'head'|'body';color:string;cat:boolean}) {
  if (pattern === 'tabby' || pattern === 'classic' && cat) return part === 'head' ? <g stroke={color} strokeWidth="8" strokeLinecap="round" opacity=".75"><path d="m136 85 3 20m11-21v21m14-20-4 20M77 124l17 6m-17 11 16 4m128-21-17 6m18 11-16 4" /></g> : null
  if (pattern === 'calico') return <g fill="#e8a76f"><ellipse cx={part === 'head' ? 100 : 106} cy={part === 'head' ? 113 : 211} rx="33" ry="38" /><ellipse cx="198" cy={part === 'head' ? 112 : 217} rx="30" ry="31" fill="#554e4a" /></g>
  if (pattern === 'spots') return <g fill="#41434c">{(part === 'head' ? [[84,113,12],[162,95,13],[214,133,15],[190,181,8]] : [[102,194,13],[169,219,11],[194,197,16],[111,239,9]]).map(([x,y,r])=><ellipse key={x} cx={x} cy={y} rx={r} ry={r*.8} />)}</g>
  if (pattern === 'siamese' && part === 'head') return <path d="M75 112q75-69 150 0l5 41q-7 48-80 49-73-1-80-49Z" fill={color} />
  if (part === 'body' && ['saddle','tricolor'].includes(pattern)) return <path d="M82 174q68-40 135 0l-6 37q-71-25-130 9Z" fill="#494646" />
  if (part === 'head' && pattern === 'tricolor') return <><path d="M66 86h72l-12 75-59-9Z" fill="#ac754c" /><path d="M166 83h71v71l-48 4Z" fill="#494646" /><path d="m140 79-10 61 20 29 20-29-9-61Z" fill="#fff2dc" /></>
  if (part === 'head' && pattern === 'saddle') return <path d="M76 80h148v54l-49-23-25 39-25-39-49 23Z" fill="#494646" />
  if (part === 'head' && (!cat && ['mask','classic'].includes(pattern) || pattern === 'tuxedo')) return <><path d="M82 141q14 8 32-4 17-12 36 0 19-12 36 0 17 12 34 4-8 58-70 59-61-1-68-59" fill="#fff2dc" /><path d="m105 119 11-3m69 3-11-3" stroke="#fff2dc" strokeWidth="7" strokeLinecap="round" /></>
  return null
}
export function PetAccessory({accessory,part}: {accessory?:AccessoryId|null;part:'head'|'body'}) {
  if (!accessory) return null
  if (part === 'body' && ['red-collar','blue-collar'].includes(accessory)) return <g data-accessory={accessory}><path d="M93 199q57 25 114 0v12q-57 24-114 0Z" fill={accessory === 'red-collar' ? '#c86761' : '#6899ba'} stroke="#76574b" strokeWidth="2" /><circle cx="150" cy="220" r="6" fill="#e4bc70" stroke="#76574b" strokeWidth="2" /></g>
  if (part === 'body' && accessory === 'green-scarf') return <g data-accessory={accessory} fill="#7d9f81" stroke="#76574b" strokeWidth="2"><path d="M89 192q61 38 121 0l-6 23q-50 26-109 0Z" /><path d="m170 211 23 33-26-7-11-22Z" /></g>
  if (part === 'body' && accessory === 'backpack') return <g data-accessory={accessory} stroke="#76574b" strokeWidth="2.5"><rect x="208" y="183" width="31" height="57" rx="10" fill="#9aa784" /><path d="m199 190 17 42m-4-23h24" fill="none" /><rect x="215" y="215" width="19" height="17" rx="4" fill="#d8bd89" /></g>
  if (part === 'head' && accessory === 'pink-bow') return <g data-accessory={accessory} fill="#d998a8" stroke="#76574b" strokeWidth="2"><path d="m211 91-20-14q-7 16 0 29Zm1 0 21-14q6 16 0 29Z" /><circle cx="212" cy="91" r="5" fill="#eebfc9" /></g>
  if (part === 'head' && accessory === 'flower-crown') return <g data-accessory={accessory}><path d="M90 88q60-28 120 0" stroke="#789775" strokeWidth="5" fill="none" />{[[103,83],[127,75],[152,72],[178,76],[201,85]].map(([x,y],i)=><g key={x} fill={i%2 ? '#e6b6c0' : '#f5dfb0'}>{[0,72,144,216,288].map(angle=><ellipse key={angle} cx={x} cy={y-5} rx="3.5" ry="5" transform={`rotate(${angle} ${x} ${y})`} />)}<circle cx={x} cy={y} r="3" fill="#c19b57" /></g>)}</g>
  return null
}
