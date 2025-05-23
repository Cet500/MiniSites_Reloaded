// ------------------------ Easy JS PassGenerator --------------------------- //
// Author: Cet500


/* ---------------- Core Password Object ---------------- */


let currentPasswords = [];


/* ---------------------- Main UI ----------------------- */


function switchTab(tabName) {
	document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
	document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));

	document.getElementById(tabName + 'Tab').classList.add('active');
	document.querySelector(`[onclick="switchTab('${tabName}')"]`).classList.add('active');

	// Обновляем содержимое при переключении
	if(tabName === 'plain')  updatePlainText();
	if(tabName === 'json')   updateJson();
	if(tabName === 'xml')    updateXml();
	if(tabName === 'csv')    updateCsv();
	if(tabName === 'sql')    updateSql();
	if(tabName === 'base64') updateBase64();
}


/* --------------------- Generate ----------------------- */


function generatePassword() {
	const length = parseInt(document.getElementById('length').value);
	const count = parseInt(document.getElementById('count').value);

	if (isNaN(length) || length <= 0) {
		alert('Некорректная длина пароля.');
		return;
	}

	if (isNaN(count) || count <= 0) {
		alert('Некорректное количество паролей.');
		return;
	}

	const is_uppercase = document.getElementById('uppercase').checked;
	const is_lowercase = document.getElementById('lowercase').checked;
	const is_numbers   = document.getElementById('numbers'  ).checked;
	const is_symbols   = document.getElementById('symbols'  ).checked;

	let charset = '';
	if (is_uppercase) charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
	if (is_lowercase) charset += 'abcdefghijklmnopqrstuvwxyz';
	if (is_numbers)   charset += '0123456789';
	if (is_symbols)   charset += '@#$%^*_+-=:.!?';

	if (!charset) {
		alert('Выберите хотя бы один набор символов!');
		return;
	}

	const autoGroup = document.getElementById('autoGroup').checked;

	const charsetArray = charset.split('');
	const charsetLength = charsetArray.length;

	let passwords = [];

	for (let n = 0; n < count; n++) {
		let password = '';

		for (let i = 0; i < length; i++) {
			const randomIndex = getSecureRandomIndex(charsetLength);
			password += charsetArray[randomIndex];
		}

		if (autoGroup) {
			password = applyAutoGrouping(password);
		}

		passwords.push(password);
	}

	currentPasswords = passwords;

	updatePretty();
	updatePlainText();
	updateJson();
	updateXml();
	updateCsv();
	updateSql();
	updateBase64();
}

function getSecureRandomIndex(max) {
	const maxValidValue = Math.floor(0xFFFFFFFF / max) * max;
	const randomBuffer = new Uint32Array(1);

	while (true) {
		window.crypto.getRandomValues(randomBuffer);
		if (randomBuffer[0] < maxValidValue) {
			return randomBuffer[0] % max;
		}
	}
}


/* --------------------- Grouping ----------------------- */


function applyAutoGrouping(password) {
	const length = password.length;

	// Определяем размер группы по новым правилам
	const getGroupSize = () => {
		if (length <= 6) return 2;
		if (length <= 11) return 3;
		if (length <= 19) return 4;
		if (length <= 29) return 5;
		if (length <= 48) return 6;
		if (length <= 63) return 7;
		return 8;
	};

	const groupSize = getGroupSize();
	const totalGroups = Math.ceil(length / groupSize);
	const baseGroupSize = Math.floor(length / totalGroups);
	let remainder = length % totalGroups;

	// Создаем массив групп
	let groups = [];
	for (let i = 0; i < totalGroups; i++) {
		let currentSize = baseGroupSize;
		if (remainder > 0) {
			currentSize++;
			remainder--;
		}
		groups.push(currentSize);
	}

	// Собираем результат
	let grouped = '';
	let pos = 0;
	for (let i = 0; i < groups.length; i++) {
		if (i > 0) grouped += '-';
		grouped += password.substr(pos, groups[i]);
		pos += groups[i];
	}

	return grouped;
}


/* ------------------- View - Pretty -------------------- */


function updatePretty() {
	const resultDiv = document.getElementById('passwordResult');
	let html = '';

	currentPasswords.forEach((pass, index) => {
		html += `
            <div class="password-item">
                <strong>#${index + 1}:</strong> ${escapeHtml(pass)}
            </div>
            `;
	});

	resultDiv.innerHTML = html;
}

function escapeHtml(text) {
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}


/* ------------------- View - Plain --------------------- */


function updatePlainText() {
	document.getElementById('plainResult').textContent = currentPasswords.join('\n');
}


/* -------------------- View - JSON --------------------- */


function updateJson() {
	document.getElementById('jsonResult').textContent = JSON.stringify(currentPasswords, null, 4);
}


/* -------------------- View - XML ---------------------- */


function updateXml() {
	const xmlResult = document.getElementById('xmlResult');

	let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<passwords>\n';

	currentPasswords.forEach((pass, index) => {
		xml += `    <password id="${index + 1}">${escapeXml(pass)}</password>\n`;
	});

	xml += '</passwords>';

	xmlResult.textContent = xml;
}

function escapeXml(text) {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');
}


/* -------------------- View - CSV ---------------------- */


function updateCsv() {
	let csv = "ID,Password\n";

	currentPasswords.forEach((pass, index) => {
		csv += `${index + 1},"${pass}"\n`; // Экранируем кавычки в пароле
	});

	document.getElementById('csvResult').textContent = csv;
}

function updateSql() {
	let sql = "-- Генерация паролей " + new Date().toISOString() + "\n";

	sql += "INSERT INTO passwords (id, value) VALUES\n";

	currentPasswords.forEach((pass, index) => {
		sql += `  (${index + 1}, '${pass.replace(/'/g, "''")}')${index < currentPasswords.length - 1 ? ',' : ';'}\n`;
	});

	document.getElementById('sqlResult').textContent = sql;
}


/* ------------------- View - Base64 -------------------- */


function updateBase64() {
	const encoder = new TextEncoder();

	let output = currentPasswords.map(p => {
		// Кодируем строку в Uint8Array
		let bytes = encoder.encode(p);
		// Преобразуем в обычную строку байтов
		let binary = Array.from(bytes).map(b => String.fromCharCode(b)).join('');
		// Преобразуем в base64
		return btoa(binary);
	}).join('\n');

	document.getElementById('base64Result').textContent = output;
}


/* ----------------- Copy to clipboard ------------------ */


function copyPassword() {
	let textToCopy = '';
	const activeTab = document.querySelector('.tab.active').textContent.trim();

	switch (activeTab) {
		case 'Pretty':
			textToCopy = currentPasswords.join('\n');
			break;
		case 'Text':
			textToCopy = currentPasswords.join('\n');
			break;
		case 'JSON':
			textToCopy = JSON.stringify(currentPasswords, null, 2);
			break;
		case 'XML':
			textToCopy = document.getElementById('xmlResult').textContent;
			break;
		case 'CSV':
			textToCopy = document.getElementById('csvResult').textContent;
			break;
		case 'SQL':
			textToCopy = document.getElementById('sqlResult').textContent;
			break;
		case 'Base64':
			textToCopy = document.getElementById('base64Result').textContent;
			break;
	}

	navigator.clipboard.writeText(textToCopy.trim())
		.then(() => console.log('Успешно скопировано!'))
		.catch(err => alert('Не удалось скопировать пароль: ' + err));
}
