#!/usr/bin/env python3
"""Rebase the mod's Lua signature additions onto the 0.39 base file.

The mod ships a whole copy of LuaFunctionSignatures.js forked from 0.38.4.
Rather than carry that fork forward (it drags along stale base-game entries and
imports devutils modules 0.39 deleted), take the 0.39 file as the base and
re-apply only the entries the mod actually adds:

  * namespaces that exist solely in the mod are copied across verbatim
  * namespaces present in both keep the 0.39 body, with any mod-only functions
    inside them appended, so base-game changes are preserved
"""
import re
import sys

ENTRY_RE = re.compile(r"^(\s*)([A-Za-z_$][\w$]*)\s*:")


def read(path):
    with open(path, encoding="utf-8") as fh:
        return fh.read().replace("\r\n", "\n").split("\n")


def parse_entries(lines, start, end, indent):
    """Map each `name:` entry at `indent` to its inclusive (start, end) range."""
    entries, i = {}, start
    while i < end:
        m = ENTRY_RE.match(lines[i])
        if m and len(m.group(1)) == indent:
            name, j, depth = m.group(2), i, 0
            while j < end:
                depth += lines[j].count("{") + lines[j].count("[")
                depth -= lines[j].count("}") + lines[j].count("]")
                if depth <= 0:
                    break
                j += 1
            entries[name] = (i, j)
            i = j + 1
        else:
            i += 1
    return entries


def main(base_path, mod_path, out_path):
    base, mod = read(base_path), read(mod_path)

    b_top = parse_entries(base, 0, len(base) - 1, 2)
    m_top = parse_entries(mod, 0, len(mod) - 1, 2)

    new_top = [k for k in m_top if k not in b_top]
    shared = [k for k in m_top if k in b_top]

    # For shared namespaces, collect mod-only functions to append into the body.
    additions = {}
    for k in shared:
        bs, be = b_top[k]
        ms, me = m_top[k]
        if base[bs:be + 1] == mod[ms:me + 1]:
            continue
        b_fns = parse_entries(base, bs + 1, be, 4)
        m_fns = parse_entries(mod, ms + 1, me, 4)
        extra = [f for f in m_fns if f not in b_fns]
        if extra:
            additions[k] = [(f, m_fns[f]) for f in extra]

    out, i = [], 0
    while i < len(base):
        line = base[i]
        # Rewrite a shared namespace that gains mod-only functions.
        owner = next((k for k, (s, _) in b_top.items() if s == i and k in additions), None)
        if owner:
            bs, be = b_top[owner]
            body = base[bs:be]                 # body without its closing line
            # The final entry of a block may omit its trailing comma; appending
            # after it would produce invalid JS.
            for k in range(len(body) - 1, -1, -1):
                stripped = body[k].rstrip()
                if stripped and not stripped.endswith(("{", ",")):
                    body[k] = stripped + ","
                    break
                if stripped:
                    break
            out.extend(body)
            out.append("")
            out.append("    // --- RLS Career Overhaul additions ---")
            for _, (s, e) in additions[owner]:
                out.extend(mod[s:e + 1])
            out.append(base[be])               # closing line
            i = be + 1
            continue
        # Append mod-only namespaces just before the default export closes.
        if i == len(base) - 1 and line.strip() == "}":
            out.append("")
            out.append("  // --- RLS Career Overhaul additions ---")
            for k in new_top:
                s, e = m_top[k]
                out.extend(mod[s:e + 1])
        out.append(line)
        i += 1

    with open(out_path, "w", encoding="utf-8") as fh:
        fh.write("\n".join(out))

    print(f"new namespaces:      {len(new_top)}")
    print(f"namespaces extended: {len(additions)}")
    total = sum(len(v) for v in additions.values())
    print(f"functions added into existing namespaces: {total}")
    for k, v in additions.items():
        print(f"  {k}: {', '.join(f for f, _ in v)}")


if __name__ == "__main__":
    main(*sys.argv[1:4])
