"""
Модуль для сбора метрик о работе системы.
Позволяет отслеживать производительность и количество обрабатываемых событий.
"""

import time
import threading
from collections import defaultdict
from typing import Dict, List, Any, Optional, Callable
from enum import Enum, auto
from dataclasses import dataclass, field

from .logger import logger


class MetricType(Enum):
    """Типы метрик"""
    COUNTER = auto()  # Счетчик (увеличивается на заданное значение)
    GAUGE = auto()    # Измеритель (устанавливается в заданное значение)
    HISTOGRAM = auto() # Гистограмма (распределение значений)
    TIMER = auto()    # Таймер (измерение времени выполнения)


@dataclass
class Metric:
    """Базовый класс для метрик"""
    name: str
    type: MetricType
    description: str
    tags: Dict[str, str] = field(default_factory=dict)
    value: Any = None
    timestamp: float = field(default_factory=time.time)
    
    def __post_init__(self):
        if self.value is None:
            if self.type in (MetricType.COUNTER, MetricType.GAUGE):
                self.value = 0
            elif self.type == MetricType.HISTOGRAM:
                self.value = []
            elif self.type == MetricType.TIMER:
                self.value = 0.0


@dataclass
class MetricsSnapshot:
    """Снимок всех метрик в определенный момент времени"""
    timestamp: float
    metrics: Dict[str, Metric]


class MetricsRegistry:
    """
    Реестр метрик, хранящий все метрики приложения
    """
    _instance = None
    _lock = threading.Lock()
    
    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(MetricsRegistry, cls).__new__(cls)
                cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
            
        self._metrics: Dict[str, Metric] = {}
        self._snapshots: List[MetricsSnapshot] = []
        self._max_snapshots = 100  # Максимальное количество снимков
        self._callbacks: Dict[str, List[Callable[[Metric], None]]] = defaultdict(list)
        self._initialized = True
        
        logger.info("Metrics registry initialized")
    
    def create_counter(self, name: str, description: str, tags: Dict[str, str] = None) -> Metric:
        """Создает счетчик"""
        metric = Metric(name, MetricType.COUNTER, description, tags or {})
        self._metrics[name] = metric
        logger.debug(f"Created counter metric: {name}")
        return metric
    
    def create_gauge(self, name: str, description: str, tags: Dict[str, str] = None) -> Metric:
        """Создает измеритель"""
        metric = Metric(name, MetricType.GAUGE, description, tags or {})
        self._metrics[name] = metric
        logger.debug(f"Created gauge metric: {name}")
        return metric
    
    def create_histogram(self, name: str, description: str, tags: Dict[str, str] = None) -> Metric:
        """Создает гистограмму"""
        metric = Metric(name, MetricType.HISTOGRAM, description, tags or {}, value=[])
        self._metrics[name] = metric
        logger.debug(f"Created histogram metric: {name}")
        return metric
    
    def create_timer(self, name: str, description: str, tags: Dict[str, str] = None) -> Metric:
        """Создает таймер"""
        metric = Metric(name, MetricType.TIMER, description, tags or {}, value=0.0)
        self._metrics[name] = metric
        logger.debug(f"Created timer metric: {name}")
        return metric
    
    def get_metric(self, name: str) -> Optional[Metric]:
        """Возвращает метрику по имени"""
        return self._metrics.get(name)
    
    def get_all_metrics(self) -> Dict[str, Metric]:
        """Возвращает все метрики"""
        return self._metrics.copy()
    
    def increment_counter(self, name: str, value: int = 1, tags: Dict[str, str] = None) -> None:
        """Увеличивает счетчик на заданное значение"""
        metric = self._metrics.get(name)
        if metric and metric.type == MetricType.COUNTER:
            metric.value += value
            metric.timestamp = time.time()
            if tags:
                metric.tags.update(tags)
            self._notify_callbacks(name, metric)
        else:
            logger.warning(f"Cannot increment non-existent or non-counter metric: {name}")
    
    def set_gauge(self, name: str, value: float, tags: Dict[str, str] = None) -> None:
        """Устанавливает значение измерителя"""
        metric = self._metrics.get(name)
        if metric and metric.type == MetricType.GAUGE:
            metric.value = value
            metric.timestamp = time.time()
            if tags:
                metric.tags.update(tags)
            self._notify_callbacks(name, metric)
        else:
            logger.warning(f"Cannot set non-existent or non-gauge metric: {name}")
    
    def record_histogram_value(self, name: str, value: float, tags: Dict[str, str] = None) -> None:
        """Записывает значение в гистограмму"""
        metric = self._metrics.get(name)
        if metric and metric.type == MetricType.HISTOGRAM:
            metric.value.append(value)
            metric.timestamp = time.time()
            if tags:
                metric.tags.update(tags)
            self._notify_callbacks(name, metric)
        else:
            logger.warning(f"Cannot record to non-existent or non-histogram metric: {name}")
    
    def start_timer(self, name: str) -> float:
        """
        Запускает таймер и возвращает метку времени начала
        
        Примечание: эта функция не изменяет значение метрики,
        она просто возвращает текущую метку времени для использования
        вместе с stop_timer
        """
        metric = self._metrics.get(name)
        if metric and metric.type == MetricType.TIMER:
            return time.time()
        else:
            logger.warning(f"Cannot start non-existent or non-timer metric: {name}")
            return 0.0
    
    def stop_timer(self, name: str, start_time: float, tags: Dict[str, str] = None) -> float:
        """
        Останавливает таймер и обновляет значение метрики
        
        Возвращает продолжительность в секундах
        """
        if start_time <= 0:
            return 0.0
            
        metric = self._metrics.get(name)
        if metric and metric.type == MetricType.TIMER:
            duration = time.time() - start_time
            metric.value = duration
            metric.timestamp = time.time()
            if tags:
                metric.tags.update(tags)
            self._notify_callbacks(name, metric)
            return duration
        else:
            logger.warning(f"Cannot stop non-existent or non-timer metric: {name}")
            return 0.0
    
    def take_snapshot(self) -> MetricsSnapshot:
        """Создает снимок текущих метрик"""
        snapshot = MetricsSnapshot(
            timestamp=time.time(),
            metrics=self._metrics.copy()
        )
        self._snapshots.append(snapshot)
        
        # Ограничиваем количество снимков
        if len(self._snapshots) > self._max_snapshots:
            self._snapshots = self._snapshots[-self._max_snapshots:]
            
        return snapshot
    
    def get_snapshots(self) -> List[MetricsSnapshot]:
        """Возвращает все сохраненные снимки метрик"""
        return self._snapshots.copy()
    
    def register_callback(self, metric_name: str, callback: Callable[[Metric], None]) -> None:
        """Регистрирует колбэк, вызываемый при изменении метрики"""
        self._callbacks[metric_name].append(callback)
    
    def unregister_callback(self, metric_name: str, callback: Callable[[Metric], None]) -> None:
        """Отменяет регистрацию колбэка"""
        if metric_name in self._callbacks and callback in self._callbacks[metric_name]:
            self._callbacks[metric_name].remove(callback)
    
    def _notify_callbacks(self, metric_name: str, metric: Metric) -> None:
        """Уведомляет все колбэки об изменении метрики"""
        for callback in self._callbacks.get(metric_name, []):
            try:
                callback(metric)
            except Exception as e:
                logger.error(f"Error in metric callback for {metric_name}: {e}")


