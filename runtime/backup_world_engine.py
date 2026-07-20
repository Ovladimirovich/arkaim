"""
World Engine Backup — резервное копирование файлов World Engine.

Создаёт бэкап всех файлов World Engine в отдельную директорию.
"""
import sys
sys.path.insert(0, '../core/CORE')

import shutil
import json
from pathlib import Path
from datetime import datetime


BACKUP_DIR = Path(__file__).parent / "world_engine_backups"


def create_backup():
    """Создать бэкап World Engine."""
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_path = BACKUP_DIR / f"backup_{timestamp}"
    backup_path.mkdir(parents=True, exist_ok=True)
    
    print("=" * 60)
    print(f" СОЗДАНИЕ БЭКАПА: {backup_path.name}")
    print("=" * 60)
    
    # Файлы для бэкапа
    files_to_backup = [
        # Ядро World Engine
        ("../core/CORE/narrative_engine/world_engine.py", "narrative_engine/"),
        ("../core/CORE/narrative_engine/world_model_ext.py", "narrative_engine/"),
        ("../core/CORE/narrative_engine/world_models.py", "narrative_engine/"),
        ("../core/CORE/narrative_engine/relation_models.py", "narrative_engine/"),
        ("../core/CORE/narrative_engine/relation_extractor.py", "narrative_engine/"),
        ("../core/CORE/narrative_engine/form_engine.py", "narrative_engine/"),
        ("../core/CORE/narrative_engine/consistency_engine.py", "narrative_engine/"),
        ("../core/CORE/narrative_engine/experience_engine.py", "narrative_engine/"),
        
        # Данные
        ("../core/CORE/WORLD_MODEL/", "WORLD_MODEL/"),
        ("../core/CORE/FORM/", "FORM/"),
        
        # Интеграция
        ("../core/CORE/pulse/layers_world_engine.py", "pulse/"),
        ("../runtime/core/routes/world_engine.py", "routes/"),
        
        # Инструменты
        ("../runtime/world_cli.py", "tools/"),
        ("../runtime/world_batch.py", "tools/"),
        ("../runtime/world_advanced.py", "tools/"),
        ("../runtime/world_performance.py", "tools/"),
        ("../runtime/world_test_pipeline.py", "tools/"),
        ("../runtime/demo_world_engine.py", "tools/"),
        
        # Тесты
        ("../runtime/tests/test_world_engine.py", "tests/"),
        ("../runtime/tests/test_world_engine_integration.py", "tests/"),
        
        # Документация
        ("../WORLD_ENGINE_DOCUMENTATION.md", "docs/"),
        ("../WORLD_ENGINE_ROADMAP.md", "docs/"),
        ("../WORLD_ENGINE_FINAL_REPORT.md", "docs/"),
        ("../runtime/API_DOCUMENTATION.md", "docs/"),
        
        # Экспорт
        ("../runtime/knowledge_base/", "knowledge_base/"),
    ]
    
    backed_up = 0
    errors = []
    
    for src_rel, dst_dir in files_to_backup:
        src_path = Path(__file__).parent / src_rel
        
        if src_path.is_dir():
            # Бэкап директории
            dst_path = backup_path / dst_dir
            if dst_path.exists():
                shutil.rmtree(dst_path)
            try:
                shutil.copytree(src_path, dst_path)
                backed_up += 1
                print(f"  ✓ {src_rel}")
            except Exception as e:
                errors.append(f"{src_rel}: {e}")
                print(f"  ✗ {src_rel}: {e}")
        elif src_path.is_file():
            # Бэкап файла
            dst_path = backup_path / dst_dir
            dst_path.mkdir(parents=True, exist_ok=True)
            try:
                shutil.copy2(src_path, dst_path / src_path.name)
                backed_up += 1
                print(f"  ✓ {src_rel}")
            except Exception as e:
                errors.append(f"{src_rel}: {e}")
                print(f"  ✗ {src_rel}: {e}")
        else:
            errors.append(f"{src_rel}: not found")
            print(f"  ✗ {src_rel}: not found")
    
    # Создаём манифест бэкапа
    manifest = {
        "timestamp": datetime.now().isoformat(),
        "backup_path": str(backup_path),
        "files_backed_up": backed_up,
        "errors": errors,
        "files": [f[0] for f in files_to_backup],
    }
    
    manifest_path = backup_path / "manifest.json"
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    
    print(f"\nИтого:")
    print(f"  Скопировано: {backed_up}")
    print(f"  Ошибок: {len(errors)}")
    print(f"  Манифест: {manifest_path}")
    
    return backup_path


def main():
    """Главная функция."""
    create_backup()


if __name__ == "__main__":
    main()
