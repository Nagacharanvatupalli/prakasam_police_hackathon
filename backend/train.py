import os
import sys
import shutil
from pathlib import Path

def main():
    # 1. Imports and environment validation
    try:
        from ultralytics import YOLO
    except ImportError:
        print("Error: The 'ultralytics' library is not installed in the python environment.")
        print("Please run: pip install ultralytics")
        sys.exit(1)
        
    import torch
    
    backend_dir = Path(__file__).resolve().parent
    dataset_yaml = backend_dir / "dataset.yaml"
    
    if not dataset_yaml.exists():
        print(f"Error: dataset.yaml config file not found at: {dataset_yaml}")
        print("Please run backend/prepare_dataset.py first to construct the dataset.")
        sys.exit(1)
        
    # Check device availability
    device = "0" if torch.cuda.is_available() else "cpu"
    print(f"Using device: {device} for training.")
    if device == "0":
        print(f"CUDA Device detected: {torch.cuda.get_device_name(0)}")
    else:
        print("CUDA Device NOT detected. Fine-tuning on CPU (will be slower).")

    # 2. Initialize YOLOv8 Model
    # We start from the pre-trained yolov8n.pt model as recommended
    model_name = "yolov8n.pt"
    print(f"Loading base YOLOv8 model: {model_name}...")
    model = YOLO(model_name)

    # 3. Start Training
    print("Starting YOLOv8 fine-tuning on number plate dataset...")
    # Use project directory context to prevent absolute path resolution issues during run
    project_dir = backend_dir.parent
    
    # Run training
    results = model.train(
        data=str(dataset_yaml.resolve()),
        epochs=50,
        imgsz=640,
        device=device,
        project=str(backend_dir / "runs"),
        name="numberplate_train",
        exist_ok=True
    )
    
    print("Training finished successfully!")
    
    # 4. Copy resulting best weights to deployment location
    best_weights = backend_dir / "runs" / "numberplate_train" / "weights" / "best.pt"
    deploy_weights = backend_dir / "models" / "best.pt"
    
    if best_weights.exists():
        deploy_weights.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(best_weights, deploy_weights)
        print(f"Fine-tuned model successfully deployed to: {deploy_weights}")
    else:
        print(f"Warning: Could not locate fine-tuned weights at: {best_weights}")
        print("Please check the training logs for where the model saved its weights.")

if __name__ == "__main__":
    main()