# Класс для удобного использования таймера как контекстного менеджера
class TimerContext:
    """
    Контекстный менеджер для измерения времени выполнения блока кода
    
    Пример использования:
    
    ```python
    with TimerContext("my_operation") as timer:
        # Какой-то код
        pass
    
    # timer.duration содержит продолжительность выполнения в секундах
    ```
    """
    
    def __init__(self, metric_name: str, registry: MetricsRegistry = None, tags: Dict[str, str] = None):
        self.metric_name = metric_name
        self.registry = registry or MetricsRegistry()
        self.tags = tags or {}
        self.start_time = 0.0
        self.duration = 0.0
    
    def __enter__(self):
        self.start_time = self.registry.start_timer(self.metric_name)
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.duration = self.registry.stop_timer(self.metric_name, self.start_time, self.tags)


# Создаем базовые метрики для системы
def initialize_metrics() -> MetricsRegistry:
    """
    Инициализирует базовые метрики системы
    
    Возвращает реестр метрик
    """
    registry = MetricsRegistry()
    
    # Счетчики событий
    registry.create_counter("events.received", "Количество полученных событий")
    registry.create_counter("events.sent", "Количество отправленных событий")
    registry.create_counter("events.processed", "Количество обработанных событий")
    registry.create_counter("events.errors", "Количество ошибок обработки событий")
    
    # Счетчики по типам событий
    registry.create_counter("events.connect", "Количество событий подключения")
    registry.create_counter("events.disconnect", "Количество событий отключения")
    registry.create_counter("events.update_node", "Количество запросов на обновление узлов")
    registry.create_counter("events.selection_change", "Количество изменений выделения")
    
    # Измерители активных соединений
    registry.create_gauge("connections.active", "Количество активных соединений")
    
    # Таймеры для измерения производительности
    registry.create_timer("events.processing_time", "Время обработки событий")
    registry.create_timer("events.update_node_time", "Время обновления узла")
    
    # Гистограммы для распределения времени
    registry.create_histogram("events.processing_distribution", "Распределение времени обработки событий")
    
    logger.info("System metrics initialized")
    return registry


# Получаем экземпляр реестра метрик
def get_metrics_registry() -> MetricsRegistry:
    """Возвращает экземпляр реестра метрик"""
    return MetricsRegistry()


# Функция для вывода текущих метрик в лог
def log_current_metrics() -> None:
    """Выводит текущие метрики в лог"""
    registry = get_metrics_registry()
    metrics = registry.get_all_metrics()
    
    logger.info(f"Current metrics ({len(metrics)} total):")
    for name, metric in sorted(metrics.items()):
        if metric.type == MetricType.HISTOGRAM:
            # Для гистограммы выводим статистику
            values = metric.value
            if values:
                avg = sum(values) / len(values)
                min_val = min(values)
                max_val = max(values)
                logger.info(f"  {name}: count={len(values)}, min={min_val:.4f}, avg={avg:.4f}, max={max_val:.4f}")
            else:
                logger.info(f"  {name}: empty")
        else:
            # Для остальных типов выводим значение
            logger.info(f"  {name}: {metric.value}")


# Декоратор для измерения времени выполнения функции
def timed(metric_name: str, tags: Dict[str, str] = None):
    """
    Декоратор для измерения времени выполнения функции
    
    Пример использования:
    
    ```python
    @timed("my_function")
    def my_function():
        # Код функции
        pass
    ```
    """
    def decorator(func):
        def wrapper(*args, **kwargs):
            registry = get_metrics_registry()
            with TimerContext(metric_name, registry, tags) as timer:
                result = func(*args, **kwargs)
            
            # Записываем время выполнения в гистограмму
            histogram_name = f"{metric_name}.distribution"
            if registry.get_metric(histogram_name) is None:
                registry.create_histogram(histogram_name, f"Распределение времени выполнения {metric_name}")
            
            registry.record_histogram_value(histogram_name, timer.duration)
            return result
        return wrapper
    return decorator 