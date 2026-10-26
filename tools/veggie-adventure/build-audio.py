"""Preserve Drive originals; build normalized music and two original short cues.

Run with the bundled Python (numpy) and --ffmpeg <path-to-ffmpeg>.
No remote credentials or temporary download links are stored.
"""
from pathlib import Path
import argparse, hashlib, json, math, re, subprocess, wave
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'art-source/veggie-adventure/audio/drive-ost-20261025'
GENERATED = ROOT / 'art-source/veggie-adventure/audio/generated-jingles-v1'
DEST = ROOT / 'public/games/veggie-adventure/assets/audio'
SR = 44100


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def command(args, data=None):
    r = subprocess.run([FFMPEG, '-hide_banner', '-loglevel', 'info', *args], input=data, capture_output=True)
    if r.returncode:
        raise RuntimeError(r.stderr.decode('utf8', errors='replace')[-2000:])
    return r


def decode(path):
    r = command(['-i', str(path), '-map', '0:a:0', '-vn', '-ac', '2', '-ar', str(SR), '-f', 'f32le', 'pipe:1'])
    return np.frombuffer(r.stdout, dtype='<f4').reshape(-1, 2).copy(), r.stderr.decode('utf8', errors='replace')


def active_region(x):
    n = SR // 50
    levels = np.sqrt(np.mean(x[:len(x)//n*n].reshape(-1, n, 2) ** 2, axis=(1, 2)))
    active = np.flatnonzero(levels > max(.0015, float(levels.max()) * .008))
    if not len(active):
        raise ValueError('Silent source')
    return max(0, active[0]*n-int(.04*SR)), min(len(x), (active[-1]+1)*n+int(.15*SR))


def wrap_loop(x, seconds=.45):
    # Tail dissolves into the removed opening. End -> start follows consecutive
    # source samples; it does not add a silent fade at each loop.
    n = min(int(seconds*SR), len(x)//8)
    a = np.linspace(0, np.pi/2, n, endpoint=False)[:, None]
    y = x[n:].copy()
    y[-n:] = x[-n:]*np.cos(a) + x[:n]*np.sin(a)
    return y


def wav(path, x):
    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), 'wb') as f:
        f.setnchannels(2); f.setsampwidth(2); f.setframerate(SR)
        f.writeframes((np.clip(x, -.98, .98)*32767).astype('<i2').tobytes())


def original_cue(code, duration, notes, chord):
    x = np.zeros((int(duration*SR), 2), dtype=np.float32)
    for start, length, midi, strength, voice in notes + chord:
        n = min(int(length*SR), len(x)-int(start*SR))
        t = np.arange(n)/SR; freq = 440*2**((midi-69)/12)
        env = np.minimum(1, t/.012)*np.minimum(1, (length-t)/.16)
        if voice == 'bell':
            signal = (np.sin(2*np.pi*freq*t)*np.exp(-t*3.8)+.22*np.sin(2*np.pi*freq*3*t)*np.exp(-t*8))
        elif voice == 'chip':
            signal = sum(np.sin(2*np.pi*freq*k*t)/k**2 for k in [1, 3, 5, 7])*.65
        else:
            signal = np.sin(2*np.pi*freq*t)+.16*np.sin(2*np.pi*freq*2*t)
        signal *= env*strength
        offset = int(start*SR); x[offset:offset+n] += signal[:, None]*np.array([.94, 1.0])
    wav(GENERATED/(code+'.wav'), x)
    return {'code':code, 'duration':duration, 'notes':notes, 'chord':chord, 'method':'original additive synthesis; no borrowed melody'}


def build(only=None):
    index = json.loads((SOURCE/'index.json').read_text(encoding='utf8'))
    manifest = {'version':1, 'tracks':{}, 'worlds':{}, 'bosses':{}, 'events':{'death':'J02', 'levelClear':'J03', 'bossClear':'J04', 'finalVictory':'J05', 'gameOver':'J06', 'rebirth':'J07'}}
    report = []
    if only:
        manifest = json.loads((DEST/'manifest.json').read_text(encoding='utf8'))
        report = [r for r in json.loads((SOURCE/'processing-report.json').read_text(encoding='utf8')) if r['code'] not in only]
    specs = [original_cue('J06_game_over_v1', 4.1,
                [(0,.45,71,.18,'sine'),(.38,.4,69,.17,'sine'),(.75,.45,67,.16,'sine'),(1.15,.75,64,.16,'sine'),(2,.85,59,.11,'bell')],
                [(1.2,1.7,40,.1,'chip'),(1.2,1.7,55,.055,'sine'),(1.2,1.7,59,.055,'sine')]),
             original_cue('J07_rebirth_v1', 1.65,
                [(0,.25,74,.17,'bell'),(.16,.28,78,.17,'bell'),(.32,.3,81,.17,'bell'),(.52,.65,86,.15,'sine')],
                [(0,1.1,50,.11,'chip'),(.32,.85,57,.075,'sine')])]
    GENERATED.mkdir(parents=True, exist_ok=True)
    (GENERATED/'score.json').write_text(json.dumps(specs, ensure_ascii=False, indent=2)+'\n', encoding='utf8')
    files = list(index['files']) + [{'code':s['code'][:3], 'name':s['code']+'.wav', 'generated':True} for s in specs]
    for entry in sorted(files, key=lambda e:e['code']):
        code = entry['code']; generated = entry.get('generated', False)
        if only and code not in only: continue
        if generated:
            src = GENERATED/entry['name']; source_type = 'synthesized-original'
        else:
            old = SOURCE/'originals'/(code+'.mp3'); src = SOURCE/'originals'/(code+'.m4a')
            if old.exists():
                if b'ftyp' not in old.read_bytes()[:16]: raise ValueError('Unexpected container '+code)
                if src.exists(): raise FileExistsError(src)
                old.rename(src)
            if src.stat().st_size != entry['bytes']: raise ValueError('Drive size mismatch '+code)
            source_type = 'user-drive-aac'
        x, info = decode(src); source_seconds = len(x)/SR
        if not generated and 'Audio: aac' not in info: raise ValueError('Expected AAC stream '+code)
        start, end = active_region(x); x = x[start:end]
        loop = code[0] in 'WB' or code in ['M01', 'M02']
        if code == 'M02': x = x[:int(11.43*SR)]
        target = {'J01':2, 'J02':.65, 'J03':5, 'J04':7, 'J05':12}.get(code)
        if target:
            x = x[:int(target*SR)]
            n = min(int(min(1, target*.17)*SR), len(x))
            x[-n:] *= np.linspace(1, 0, n)[:, None]
            x[:int(.015*SR)] *= np.linspace(0, 1, int(.015*SR))[:, None]
        if loop: x = wrap_loop(x)
        kind = 'music' if code[0] in 'WBM' else 'jingles'
        out = DEST/kind/(Path(entry['name']).stem.split(' (Take')[0]+'.mp3')
        out.parent.mkdir(parents=True, exist_ok=True)
        r = command(['-y', '-f','f32le','-ar',str(SR),'-ac','2','-i','pipe:0','-map','0:a:0','-vn','-map_metadata','-1',
                     '-af','loudnorm=I=-18:TP=-2:LRA=11:print_format=json','-ar',str(SR),'-c:a','libmp3lame','-b:a','112k',str(out)], x.astype('<f4').tobytes())
        measured, _ = decode(out); peak = float(np.abs(measured).max()); duration = len(measured)/SR
        if peak >= .999: raise ValueError('Decoded MP3 clips '+code)
        track = {'path':out.relative_to(DEST).as_posix(), 'duration':round(duration, 6),'loop':loop,'loopStart':0,'loopEnd':round(duration,6),
                 'bytes':out.stat().st_size,'sha256':sha(out),'source':source_type,'enabled':code!='J01','peakDb':round(20*math.log10(max(peak,1e-9)),2)}
        manifest['tracks'][code] = track
        if code.startswith('W'):manifest['worlds'][str(int(code[1:]))] = code
        if code.startswith('B'):manifest['bosses'][str(int(code[1:]))] = code
        report.append({'code':code,'sourceName':entry['name'],'sourcePath':src.relative_to(ROOT).as_posix(),'sourceSha256':sha(src),'sourceDuration':round(source_seconds,3),**track})
        print(code, round(source_seconds,2), '->', round(duration,2), 'sec', track['peakDb'], 'dBFS', flush=True)
    (DEST/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
    (SOURCE/'processing-report.json').write_text(json.dumps(sorted(report,key=lambda r:r['code']),ensure_ascii=False,indent=2)+'\n',encoding='utf8')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(); parser.add_argument('--ffmpeg', required=True); parser.add_argument('--only'); args = parser.parse_args(); FFMPEG = args.ffmpeg
    build(set(args.only.split(',')) if args.only else None)
