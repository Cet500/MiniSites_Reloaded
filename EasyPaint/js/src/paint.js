// ------------------------- EasyPaint: Reinvented -------------------------- //
// Author: Cet500


logger.info('EasyPaint', 'Запуск системы рисования')

const global_params = {
	always_yes: true
}


// ---------------------- State Object ---------------------


let state = {
	currentColor: localStorage.getItem('paintLineColor') || '#000000',
	currentWidth: Math.max(1, Math.min(100,  parseInt(localStorage.getItem('paintLineWidth')))) || 20,
	bgColor:      localStorage.getItem('paintBgColor') || '#ffffff',

	lastX: 0,
	lastY: 0,

	isDrawing:   false,
	isReplaying: false,
};


// ------------------ Layer System Object ------------------


const LayerSystem = {
	maxLayers: 10,
	layers: [],

	activeLayerId:   null,
	onLayersChanged: null,

	init() {
		logger.info('LayerSystem', 'Первичная инициализация слоёв');

		this.setBackground();
		this.addLayer('Слой 1');
		this.setSizesLayers();
		this.initBackground();
	},

	setBackground() {
		const canvas = document.getElementById('canvas__background');

		this.layers.push({
			id:   'background',
			name: 'Фон',

			canvas:  canvas,
			ctx:     canvas.getContext('2d'),
			zIndex:  0,

			visible: true,
			locked:  true
		});

    	logger.info('LayerSystem', 'Фон установлен');
	},

	initBackground() {
		const bg = this.getBackgroundLayer();
		if (!bg) return;
		bg.ctx.fillStyle = state.bgColor;
		bg.ctx.fillRect(0, 0, bg.canvas.width, bg.canvas.height);
		logger.info('LayerSystem', 'Фон инициирован');
	},

	addLayer(name = `Слой ${this.layers.length}`, id = null) {
		if (this.layers.length >= this.maxLayers + 1) return;

		logger.info('LayerSystem', `Добавлен слой № ${this.layers.length}`)

		const newLayer = {
			id:   id || generateUUID(),
			name: name,

			canvas:  this.createCanvasElement(),
			ctx:     null,
			zIndex:  this.layers.length,

			visible: true,
			locked:  false,

			recording: []
		};

		newLayer.ctx = newLayer.canvas.getContext('2d');
		newLayer.ctx.imageSmoothingEnabled = true;
		newLayer.ctx.imageSmoothingQuality = 'high';

		this.layers.push(newLayer);

		this.setActiveLayer(newLayer.id);
		this.updateDOM();
		this.setLayerSize(newLayer);

		if (this.onLayersChanged) this.onLayersChanged();

		logger.info('LayerSystem', `ID ${newLayer.id} | Слой полностью подготовлен`);
	},

	createCanvasElement() {
		const canvas = document.createElement('canvas');

		const main = document.querySelector('main');
		const bgCanvas  = main.querySelector('#canvas__background');

		canvas.className    = 'main__canvas';
		main.insertBefore(canvas, bgCanvas);

		return canvas;
	},

	setActiveLayer(layerId) {
		this.activeLayerId = layerId;

		this.updateLayerStack();
		this.updateBrushSettings();
		setupCanvasEventListeners();

		logger.info('LayerSystem', `ID ${layerId} | Установлен активный слой`)
	},

	updateLayerStack() {
		// Сортируем по актуальному z-index
		this.layers.sort((a, b) => a.zIndex - b.zIndex).forEach(layer => {
			layer.canvas.style.zIndex = layer.zIndex;
			layer.canvas.style.pointerEvents = layer.id === this.activeLayerId ? 'auto' : 'none';
		});
	},

	setSizesLayers() {
		this.layers.forEach(layer => {
			const canvas = layer.canvas;
			canvas.width  = canvas.clientWidth;
			canvas.height = canvas.clientHeight;

			logger.debug('LayerSystem', `ID ${layer.id} | Размер изменён на ${canvas.clientWidth} x ${canvas.clientHeight}`)
		});
	},

	setLayerSize(layer) {
		const main = document.querySelector('main');
		if (!main) return;

		layer.canvas.width  = main.offsetWidth;
		layer.canvas.height = main.offsetHeight;

		logger.debug('LayerSystem', `ID ${layer.id} | Размер изменён на ${main.offsetWidth} x ${main.offsetHeight}`)
	},

	updateBrushSettings() {
		const layer = this.getActiveLayer();
		if (!layer) return;

		layer.ctx.strokeStyle = state.currentColor;
		layer.ctx.fillStyle   = state.currentColor;
		layer.ctx.lineWidth   = state.currentWidth;
		layer.ctx.lineCap     = 'round';
		layer.ctx.lineJoin    = 'round';

		logger.info('LayerSystem', `ID ${layer.id} | Обновление параметров рисования`)
	},

	getLayer(layerId) {
		return this.layers.find(l => l.id === layerId);
	},

	getActiveLayer() {
		return this.layers.find(l => l.id === this.activeLayerId);
	},

	getBackgroundLayer() {
		return this.layers.find(l => l.id === 'background');
	},

	renameLayer(layerId) {
		const layerItem = document.querySelector(`.layer-item[data-layer-id="${layerId}"]`);
		const nameSpan  = layerItem.querySelector('.layer-name');
		const currentName = nameSpan.textContent;

		const input = document.createElement('input');
		input.type = 'text';
		input.value = currentName;
		input.className = 'layer-name-input';

		nameSpan.replaceWith(input);
		input.focus();

		const handleRename = () => {
			const newName = input.value.trim() || currentName;
			const layer = this.getLayer(layerId);
			if (layer) layer.name = newName;

			nameSpan.textContent = newName;
			input.replaceWith(nameSpan);

			logger.info('LayerSystem', `ID ${layerId} | Слой переименован из ${currentName} в ${newName}`)
		};

		input.addEventListener('blur', handleRename);
		input.addEventListener('keypress', (e) => {
			if (e.key === 'Enter') handleRename();
		});
	},

	moveLayerUp(layerId) {
		const layer = this.getLayer(layerId);
		if (!layer || layer.zIndex >= this.layers.length - 1) return;

		const nextLayer = this.layers.find(l => l.zIndex === layer.zIndex + 1);
		if (nextLayer) {
			nextLayer.zIndex--;
			layer.zIndex++;
			this.updateLayerStack();
			this.updateDOM();
		}
	},

	moveLayerDown(layerId) {
		const layer = this.getLayer(layerId);
		if (!layer || layer.zIndex <= 1) return; // 0 - это фон

		const prevLayer = this.layers.find(l => l.zIndex === layer.zIndex - 1);
		if (prevLayer) {
			prevLayer.zIndex++;
			layer.zIndex--;
			this.updateLayerStack();
			this.updateDOM();
		}
	},

	clearLayer(layerId) {
		const layer = this.getLayer(layerId);
		if (!layer) return false;

		const prevFill = layer.ctx.fillStyle;
		const prevStroke = layer.ctx.strokeStyle;
		const prevWidth = layer.ctx.lineWidth;

		layer.ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height);

		layer.ctx.fillStyle = prevFill;
		layer.ctx.strokeStyle = prevStroke;
		layer.ctx.lineWidth = prevWidth;

		logger.info('LayerSystem', `ID ${layerId} | Слой очищен`);
		return true
	},

	clearActiveLayer(){
		const layer = this.getActiveLayer();
		if (!layer || layer.id === 'background') return false;

		const result = this.clearLayer(layer.id);

		if (result) {
			logger.info('LayerSystem', `ID ${layer.id} | Слой очищен`);
		}

		return result
	},

	clearAllLayers() {
		this.layers
			.filter(layer => layer.id !== 'background')
			.forEach(layer => this.clearLayer(layer.id));

		const bgLayer = this.getLayer('background');
		if (bgLayer) {
			bgLayer.ctx.clearRect(0, 0, bgLayer.canvas.width, bgLayer.canvas.height);
			bgLayer.ctx.fillStyle = state.bgColor;
			bgLayer.ctx.fillRect(0, 0, bgLayer.canvas.width, bgLayer.canvas.height);
		}

		logger.warning('EasyPaint', 'Все слои были очищены');
		return true;
	},

	removeLayer(layerId) {
		const layer = this.getLayer(layerId);
		if (!layer) return false;

		const prevFill = layer.ctx.fillStyle;
		const prevStroke = layer.ctx.strokeStyle;
		const prevWidth = layer.ctx.lineWidth;

		layer.ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
		layer.recording = []

		layer.ctx.fillStyle = prevFill;
		layer.ctx.strokeStyle = prevStroke;
		layer.ctx.lineWidth = prevWidth;

		logger.info('LayerSystem', `ID ${layerId} | Слой и его данные очищены`);
		return true
	},

	removeAllLayers() {
		this.layers
			.filter(layer => layer.id !== 'background')
			.forEach(layer => this.removeLayer(layer.id));

		const bgLayer = this.getLayer('background');
		if (bgLayer) {
			bgLayer.ctx.clearRect(0, 0, bgLayer.canvas.width, bgLayer.canvas.height);
			bgLayer.ctx.fillStyle = state.bgColor;
			bgLayer.ctx.fillRect(0, 0, bgLayer.canvas.width, bgLayer.canvas.height);
		}
		localStorage.removeItem('PaintData');

		logger.warning('EasyPaint', 'Все слои и данные были очищены');
		return true;
	},

	deleteLayer(layerId, isNeed = false) {
		if (!isNeed && this.layers.filter(l => !l.locked).length <= 1) {
			logger.warning('LayerSystem', 'Нельзя удалить последний слой');
			return false;
		}
		else {
			logger.info('LayerSystem', 'Если очень хочется - всё можно. Удаляю последний слой.')
		}

		const index = this.layers.findIndex(l => l.id === layerId);
		if (index === -1) {
			logger.warning('LayerSystem', `Слой ID ${layerId} не найден`);
			return false;
		}

		this.layers[index].canvas.remove();
		this.layers[index].recording = [];
		this.layers.splice(index, 1);

		if (layerId === this.activeLayerId) {
			const firstNonBgLayer = this.layers.find(l => !l.locked);
			if (firstNonBgLayer) {
				this.setActiveLayer(firstNonBgLayer.id);
			}
		}

		this.updateDOM();

		if (this.onLayersChanged) {
			this.onLayersChanged();
		}

		logger.info('LayerSystem', `ID ${layerId} | Слой удалён`);
		return true;
	},

	updateDOM() {
		logger.info('LayerSystem', `Обновление DOM-дерева`)

		const container = document.getElementById('layers-container');
		container.innerHTML = '';

		this.layers
			.filter(layer => !layer.locked) // Исключаем фон
			.sort((a, b) => b.zIndex - a.zIndex)
			.forEach(layer => {
				const layerHTML = `
				<div class="aside-block__layer layer-item" data-layer-id="${layer.id}">
					<p class="layer-name">${layer.name}</p>
					
					<div class="layer-controls">
						<button class="btn sm green layer-select" data-layer-id="${layer.id}">
							<i class="fa fa-paint-roller"></i>
						</button>
						
						<button class="btn sm blue layer-rename" data-layer-id="${layer.id}">
							<i class="fa fa-pencil"></i>
						</button>
						
						<button class="btn sm blue layer-up" data-layer-id="${layer.id}">
                            <i class="fa fa-arrow-up"></i>
                        </button>
                        
                        <button class="btn sm blue layer-down" data-layer-id="${layer.id}">
                            <i class="fa fa-arrow-down"></i>
                        </button>
			            
						<button class="btn sm red layer-clear" data-layer-id="${layer.id}">
							<i class="fa fa-trash-can"></i>
						</button>
						
						<button class="btn sm red layer-delete" data-layer-id="${layer.id}">
							<i class="fa fa-xmark"></i>
						</button>
					</div>
				</div>
			`;
				container.insertAdjacentHTML('beforeend', layerHTML);
			});

		container.insertAdjacentHTML('beforeend', `
            <div class="buttons">
                <button class="btn md green" id="button__add-new-layer" 
                                ${this.layers.length >= this.maxLayers + 1 ? 'disabled' : ''}>
                    добавить слой
                </button>
            </div>
        `);

		document.getElementById('button__add-new-layer')?.addEventListener('click', () => {
			logger.debug('LayerSystem', 'Попытка добавления нового слоя')
			this.addLayer();
		});
	}
};


