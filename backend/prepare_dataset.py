import os
import shutil
import random
from pathlib import Path

def to_windows_long_path(path: Path | str) -> str:
    path_str = str(path)
    if os.name != "nt":
        return path_str
    if path_str.startswith("\\\\?\\"):
        return path_str
    if path_str.startswith("\\\\"):
        return "\\\\?\\UNC\\" + path_str.lstrip("\\")
    return "\\\\?\\" + path_str

def main():
    # Source dataset location
    src_dir = Path("C:\\Users\\ranga\\Desktop\\New folder (2)\\filtered_dataset_archive")
    
    # Destination dataset layout in the project backend
    dest_dir = Path(__file__).resolve().parent / "data"
    
    print(f"Reading dataset from: {src_dir}")
    print(f"Setting up destination at: {dest_dir}")
    
    # Define directories
    images_train = dest_dir / "images" / "train"
    images_val = dest_dir / "images" / "val"
    labels_train = dest_dir / "labels" / "train"
    labels_val = dest_dir / "labels" / "val"
    
    # Recreate destination directories cleanly
    for folder in [images_train, images_val, labels_train, labels_val]:
        if folder.exists():
            shutil.rmtree(folder)
        folder.mkdir(parents=True, exist_ok=True)
        
    # Gather all image files
    extensions = [".jpg", ".jpeg", ".png", ".webp"]
    image_files = []
    
    for item in src_dir.iterdir():
        if item.is_file() and item.suffix.lower() in extensions:
            # Check if corresponding label file exists
            label_file = item.with_suffix(item.suffix + ".txt")
            # Also check if it's named without double suffix, like .txt instead of .jpg.txt
            label_file_alt = item.with_suffix(".txt")
            
            resolved_label = None
            if label_file.exists():
                resolved_label = label_file
            elif label_file_alt.exists():
                resolved_label = label_file_alt
                
            if resolved_label:
                image_files.append((item, resolved_label))
                
    print(f"Found {len(image_files)} matched image-annotation pairs.")
    
    if len(image_files) == 0:
        print("Error: No valid matched images and annotations found in source path!")
        return
        
    # Shuffle and split (80% train, 20% validation)
    random.seed(42)
    random.shuffle(image_files)
    
    split_idx = int(len(image_files) * 0.8)
    train_pairs = image_files[:split_idx]
    val_pairs = image_files[split_idx:]
    
    print(f"Split layout: {len(train_pairs)} training, {len(val_pairs)} validation.")
    
    # Helper to copy pairs
    def copy_pairs(pairs, img_dest, lbl_dest):
        for img_path, lbl_path in pairs:
            # Copy image
            shutil.copy2(to_windows_long_path(img_path), to_windows_long_path(img_dest / img_path.name))
            # Copy label, renaming to standard .txt to match the image name
            shutil.copy2(to_windows_long_path(lbl_path), to_windows_long_path(lbl_dest / (img_path.stem + ".txt")))
            
    print("Copying training set...")
    copy_pairs(train_pairs, images_train, labels_train)
    
    print("Copying validation set...")
    copy_pairs(val_pairs, images_val, labels_val)
    
    # Create dataset.yaml
    dataset_yaml_path = Path(__file__).resolve().parent / "dataset.yaml"
    yaml_content = f"""path: {dest_dir.as_posix()}
train: images/train
val: images/val

names:
  0: license_plate
"""
    dataset_yaml_path.write_text(yaml_content)
    print(f"Created dataset.yaml config at: {dataset_yaml_path}")
    print("Dataset preparation completed successfully!")

if __name__ == "__main__":
    main()
