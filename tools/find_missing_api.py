#!/usr/bin/env python3
"""Find base-game calls that the mod's overrides no longer satisfy.

Each file under lua/ge/extensions/overrides/ wholesale-replaces a base-game
module. If 0.39 added or renamed a function on such a module, any base-game
file still calling it hits nil, because the mod's older copy is what actually
loads. This reports those holes before they turn into runtime crashes.
"""
import pathlib
import re
import sys

REPO = pathlib.Path("/home/m/Downloads/rls_mod")
GAME = pathlib.Path(
    "/home/m/.steam/debian-installation/steamapps/common/BeamNG.drive"
)
OVERRIDES = REPO / "lua/ge/extensions/overrides"

EXPORT_RE = re.compile(r"^M\.([A-Za-z_]\w*)\s*=", re.M)
# also catch `M.foo = function` style and table-literal exports
EXPORT2_RE = re.compile(r"^\s{2}([A-Za-z_]\w*)\s*=\s*[A-Za-z_]\w*,?\s*$", re.M)


def ext_name(rel):
    return str(rel.with_suffix("")).replace("/", "_")


def read(p):
    return p.read_text(encoding="utf-8", errors="replace").replace("\r\n", "\n")


def exports(text):
    return set(EXPORT_RE.findall(text))


def main():
    game_lua = list((GAME / "lua").rglob("*.lua"))
    game_text = {p: read(p) for p in game_lua}

    rows = []
    for f in sorted(OVERRIDES.rglob("*.lua")):
        rel = f.relative_to(OVERRIDES)
        module = ext_name(rel)
        vanilla = GAME / "lua/ge/extensions" / rel
        if not vanilla.exists():
            rows.append((module, "MODULE DELETED IN 0.39", []))
            continue

        mod_exports = exports(read(f))
        van_exports = exports(read(vanilla))

        # Functions 0.39 exports that the mod's copy does not.
        missing = van_exports - mod_exports
        if not missing:
            continue

        # Of those, which are actually called by base-game code that still runs?
        # A call site inside a file this mod also overrides never executes, and a
        # call guarded by `module.name and module.name(...)` degrades instead of
        # erroring - neither is a crash, so both are reported separately.
        called = {}
        for name in missing:
            pat = re.compile(rf"\b{module}\.{name}\s*\(")
            guard = re.compile(rf"\b{module}\.{name}\s+and\b")
            hits = []
            for p, t in game_text.items():
                if p == vanilla or not pat.search(t):
                    continue
                try:
                    p_rel = p.relative_to(GAME / "lua/ge/extensions")
                except ValueError:
                    p_rel = None
                shadowed = p_rel is not None and (OVERRIDES / p_rel).exists()
                tag = "shadowed" if shadowed else ("guarded" if guard.search(t) else "LIVE")
                hits.append((tag, str(p.relative_to(GAME))))
            if hits:
                called[name] = hits
        live = sum(1 for v in called.values() if any(t == "LIVE" for t, _ in v))
        if called:
            rows.append((module, f"{live} live / {len(called)} missing", called))

    rows.sort(key=lambda r: -len(r[2]) if isinstance(r[2], dict) else 0)
    for module, summary, called in rows:
        print(f"\n### {module}  --  {summary}")
        if not isinstance(called, dict):
            continue
        for name, hits in sorted(called.items()):
            worst = "LIVE" if any(t == "LIVE" for t, _ in hits) else hits[0][0]
            where = sorted({f for t, f in hits if t == worst})
            more = "" if len(where) <= 2 else f" (+{len(where) - 2} more)"
            print(f"    [{worst:8s}] {name:34s} <- {', '.join(where[:2])}{more}")


if __name__ == "__main__":
    sys.exit(main())
