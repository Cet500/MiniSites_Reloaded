// ------------------------- Easy JS Logger Class --------------------------- //
// Author: Cet500


class Logger {
	constructor(options = {}) {
		this.config = {
			format: '{datetime} | {level} | {module} | {message}',  // формат по умолчанию
			level: 'info',  // минимальный уровень - 'trace', 'debug', 'info', 'success', 'warning', 'error', 'critical'
			timeFormat: 'YYYY.MM.DD HH:mm', // формат времени
			colors: true,   // вкл/выкл цвета
			mode: 'web',    // режим работы - 'web', 'node', 'auto', 'text'
			...options
		};

		this.levels = {
			trace:    5,   // почти бесполезная, частая информация
			debug:    10,  // подробные данные о работе системы
			info:     20,  // информация к сведению
			success:  25,  // всё замечательно
			warning:  30,  // стоит обратить внимание, что-то не так
			error:    50,  // что-то сломалось, требует исправления
			critical: 100  // полный пздц, срочно нужно чинить
		};

		this.modes = [
			'web',       // работа через console.log()
			'node',      // вывод в терминал node.js
			'auto',      // автоматическое переключение между web и node
			'text',      // только рендер текста, чтобы его потом передать куда угодно
			'html',      // рендер через HTML, возвращает span
			'broadcast'  // пересылка данных через callback в зарегистрированную функцию
		];

		this.broadcastCallback = null; // Для режима broadcast
	}


	/* --------------- Core Logging Method -------------- */


	log(level, module, message) {
		// Check if logging is enabled for this level
		if (this.levels[level] < this.levels[this.config.level]) {
			return;
		}

		const now= new Date();
		const datetime = this.formatTime(now);

		const logData = {
			datetime,
			level: level.toUpperCase(),
			module,
			message,
			timestamp: now.getTime()
		};

		// Форматирование
		let output = this.config.format;
		for (const [key, value] of Object.entries(logData)) {
			output = output.replace(new RegExp(`{${key}}`, 'g'), value);
		}

		let effectiveMode = this.config.mode;
		if (effectiveMode === 'auto') {
			effectiveMode = this.detectEnvironment();
		}

		switch (effectiveMode) {
			case 'text':
				return output;

			case 'html':
				return this.renderHtml(logData);

			case 'broadcast':
				if(this.broadcastCallback) {
					this.broadcastCallback(logData);
				}
				return null;

			case 'web':
				if (this.config.colors) {
					this.colorizeBrowser(output, level, module);
				}
				else {
					console.log(output);
				}
				break;

			case 'node':
				if (this.config.colors) {
					const coloredOutput = this.colorizeNode(output, level, module);
					console.log(coloredOutput);
				}
				else {
					console.log(output);
				}
				break;

			default:
				console.log(output);
		}
	}

	onLog(callback) {
		this.broadcastCallback = callback;
	}


	/* ------------------ Render HTML ------------------- */


	renderHtml(logData) {
		const escape = str => String(str)
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#39;');

		const parts = this.config.format.split(/({.*?})/g);

		let html = '<span class="log-record">';

		parts.forEach(part => {
			if (part.startsWith('{') && part.endsWith('}')) {
				const key = part.slice(1, -1);
				const value = escape(logData[key.toLowerCase()] || '');

				switch(key) {
					case 'datetime':
						html += `<span class="log-record__datetime">${value}</span>`;
						break;
					case 'level':
						html += `<span class="log-record__level log-record__level--${escape(logData.level.toLowerCase())}">${value}</span>`;
						break;
					case 'module':
						html += `<span class="log-record__module">${value}</span>`;
						break;
					case 'message':
						html += `<span class="log-record__message">${value}</span>`;
						break;
					default:
						html += value;
				}
			}
			else if (part.trim()) {
				// Обработка разделителей и обычного текста
				html += `<span class="log-record__separator">${escape(part)}</span>`;
			}
		});

		html += '</span>';

		return html;
	}


	/* ------------------ Colorization ------------------ */


