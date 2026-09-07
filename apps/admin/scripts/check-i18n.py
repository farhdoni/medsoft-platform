"""Guards the class of bug tsc cannot see.

The dictionaries are typed `Record<string, string>`, so `t.users.blockd`
type-checks perfectly and renders "undefined" on screen. This walks every
`t.<section>.<key>` reference in the app and checks it exists in all three
locales, and separately reports keys that exist in ru but are missing from
en or uz (a silently untranslated string).

Exit code 1 on any problem, so it can gate a commit.
"""
import io, os, re, sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'src')
ROOT = os.path.normpath(ROOT).replace(os.sep, '/')
I18N = os.path.join(ROOT, 'lib/i18n.tsx').replace(os.sep, '/')

# ── parse the dictionary ──────────────────────────────────────────────────
src = io.open(I18N, encoding='utf-8').read()

# locale blocks look like:  ru: {  ...  },\n  en: {
locales = {}
for loc in ('ru', 'en', 'uz'):
    m = re.search(r'\n  %s: \{\n(.*?)\n  \},\n' % loc, src, re.S)
    if not m:
        print('FATAL: locale block %s not found' % loc)
        sys.exit(1)
    body = m.group(1)
    sections = {}
    # section: {  ... },   (one nesting level below the locale)
    for sm in re.finditer(r'^    (\w+): \{\n(.*?)\n    \},', body, re.S | re.M):
        name, inner = sm.group(1), sm.group(2)
        keys = set()
        for km in re.finditer(r"^\s*'?([A-Za-z0-9_:\-]+)'?\s*:", inner, re.M):
            keys.add(km.group(1))
        sections[name] = keys
    locales[loc] = sections

print('parsed sections:', ', '.join(sorted(locales['ru'])))
for loc in ('ru', 'en', 'uz'):
    total = sum(len(v) for v in locales[loc].values())
    print('  %s: %d sections, %d keys' % (loc, len(locales[loc]), total))

problems = []

# ── the Translations type must list every section ─────────────────────────
# A section added to the three locale objects but not to the type is invisible
# to this script and only shows up as a wall of TS2339 errors.
tm = re.search(r'export type Translations = \{\n(.*?)\n\};', src, re.S)
if not tm:
    problems.append('export type Translations not found')
else:
    declared = set(re.findall(r'^  (\w+):', tm.group(1), re.M))
    for section in sorted(set(locales['ru']) - declared):
        problems.append('section "%s" is missing from the Translations type' % section)
    for section in sorted(declared - set(locales['ru'])):
        problems.append('Translations declares "%s" but no locale defines it' % section)

# ── every ru key should exist in en and uz ────────────────────────────────
for section, keys in locales['ru'].items():
    for other in ('en', 'uz'):
        if section not in locales[other]:
            problems.append('section "%s" missing entirely from %s' % (section, other))
            continue
        missing = keys - locales[other][section]
        for k in sorted(missing):
            problems.append('%s.%s missing from %s' % (section, k, other))

# ── every reference in the app must resolve ───────────────────────────────
BINDING = re.compile(r"const \{[^}]*\bt(?:\s*:\s*(\w+))?\b[^}]*\}\s*=\s*useI18n\(\)")


def ref_patterns(name):
    """Which identifier carries the dictionary in this file.

    Files that already use `t` for something of their own (the support
    cabinet calls its ticket `t`) alias the hook, and then a bare `t.x.y` is
    somebody else's object, not a missing key.
    """
    return (re.compile(r"\b%s\.([a-zA-Z]\w*)\.([a-zA-Z]\w*)" % name),
            re.compile(r"\b%s\.([a-zA-Z]\w*)\[" % name))

refs = 0
dynamic_sections = set()
for dirpath, _, files in os.walk(ROOT):
    for f in files:
        if not f.endswith(('.tsx', '.ts')):
            continue
        p = os.path.join(dirpath, f).replace(os.sep, '/')
        if p == I18N:
            continue
        s = io.open(p, encoding='utf-8').read()
        if 'useI18n' not in s:
            continue
        rel = p[len(ROOT) + 1:]
        bind = BINDING.search(s)
        if not bind:
            problems.append('%s: imports useI18n but no `const { t } = useI18n()` binding found' % rel)
            continue
        name = bind.group(1) or 't'
        REF, DYNAMIC = ref_patterns(name)
        for m in REF.finditer(s):
            section, key = m.group(1), m.group(2)
            refs += 1
            if section not in locales['ru']:
                problems.append('%s: %s.%s.%s — no such section' % (rel, name, section, key))
                continue
            if key not in locales['ru'][section]:
                problems.append('%s: %s.%s.%s — key not in dictionary' % (rel, name, section, key))
        for m in DYNAMIC.finditer(s):
            dynamic_sections.add((rel, m.group(1)))

print('checked %d static references' % refs)
if dynamic_sections:
    print('dynamic lookups (not statically checkable):')
    for rel, section in sorted(dynamic_sections):
        mark = 'ok' if section in locales['ru'] else 'UNKNOWN SECTION'
        print('  %-46s t.%s[...]  %s' % (rel, section, mark))
        if section not in locales['ru']:
            problems.append('%s: t.%s[...] — no such section' % (rel, section))

if problems:
    print('\n%d PROBLEM(S):' % len(problems))
    for p in problems:
        print('  x', p)
    sys.exit(1)

print('\nOK — every reference resolves, all three locales in sync')
