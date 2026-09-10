import sys,glob,os
from faster_whisper import WhisperModel
m = WhisperModel("small", device="cpu", compute_type="int8")
for f in sorted(glob.glob(sys.argv[1]+"/*.mp3")):
    segs,_ = m.transcribe(f, language="pt")
    print(os.path.basename(f), '->', " ".join(s.text for s in segs).strip())
