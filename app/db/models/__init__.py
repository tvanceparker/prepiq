"""Auto-import all ORM modules.

Historically ``main.py`` imported every ``*_orm`` file to ensure SQLAlchemy's
class registry was populated. Test modules often import ``app.db.models`` but
not ``main``, so string-based relationship targets (for example
``relationship("Order")`` on ``Restaurant``) could not be resolved and
mapper configuration failed. Importing every module when this package is first
loaded keeps the registry in sync without requiring the rest of the app to
manually enumerate files.
"""

from importlib import import_module
import pkgutil


def _auto_import_models() -> None:
	for module_info in pkgutil.iter_modules(__path__):  # type: ignore[name-defined]
		name = module_info.name
		if name.startswith("__"):
			continue
		import_module(f"{__name__}.{name}")


_auto_import_models()

__all__ = []  # Namespace is populated via side effects of the imports above.
