from pathlib import Path
import shutil

src_dir = Path(r"C:\Users\ranga\Desktop\New folder (2)\filtered_dataset_archive")
dest_dir = Path(r"C:\Users\ranga\Desktop\New folder (2)\VEHICLE-MANAGEMENT-USING-AI\backend\data")

images_train = dest_dir / "images" / "train"
labels_train = dest_dir / "labels" / "train"

for folder in [images_train, labels_train]:
    folder.mkdir(parents=True, exist_ok=True)

extensions = {".jpg", ".jpeg", ".png", ".webp"}
image_files = []
for item in src_dir.iterdir():
    if item.is_file() and item.suffix.lower() in extensions:
        label_file = item.with_suffix(item.suffix + ".txt")
        label_file_alt = item.with_suffix(".txt")
        resolved = None
        if label_file.exists():
            resolved = label_file
        elif label_file_alt.exists():
            resolved = label_file_alt
        if resolved:
            image_files.append((item, resolved))

print(f"Found {len(image_files)} pairs")

for idx, (img_path, lbl_path) in enumerate(image_files[:200]):
    try:
        dst_img = images_train / img_path.name
        dst_lbl = labels_train / (img_path.stem + ".txt")
        print(f"Trying {idx}: {img_path.name} -> {dst_img}")
        shutil.copy2(img_path, dst_img)
        shutil.copy2(lbl_path, dst_lbl)
    except Exception as exc:
        print("FAILED", idx, img_path, lbl_path, type(exc).__name__, exc)
        print("src exists", img_path.exists(), "lbl exists", lbl_path.exists())
        print("dst dir", dst_img.parent.exists(), "dst lbl dir", dst_lbl.parent.exists())
        break
print('done')
