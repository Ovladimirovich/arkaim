"""Update frontend page to use WebSocket real-time progress."""
import pathlib

p = pathlib.Path(r"C:\ПРОЕКТ Наследие Аркаима\arkaim-web\src\app\world-explorer\page.tsx")
c = p.read_text(encoding="utf-8")

old_import = "import { ProtectedRoute } from '@/shared/lib/guards';"
new_import = "import { ProtectedRoute } from '@/shared/lib/guards';\nimport { useWsEvent } from '@/shared/lib/ws-hooks';"
c = c.replace(old_import, new_import)

old_effect = "useEffect(() => { if (exploreMutation.isPending) { setProgress(0); let step = 0; progressTimer.current = setInterval(() => { step++; if (step < PROGRESS_STEPS.length) setProgress(step); }, 400); } else { if (progressTimer.current) clearInterval(progressTimer.current); } return () => { if (progressTimer.current) clearInterval(progressTimer.current); }; }, [exploreMutation.isPending]);"
new_effect = "// WebSocket real-time progress\n  useWsEvent('exploration_progress' as any, (data: any) => { if (data.step !== undefined) setProgress(data.step); });\n  useWsEvent('exploration_complete' as any, () => { setProgress(-1); });"
c = c.replace(old_effect, new_effect)

p.write_text(c, encoding="utf-8")
print(f"Updated {p.stat().st_size} bytes")
