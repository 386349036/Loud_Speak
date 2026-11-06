# -*- coding: utf-8 -*-
"""像素坦克大战 · 美术资产后处理工具（纯标准库，无第三方依赖）

子命令:
  normalize <src> <dst>      背景归一: 粉色系(含边缘混色) -> 纯 #FF00FF, 保留最大连通域清除杂点
  keyout    <src> <dst>      抠透明底: #FF00FF -> alpha=0, 输出 RGBA
  check     <img>...         合规自检: 尺寸/背景纯度/包围盒/安全边/亮度档数
  trim      <src> <dst>      裁掉四周纯品红边到内容 bbox
"""
import sys, os, zlib, struct
from collections import deque, Counter

MAG = (255, 0, 255)
TILE = 512  # 基准画布


# ---------- PNG 编解码 (仅支持 8bit RGB/RGBA, 所有 filter) ----------

def load_png(path):
    data = open(path, 'rb').read()
    if data[:8] != b'\x89PNG\r\n\x1a\n':
        raise SystemExit('not a png: ' + path)
    pos = 8
    idat = b''
    w = h = ct = None
    plte = None
    while pos < len(data):
        ln = struct.unpack('>I', data[pos:pos+4])[0]
        typ = data[pos+4:pos+8]
        c = data[pos+8:pos+8+ln]
        if typ == b'IHDR':
            w, h, bd, ct, _, _, inter = struct.unpack('>IIBBBBB', c)
            if bd != 8 or inter != 0 or ct not in (2, 6):
                raise SystemExit(f'unsupported png: bitd={bd} ctype={ct} inter={inter}')
        elif typ == b'IDAT':
            idat += c
        elif typ == b'PLTE':
            plte = c
        elif typ == b'IEND':
            break
        pos += 12 + ln
    raw = zlib.decompress(idat)
    ch = 4 if ct == 6 else 3
    stride = w * ch
    rows = []
    p = 0
    prev = bytearray(stride)
    for y in range(h):
        f = raw[p]; p += 1
        line = bytearray(raw[p:p+stride]); p += stride
        if f == 0:
            pass
        elif f == 1:
            for i in range(ch, stride):
                line[i] = (line[i] + line[i-ch]) & 255
        elif f == 2:
            for i in range(stride):
                line[i] = (line[i] + prev[i]) & 255
        elif f == 3:
            for i in range(stride):
                a = line[i-ch] if i >= ch else 0
                line[i] = (line[i] + ((a + prev[i]) >> 1)) & 255
        elif f == 4:
            for i in range(stride):
                a = line[i-ch] if i >= ch else 0
                b = prev[i]
                c2 = prev[i-ch] if i >= ch else 0
                pp = a + b - c2
                pa, pb, pc = abs(pp-a), abs(pp-b), abs(pp-c2)
                pr = a if (pa <= pb and pa <= pc) else (b if pb <= pc else c2)
                line[i] = (line[i] + pr) & 255
        else:
            raise SystemExit('bad filter %d' % f)
        prev = line
        rows.append(line)
    return w, h, ch, rows


def save_png(path, w, h, ch, rows):
    ct = 6 if ch == 4 else 2
    buf = bytearray()
    for line in rows:
        buf.append(0)
        buf += line
    comp = zlib.compress(bytes(buf), 9)

    def chunk(t, d):
        return struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t+d) & 0xffffffff)

    png = b'\x89PNG\r\n\x1a\n'
    png += chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, ct, 0, 0, 0))
    png += chunk(b'IDAT', comp)
    png += chunk(b'IEND', b'')
    open(path, 'wb').write(png)


# ---------- 像素判断 ----------

def is_bg(r, g, b):
    """粉色系(含半透明边缘混色): 红高、绿低、偏蓝但明显偏红"""
    return r >= 180 and g <= 110 and 100 <= b <= 230 and (r - b) >= 50


def is_pure_mag(r, g, b):
    return r == 255 and g == 0 and b == 255


