import sys, re
from faster_whisper import WhisperModel
m = WhisperModel("small", device="cpu", compute_type="int8")
for slug in sys.argv[1:]:
    segs,_ = m.transcribe(f"exports/{slug}/narr.mp3", language="pt")
    ouvido = " ".join(s.text for s in segs).strip()
    print(f"\n=== {slug}")
    print(ouvido)
