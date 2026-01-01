let moves = 0;
let flippedCards = [];
let matchedPairs = 0;
let lockBoard = false;

const images = [
	'1.jpg', '2.jpg', '3.jpg', '4.jpg',  '5.jpg',  '6.jpg',
	'7.jpg', '8.jpg', '9.jpg', '10.jpg', '11.jpg', '12.jpg'
];
const cards = [...images, ...images]; // 24 карточки



// Получаем выбранное значение
const cardsSetSelect = document.getElementById('cards-set');

var dir = cardsSetSelect.value;

cardsSetSelect.addEventListener('change', function() {
	dir = this.value;
	restartGame()
});

// Перемешиваем карточки (Фишер-Йейтс)
function shuffle(array) {
	for (let i = array.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[array[i], array[j]] = [array[j], array[i]];
	}
	return array;
}

function createBoard() {
	const board = document.getElementById('gameBoard');
	board.innerHTML = '';
	const shuffled = shuffle([...cards]);

	shuffled.forEach((img, index) => {
		const card = document.createElement('div');
		card.classList.add('card');
		card.dataset.image = img;
		card.dataset.index = index;

		card.innerHTML = `
      <div class="card-face card-front">?</div>
      <div class="card-face card-back">
        <img src="img/${dir}/${img}" alt="картинка">
      </div>
    `;

		card.addEventListener('click', flipCard);
		board.appendChild(card);
	});
}

function flipCard() {
	if (lockBoard) return;
	if (this.classList.contains('flipped') || this.classList.contains('matched')) return;

	this.classList.add('flipped');

	flippedCards.push(this);

	if (flippedCards.length === 2) {
		moves++;
		document.getElementById('moves').textContent = moves;

		const [card1, card2] = flippedCards;
		const img1 = card1.dataset.image;
		const img2 = card2.dataset.image;

		if (img1 === img2) {
			// Совпадение!
			card1.classList.add('matched');
			card2.classList.add('matched');
			resetFlipped();
			matchedPairs++;
			document.getElementById('pairs').textContent = matchedPairs;

			if (matchedPairs === 12) {
				setTimeout(showWinModal, 500);
			}
		} else {
			// Нет совпадения — переворачиваем обратно
			lockBoard = true;
			setTimeout(() => {
				card1.classList.remove('flipped');
				card2.classList.remove('flipped');
				resetFlipped();
				lockBoard = false;
			}, 1000);
		}
	}
}

function resetFlipped() {
	flippedCards = [];
}

function showWinModal() {
	document.getElementById('finalMoves').textContent = moves;
	document.getElementById('winModal').style.display = 'flex';
}

function restartGame() {
	moves = 0;
	matchedPairs = 0;
	flippedCards = [];
	lockBoard = false;
	document.getElementById('moves').textContent = moves;
	document.getElementById('pairs').textContent = matchedPairs;
	document.getElementById('winModal').style.display = 'none';
	createBoard();
}

// Запуск игры
document.addEventListener('DOMContentLoaded', () => {
	createBoard();
});