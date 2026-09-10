import sys
from faster_whisper import WhisperModel
m = WhisperModel("small", device="cpu", compute_type="int8")
segs,_ = m.transcribe(f"exports/{sys.argv[1]}/_longo_narr.mp3", language="pt")
print(" ".join(s.text for s in segs).strip())