// --------------------- Drawing Logic ---------------------


function getCanvasPosition(canvas, e) {
	const rect = canvas.getBoundingClientRect();
	const scaleX = canvas.width / rect.width;
	const scaleY = canvas.height / rect.height;

	return {
		x: (e.clientX - rect.left) * scaleX,
		y: (e.clientY - rect.top)  * scaleY
	};
}

function startDrawing(e) {
	const layer = LayerSystem.getActiveLayer();
	if (!layer || layer.id === 'background') return;

	logger.info('EasyPaint', 'Рисование - старт');

	state.isDrawing = true;
	const pos = getCanvasPosition(layer.canvas, e);
	[state.lastX, state.lastY] = [pos.x, pos.y];

	const action = {
		t: 's',                 // type
		x: pos.x,               // x coordinate
		y: pos.y,               // y coordinate
		c: state.currentColor,  // color
		w: state.currentWidth   // width
	};

	layer.recording.push(action);

	layer.ctx.beginPath();
	layer.ctx.arc(pos.x, pos.y, state.currentWidth/2, 0, Math.PI*2);
	layer.ctx.fill();
}

function draw(e) {
	const layer = LayerSystem.getActiveLayer();
	if (!state.isDrawing || !layer) return;

	logger.info('EasyPaint', 'Рисование - процесс...');

	const pos = getCanvasPosition(layer.canvas, e);
	const x = Math.round(pos.x);
	const y = Math.round(pos.y);

	const lastAction = layer.recording[layer.recording.length - 1];

	if (lastAction && lastAction.t === 'm') {
		lastAction.p.push([x, y]);
	}
	else {
		layer.recording.push({ t: 'm', p: [[x, y]] });
	}

	layer.ctx.beginPath();
	layer.ctx.moveTo(state.lastX, state.lastY);
	layer.ctx.lineTo(pos.x, pos.y);
	layer.ctx.stroke();

	layer.ctx.beginPath();
	layer.ctx.arc(pos.x, pos.y, state.currentWidth/2, 0, Math.PI*2);
	layer.ctx.fill();

	[state.lastX, state.lastY] = [pos.x, pos.y];
}

