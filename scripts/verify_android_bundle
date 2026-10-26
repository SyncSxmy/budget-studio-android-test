#!/usr/bin/env python3
"""Fail Android build if any web assets referenced by index.html are missing or outdated.

Usage:
    python3 scripts/verify_android_bundle.py --source
    python3 scripts/verify_android_bundle.py --apk android/app/build/outputs/apk/debug/app-debug.apk
"""
from __future__ import annotations
import argparse
import hashlib
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1]
WEB = ROOT / 'www'
REQUIRED = {'index.html','app.js','style.css','crypto-extra.js','auth-extra.js',
            'sync-extra.js','media-extra.js','business-extra.js','finance-engine.js',
            'tool-planner.js','home-tools.js','orders-extra.js'}
VERSION = '0.9.8'

class Assets(HTMLParser):
    def __init__(self):
        super().__init__()
        self.paths = set()
    def handle_starttag(self, tag, attrs):
        attrs=dict(attrs)
        if tag=='script' and attrs.get('src'):
            self.add(attrs['src'])
        if tag=='link' and attrs.get('rel','').lower() in ('stylesheet','manifest','icon','apple-touch-icon'):
            self.add(attrs.get('href',''))
    def add(self, s):
        if not s or s.startswith(('https://','http://','data:','//','#')):
            return
        path=urlsplit(s).path.lstrip('/')
        if not path or '..' in Path(path).parts:
            raise ValueError(f'Invalid local resource path: {s}')
        self.paths.add(path)

def check_source():
    p=WEB/'index.html'
    if not p.is_file():
        raise RuntimeError('Missing www/index.html. Upload the entire Android project, including www/')
    h=p.read_text(encoding='utf-8')
    if f'Testversion {VERSION}' not in h:
        raise RuntimeError(f'Wrong web version: index.html must be {VERSION}. Do not build an old branch.')
    parser=Assets();parser.feed(h)
    expected=set(parser.paths)|REQUIRED
    missing=[k for k in sorted(expected) if not (WEB/k).is_file()]
    if missing:
        raise RuntimeError('Missing required web files in www/: '+', '.join(missing))
    print(f'OK source: Version {VERSION}; {len(expected)} referenced/required web assets checked.')
    return expected

def check_apk(path):
    check_source()
    if not path.is_file():
        raise RuntimeError('No APK found: '+str(path))
    with ZipFile(path) as z:
        paths=set(z.namelist())
        allfiles=[p for p in WEB.rglob('*') if p.is_file()]
        missing=[]; mismatched=[]
        for f in allfiles:
            rel=f.relative_to(WEB).as_posix()
            key='assets/public/'+rel
            if key not in paths:
                missing.append(rel)
            elif hashlib.sha256(f.read_bytes()).digest() != hashlib.sha256(z.read(key)).digest():
                mismatched.append(rel)
        if missing or mismatched:
            raise RuntimeError('APK bundle DOES NOT match www/: '+
                  ('missing='+', '.join(missing)+'; ' if missing else '')+
                  ('different='+', '.join(mismatched) if mismatched else ''))
    print(f'OK APK: {len(allfiles)} web files present and byte-identical, including all 0.9.8 modules.')

if __name__=='__main__':
    ap=argparse.ArgumentParser()
    g=ap.add_mutually_exclusive_group(required=True)
    g.add_argument('--source',action='store_true')
    g.add_argument('--apk',type=Path)
    args=ap.parse_args()
    try:
        if args.source:check_source()
        else:check_apk(args.apk)
    except Exception as exc:
        raise SystemExit('BUILD CHECK FAILED: '+str(exc))
