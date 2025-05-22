// ------------------------ Initial ------------------------


logger.info('EasyPaint', 'Инициализация начата');

const lineColorInput = document.getElementById('param__line-color');
const lineSizeInput  = document.getElementById('param__line-size');
const bgColorInput   = document.getElementById('param__bg-color');

const submitBtn = document.getElementById('param__submit');

syncSettings()
LayerSystem.init();

logger.debug('EasyPaint', 'Подтверждение инициализации');
logger.debug('EasyPaint', `Текущий слой: ID ${LayerSystem.activeLayerId}`);
logger.debug('EasyPaint', `Количество слоёв: ${LayerSystem.layers.length} / ${LayerSystem.maxLayers}`);
logger.debug('EasyPaint', `Текущий цвет: ${state.currentColor}`);
logger.debug('EasyPaint', `Текущая толщина: ${state.currentWidth}px`);
logger.debug('EasyPaint', `Текущий цвет фона: ${state.bgColor}`);

logger.info('EasyPaint', 'Инициализация завершена');


// ---------------------- Drawing UI -----------------------


function setupCanvasEventListeners() {
	logger.info('EasyPaint', 'Установка событий на слой')

	const activeLayer = LayerSystem.getActiveLayer();

	logger.debug('EasyPaint', 'Удаление старых событий...')

	LayerSystem.layers.forEach(layer => {
		// Блокируем все слои
		layer.canvas.style.pointerEvents = 'none';
		// Очищаем старые обработчики
		layer.canvas.removeEventListener('mousedown', handleCanvasMouseDown);
		layer.canvas.removeEventListener('mousemove', handleCanvasMouseMove);
		layer.canvas.removeEventListener('mouseup',   handleCanvasMouseUp);
		layer.canvas.removeEventListener('mouseout',  handleCanvasMouseOut);
	});


	logger.debug('EasyPaint', `ID ${activeLayer.id} | Установка новых событий для слоя`)

	if (activeLayer) {
		activeLayer.canvas.style.pointerEvents = 'auto';

		activeLayer.canvas.addEventListener('mousedown', handleCanvasMouseDown);
		activeLayer.canvas.addEventListener('mousemove', handleCanvasMouseMove);
		activeLayer.canvas.addEventListener('mouseup',   handleCanvasMouseUp);
		activeLayer.canvas.addEventListener('mouseout',  handleCanvasMouseOut);
	}
}

function handleCanvasMouseDown(e) {
	e.preventDefault();
	if (e.button !== 0) return;
	const layer = LayerSystem.layers.find(l => l.canvas === e.target);
	if (!layer || layer.locked) return;

	LayerSystem.setActiveLayer(layer.id);
	startDrawing(e);
}

function handleCanvasMouseMove(e) {
	const layer = LayerSystem.getActiveLayer();
	if (layer && layer.canvas === e.target) {
		draw(e);
	}
}

function handleCanvasMouseUp(e) {
	stopDrawing();
}

function handleCanvasMouseOut(e) {
	stopDrawing();
}

LayerSystem.onLayersChanged = setupCanvasEventListeners;
setupCanvasEventListeners();


// ------------------ Settings Management ------------------


function syncSettings() {
	lineColorInput.value = state.currentColor;
	lineSizeInput.value  = state.currentWidth;
	bgColorInput.value   = state.bgColor;

	logger.info('EasyPaint', 'Синхронизация элементов управления завершена');
}

submitBtn?.addEventListener('click', function() {
	const newColor = lineColorInput.value;
	const newWidth = parseInt(lineSizeInput.value);
	const newBgColor = bgColorInput.value;

	if (!/^#([0-9A-F]{3}){1,2}$/i.test(newColor)) {
		logger.error('EasyPaint', 'Некорректный формат цвета');
		return;
	}

	if (newColor && newColor !== state.currentColor) {
		state.currentColor = newColor;
		localStorage.setItem('paintLineColor', state.currentColor);
	}

	if (newWidth && newWidth !== state.currentWidth) {
		state.currentWidth = newWidth;
		localStorage.setItem('paintLineWidth', state.currentWidth);
	}

	if (newBgColor && newBgColor !== state.bgColor) {
		state.bgColor = newBgColor;
		localStorage.setItem('paintBgColor', state.bgColor);

		LayerSystem.initBackground()
	}

	LayerSystem.updateBrushSettings();

	logger.info('EasyPaint', 'Настройки сохранены');
	logger.debug('EasyPaint', `Новый цвет: ${state.currentColor}`);
	logger.debug('EasyPaint', `Новая толщина: ${state.currentWidth}px`);
	logger.debug('EasyPaint', `Новый цвет фона: ${state.bgColor}`);
});


