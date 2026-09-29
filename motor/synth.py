import sys, json, wave
import numpy as np
out, T, pops = sys.argv[1], float(sys.argv[2]), json.loads(sys.argv[3])
sr = 48000; N = int(sr * T); x = np.zeros(N)
rng = np.random.default_rng(7)
def add(sig, t):
    i = int(t * sr); j = min(N, i + len(sig))
    if i < N: x[i:j] += sig[:j - i]
bpm = 84; beat = 60 / bpm
# pad: acordes graves suaves
roots = [55, 43.65, 65.41, 49]
t = np.arange(N) / sr
pad = np.zeros(N)
for bar in range(int(T / (beat * 4)) + 1):
    f = roots[(bar // 2) % len(roots)]; s0 = bar * beat * 4; s1 = min(T, s0 + beat * 4)
    i0, i1 = int(s0 * sr), int(s1 * sr); tt = t[i0:i1] - s0
    seg = .6 * np.sin(2 * np.pi * f * tt) + .18 * np.sin(2 * np.pi * f * 1.5 * tt) + .12 * np.sin(2 * np.pi * f * 2 * tt)
    env = np.minimum(1, tt / .3) * np.minimum(1, (s1 - s0 - tt) / .3)
    pad[i0:i1] += seg * env
fade = np.minimum(1, t / 2) * np.minimum(1, (T - t) / 2)
x += .09 * pad * fade
# bateria
def kick():
    d = .38; tt = np.arange(int(sr * d)) / sr
    f = 42 + (130 - 42) * np.exp(-tt / .04); ph = 2 * np.pi * np.cumsum(f) / sr
    return .85 * np.sin(ph) * np.exp(-tt / .09)
def hat(g):
    d = .05; n = rng.standard_normal(int(sr * d)); n = np.diff(n, prepend=0)
    return g * n * np.exp(-np.arange(len(n)) / sr / .012)
def snare():
    d = .18; n = rng.standard_normal(int(sr * d)); tt = np.arange(len(n)) / sr
    return .3 * n * np.exp(-tt / .05) + .15 * np.sin(2 * np.pi * 190 * tt) * np.exp(-tt / .04)
i = 0; tb = 2.2
while tb < T - 1.5:
    if i % 2 == 0 and i % 8 != 6: add(kick(), tb)
    if i % 8 == 4: add(snare(), tb)
    add(hat(.05 if i % 2 else .08), tb)
    tb += beat / 2; i += 1
# efeito em cada frase
def pop():
    d = .3; tt = np.arange(int(sr * d)) / sr; n = rng.standard_normal(len(tt))
    f = 600 * (7 ** np.minimum(1, tt / .22)); swish = np.sin(2 * np.pi * np.cumsum(f) / sr) * n * .15
    env = np.minimum(1, tt / .05) * np.exp(-np.maximum(0, tt - .05) / .06)
    blip = np.where(tt > .04, np.sin(2 * np.pi * (660 + 330 * np.minimum(1, (tt - .04) / .06)) * tt) * np.exp(-np.maximum(0, tt - .06) / .04), 0)
    return .5 * swish * env + .18 * blip
for p in pops: add(pop(), p)
x = .6 * x; x = np.tanh(x * 1.2) / np.tanh(1.2)
pk = np.max(np.abs(x)); x = x / pk * .6 if pk > 0 else x
s = (x * 32767).astype(np.int16); st = np.stack([s, s], 1).tobytes()
with wave.open(out, 'wb') as wv:
    wv.setnchannels(2); wv.setsampwidth(2); wv.setframerate(sr); wv.writeframes(st)
