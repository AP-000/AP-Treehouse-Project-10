const qwerty = document.getElementById("qwerty");
const word = document.getElementById("word");
const overlay = document.getElementById("overlay");
const timer = document.getElementById("timer");
const timerParagraph = timer.querySelector("p");
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
			<div class="label-select-container">
				<label for="theme" class="form-label">Choose Theme:</label>
				<select id="theme" name="theme">
					<option value="classic">Classic</option>
					<option value="dark">Dark</option>
					<option value="neon">Neon</option>
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
const themeStorageKey = "selectedTheme";
const totalTime = 25;

let gameTitle = document.getElementById("game-title");
let setupForm = document.getElementById("setup-form");
let difficultySelect = document.getElementById("difficulty");
let lifeIconSelect = document.getElementById("lifeicon");
let themeSelect = document.getElementById("theme");

let missed = 0;
let selectedDifficulty = "";
let selectedLifeIcon = "";
let randomWord = "";
let currentWinStreak = 0;
let timeRemaining = totalTime;
let timerIntervalId = null;

function cacheOverlayElements() {
	gameTitle = document.getElementById("game-title");
	setupForm = document.getElementById("setup-form");
	difficultySelect = document.getElementById("difficulty");
	lifeIconSelect = document.getElementById("lifeicon");
	themeSelect = document.getElementById("theme");
}

function getBestStreakKey(difficulty) {
	return `bestStreak_${difficulty}`;
}

function getCurrentStreakKey(difficulty) {
	return `currentStreak_${difficulty}`;
}

function saveThemeSelection(theme) {
	localStorage.setItem(themeStorageKey, theme);
}

function loadThemeSelection() {
	const savedTheme = localStorage.getItem(themeStorageKey) ?? "classic";

	document.documentElement.dataset.theme = savedTheme;

	if (themeSelect) {
		themeSelect.value = savedTheme;
	}
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

function updateTimerDisplay() {
	if (selectedDifficulty === "hard") {
		timerParagraph.textContent = `Time Remaining: ${timeRemaining}`;
		return;
	}

	timerParagraph.textContent = "";
}

function stopTimer() {
	if (timerIntervalId) {
		clearInterval(timerIntervalId);
		timerIntervalId = null;
	}
}

function startTimer() {
	if (selectedDifficulty !== "hard") {
		stopTimer();
		updateTimerDisplay();
		return;
	}

	stopTimer();
	timeRemaining = totalTime;
	updateTimerDisplay();

	timerIntervalId = setInterval(() => {
		timeRemaining -= 1;
		updateTimerDisplay();

		if (timeRemaining > 0 && timeRemaining % 5 === 0) {
			removeLife();
			checkWin();
		}

		if (timeRemaining <= 0) {
			stopTimer();

			if (missed < 5) {
				removeLife();
				checkWin();
			}
		}
	}, 1000);
}

function resetGameBoard() {
	stopTimer();
	missed = 0;
	randomWord = "";
	timeRemaining = totalTime;
	wordList.innerHTML = "";
	document.querySelector("#definition p").textContent = "";
	updateTimerDisplay();
	resetKeyboard();

	lifeIcons.forEach((icon) => {
		icon.src = `./images/live${selectedLifeIcon}.png`;
	});
}

function clearRoundDisplay() {
	wordList.innerHTML = "";
	document.querySelector("#definition p").textContent = "";
}

async function fetchRandomWord() {
	const wordLength = difficultyWordLengths[selectedDifficulty];

	try {
		const response = await fetch(
			`https://random-word-api.herokuapp.com/word?length=${wordLength}`
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
	const partOfSpeechLabels = {
		n: "Noun",
		v: "Verb",
		adj: "Adjective",
		adv: "Adverb",
		u: "Unknown",
		prop: "Proper Noun",
	};

	try {
		const response = await fetch(
			`https://api.datamuse.com/words?sp=${gameWord}&md=d&max=1`
		);

		if (!response.ok) {
			throw new Error("Failed to fetch a word definition.");
		}

		const [wordData] = await response.json();
		const firstDefinition = wordData?.defs?.[0] ?? "No definition available.";
		const [partOfSpeech, definitionText] = firstDefinition.split("\t");
		const partOfSpeechLabel = partOfSpeechLabels[partOfSpeech];

		definitionParagraph.textContent = definitionText
			? `${partOfSpeechLabel ?? partOfSpeech}: ${definitionText}`
			: firstDefinition;
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
	startTimer();
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

	stopTimer();
	clearRoundDisplay();

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
	loadThemeSelection();
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
	const selectedTheme = themeSelect.value;
	saveThemeSelection(selectedTheme);
	document.documentElement.dataset.theme = selectedTheme;
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

document.addEventListener("DOMContentLoaded", () => {
	loadThemeSelection();
});

bindSetupForm();