// ------------------- Aside show/hide ---------------------


document.getElementById('button__toggle-aside').addEventListener('click', function() {
	const aside = document.querySelector('.aside');

	if (aside.classList.contains('active')) {
		// Закрытие: анимация → затем display: none
		aside.classList.remove('active');
		aside.addEventListener('transitionend', function handler() {
			aside.classList.add('hidden');
			aside.removeEventListener('transitionend', handler);
		}, { once: true });

		logger.debug( 'aside', 'Скрытие боковой панели' );
	}
	else {
		// Открытие: display: block → анимация
		aside.classList.remove('hidden');
		void aside.offsetWidth;
		aside.classList.add('active');

		logger.debug( 'aside', 'Появление боковой панели' );
	}
});


// ------------------- Canvas Operations -------------------


document.getElementById('button__clear')?.addEventListener('click', () => {
	LayerSystem.clearAllLayers();
});

document.getElementById('button__remove')?.addEventListener('click', () => {
	if (global_params.always_yes || confirm('Все слои будут очищены, а данные удалены. Продолжить?')) {
		LayerSystem.removeAllLayers();
	}
});


// ------------------ Save/Replay buttons ------------------


document.getElementById('button__save')?.addEventListener('click', () => {
	DataManager.save();
});

document.getElementById('button__replay')?.addEventListener('click', () => {
	DataManager.load();

	if (ReplayManager.isReplaying) {
		ReplayManager.stop();
		logger.warning('EasyPaint', 'Воспроизведение остановлено пользователем');
	}
	else {
		ReplayManager.start();
	}
});


// ------------------ Import/Export Logic ------------------


document.getElementById('button_import')?.addEventListener('click', () => {
	const importData = document.getElementById('script__data-import').value;

	if (importData && ( global_params.always_yes || confirm('Текущие данные будут перезаписаны. Продолжить?') )) {
		if (DataManager.import(importData)) {
			logger.info('EasyPaint', 'Данные успешно импортированы');
			const modal = document.getElementById('modal__import');
			modal?.removeAttribute('open');
		}
	}
});

document.getElementById('button_export')?.addEventListener('click', () => {
	const exportData = DataManager.export();
	const modalContent = document.querySelector('#modal__export .modal-content__data');

	if (modalContent) {
		modalContent.textContent = exportData || 'Нет данных для экспорта';
		logger.info('EasyPaint', 'Данные подготовлены для экспорта');
	}
});


// ----------------------- Layers UI -----------------------


function initLayersUI() {
	logger.info('LayersUI', 'Инициализация интерфейса слоёв');

	const container = document.getElementById('layers-container');
	if (!container) return;

	container.addEventListener('click', (e) => {
		const target = e.target.closest('button');
		if (!target) return;

		const layerId = target.dataset.layerId;
		if (!layerId) return;

		if (target.classList.contains('layer-select')) {
			logger.debug('LayersUI', `ID ${layerId} | Попытка выбора слоя`)
			handleSelectLayer(layerId);
		}
		else if (target.classList.contains('layer-rename')) {
			logger.debug('LayersUI', `ID ${layerId} | Попытка переименования слоя`)
			handleRenameLayer(layerId);
		}
		else if (target.classList.contains('layer-up')) {
			logger.debug('LayersUI', `ID ${layerId} | Попытка поднять уровень слоя`)
			handleMoveUpLayer(layerId);
		}
		else if (target.classList.contains('layer-down')) {
			logger.debug('LayersUI', `ID ${layerId} | Попытка опустить уровень слоя`)
			handleMoveDownLayer(layerId);
		}
		else if (target.classList.contains('layer-clear')) {
			logger.debug('LayersUI', `ID ${layerId} | Попытка очистки слоя`)
			handleRemoveLayer(layerId);
		}
		else if (target.classList.contains('layer-delete')) {
			logger.debug('LayersUI', `ID ${layerId} | Попытка удаления слоя`)
			handleDeleteLayer(layerId);
		}
	});
}

