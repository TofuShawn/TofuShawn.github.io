"""Summarise a screenshot: is the page actually painted, or blank/faded?"""
import sys
from PIL import Image
import numpy as np

def report(path):
    im = Image.open(path).convert('RGB')
    a = np.asarray(im).astype(np.int16)
    h, w, _ = a.shape
    lum = a.mean(axis=2)
    # Distinct colours is the cheapest "did anything render" signal.
    flat = a.reshape(-1, 3)
    uniq = len(np.unique(flat[::7], axis=0))
    dark = float((lum < 90).mean())      # ink coverage
    mid = float(((lum >= 90) & (lum < 200)).mean())
    paper = float((lum >= 200).mean())
    # Row-band profile: a page of text is not uniform.
    bands = [round(float(lum[i*h//12:(i+1)*h//12].std()), 1) for i in range(12)]
    print(f"{path}")
    print(f"  size={w}x{h} uniq={uniq} dark={dark:.3%} mid={mid:.3%} light={paper:.3%}")
    print(f"  row-std={bands}")
    print(f"  verdict={'BLANK' if uniq < 12 or dark < 0.001 else 'PAINTED'}")

for p in sys.argv[1:]:
    report(p)
