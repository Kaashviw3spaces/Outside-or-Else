"""Run existing isolated Chrome regressions and retain exact outcomes."""
import json
from pathlib import Path
import subprocess

root = Path(__file__).resolve().parents[1]
results = []
for name in ['onboarding', 'scenes', 'context-dialogue', 'pets', 'journey', 'challenge', 'ai', 'ai-9c', 'notifications']:
    try:
        completed = subprocess.run(['node', 'scripts/' + name + '-browser-check.cjs'], cwd=root, capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=160)
        results.append({'suite': name, 'status': 'PASS' if completed.returncode == 0 else 'FAIL', 'exitCode': completed.returncode, 'output': completed.stdout + completed.stderr})
    except subprocess.TimeoutExpired:
        results.append({'suite': name, 'status': 'FAIL', 'exitCode': 124, 'output': 'Test timed out'})
    print(name + ': ' + results[-1]['status'], flush=True)
    (root / 'artifacts/checkpoint-9d1/regression-browser.json').write_text(json.dumps(results, indent=2))
raise SystemExit(1 if any(result['exitCode'] for result in results) else 0)
