"""Verify the pinned shipped model and inspect its GGUF tokenizer/template metadata."""
import hashlib, json, pathlib, struct
path = pathlib.Path('native/models/Qwen_Qwen3-0.6B-Q4_K_M.gguf')
expected = '9acfc1e001311f34b4252001b626f2e466d592a42065f66571bff3790d4e1b14'
digest = hashlib.file_digest(path.open('rb'), 'sha256').hexdigest()
assert path.stat().st_size == 484220320 and digest == expected, 'Model size/hash mismatch'
with path.open('rb') as f:
    def number(fmt): return struct.unpack('<' + fmt, f.read(struct.calcsize(fmt)))[0]
    def string(): return f.read(number('Q')).decode('utf-8')
    def value(t):
        if t == 8: return string()
        if t == 9:
            kind, count = number('I'), number('Q')
            return [value(kind) for _ in range(count)]
        return number({0:'B',1:'b',2:'H',3:'h',4:'I',5:'i',6:'f',7:'?',10:'Q',11:'q',12:'d'}[t])
    assert f.read(4) == b'GGUF'
    version, tensors, count = number('I'), number('Q'), number('Q')
    metadata = {string(): value(number('I')) for _ in range(count)}
tokens = metadata['tokenizer.ggml.tokens']
report = {'sha256':digest,'bytes':path.stat().st_size,'ggufVersion':version,'tensorCount':tensors,
          'metadata':{k:v for k,v in metadata.items() if not isinstance(v,list)},
          'vocabularySize':len(tokens),'specialTokens':{str(i):tokens[i] for i in [151643,151644,151645,151667,151668]}}
assert metadata['general.architecture'] == 'qwen3'
assert metadata['tokenizer.ggml.model'] == 'gpt2'
assert tokens[151644] == '<|im_start|>' and tokens[151645] == '<|im_end|>'
assert '<think>\\n\\n</think>\\n\\n' in metadata['tokenizer.chat_template']
out=pathlib.Path('artifacts/checkpoint-9d/model-inspection.json');out.parent.mkdir(parents=True,exist_ok=True)
out.write_text(json.dumps(report,indent=2),encoding='utf-8')
print('PASS: pinned GGUF SHA-256, size, Qwen3 architecture, BPE tokenizer, special tokens, non-thinking template; metadata saved.')
