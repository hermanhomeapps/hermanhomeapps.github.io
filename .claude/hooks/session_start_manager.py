#!/usr/bin/env python3
import json
import os

FILENAME = "SESSION_MANAGER.md"

path = os.path.join(os.getcwd(), FILENAME)

if os.path.isfile(path):
    with open(path, encoding="utf-8") as f:
        content = f.read()
    print(json.dumps({
        "hookSpecificOutput": {
            "hookEventName": "SessionStart",
            "additionalContext": (
                f"{FILENAME} (shared cross-session coordination file, read automatically "
                "at session start — check file claims here before editing shared files):\n\n"
                + content
            ),
        }
    }))
