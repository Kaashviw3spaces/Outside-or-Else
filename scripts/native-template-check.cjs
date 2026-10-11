const fs=require('node:fs'),assert=require('node:assert/strict')
async function main(){
 const {Template}=await import('@huggingface/jinja'),metadata=JSON.parse(fs.readFileSync('artifacts/checkpoint-9d/model-inspection.json','utf8')),template=new Template(metadata.metadata['tokenizer.chat_template'])
 for(let history=0;history<=2;history++){
  const messages=[{role:'system',content:'A playful cat, with no actions or tools.'},...Array.from({length:history},(_,i)=>[{role:'user',content:'hello '+i},{role:'assistant',content:'little paws say hello.'}]).flat(),{role:'user',content:'welcome the imaginary scarf'}]
  const expected=messages.map(m=>`<|im_start|>${m.role}\n${m.content}<|im_end|>\n`).join('')+'<|im_start|>assistant\n<think>\n\n</think>\n\n'
  assert.equal(template.render({messages,tools:[],add_generation_prompt:true,enable_thinking:false}),expected)
 }
 console.log('PASS: native no-tools formatting matches the actual bundled Jinja template with thinking disabled for 0/1/2 history turns. No inference performed.')
}
main().catch(e=>{console.error(e);process.exitCode=1})
