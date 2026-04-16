const qwerty = document.getElementById("qwerty");
const word = document.getElementById("word");
const overlay = document.getElementById("overlay");
const lifeIcons = document.querySelectorAll("#scoreboard img");
const wordList = word.querySelector("ul");
const initialOverlayMarkup = `
	<h1 id="game-title" class="title">Wheel of Success 2.0</h1>
	<form id="setup-form">
		<fieldset>
			<legend class="visually-hidden">Game Setup</legend>
			<div class="label-select-container">
				<label class="form-label" for="difficulty">Select Difficulty:</label>
				<select id="difficulty" name="difficulty">
					<option value="easy" selected>Easy</option>
					<option value="medium">Medium</option>
					<option value="hard">Hard</option>
				</select>
			</div>
			<div class="label-select-container">
				<label class="form-label" for="lifeicon">Select Life Icon:</label>
				<select id="lifeicon" name="lifeicon">
					<option value="Heart" selected>Hearts ❤️</option>
					<option value="Emoji">Emojis 😀</option>
					<option value="Shield">Shields 🛡️</option>
					<option value="Thumbs">Thumbs 👍</option>
				</select>
			</div>
			<button type="submit" class="btn_reset">Start Game</button>
		</fieldset>
	</form>
`;
const difficultyWordLengths = {
	easy: 3,
	medium: 6,
	hard: 9,
};

let gameTitle = document.getElementById("game-title");
let setupForm = document.getElementById("setup-form");
let difficultySelect = document.getElementById("difficulty");
let lifeIconSelect = document.getElementById("lifeicon");

let missed = 0;
let selectedDifficulty = "";
let selectedLifeIcon = "";
let randomWord = "";
let currentWinStreak = 0;

function cacheOverlayElements() {
	gameTitle = document.getElementById("game-title");
	setupForm = document.getElementById("setup-form");
	difficultySelect = document.getElementById("difficulty");
	lifeIconSelect = document.getElementById("lifeicon");
}

function getBestStreakKey(difficulty) {
	return `bestStreak_${difficulty}`;
}

function getCurrentStreakKey(difficulty) {
	return `currentStreak_${difficulty}`;
}

function saveCurrentStreak() {
	localStorage.setItem(
		getCurrentStreakKey(selectedDifficulty),
		String(currentWinStreak)
	);
}

function updateBestStreak() {
	const bestStreakKey = getBestStreakKey(selectedDifficulty);
	const savedBestStreak = Number(localStorage.getItem(bestStreakKey) ?? 0);

	if (currentWinStreak > savedBestStreak) {
		localStorage.setItem(bestStreakKey, String(currentWinStreak));
	}
}

function getBestStreak() {
	return Number(localStorage.getItem(getBestStreakKey(selectedDifficulty)) ?? 0);
}

function resetKeyboard() {
	const keyboardButtons = qwerty.querySelectorAll("button");

	keyboardButtons.forEach((button) => {
		button.disabled = false;
		button.classList.remove("chosen");
	});
}

function resetGameBoard() {
	missed = 0;
	randomWord = "";
	wordList.innerHTML = "";
	document.querySelector("#definition p").textContent = "";
	resetKeyboard();

	lifeIcons.forEach((icon) => {
		icon.src = `./images/live${selectedLifeIcon}.png`;
	});
}

async function fetchRandomWord() {
	const wordLength = difficultyWordLengths[selectedDifficulty];

	try {
		const response = await fetch(
			`https://random-word-api.vercel.app/api?words=1&length=${wordLength}`
		);

		if (!response.ok) {
			throw new Error("Failed to fetch a random word.");
		}

		const [fetchedWord] = await response.json();
		randomWord = fetchedWord;
	} catch (error) {
		console.error(error);
	}
}

async function fetchAndShowDefinition(gameWord) {
	const definition = document.getElementById("definition");
	const definitionParagraph = definition.querySelector("p");

	try {
		const response = await fetch(
			`https://api.datamuse.com/words?sp=${gameWord}&md=d&max=1`
		);

		if (!response.ok) {
			throw new Error("Failed to fetch a word definition.");
		}

		const [wordData] = await response.json();
		const firstDefinition = wordData?.defs?.[0] ?? "No definition available.";

		definitionParagraph.textContent = firstDefinition;
	} catch (error) {
		console.error(error);
		definitionParagraph.textContent = "Definition unavailable.";
	}
}

