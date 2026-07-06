from pathlib import Path
import shutil

src_dir = Path(r"C:\Users\ranga\Desktop\New folder (2)\filtered_dataset_archive")
dest_base = Path(r"C:\Users\ranga\Desktop\New folder (2)\VEHICLE-MANAGEMENT-USING-AI\backend\data")
images_train = dest_base / "images" / "train"
labels_train = dest_base / "labels" / "train"

extensions = {".jpg", ".jpeg", ".png", ".webp"}
paired = []
for item in src_dir.iterdir():
    if item.is_file() and item.suffix.lower() in extensions:
        label_file = item.with_suffix(item.suffix + ".txt")
        label_file_alt = item.with_suffix(".txt")
        if label_file.exists():
            resolved = label_file
        elif label_file_alt.exists():
            resolved = label_file_alt
        else:
            continue
        paired.append((item, resolved))

print(f"Found {len(paired)} pairs")
print(f"Images train exists: {images_train.exists()}, labels train exists: {labels_train.exists()}")

for idx, (img, lbl) in enumerate(paired[:50]):
    dst_img = images_train / img.name
    dst_lbl = labels_train / f"{img.stem}.txt"
    print(idx, img.name, img.exists(), lbl.exists(), dst_img.parent.exists(), dst_lbl.parent.exists())
    try:
        if not img.exists():
            print('MISSING IMAGE', img)
            break
        if not lbl.exists():
            print('MISSING LABEL', lbl)
            break
        # Perform a dry-run path validation by resolving the destination parent
        dst_img.parent.mkdir(parents=True, exist_ok=True)
        dst_lbl.parent.mkdir(parents=True, exist_ok=True)
    except Exception as e:
        print('FAIL', img, lbl, e)
        break
print('Done.')
