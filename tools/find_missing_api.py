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

        # Of those, which are actually called by base-game code?
        called = {}
        for name in missing:
            pat = re.compile(rf"\b{module}\.{name}\s*\(")
            hits = [
                str(p.relative_to(GAME))
                for p, t in game_text.items()
                if p != vanilla and pat.search(t)
            ]
            if hits:
                called[name] = hits
        if called:
            rows.append((module, f"{len(called)} missing & called", called))

    rows.sort(key=lambda r: -len(r[2]) if isinstance(r[2], dict) else 0)
    for module, summary, called in rows:
        print(f"\n### {module}  --  {summary}")
        if isinstance(called, dict):
            for name, hits in sorted(called.items()):
                where = ", ".join(sorted(set(hits))[:3])
                more = "" if len(set(hits)) <= 3 else f" (+{len(set(hits)) - 3} more)"
                print(f"    {name:38s} <- {where}{more}")


if __name__ == "__main__":
    sys.exit(main())
