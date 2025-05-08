const logger = new Logger({
	mode: 'html',
	timeFormat: 'HH:mm:SS.ss',
	level: 'trace'
});


const logContainer = document.querySelector('.content');
const threshold = 50;  // Пикселей от низа, чтобы считать что пользователь внизу


function addLogToContainer(logHtml) {
	isUserAtBottom = logContainer.scrollHeight - logContainer.scrollTop - logContainer.clientHeight <= threshold;

	logContainer.innerHTML += logHtml;

	if (isUserAtBottom) {
		// Используем setTimeout для корректной прокрутки после добавления элемента
		setTimeout(() => {
			logContainer.scrollTop = logContainer.scrollHeight;
		}, 0);
	}
}


// Перехватываем вывод логгера в HTML-режиме
const originalLog = logger.log;
logger.log = function(level, module, message) {
	const result = originalLog.call(this, level, module, message);

	if (result) {
		addLogToContainer(result);
	}

	return result;
};


// 1. Информация о браузере
function logBrowserInfo() {
	const userAgent = navigator.userAgent;
	const platform = navigator.platform;
	const screenWidth = window.screen.width;
	const screenHeight = window.screen.height;

	logger.info('System', `Браузер: ${userAgent}`);
	logger.info('System', `Платформа: ${platform}`);
	logger.info('System', `Разрешение экрана: ${screenWidth}x${screenHeight}`);
}


// 2. Демонстрация уровней логирования
function demoLogLevels() {
	logger.trace('Demo', 'Это TRACE сообщение - самый низкий уровень');
	logger.debug('Demo', 'Это DEBUG сообщение - отладочная информация');
	logger.info('Demo', 'Это INFO сообщение - информация для пользователя');
	logger.success('Demo', 'Это SUCCESS сообщение - успешное выполнение');
	logger.warning('Demo', 'Это WARNING сообщение - предупреждение');
	logger.error('Demo', 'Это ERROR сообщение - ошибка в работе');
	logger.critical('Demo', 'Это CRITICAL сообщение - критическая ошибка!');
}


// 3. Отслеживание событий
function setupEventListeners() {
	// Клики мышью
	document.addEventListener('click', (e) => {
		logger.info('Mouse', `Клик: ${e.target.tagName} (X=${e.clientX}, Y=${e.clientY})`);
	});

	// Движение мыши
	document.addEventListener('mousemove', throttle((e) => {
		logger.trace('Mouse', `Позиция: X=${e.clientX}, Y=${e.clientY}`);
	}, 200)); // 1 событие в 200 мс

	// Нажатия клавиш
	document.addEventListener('keydown', (e) => {
		logger.debug('Keyboard', `Нажата клавиша: ${e.key} (Code: ${e.code})`);
	});

	// Изменение размера окна
	window.addEventListener('resize', throttle(() => {
		logger.info('Window', `Новый размер: ${window.innerWidth}x${window.innerHeight}`);
	}, 300)); // 1 событие в 300 мс

	// Касания (для мобильных устройств)
	document.addEventListener('touchstart', (e) => {
		logger.trace('Touch', `Касание: X=${Math.round(e.touches[0].clientX)}, Y=${Math.round(e.touches[0].clientY)}`);
	});

	// Движение при касании
	document.addEventListener('touchmove', throttle((e) => {
		logger.trace('Touch', `Движение: X=${Math.round(e.touches[0].clientX)}, Y=${Math.round(e.touches[0].clientY)}`);
	}, 500)); // 1 событие в 500 мс
}


// Вспомогательная функция для троттлинга
function throttle(func, limit) {
	let lastFunc;
	let lastRan;

	return function() {
		const context = this;
		const args = arguments;

		if (!lastRan) {
			func.apply(context, args);
			lastRan = Date.now();
		}
		else {
			clearTimeout(lastFunc);

			lastFunc = setTimeout(function() {
				if ((Date.now() - lastRan) >= limit) {
					func.apply(context, args);
					lastRan = Date.now();
				}
			}, limit - (Date.now() - lastRan));
		}
	};
}


function initDemo() {
	logger.info('System', `Демонстрация запущена`);

	// Выводим информацию о браузере
	logBrowserInfo();

	// Демонстрируем уровни логирования
	demoLogLevels();

	// Настраиваем отслеживание событий
	setupEventListeners();

	// Сообщение о готовности
	logger.success('System', 'Демо инициализировано и готово к работе!');
}


window.addEventListener('DOMContentLoaded', initDemo);
