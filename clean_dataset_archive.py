import argparse
import os
import shutil
import zipfile
from pathlib import Path
from collections import defaultdict

VALID_IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp"}
VALID_LABEL_EXTS = {".txt"}
UNWANTED_NAMES = {
    ".DS_Store",
    "Thumbs.db",
    "desktop.ini",
    "__MACOSX",
    ".gitignore",
    ".git",
    ".ipynb_checkpoints",
    "README.md",
    "LICENSE",
}
UNWANTED_PATTERNS = {
    ".pyc",
    ".tmp",
    ".temp",
    ".log",
    ".bak",
    ".cache",
    "__pycache__",
    "runs",
    "weights",
    "checkpoints",
    "checkpoint",
    "*.pt",
    "*.pth",
    "*.ckpt",
}

CLASS_FALLBACK = ["license_plate"]


def parse_class_names(source_root: Path) -> list[str]:
    classes_txt = source_root / "classes.txt"
    if classes_txt.exists():
        lines = [line.strip() for line in classes_txt.read_text(encoding="utf-8").splitlines() if line.strip()]
        if lines:
            return lines

    dataset_yaml = source_root / "dataset.yaml"
    if dataset_yaml.exists():
        text = dataset_yaml.read_text(encoding="utf-8")
        # Attempt to parse a simple YAML names block from dataset.yaml
        if "names:" in text:
            lines = text.splitlines()
            names = []
            collecting = False
            for line in lines:
                stripped = line.strip()
                if stripped.startswith("names:"):
                    collecting = True
                    if "{" in stripped and "}" in stripped:
                        content = stripped[stripped.index("{") + 1:stripped.index("}")].strip()
                        if content:
                            for pair in content.split(","):
                                if ":" in pair:
                                    _, value = pair.split(":", 1)
                                    names.append(value.strip().strip("'\"").strip())
                            return names
                        break
                    continue
                if collecting:
                    if not stripped or stripped.startswith("#"):
                        continue
                    if stripped.startswith("-"):
                        names.append(stripped.lstrip("- ").strip().strip("'\""))
                        continue
                    if ":" in stripped:
                        _, value = stripped.split(":", 1)
                        names.append(value.strip().strip("'\""))
                        continue
                    if stripped and not stripped.startswith("-"):
                        names.append(stripped.strip().strip("'\""))
                    else:
                        break
            if names:
                return names

    return CLASS_FALLBACK


def _is_unwanted_path(path: Path) -> bool:
    name = path.name
    if name in UNWANTED_NAMES:
        return True
    if path.is_dir() and name in {"__pycache__", "__MACOSX", "runs", "weights", "checkpoints"}:
        return True
    if any(name.lower().endswith(pattern) for pattern in [".pyc", ".tmp", ".temp", ".log", ".bak", ".cache", ".pt", ".pth", ".ckpt"]):
        return True
    return False


def _choose_primary_image(paths: list[Path]) -> Path:
    if not paths:
        raise ValueError("No image paths provided")
    priority = [".jpg", ".jpeg", ".png", ".webp"]
    paths_by_ext = {p.suffix.lower(): p for p in paths}
    for ext in priority:
        if ext in paths_by_ext:
            return paths_by_ext[ext]
    return sorted(paths, key=lambda p: p.name)[0]


def to_windows_long_path(path: Path | str) -> str:
    p = str(path)
    if os.name != "nt":
        return p
    if p.startswith("\\\\?\\"):
        return p
    if p.startswith("\\\\"):
        return "\\\\?\\UNC\\" + p.lstrip("\\")
    return "\\\\?\\" + p


def copytree_long(src: Path, dst: Path) -> None:
    src = Path(src)
    dst = Path(dst)
    dst.mkdir(parents=True, exist_ok=True)
    for item in src.iterdir():
        target = dst / item.name
        if item.is_dir():
            copytree_long(item, target)
        elif item.is_file():
            shutil.copy2(to_windows_long_path(item), to_windows_long_path(target))


def count_files(root: Path) -> tuple[int, int]:
    images = 0
    labels = 0
    if not root.exists():
        return images, labels
    for p in root.rglob("*"):
        if p.is_file():
            suffix = p.suffix.lower()
            if suffix in VALID_IMAGE_EXTS:
                images += 1
            elif suffix in VALID_LABEL_EXTS:
                labels += 1
    return images, labels


def build_file_index(split_root: Path) -> dict[str, list[Path]]:
    index = defaultdict(list)
    if not split_root.exists():
        return index
    for p in split_root.iterdir():
        if not p.is_file():
            continue
        if p.suffix.lower() in VALID_IMAGE_EXTS | VALID_LABEL_EXTS:
            index[p.stem].append(p)
    return index