	colorizeBrowser(text, level, module) {
		const styles = {
			trace:     'color: gray',
			debug:     'color: gray;',
			info:      'color: green;',
			success:   'color: lime',
			warning:   'color: yellow;',
			error:     'color: orange;',
			critical:  'color: red;',

			timestamp: 'color: gray;',
			module:    'color: cyan;',
			separator: 'color: #888;'
		};

		const parts = text.split(/(\|)/g);
		let result = '';
		const styleArray = [];

		parts.forEach((part, index) => {
			if (part === '|') {
				result += `%c${part}`;
				styleArray.push(styles.separator);
			}
			else {
				result += `%c${part}`;

				if (part.includes(level.toUpperCase())) {
					styleArray.push(styles[level]);
				}
				else if (part.includes(module)) {
					styleArray.push(styles.module);
				}
				else if (part.match(/\d{4}\.\d{2}\.\d{2} \d{2}:\d{2}/)) {
					styleArray.push(styles.timestamp);
				}
				else {
					styleArray.push('');
				}
			}
		});

		console.log(result, ...styleArray);
	}

	colorizeNode(text, level, module) {
		const styles = {
			trace:     '\x1b[90m',
			debug:     '\x1b[37m',
			info:      '\x1b[32m',
			success:   '\x1b[92m',
			warning:   '\x1b[33m',
			error:     '\x1b[31m',
			critical:  '\x1b[91m\x1b[1m',
			timestamp: '\x1b[90m',

			module:    '\x1b[36m',
			separator: '\x1b[90m',
			reset:     '\x1b[0m'
		};

		const parts = text.split(/(\|)/g);
		let result = '';

		parts.forEach(part => {
			let style = '';
			let reset = styles.reset;

			if (part === '|') {
				style = styles.separator;
			}
			else if (part.includes(level.toUpperCase())) {
				style = styles[level];
			}
			else if (part.includes(module)) {
				style = styles.module;
			}
			else if (part.match(/\d{4}\.\d{2}\.\d{2} \d{2}:\d{2}/)) {
				style = styles.timestamp;
			}
			else {
				style = '';
				reset = '';
			}

			result += `${style}${part}${reset}`;
		});

		return result;
	}


	/* ----------------- Time Formatting ---------------- */


	formatTime(date) {
		const pad = num => num.toString().padStart(2, '0');

		return this.config.timeFormat
			.replace('YYYY', date.getFullYear())
			.replace('MM', pad(date.getMonth() + 1))
			.replace('DD', pad(date.getDate()))
			.replace('HH', pad(date.getHours()))
			.replace('mm', pad(date.getMinutes()))
			.replace('SS', pad(date.getSeconds()))
			.replace('ss', pad(date.getMilliseconds()));
	}


	/* --------------- Convenience Methods ------------- */


	trace(module, message) {
		return this.log('trace', module, message);
	}

	debug(module, message) {
		return this.log('debug', module, message);
	}

	info(module, message) {
		return this.log('info', module, message);
	}

	success(module, message) {
		return this.log('success', module, message)
	}

	warning(module, message) {
		return this.log('warning', module, message);
	}

	error(module, message) {
		return this.log('error', module, message);
	}

	critical(module, message) {
		return this.log('critical', module, message);
	}


	/* ------------- Configuration Methods -------------- */


	setFormat(format) {
		const allowed = new Set(['datetime', 'level', 'module', 'message']);
		const placeholders = format.match(/\{(\w+)\}/g) || [];

		for (const ph of placeholders) {
			const key = ph.slice(1, -1);
			if (!allowed.has(key)) {
				throw new Error(`Invalid placeholder: ${ph}`);
			}
		}

		this.config.format = format;
	}

	setLevel(level) {
		if (this.levels[level] === undefined) {
			throw new Error(`Invalid log level: ${level}`);
		}

		this.config.level = level;
	}

	setTimeFormat(timeFormat) {
		const allowedTokens = ['YYYY', 'MM', 'DD', 'HH', 'mm', 'SS', 'ss'];
		const allowedPattern = new RegExp(allowedTokens.join('|'), 'g');
		const remaining = timeFormat.replace(allowedPattern, '');
		const invalid = remaining.match(/[A-Za-z]{2,}/g);

		if (invalid) {
			throw new Error(`Invalid time format tokens: ${invalid.join(', ')}`);
		}

		this.config.timeFormat = timeFormat;
	}

	setMode(mode) {
		if (!this.modes.includes(mode)) {
			throw new Error(`Invalid mode: ${mode}`);
		}

		this.config.mode = mode;
	}

	enableColors(enable = true) {
		this.config.colors = enable;
	}


	/* ------------------ Helper Methods ----------------- */


	detectEnvironment() {
		if (typeof process !== 'undefined' && process.versions && process.versions.node) {
			return 'node';
		}
		else if (typeof window !== 'undefined' && typeof document !== 'undefined') {
			return 'web';
		}

		return 'text';
	}

}
