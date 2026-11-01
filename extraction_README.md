# Extraction record
- Model: qwen2.5:7b (run locally with Ollama 0.40.13 on Tesla T4)
- Date: 31 October 2026
- Prompt: prompt/prompt.txt, sent three times, once for each chunk (sentences 1-33, 34-66 and 67-99)
- Settings: temperature 0, seed 42, context 8,192 tokens, structured JSON output (see llm_run_log.json)
- Output as received: llm_output.json (merged) and llm_run_log.json (each chunk)
- Verification: every phrase must occur word for word in the story and is kept under one sub-type only
- Phrases returned: 54; verified and kept: 49; removed: 5 (listed in raw_llm_output.json)
- Researcher rejections: none
- Matching in Step 6: whole words, case-insensitive, longest phrase first, no stretch of text counted twice; stoplist: none