def largest_component(w, h, rows):
    """非纯品红像素的最大 4-连通域"""
    def bgat(x, y):
        i = x * (len(rows[0]) // w)
        line = rows[y]
        return is_pure_mag(line[i], line[i+1], line[i+2])
    visited = bytearray(w * h)
    best = None
    for y0 in range(h):
        for x0 in range(w):
            idx = y0 * w + x0
            if visited[idx] or bgat(x0, y0):
                continue
            visited[idx] = 1
            q = deque([(x0, y0)])
            comps = []
            while q:
                x, y = q.popleft()
                comps.append((x, y))
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < w and 0 <= ny < h:
                        j = ny * w + nx
                        if not visited[j] and not bgat(nx, ny):
                            visited[j] = 1
                            q.append((nx, ny))
            if best is None or len(comps) > len(best):
                best = comps
    return best or []


# ---------- 子命令 ----------

def cmd_normalize(src, dst):
    w, h, ch, rows = load_png(src)
    n = 0
    for line in rows:
        for x in range(w):
            i = x * ch
            r, g, b = line[i], line[i+1], line[i+2]
            if is_bg(r, g, b) and not is_pure_mag(r, g, b):
                line[i], line[i+1], line[i+2] = MAG
                n += 1
    keep = bytearray(w * h)
    for x, y in largest_component(w, h, rows):
        keep[y * w + x] = 1
    nc = 0
    for y in range(h):
        line = rows[y]
        for x in range(w):
            if not keep[y * w + x]:
                i = x * ch
                if not is_pure_mag(line[i], line[i+1], line[i+2]):
                    line[i], line[i+1], line[i+2] = MAG
                    nc += 1
    save_png(dst, w, h, ch, rows)
    print(f'normalize: bg->#FF00FF {n}px, stray cleaned {nc}px -> {dst}')


def cmd_keyout(src, dst):
    w, h, ch, rows = load_png(src)
    if ch == 3:
        rows = [bytearray(bytes(line[i:i+3]) + b'\xff' for i in range(0, len(line), 3)) for line in rows]
        ch = 4
    n = 0
    for line in rows:
        for x in range(w):
            i = x * 4
            if is_pure_mag(line[i], line[i+1], line[i+2]):
                line[i+3] = 0
                n += 1
    save_png(dst, w, h, 4, rows)
    print(f'keyout: {n}px -> transparent, saved {dst}')


def cmd_trim(src, dst):
    w, h, ch, rows = load_png(src)
    minx, maxx, miny, maxy = w, 0, h, 0
    for y in range(h):
        line = rows[y]
        for x in range(w):
            i = x * ch
            if not is_pure_mag(line[i], line[i+1], line[i+2]):
                minx, maxx, miny, maxy = min(minx, x), max(maxx, x), min(miny, y), max(maxy, y)
    nh, nw = maxy - miny + 1, maxx - minx + 1
    out = [line[minx*ch:(maxx+1)*ch] for line in rows[miny:maxy+1]]
    save_png(dst, nw, nh, ch, out)
    print(f'trim: {w}x{h} -> {nw}x{nh}, saved {dst}')


def cmd_check(paths):
    for path in paths:
        w, h, ch, rows = load_png(path)
        mag = 0
        minx, maxx, miny, maxy = w, 0, h, 0
        subj = Counter()
        for y in range(h):
            line = rows[y]
            for x in range(w):
                i = x * ch
                r, g, b = line[i], line[i+1], line[i+2]
                if ch == 4 and line[i+3] < 128:
                    continue
                if is_pure_mag(r, g, b):
                    mag += 1
                else:
                    minx, maxx, miny, maxy = min(minx, x), max(maxx, x), min(miny, y), max(maxy, y)
                    subj[(r//32, g//32, b//32)] += 1
        total = w * h
        lum = Counter()
        for (r, g, b), n in subj.items():
            lum[(r + g + b) // 3] += n  # r/g/b 已是 32 级量化值, 直接取均值即档位
        bw, bh = maxx - minx + 1, maxy - miny + 1
        print(f'== {os.path.basename(path)}')
        print(f'   size {w}x{h} | bg #FF00FF {mag/total*100:.1f}%')
        print(f'   bbox {bw}x{h and bh} ({bw/w*100:.0f}% x {bh/h*100:.0f}%) margins L{minx} R{w-1-maxx} T{miny} B{h-1-maxy}')
        print(f'   brightness buckets(8-step): {sorted(lum.items())}')
        ok = True
        if w != TILE:
            print(f'   [WARN] 期望 {TILE}x{TILE}')
        if bw > w * 0.95 or bh > h * 0.95:
            print('   [WARN] 主体超 95%, 疑似无安全边')
        print()


HELP = __doc__

if __name__ == '__main__':
    if len(sys.argv) < 2 or sys.argv[1] in ('-h', '--help'):
        print(HELP)
        sys.exit(0)
    cmd = sys.argv[1]
    args = sys.argv[2:]
    if cmd == 'normalize' and len(args) == 2:
        cmd_normalize(args[0], args[1])
    elif cmd == 'keyout' and len(args) == 2:
        cmd_keyout(args[0], args[1])
    elif cmd == 'trim' and len(args) == 2:
        cmd_trim(args[0], args[1])
    elif cmd == 'check' and args:
        cmd_check(args)
    else:
        print(HELP)
        sys.exit(1)
