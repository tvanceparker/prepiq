import os
from pathlib import Path
import joblib
import h2o
from h2o.estimators.gbm import H2OGradientBoostingEstimator  # Import base H2O estimator class

BASE_MODEL_DIR = Path("models/saved_models")

def get_model_path(restaurant_id: int, menu_item_id: int = None) -> Path:
    subdir = f"restaurant_{restaurant_id}"
    if menu_item_id is None:
        filename = "menu_item_all"
    else:
        filename = f"menu_item_{menu_item_id}"

    path = BASE_MODEL_DIR / subdir / filename
    os.makedirs(path.parent, exist_ok=True)
    return path


def save_model(restaurant_id: int, menu_item_id: int, model):
    path = get_model_path(restaurant_id, menu_item_id)

    if isinstance(model, H2OGradientBoostingEstimator) or hasattr(model, 'save_model'):
        print(f"Detected H2O model. Saving to: {path}")
        saved_path = h2o.save_model(model=model, path=str(path), force=True)
        info_path = path.parent / (path.name + "_info.txt")
        with open(info_path, 'w') as f:
            f.write(saved_path)
    else:
        print(f"Detected regular model. Saving with joblib...")
        file_path = path.with_suffix('.pkl')
        if isinstance(model, (str, int, float)):
            print(f"WARNING: You are about to save a primitive object: {model} — consider debugging.")
        joblib.dump(model, file_path)

        # Clean up any stale H2O info file
        info_path = path.parent / (path.name + "_info.txt")
        if info_path.exists():
            info_path.unlink()

        print(f"Model saved to: {file_path}")




import traceback

def load_model(restaurant_id: int, menu_item_id: int):
    path = get_model_path(restaurant_id, menu_item_id)
    print(f"Trying to load model from base path: {path}")
    info_path = path.parent / (path.name + "_info.txt")

    try:
        if info_path.exists():
            print(f"Found H2O info file at {info_path}")
            with open(info_path, 'r') as f:
                saved_path = f.read().strip()
            print(f"Loading H2O model from saved path: {saved_path}")
            model = h2o.load_model(saved_path)
            return model

        else:
            file_path = path.with_suffix('.pkl')
            print(f"Trying to load joblib model from {file_path}")
            if file_path.exists():
                model = joblib.load(file_path)

                # Extra guard: Make sure we're not loading garbage like "mape"
                if isinstance(model, (str, int, float, list, dict)) and not hasattr(model, "predict"):
                    print(f"Loaded unexpected object from pickle: {type(model)} — returning None")
                    return None

                return model

    except Exception:
        print("Exception occurred while loading model:")
        traceback.print_exc()

    print("No model found, returning None")
    return None