def collect_cleanup_actions(dataset_root: Path) -> tuple[list[Path], list[tuple[Path, Path]], dict[str, dict[str, int]]]:
    remove_paths: list[Path] = []
    duplicate_image_paths: list[Path] = []
    summary = {"train": {}, "val": {}, "test": {}}

    image_root = dataset_root / "images"
    label_root = dataset_root / "labels"
    if not image_root.exists() or not label_root.exists():
        raise FileNotFoundError(f"Dataset root appears invalid: {dataset_root}")

    splits = sorted({p.name for p in image_root.iterdir() if p.is_dir()} | {p.name for p in label_root.iterdir() if p.is_dir()})
    if not splits:
        splits = ["train", "val", "test"]

    for split in splits:
        image_split = image_root / split
        label_split = label_root / split
        image_index = build_file_index(image_split)
        label_index = build_file_index(label_split)

        images_total = sum(len(files) for files in image_index.values())
        labels_total = sum(len(files) for files in label_index.values())
        images_remove = 0
        labels_remove = 0

        for stem, image_paths in image_index.items():
            if len(image_paths) > 1:
                primary = _choose_primary_image(image_paths)
                for p in image_paths:
                    if p != primary:
                        duplicate_image_paths.append(p)
                        remove_paths.append(p)
                image_index[stem] = [primary]

        for stem, paths in label_index.items():
            if len(paths) > 1:
                keep = sorted(paths, key=lambda p: p.name)[0]
                for p in paths:
                    if p != keep:
                        remove_paths.append(p)
                label_index[stem] = [keep]

        for stem, image_paths in image_index.items():
            if stem not in label_index:
                for p in image_paths:
                    remove_paths.append(p)
                    images_remove += 1

        for stem, label_paths in label_index.items():
            if stem not in image_index:
                for p in label_paths:
                    remove_paths.append(p)
                    labels_remove += 1

        summary[split] = {
            "images_total": images_total,
            "labels_total": labels_total,
            "images_without_labels": images_remove,
            "labels_without_images": labels_remove,
            "duplicate_images_removed": len([p for p in duplicate_image_paths if p.parent.name == split])
        }

    # Remove any unrelated files at root and under dataset_root
    for p in dataset_root.rglob("*"):
        if p.is_file() and _is_unwanted_path(p):
            if p not in remove_paths:
                remove_paths.append(p)
        if p.is_dir() and _is_unwanted_path(p):
            remove_paths.append(p)

    return remove_paths, duplicate_image_paths, summary


def delete_paths(paths: list[Path]) -> None:
    for path in sorted(paths, key=lambda p: len(str(p)), reverse=True):
        try:
            if path.is_file():
                path.unlink()
            elif path.is_dir():
                shutil.rmtree(path)
        except Exception as exc:
            print(f"Warning: could not remove {path}: {exc}")


def copy_valid_dataset(dataset_root: Path, output_root: Path, class_names: list[str], splits: list[str]) -> dict[str, int]:
    output_dataset = output_root / "dataset"
    output_images = output_dataset / "images"
    output_labels = output_dataset / "labels"
    for split in splits:
        (output_images / split).mkdir(parents=True, exist_ok=True)
        (output_labels / split).mkdir(parents=True, exist_ok=True)

    valid_counts = {split: 0 for split in splits}

    for split in splits:
        image_split = dataset_root / "images" / split
        label_split = dataset_root / "labels" / split
        if not image_split.exists() or not label_split.exists():
            continue

        label_index = {p.stem: p for p in label_split.iterdir() if p.is_file() and p.suffix.lower() == ".txt"}
        for img_path in sorted(image_split.iterdir()):
            if not img_path.is_file() or img_path.suffix.lower() not in VALID_IMAGE_EXTS:
                continue
            label_path = label_index.get(img_path.stem)
            if label_path is None:
                continue
            shutil.copy2(img_path, output_images / split / img_path.name)
            shutil.copy2(label_path, output_labels / split / (img_path.stem + ".txt"))
            valid_counts[split] += 1

    data_yaml = output_dataset / "data.yaml"
    write_data_yaml(data_yaml, class_names, splits)

    return valid_counts


def write_data_yaml(path: Path, class_names: list[str], splits: list[str]) -> None:
    lines = []
    if len(splits) == 1 and splits[0] == "train":
        lines.append("train: images/train")
    else:
        if "train" in splits:
            lines.append("train: images/train")
        if "val" in splits:
            lines.append("val: images/val")
        if "test" in splits:
            lines.append("test: images/test")
    lines.append("")
    lines.append(f"nc: {len(class_names)}")
    lines.append("names:")
    for idx, name in enumerate(class_names):
        lines.append(f"  {idx}: '{name}'")
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def create_zip(source_dir: Path, zip_path: Path) -> None:
    if zip_path.exists():
        zip_path.unlink()
    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for path in sorted(source_dir.rglob("*")):
            if path.is_file():
                zf.write(path, path.relative_to(source_dir.parent))