function handleSelectLayer(layerId) {
	if (ReplayManager.isReplaying) {
		logger.warning('UI', 'Смена слоя заблокирована во время воспроизведения');
		return;
	}
	LayerSystem.setActiveLayer(layerId);
	updateActiveLayerVisual();
}

function updateActiveLayerVisual() {
	document.querySelectorAll('.layer-item').forEach(item => {
		item.classList.toggle('active', item.dataset.layerId === LayerSystem.activeLayerId);
	});
}

function handleRenameLayer(layerId) {
	if (ReplayManager.isReplaying) {
		logger.warning('UI', 'Переименование заблокировано во время воспроизведения');
		return;
	}
	LayerSystem.renameLayer(layerId);
}

function handleMoveUpLayer(layerId) {
	if (ReplayManager.isReplaying) {
		logger.warning('UI', 'Перемещение слоёв заблокировано во время воспроизведения');
		return;
	}
	LayerSystem.moveLayerUp(layerId);
}

function handleMoveDownLayer(layerId) {
	if (ReplayManager.isReplaying) {
		logger.warning('UI', 'Перемещение слоёв заблокировано во время воспроизведения');
		return;
	}
	LayerSystem.moveLayerDown(layerId);
}

function handleRemoveLayer(layerId) {
	if (ReplayManager.isReplaying) {
		logger.warning('UI', 'Очистка слоя заблокирована во время воспроизведения');
		return;
	}

	if (global_params.always_yes || confirm('Очистить слой? Все данные слоя будут удалены!')) {
		LayerSystem.removeLayer(layerId);
	}
}

function handleDeleteLayer(layerId) {
	if (ReplayManager.isReplaying) {
		logger.warning('UI', 'Удаление слоя заблокировано во время воспроизведения');
		return;
	}

	if (LayerSystem.layers.filter(l => !l.locked).length <= 1) {
		alert('Нельзя удалить последний слой!');
		return;
	}

	if (global_params.always_yes || confirm('Удалить слой? Это действие нельзя отменить!')) {
		LayerSystem.deleteLayer(layerId);
	}
}


// ----------------- Theme set/save/load -------------------


function setTheme(theme) {
	if (theme === 'dark') {
		document.body.classList.add('dark');
		document.body.classList.remove('light');
	}
	else {
		document.body.classList.add('light');
		document.body.classList.remove('dark');
	}

	localStorage.setItem('theme', theme);
}

function getPreferredTheme() {
	const savedTheme = localStorage.getItem('theme');
	if (savedTheme) {
		return savedTheme;
	}

	return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

const preferredTheme = getPreferredTheme();
setTheme(preferredTheme);

document.getElementById('button__toggle-theme').addEventListener('click', function() {
	const currentTheme = document.body.classList.contains('dark') ? 'dark' : 'light';
	const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
	setTheme(newTheme);
});


// ------------------- Modals windows ----------------------


logger.info('Modals', 'Скрипт модальных окон инициализирован.');

document.querySelectorAll('[data-modal-id]').forEach(btn => {
	btn.addEventListener('click', () => {
		const modalId = btn.getAttribute('data-modal-id');
		const modal = document.getElementById(modalId);

		if (modal) {
			modal.setAttribute('open', '');
			logger.debug('modals', `Открыто окно: ${modalId}`);
		}
		else {
			logger.warning('modals', `Окно с id="${modalId}" не найдено!`);
		}
	});
});

document.querySelectorAll('.close-modal').forEach(btn => {
	btn.addEventListener('click', () => {
		const modal = btn.closest('.modal');

		if (modal) {
			const modalId = modal.id;
			modal.removeAttribute('open');
			logger.debug('modals', `Закрыто окно: ${modalId}`);
		}
	});
});


// ------------------- DOMContentLoaded --------------------


document.addEventListener('DOMContentLoaded', () => {
	initLayersUI();
	LayerSystem.updateDOM();
});