function stopDrawing() {
	const layer = LayerSystem.getActiveLayer();
	if (!layer || !state.isDrawing) return;

	try {
		layer.recording.push({ t: 'e' });
		logger.info('EasyPaint', 'Рисование - стоп');
	}
	catch (e) {
		logger.error('EasyPaint', 'Ошибка завершения рисования', e);
	}

	state.isDrawing = false;
}


// -------------------- Save/Load Logic --------------------


const DataManager = {
	storageKey: 'PaintData',

	getData() {
		return {
			version: '2.0',
			createdAt: new Date().toISOString(),
			layers: Object.fromEntries(
				LayerSystem.layers
					.filter( layer => layer.id !== 'background' )
					.map(layer => [
						layer.id,
						{
							name: layer.name,
							recording: layer.recording,
							zIndex: layer.zIndex
						}
					])
			)
		}
	},

	save() {
		try {
			const data = this.getData();
			localStorage.setItem(this.storageKey, JSON.stringify(data));
			logger.info('EasyPaint', 'Данные сохранены');
			return true;
		}
		catch (e) {
			logger.error('EasyPaint', 'Ошибка сохранения данных', e);
			return false;
		}
	},

	load() {
		try {
			const saved = localStorage.getItem(this.storageKey);
			if (!saved) {
				logger.warning('EasyPaint', 'Нет сохраненных данных');
				return false;
			}

			const data = JSON.parse(saved);
			if (!this.validateData(data)) {
				logger.error('EasyPaint', 'Загруженные данные невалидны');
				return false;
			}

			// Удаляем ВСЕ слои (включая фон) и пересоздаём систему
            LayerSystem.removeAllLayers();
            LayerSystem.setBackground(); // Пересоздаём фон

            // Восстанавливаем слои в правильном порядке
            Object.entries(data.layers)
                .sort((a, b) => a[1].zIndex - b[1].zIndex)
                .forEach(([id, layerData]) => {
	                LayerSystem.addLayer(layerData.name, id);
	                const layer = LayerSystem.getLayer(id);

	                if (layer) {
		                layer.recording = layerData.recording;
		                layer.zIndex = layerData.zIndex;
		                LayerSystem.setLayerSize(layer);
	                }
                });

            // Фиксим z-index
            LayerSystem.layers.forEach(l => l.canvas.style.zIndex = l.zIndex);
			LayerSystem.updateLayerStack();

			logger.info('EasyPaint', 'Данные загружены');
			return true;
		}
		catch (e) {
			logger.error('EasyPaint', 'Ошибка загрузки данных', e);
			return false;
		}
	},

	export() {
		return JSON.stringify(this.getData(), null, 2);
	},

	import(jsonString) {
		try {
			const data = JSON.parse(jsonString);
			if (!this.validateData(data)) {
				logger.error('EasyPaint', 'Неверный формат импортируемых данных');
				return false;
			}

			localStorage.setItem(this.storageKey, JSON.stringify(data));
			this.load();
			return true;
		}
		catch (e) {
			logger.error('EasyPaint', 'Ошибка импорта данных', e);
			return false;
		}
	},

	validateData(data) {
		return data && typeof data === 'object' && data.layers && typeof data.layers === 'object' && data.version === '2.0';
	},

	getLayerData(layerId) {
		const saved = localStorage.getItem(this.storageKey);
		if (!saved) return null;

		const data = JSON.parse(saved);
		return data.layers ? data.layers[layerId] : null;
	},

	clear() {
		localStorage.removeItem(this.storageKey);
		logger.info('EasyPaint', 'Данные удалены');
	}
};


