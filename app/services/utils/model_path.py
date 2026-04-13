import os
from pathlib import Path
import joblib
import h2o
from h2o.estimators.gbm import H2OGradientBoostingEstimator  # Import base H2O estimator class

from app.core.logging import logger

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


def _is_h2o_model(model) -> bool:
    return isinstance(model, H2OGradientBoostingEstimator) or hasattr(model, "save_model")


def save_model(restaurant_id: int, menu_item_id: int, model):
    path = get_model_path(restaurant_id, menu_item_id)

    if _is_h2o_model(model):
        save_dir = path.parent / path.name
        os.makedirs(save_dir, exist_ok=True)
        logger.info(
            "[FORECAST] Saving H2O model restaurant=%s menu_item=%s directory=%s",
            restaurant_id,
            menu_item_id,
            save_dir,
        )
        saved_path = h2o.save_model(model=model, path=str(save_dir), force=True)
        info_path = path.parent / (path.name + "_info.txt")
        with open(info_path, 'w') as f:
            f.write(saved_path)
        logger.info(
            "[FORECAST] Saved H2O model restaurant=%s menu_item=%s model_path=%s info_path=%s",
            restaurant_id,
            menu_item_id,
            saved_path,
            info_path,
        )
    else:
        logger.info(
            "[FORECAST] Saving non-H2O model restaurant=%s menu_item=%s base_path=%s",
            restaurant_id,
            menu_item_id,
            path,
        )
        file_path = path.with_suffix('.pkl')
        if isinstance(model, (str, int, float)):
            logger.warning(
                "[FORECAST] Attempting to save primitive model restaurant=%s menu_item=%s type=%s value=%s",
                restaurant_id,
                menu_item_id,
                type(model).__name__,
                model,
            )
        joblib.dump(model, file_path)

        # Clean up any stale H2O info file
        info_path = path.parent / (path.name + "_info.txt")
        if info_path.exists():
            info_path.unlink()

        logger.info(
            "[FORECAST] Saved non-H2O model restaurant=%s menu_item=%s file_path=%s",
            restaurant_id,
            menu_item_id,
            file_path,
        )




import traceback

def load_model(restaurant_id: int, menu_item_id: int):
    path = get_model_path(restaurant_id, menu_item_id)
    logger.info(
        "[FORECAST] Loading model restaurant=%s menu_item=%s base_path=%s",
        restaurant_id,
        menu_item_id,
        path,
    )
    info_path = path.parent / (path.name + "_info.txt")

    try:
        if info_path.exists():
            logger.info(
                "[FORECAST] Found H2O model info restaurant=%s menu_item=%s info_path=%s",
                restaurant_id,
                menu_item_id,
                info_path,
            )
            with open(info_path, 'r') as f:
                saved_path = f.read().strip()
            logger.info(
                "[FORECAST] Loading H2O model restaurant=%s menu_item=%s saved_path=%s",
                restaurant_id,
                menu_item_id,
                saved_path,
            )
            model = h2o.load_model(saved_path)
            return model

        else:
            file_path = path.with_suffix('.pkl')
            logger.info(
                "[FORECAST] Looking for pickle model restaurant=%s menu_item=%s file_path=%s",
                restaurant_id,
                menu_item_id,
                file_path,
            )
            if file_path.exists():
                model = joblib.load(file_path)

                # Extra guard: Make sure we're not loading garbage like "mape"
                if isinstance(model, (str, int, float, list, dict)) and not hasattr(model, "predict"):
                    logger.warning(
                        "[FORECAST] Loaded invalid pickle model restaurant=%s menu_item=%s type=%s",
                        restaurant_id,
                        menu_item_id,
                        type(model).__name__,
                    )
                    return None

                return model

    except Exception:
        logger.exception(
            "[FORECAST] Exception while loading model restaurant=%s menu_item=%s",
            restaurant_id,
            menu_item_id,
        )
        traceback.print_exc()

    logger.info(
        "[FORECAST] No persisted model found restaurant=%s menu_item=%s",
        restaurant_id,
        menu_item_id,
    )
    return None