async function startGame() {
	resetGameBoard();
	overlay.style.display = "none";

	await fetchRandomWord();

	const wordArray = getRandomWordAsArray(randomWord);
	addWordToDisplay(wordArray);
	await fetchAndShowDefinition(randomWord);
}

function getRandomWordAsArray(gameWord) {
	return gameWord.split("");
}

function addWordToDisplay(arr) {
	wordList.innerHTML = "";

	arr.forEach((character) => {
		const listItem = document.createElement("li");
		listItem.textContent = character;
		listItem.className = "letter";
		wordList.appendChild(listItem);
	});
}

function checkLetter(letter) {
	const letters = document.querySelectorAll("li.letter");
	let matchedLetter = null;

	letters.forEach((listItem) => {
		if (listItem.textContent === letter) {
			listItem.classList.add("show");
			matchedLetter = letter;
		}
	});

	return matchedLetter;
}

function removeLife() {
	const lostIcon = lifeIcons[missed];

	missed += 1;

	if (lostIcon) {
		lostIcon.src = `./images/lost${selectedLifeIcon}.png`;
	}
}

function showEndScreen(result) {
	const actionLabel = result === "win" ? "Play Again" : "Try Again";
	const heading = result === "win" ? "You Win!" : "You Lose!";
	const bestWinStreak = getBestStreak();

	overlay.className = result;
	overlay.style.display = "flex";
	overlay.innerHTML = `
		<h1 id="game-title" class="title">${heading}</h1>
		<p>Current Streak: ${currentWinStreak}</p>
		<p>Best Streak: ${bestWinStreak}</p>
		<div class="button-container">
			<button class="btn_reset" data-action="play-again">${actionLabel}</button>
			<button class="btn_home" data-action="home">Home</button>
		</div>
	`;

	cacheOverlayElements();
}

function returnToStartScreen() {
	resetGameBoard();
	selectedDifficulty = "";
	selectedLifeIcon = "";
	overlay.className = "start";
	overlay.style.display = "flex";
	overlay.innerHTML = initialOverlayMarkup;
	cacheOverlayElements();
	bindSetupForm();
}

function checkWin() {
	const shownLetters = document.querySelectorAll("li.show").length;
	const hiddenLetters = document.querySelectorAll("li.letter").length;

	if (shownLetters === hiddenLetters) {
		currentWinStreak += 1;
		saveCurrentStreak();
		updateBestStreak();
		showEndScreen("win");
	} else if (missed >= 5) {
		currentWinStreak = 0;
		saveCurrentStreak();
		showEndScreen("lose");
	}
}

function handleInteraction(selectedButton) {
	const guessedLetter = selectedButton.textContent;
	const matchedLetter = checkLetter(guessedLetter);

	selectedButton.disabled = true;
	selectedButton.classList.add("chosen");

	if (matchedLetter === null) {
		removeLife();
	}

	checkWin();
}

qwerty.addEventListener("click", (event) => {
	if (overlay.style.display !== "none") {
		return;
	}

	if (event.target.tagName === "BUTTON") {
		handleInteraction(event.target);
	}
});

document.addEventListener("keydown", (event) => {
	if (overlay.style.display !== "none") {
		return;
	}

	if (!/^[a-z]$/i.test(event.key)) {
		return;
	}

	const pressedLetter = event.key.toLowerCase();
	const keyboardButtons = qwerty.querySelectorAll("button");

	keyboardButtons.forEach((button) => {
		if (button.textContent === pressedLetter && !button.disabled) {
			handleInteraction(button);
		}
	});
});

overlay.addEventListener("click", async (event) => {
	const action = event.target.dataset.action;

	if (action === "play-again") {
		await startGame();
	}

	if (action === "home") {
		returnToStartScreen();
	}
});

async function handleSetupSubmit(event) {
	event.preventDefault();

	selectedDifficulty = difficultySelect.value;
	selectedLifeIcon = lifeIconSelect.value;
	currentWinStreak = Number(
		localStorage.getItem(getCurrentStreakKey(selectedDifficulty)) ?? 0
	);

	await startGame();
}

function bindSetupForm() {
	if (setupForm) {
		setupForm.addEventListener("submit", handleSetupSubmit);
	}
}

bindSetupForm();