def main() -> None:
    parser = argparse.ArgumentParser(description="Clean a YOLO dataset archive and build a fresh training archive.")
    parser.add_argument(
        "--source",
        default=r"C:\Users\ranga\Desktop\New folder (2)\archive (3)\archive",
        help="Path to the extracted archive root or archive file."
    )
    parser.add_argument(
        "--output",
        default=r"C:\Users\ranga\Desktop\New folder (2)\archive (3)\cleaned_dataset",
        help="Output folder for the cleaned dataset structure."
    )
    parser.add_argument(
        "--workdir",
        default=r"C:\Users\ranga\Desktop\New folder (2)\archive (3)\archive_clean_workspace",
        help="Temporary workspace copy path for cleaning operations."
    )
    args = parser.parse_args()

    source_root = Path(args.source).expanduser().resolve()
    output_root = Path(args.output).expanduser().resolve()
    work_root = Path(args.workdir).expanduser().resolve()

    if source_root.is_file() and source_root.suffix.lower() in {".zip", ".tar", ".gz", ".tgz", ".tar.gz"}:
        raise SystemExit("Archive-file support is not implemented in this version. Please extract the archive to a folder first.")

    if not source_root.exists():
        raise FileNotFoundError(f"Source dataset path not found: {source_root}")

    if work_root.exists():
        print(f"Removing existing temporary workspace: {work_root}")
        shutil.rmtree(work_root)
    print(f"Copying source dataset to temporary workspace: {work_root}")
    copytree_long(source_root, work_root)

    class_names = parse_class_names(source_root)
    valid_splits = sorted({p.name for p in (work_root / "images").iterdir() if p.is_dir()} | {p.name for p in (work_root / "labels").iterdir() if p.is_dir()})
    if not valid_splits:
        valid_splits = ["train", "val", "test"]

    remove_paths, duplicate_image_paths, summary = collect_cleanup_actions(work_root)

    total_images = sum(summary[split]["images_total"] for split in valid_splits if split in summary)
    total_labels = sum(summary[split]["labels_total"] for split in valid_splits if split in summary)
    images_removed = sum(summary[split]["images_without_labels"] for split in valid_splits if split in summary)
    labels_removed = sum(summary[split]["labels_without_images"] for split in valid_splits if split in summary)
    duplicate_images_removed = sum(summary[split]["duplicate_images_removed"] for split in valid_splits if split in summary)

    print("\nDRY RUN SUMMARY")
    print("-------------------")
    print(f"Source path: {source_root}")
    print(f"Temporary workspace: {work_root}")
    print(f"Output cleaned dataset root: {output_root}")
    print(f"Class names: {class_names}")
    print(f"Detected splits: {valid_splits}")
    print(f"Total images before cleaning: {total_images}")
    print(f"Total labels before cleaning: {total_labels}")
    print(f"Images to remove because labels missing: {images_removed}")
    print(f"Labels to remove because images missing: {labels_removed}")
    print(f"Duplicate image files to remove: {duplicate_images_removed}")
    print(f"Unrelated/unwanted files to remove: {len([p for p in remove_paths if p not in duplicate_image_paths])}")

    if remove_paths:
        print("\nSamples of files/folders that will be removed:")
        for path in sorted(remove_paths)[:20]:
            print(" -", path)

    print("\nPerforming cleanup now...")
    delete_paths(remove_paths)

    # Remove any empty image/label directories after cleanup
    for side in [work_root / "images", work_root / "labels"]:
        if side.exists():
            for split_dir in side.iterdir():
                if split_dir.is_dir() and not any(split_dir.iterdir()):
                    shutil.rmtree(split_dir)

    if output_root.exists():
        print(f"Removing existing output root: {output_root}")
        shutil.rmtree(output_root)

    print("Copying validated dataset into clean structure...")
    valid_counts = copy_valid_dataset(work_root, output_root, class_names, valid_splits)

    print("Final valid dataset counts:")
    for split in valid_splits:
        print(f" - {split}: {valid_counts.get(split, 0)} valid image-label pairs")

    zip_path = source_root.parent / "cleaned_dataset.zip"
    print(f"Creating cleaned archive: {zip_path}")
    create_zip(output_root / "dataset", zip_path)
    print("Cleaned dataset archive created successfully.")
    print("\nNEXT STEP")
    print(f"Use the generated data.yaml at: {output_root / 'dataset' / 'data.yaml'}")
    print(f"Use the cleaned archive: {zip_path}")


if __name__ == "__main__":
    main()
