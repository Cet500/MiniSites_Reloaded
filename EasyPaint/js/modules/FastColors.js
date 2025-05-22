// ------------------- FastColors Module -------------------


document.getElementById('button__add-fast-color')?.addEventListener('click', () => {
	FastColors.add();
});

const FastColors = {
	colors: [],
	storageKey: 'FastColorsData',

	add() {
		try {
			const container = document.getElementById('colors-container');
			const color =  state.currentColor;

			if (!this.colors.includes(color)) {
				this.colors.push(color);
				this.save();

				const newBlock= `<div class="aside-block__color" style="background-color: ${color}" onclick="FastColors.set('${color}');"></div>`
				container.insertAdjacentHTML('beforeend', newBlock);

				logger.info('FastColors', `Цвет успешно установлен: ${color}`);
				return true
			}
			else {
				logger.warning('FastColors', `Цвет ${color} уже и так добавлен`);
				return false;
			}
		}
		catch (e) {
			logger.error('FastColors', `Ошибка установки цвета: ${e}`);
			return false;
		}
	},

	set( color ) {
		try {
			if (color && color !== state.currentColor) {
				state.currentColor = color;
				localStorage.setItem('paintLineColor', state.currentColor);

				LayerSystem.updateBrushSettings();
				syncSettings()
			}

			logger.info('FastColors', `Цвет ${color} установлен как текущий`);
			return true;
		}
		catch (e) {
			logger.error('FastColors', `Ошибка применения цвета: ${e}`);
			return false;
		}
	},

	save() {
		try {
			localStorage.setItem(this.storageKey, JSON.stringify(this.colors));
			logger.info('FastColors', 'Цвета сохранены в localStorage');
		}
		catch (e) {
			logger.error('FastColors', `Ошибка сохранения цветов: ${e}`);
		}
	},

	load() {
		try {
			const savedColors = localStorage.getItem(this.storageKey);

			if (savedColors) {
				this.colors = JSON.parse(savedColors);
				this.render();

				logger.info('FastColors', 'Цвета загружены из localStorage');

				return true;
			}

			return false;
		}
		catch (e) {
			logger.error('FastColors', `Ошибка загрузки цветов: ${e}`);
			return false;
		}
	},

	render() {
		const container = document.getElementById('colors-container');
		container.innerHTML = '';

		this.colors.forEach(color => {
			const newBlock = `<div class="aside-block__color" style="background-color: ${color}" onclick="FastColors.set('${color}');"></div>`;
			container.insertAdjacentHTML('beforeend', newBlock);
		});
	},

	clear() {
		this.colors = [];

		localStorage.removeItem(this.storageKey);
		document.getElementById('colors-container').innerHTML = '';

		logger.info('FastColors', 'Все цвета и данные очищены');
	}

}

document.addEventListener('DOMContentLoaded', () => {
	FastColors.load();
});