// --------------------- Replay System ---------------------


const ReplayManager = {
	isReplaying: false,
	originalLayersState: null, // Сохраняем исходные z-index слоёв

	// Запуск воспроизведения
	start() {
		if (this.isReplaying) {
			logger.warning('ReplayManager', 'Воспроизведение уже запущено');
			return;
		}

		const data = DataManager.getData();
		if (!this._validateData(data)) {
			logger.error('ReplayManager', 'Ошибка: неверный формат данных');
			return;
		}

		logger.info('ReplayManager', 'Старт воспроизведения');
		this.isReplaying = true;
		this._saveLayersState(); // Фиксируем исходное состояние

		try {
			// Воспроизводим все слои
			Object.entries(data.layers)
				.sort((a, b) => a[1].zIndex - b[1].zIndex)
				.forEach(([layerId, layerData]) => {
					this._replayLayer(layerId, layerData);
				});

			logger.info('ReplayManager', 'Воспроизведение завершено');
		} catch (e) {
			logger.error('ReplayManager', 'Ошибка воспроизведения:', e);
			this._restoreLayersState(); // Откат при ошибке
		} finally {
			this.isReplaying = false;
		}
	},

	// Остановка (для ручного прерывания)
	stop() {
		if (!this.isReplaying) return;
		this._restoreLayersState();
		this.isReplaying = false;
		logger.info('ReplayManager', 'Воспроизведение принудительно остановлено');
	},

	// --- Вспомогательные методы ---
	_validateData(data) {
		return data?.version === '2.0' && data.layers && typeof data.layers === 'object';
	},

	_saveLayersState() {
		this.originalLayersState = LayerSystem.layers.map(layer => ({
			id: layer.id,
			zIndex: layer.zIndex
		}));
	},

	_restoreLayersState() {
		if (!this.originalLayersState) return;
		this.originalLayersState.forEach(state => {
			const layer = LayerSystem.getLayer(state.id);
			if (layer) layer.zIndex = state.zIndex;
		});
		LayerSystem.updateLayerStack();
	},

	_replayLayer(layerId, layerData) {
		const layer = LayerSystem.getLayer(layerId);
		if (!layer || !layerData.recording?.length) {
			logger.warning('ReplayManager', `Слой ${layerId} пропущен (нет данных)`);
			return;
		}

		// Очищаем слой перед воспроизведением
		layer.ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
		layer.zIndex = layerData.zIndex; // Восстанавливаем z-index
		layer.canvas.style.zIndex = layerData.zIndex;

		// Воспроизводим все действия
		layerData.recording.forEach(action => {
			switch (action.t) {
				case 's': // Начало линии
					layer.ctx.strokeStyle = action.c;
					layer.ctx.fillStyle = action.c;
					layer.ctx.lineWidth = action.w;
					layer.ctx.beginPath();
					layer.ctx.arc(action.x, action.y, action.w / 2, 0, Math.PI * 2);
					layer.ctx.fill();
					break;

				case 'm': // Продолжение линии
					layer.ctx.beginPath();
					action.p.forEach(([x, y], i) => {
						if (i === 0) layer.ctx.moveTo(x, y);
						else layer.ctx.lineTo(x, y);
					});
					layer.ctx.stroke();
					break;

				case 'e': // Конец линии
					layer.ctx.closePath();
					break;
			}
		});

		logger.debug('ReplayManager', `Слой ${layerId} (${layerData.name}) воспроизведён`);
	}
};
