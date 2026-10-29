const API_URL =
    "https://en.wiktionary.org/api/rest_v1/page/definition/";

const searchForm = document.getElementById("word-search-form");
const searchInput = document.getElementById("word-search");

const loadingState = document.getElementById("loading-state");
const errorState = document.getElementById("error-state");
const errorMessage = document.getElementById("error-message");
const emptyState = document.getElementById("empty-state");
const resultsContainer = document.getElementById("word-results");

const savedSearch = document.getElementById("saved-search");
const savedWordsList = document.getElementById("saved-words-list");
const savedEmptyState = document.getElementById("saved-empty-state");
const refreshButton = document.getElementById("refresh-words");

const totalSaved = document.getElementById("total-saved");
const quizAccuracy = document.getElementById("quiz-accuracy");
const quizAttempts = document.getElementById("quiz-attempts");

const quizProgress = document.getElementById("quiz-progress");
const quizEmptyState = document.getElementById("quiz-empty-state");
const quizContent = document.getElementById("quiz-content");
const quizQuestionWord = document.getElementById("quiz-question-word");
const quizDefinition = document.getElementById("quiz-definition");
const quizOptions = document.getElementById("quiz-options");
const quizOptionFeedback = document.getElementById("quiz-option-feedback");
const revealAnswerButton = document.getElementById("reveal-answer");
const quizAnswer = document.getElementById("quiz-answer");
const quizWord = document.getElementById("quiz-word");
const quizFeedback = document.getElementById("quiz-feedback");
const knewButton = document.getElementById("quiz-knew");
const didntKnowButton = document.getElementById("quiz-didnt-know");
const startQuizButton = document.getElementById("start-quiz");
const nextQuestionButton = document.getElementById("next-question");
const completeQuizButton = document.getElementById("complete-quiz");

const WORDS_KEY = "vocabveda-saved-words";
const STATS_KEY = "vocabveda-quiz-stats";

function readStorage(key, fallback) {
    try {
        const stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored) : fallback;
    } catch (error) {
        console.error("Could not read LocalStorage:", error);
        return fallback;
    }
}

let savedWords = readStorage(WORDS_KEY, []);
let quizStats = readStorage(STATS_KEY, {
    attempts: 0,
    correct: 0
});

if (!Array.isArray(savedWords)) {
    savedWords = [];
}

savedWords = savedWords
    .filter(item => item && typeof item.word === "string")
    .map(item => ({
        word: item.word.trim().toLowerCase(),
        savedAt: item.savedAt || new Date().toISOString()
    }))
    .filter((item, index, words) =>
        item.word && words.findIndex(
            other => other.word === item.word
        ) === index
    );

if (
    !quizStats ||
    !Number.isFinite(quizStats.attempts) ||
    !Number.isFinite(quizStats.correct)
) {
    quizStats = { attempts: 0, correct: 0 };
}

quizStats.attempts = Math.max(0, quizStats.attempts);
quizStats.correct = Math.max(
    0,
    Math.min(quizStats.correct, quizStats.attempts)
);

function saveWords() {
    try {
        localStorage.setItem(WORDS_KEY, JSON.stringify(savedWords));
        return true;
    } catch (error) {
        console.error("Could not save words:", error);
        return false;
    }
}

function saveStats() {
    try {
        localStorage.setItem(STATS_KEY, JSON.stringify(quizStats));
    } catch (error) {
        console.error("Could not save statistics:", error);
    }
}

function hideSearchStates() {
    loadingState?.classList.add("hidden");
    errorState?.classList.add("hidden");
    emptyState?.classList.add("hidden");
}

function showError(message) {
    if (errorMessage) {
        errorMessage.textContent = message;
    }

    errorState?.classList.remove("hidden");
}

function cleanText(value) {
    if (typeof value !== "string") return "";

    const temporaryElement = document.createElement("div");
    temporaryElement.innerHTML = value;

    return temporaryElement.textContent.trim();
}

function createElement(tag, className, text) {
    const element = document.createElement(tag);

    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;

    return element;
}

function shuffleArray(items) {
    const shuffled = [...items];

    for (let index = shuffled.length - 1; index > 0; index--) {
        const randomIndex = Math.floor(Math.random() * (index + 1));

        [shuffled[index], shuffled[randomIndex]] =
            [shuffled[randomIndex], shuffled[index]];
    }

    return shuffled;
}

const vocabularyBank = [
    { word: "abundant", definition: "Existing in large quantities; plentiful." },
    { word: "benevolent", definition: "Kind, generous and wishing others well." },
    { word: "candid", definition: "Honest and direct, without hiding feelings." },
    { word: "diligent", definition: "Careful and hardworking in one's efforts." },
    { word: "eloquent", definition: "Fluent, persuasive and expressive in speech." },
    { word: "ephemeral", definition: "Lasting for only a short time." },
    { word: "frugal", definition: "Careful about spending money or resources." },
    { word: "gratitude", definition: "The feeling of being thankful." },
    { word: "humble", definition: "Not thinking you are more important than others." },
    { word: "inevitable", definition: "Certain to happen and impossible to avoid." },
    { word: "meticulous", definition: "Extremely careful about small details." },
    { word: "novel", definition: "New, unusual or not previously known." },
    { word: "optimistic", definition: "Expecting good things to happen." },
    { word: "prudent", definition: "Showing good judgment and careful decision-making." },
    { word: "resilient", definition: "Able to recover quickly from difficulties." },
    { word: "serendipity", definition: "Finding something good without looking for it." },
    { word: "tranquil", definition: "Calm, peaceful and free from disturbance." },
    { word: "versatile", definition: "Able to adapt to many different uses or tasks." },
    { word: "vivid", definition: "Clear, bright and full of detail." },
    { word: "zeal", definition: "Great energy and enthusiasm for something." },
    { word: "ambiguous", definition: "Having more than one possible meaning." },
    { word: "compassion", definition: "Sympathy for others and a desire to help." },
    { word: "eloquence", definition: "The ability to express ideas fluently and persuasively." },
    { word: "perseverance", definition: "Continuing despite difficulty or delay." },
    { word: "profound", definition: "Very deep, thoughtful or significant." },
    { word: "resilient", definition: "Able to recover after challenges or setbacks." },
    { word: "serene", definition: "Peaceful, calm and untroubled." },
    { word: "tenacious", definition: "Persistent and unwilling to give up easily." },
    { word: "ubiquitous", definition: "Present or found everywhere." },
    { word: "articulate", definition: "Able to express thoughts clearly and effectively." }
];

const uniqueVocabulary = [
    ...new Map(vocabularyBank.map(item => [item.word, item])).values()
];

async function fetchDefinition(word) {
    try {
        const response = await fetch(
            API_URL + encodeURIComponent(word.trim().toLowerCase())
        );

        if (!response.ok) {
            if (response.status === 404) return null;

            throw new Error(`Dictionary request failed (${response.status}).`);
        }

        const data = await response.json();
        const entries = data.en || [];

        const usableEntry = entries.find(
            entry => Array.isArray(entry.definitions) &&
                entry.definitions.length > 0
        );

        return usableEntry || null;
    } catch (error) {
        console.error(`Could not load "${word}":`, error);
        return null;
    }
}

async function searchWord(word) {
    const normalizedWord = word.trim().toLowerCase();

    if (!normalizedWord) {
        searchInput?.focus();
        return;
    }

    hideSearchStates();
    resultsContainer?.replaceChildren();
    loadingState?.classList.remove("hidden");

    try {
        const response = await fetch(
            API_URL + encodeURIComponent(normalizedWord)
        );

        if (response.status === 404) {
            emptyState?.classList.remove("hidden");
            return;
        }

        if (!response.ok) {
            throw new Error(
                "The dictionary is temporarily unavailable. Please try again."
            );
        }

        const data = await response.json();
        const entries = data.en || [];

        const usableEntries = entries.filter(
            entry => Array.isArray(entry.definitions) &&
                entry.definitions.length > 0
        );

        if (usableEntries.length === 0) {
            emptyState?.classList.remove("hidden");
            return;
        }

        displayWord(normalizedWord, usableEntries);
    } catch (error) {
        showError(
            error.message ||
            "Unable to connect. Check your internet connection and try again."
        );

        console.error("Dictionary API error:", error);
    } finally {
        loadingState?.classList.add("hidden");
    }
}

function displayWord(word, entries) {
    if (!resultsContainer) return;

    resultsContainer.replaceChildren();

    const heading = createElement(
        "h3",
        "text-3xl md:text-4xl font-display font-bold mb-2",
        word
    );

    const subtitle = createElement(
        "p",
        "text-sm opacity-70 mb-3",
        "English dictionary"
    );

    resultsContainer.append(heading, subtitle);


    entries.forEach(entry => {
        const card = createElement(
            "section",
            "word-result-card rounded-xl border border-antique/30 bg-[#22251E]/90 p-5"
        );

        const partOfSpeech = createElement(
            "h4",
            "text-lg font-semibold capitalize mb-4 text-antique",
            entry.partOfSpeech || "Definition"
        );

        card.appendChild(partOfSpeech);

        (entry.definitions || []).slice(0, 5).forEach((item, index) => {
            const block = createElement("div", "mb-4");

            block.appendChild(createElement(
                "p",
                "font-semibold mb-1",
                `Definition ${index + 1}`
            ));

            block.appendChild(createElement(
                "p",
                "leading-relaxed",
                cleanText(item.definition) || "Definition unavailable."
            ));

            const exampleText =
                item.parsedExamples?.[0]?.example ||
                item.examples?.[0];

            if (exampleText) {
                block.appendChild(createElement(
                    "p",
                    "text-sm italic opacity-80 mt-2",
                    `Example: ${cleanText(exampleText)}`
                ));
            }

            card.appendChild(block);
        });

        const saveButton = createElement(
            "button",
            "mt-3 border border-antique bg-antique px-5 py-2 text-ink " +
            "transition hover:bg-parchment active:scale-95",
            "Save to My Words"
        );

        saveButton.type = "button";
        saveButton.dataset.action = "save-word";
        saveButton.dataset.word = word;

        const alreadySaved = savedWords.some(
            item => item.word === word
        );

        if (alreadySaved) {
            saveButton.textContent = "Saved to My Words";
            saveButton.disabled = true;
        }

        card.appendChild(saveButton);
        resultsContainer.appendChild(card);
    });
}


function saveWord(word) {
    const normalizedWord = word.trim().toLowerCase();

    if (!normalizedWord) return;

    const alreadySaved = savedWords.some(
        item => item.word === normalizedWord
    );

    if (alreadySaved) return;

    savedWords.push({
        word: normalizedWord,
        savedAt: new Date().toISOString()
    });

    if (!saveWords()) {
        savedWords = savedWords.filter(
            item => item.word !== normalizedWord
        );

        showError("Your browser could not save this word. Please try again.");
        return;
    }

    renderSavedWords();
    updateStatistics();

    const saveButton = [...(resultsContainer?.querySelectorAll(
        '[data-action="save-word"]'
    ) || [])].find(button => button.dataset.word === normalizedWord);

    if (saveButton) {
        saveButton.textContent = "Saved to My Words";
        saveButton.disabled = true;
    }

    if (quizEmptyState && !quizContent?.classList.contains("hidden")) {
        quizProgress.textContent =
            "Your collection has changed. Start a new quiz to include saved words.";
    }
}

resultsContainer?.addEventListener("click", event => {
    const button = event.target.closest('[data-action="save-word"]');

    if (button && resultsContainer.contains(button)) {
        saveWord(button.dataset.word);
    }
});

function deleteWord(word) {
    const previousWords = [...savedWords];

    savedWords = savedWords.filter(item => item.word !== word);

    if (!saveWords()) {
        savedWords = previousWords;
        showError("Your browser could not update saved words.");
        return;
    }

    renderSavedWords();
    updateStatistics();

    if (savedWords.length === 0 && quizContent?.classList.contains("hidden")) {
        showQuizEmpty();
    }
}

function renderSavedWords() {
    if (!savedWordsList) return;

    savedWordsList.replaceChildren();

    const query = (savedSearch?.value || "").trim().toLowerCase();

    const filteredWords = savedWords
        .filter(item => item.word.includes(query))
        .sort((a, b) => a.word.localeCompare(b.word));

    if (savedEmptyState) {
        savedEmptyState.classList.toggle(
            "hidden",
            filteredWords.length > 0
        );

        const emptyMessage = savedEmptyState.querySelector("p");

        if (emptyMessage) {
            emptyMessage.textContent = query
                ? "No saved words match your search."
                : "Search for a word and save it to build your vocabulary.";
        }
    }

    filteredWords.forEach(item => {
        const row = createElement(
            "article",
            "flex items-center justify-between gap-4 border border-antique/25 " +
            "bg-[#22251E]/90 p-4 transition hover:border-antique/60"
        );

        const name = createElement(
            "span",
            "font-semibold capitalize break-words text-parchment",
            item.word
        );

        const actions = createElement(
            "div",
            "flex shrink-0 flex-wrap items-center gap-2"
        );

        const viewButton = createElement(
            "button",
            "border border-antique/60 px-3 py-2 text-sm text-antique " +
            "transition hover:bg-antique hover:text-ink active:scale-95",
            "View"
        );

        viewButton.type = "button";
        viewButton.dataset.action = "lookup-saved";
        viewButton.dataset.word = item.word;

        const deleteButton = createElement(
            "button",
            "border border-red-400/50 px-3 py-2 text-sm text-red-300 " +
            "transition hover:bg-red-950 active:scale-95",
            "Delete"
        );

        deleteButton.type = "button";
        deleteButton.dataset.action = "delete-word";
        deleteButton.dataset.word = item.word;
        deleteButton.setAttribute(
            "aria-label",
            `Delete ${item.word} from My Words`
        );

        actions.append(viewButton, deleteButton);
        row.append(name, actions);
        savedWordsList.appendChild(row);
    });
}

savedWordsList?.addEventListener("click", event => {
    const button = event.target.closest("button[data-action]");

    if (!button || !savedWordsList.contains(button)) return;

    const word = button.dataset.word;

    if (button.dataset.action === "delete-word") {
        deleteWord(word);
    }

    if (button.dataset.action === "lookup-saved") {
        if (searchInput) searchInput.value = word;

        searchWord(word);
        document.getElementById("search")?.scrollIntoView({
            behavior: "smooth"
        });
    }
});

savedSearch?.addEventListener("input", renderSavedWords);


let quizWords = [];
let quizIndex = 0;
let currentQuestion = null;
let answerRecorded = false;
let selectedOption = null;

const previousQuestionButton =
    document.getElementById("previous-question");

function showQuizEmpty(message = "") {
    quizContent?.classList.add("hidden");
    quizEmptyState?.classList.remove("hidden");
    nextQuestionButton?.classList.add("hidden");
    previousQuestionButton?.classList.add("hidden");

    if (quizProgress) {
        quizProgress.textContent = message || "Ready to begin";
    }
}

async function getQuizPool() {
    const savedEntries = await Promise.all(
        savedWords.map(async saved => {
            const word = saved.word.toLowerCase();

            const builtInEntry = uniqueVocabulary.find(
                item => item.word === word
            );

            const dictionaryEntry = await fetchDefinition(word);

            const rawDefinition = dictionaryEntry?.definitions?.find(
                item => item.definition
            )?.definition;

            const apiDefinition = rawDefinition
                ? cleanDefinition(rawDefinition)
                : "";

            const definition =
                apiDefinition || builtInEntry?.definition || "";

            if (!definition) return null;

            return { word, definition };
        })
    );

    return savedEntries.filter(Boolean);
}

function cleanDefinition(text) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, "text/html");

    return (doc.body.textContent || "")
        .replace(/\s+/g, " ")
        .trim();
}

function resetQuizQuestion() {
    answerRecorded = false;
    selectedOption = null;
    currentQuestion = null;

    quizOptions?.replaceChildren();
    quizOptions?.classList.remove("hidden");
    quizOptionFeedback?.classList.add("hidden");
    quizAnswer?.classList.add("hidden");
    quizFeedback?.classList.add("hidden");
    revealAnswerButton?.classList.add("hidden");
    nextQuestionButton?.classList.add("hidden");

    if (quizDefinition) quizDefinition.textContent = "";
    if (quizWord) quizWord.textContent = "";

    if (knewButton) knewButton.disabled = false;
    if (didntKnowButton) didntKnowButton.disabled = false;
}

async function prepareQuiz() {
    if (startQuizButton) startQuizButton.disabled = true;

    if (quizProgress) {
        quizProgress.textContent = "Preparing your quiz...";
    }

    try {
        const pool = await getQuizPool();

        if (pool.length === 0) {
            showQuizEmpty(
                savedWords.length === 0
                    ? "Save some words in My Words to start a quiz."
                    : "No definitions are available for your saved words yet."
            );
            return;
        }

        quizWords = shuffleArray(pool);
        quizIndex = 0;

        quizEmptyState?.classList.add("hidden");
        quizContent?.classList.remove("hidden");

        startQuizButton?.classList.add("hidden");

        loadQuizQuestion();
    } catch (error) {
        console.error("Could not prepare quiz:", error);
        showQuizEmpty("Could not prepare the quiz. Please try again.");
    } finally {
        if (startQuizButton) startQuizButton.disabled = false;
    }
}

function createAnswerOptions() {
    if (!quizOptions || !currentQuestion) return;

    const distractors = [
        ...new Set([
            ...savedWords.map(item => item.word),
            ...uniqueVocabulary.map(item => item.word)
        ])
    ].filter(word => word !== currentQuestion.word);

    const choices = shuffleArray([
        currentQuestion.word,
        ...shuffleArray(distractors).slice(0, 3)
    ]);

    quizOptions.replaceChildren();
    quizOptions.classList.remove("hidden");

    choices.forEach(word => {
        const option = createElement(
            "button",
            "w-full border border-antique/40 bg-[#22251E]/80 " +
            "px-4 py-4 text-left text-sm text-parchment " +
            "transition hover:border-antique hover:bg-forest " +
            "focus:outline-none focus:ring-2 focus:ring-antique",
            word
        );

        option.type = "button";
        option.dataset.word = word;

        option.addEventListener("click", () => {
            if (answerRecorded) return;

            selectedOption = word;

            [...quizOptions.children].forEach(button => {
                button.classList.remove("border-antique", "bg-forest");
                button.setAttribute("aria-pressed", "false");
            });

            option.classList.add("border-antique", "bg-forest");
            option.setAttribute("aria-pressed", "true");

            if (quizOptionFeedback) {
                quizOptionFeedback.textContent =
                    "Choice selected. Click Reveal Word to check your answer.";
                quizOptionFeedback.classList.remove("hidden");
                quizOptionFeedback.classList.remove(
                    "text-green-300",
                    "text-red-300"
                );
            }

            revealAnswerButton?.classList.remove("hidden");
        });

        quizOptions.appendChild(option);
    });
}

function loadQuizQuestion() {
    const savedSet = new Set(savedWords.map(item => item.word));

    quizWords = quizWords.filter(item => savedSet.has(item.word));

    if (quizWords.length === 0) {
        showQuizEmpty("Save some words in My Words to start a quiz.");
        startQuizButton?.classList.remove("hidden");
        return;
    }

    quizIndex = Math.max(0, Math.min(quizIndex, quizWords.length - 1));

    resetQuizQuestion();
    currentQuestion = quizWords[quizIndex];

    if (quizQuestionWord) {
        quizQuestionWord.textContent = currentQuestion.definition;
    }

    if (quizDefinition) {
        quizDefinition.textContent = currentQuestion.definition;
    }

    if (quizProgress) {
        quizProgress.textContent =
            `Question ${quizIndex + 1} of ${quizWords.length}`;
    }

    createAnswerOptions();

   
    previousQuestionButton?.classList.toggle(
        "hidden",
        quizIndex === 0
    );

    completeQuizButton?.classList.toggle(
        "hidden",
         quizIndex !== quizWords.length - 1
    );

    nextQuestionButton?.classList.toggle(
       "hidden",
       quizIndex === quizWords.length - 1
    );


    if (nextQuestionButton) {
        nextQuestionButton.disabled = !answerRecorded;
        nextQuestionButton.classList.toggle("opacity-50", !answerRecorded);
    }
}

revealAnswerButton?.addEventListener("click", () => {
    if (!currentQuestion || answerRecorded) return;

    const isCorrect = selectedOption === currentQuestion.word;

    if (quizWord) {
        quizWord.textContent = currentQuestion.word;
    }

    quizAnswer?.classList.remove("hidden");

    let answerText = quizAnswer?.querySelector(
        "[data-role='answer-definition']"
    );

    if (!answerText && quizAnswer) {
        answerText = createElement(
            "p",
            "mt-2 text-sm leading-7 text-parchment"
        );
        answerText.dataset.role = "answer-definition";
        quizAnswer.appendChild(answerText);
    }

    if (answerText) {
        answerText.textContent = currentQuestion.definition;
    }

    if (quizOptionFeedback) {
        quizOptionFeedback.textContent = isCorrect
            ? "Correct! You selected the right word."
            : "Not quite. Check the correct answer below.";

        quizOptionFeedback.classList.remove("hidden");
        quizOptionFeedback.classList.toggle("text-green-300", isCorrect);
        quizOptionFeedback.classList.toggle("text-red-300", !isCorrect);
    }

    [...(quizOptions?.children || [])].forEach(button => {
        if (button.dataset.word === currentQuestion.word) {
            button.classList.add("border-green-500", "bg-green-950/50");
        } else if (button.dataset.word === selectedOption) {
            button.classList.add("border-red-500", "bg-red-950/50");
        }

        button.disabled = true;
    });

    const feedbackMessage = quizFeedback?.querySelector("p");

    if (feedbackMessage) {
        feedbackMessage.textContent =
            "Did you remember this word before revealing the answer?";
    }

    quizFeedback?.classList.remove("hidden");
    revealAnswerButton.classList.add("hidden");
});

function recordQuizAnswer(knewIt) {
    if (answerRecorded || !currentQuestion) return;

    answerRecorded = true;

    quizStats.attempts += 1;

    if (knewIt) {
        quizStats.correct += 1;
    }

    saveStats();
    updateStatistics();

    const feedbackMessage = quizFeedback?.querySelector("p");

    if (feedbackMessage) {
        feedbackMessage.textContent = knewIt
            ? "Great work! You remembered the word."
            : "Keep practising. Revisit this word to remember it next time.";
    }

    if (knewButton) knewButton.disabled = true;
    if (didntKnowButton) didntKnowButton.disabled = true;

    if (quizProgress) {
        quizProgress.textContent =
            `Question ${quizIndex + 1} of ${quizWords.length} · ` +
            (knewIt ? "You knew it" : "Keep practising");
    }

    const isLastQuestion = quizIndex === quizWords.length - 1;

    if (nextQuestionButton) {
        nextQuestionButton.disabled = isLastQuestion;
        nextQuestionButton.classList.toggle("hidden", isLastQuestion);
        nextQuestionButton.classList.toggle("opacity-50", isLastQuestion);
    }

completeQuizButton?.classList.toggle("hidden", !isLastQuestion);
}

knewButton?.addEventListener("click", () => recordQuizAnswer(true));
didntKnowButton?.addEventListener("click", () => recordQuizAnswer(false));

startQuizButton?.addEventListener("click", prepareQuiz);

previousQuestionButton?.addEventListener("click", () => {
    if (quizIndex <= 0) return;

    quizIndex -= 1;
    loadQuizQuestion();
});

nextQuestionButton?.addEventListener("click", () => {
    if (!answerRecorded || quizIndex >= quizWords.length - 1) return;

    quizIndex += 1;
    loadQuizQuestion();
});

completeQuizButton?.addEventListener("click", () => {
    if (!answerRecorded || quizIndex !== quizWords.length - 1) return;

    quizContent?.classList.add("hidden");
    quizEmptyState?.classList.remove("hidden");

    if (quizProgress) {
        quizProgress.textContent = "Quiz completed!";
    }

    if (quizEmptyState) {
        quizEmptyState.textContent =
            "You've completed your quiz. Great work!";
    }

    previousQuestionButton?.classList.add("hidden");
    completeQuizButton?.classList.add("hidden");
    nextQuestionButton?.classList.add("hidden");
    startQuizButton?.classList.remove("hidden");
});


function updateStatistics() {
    if (totalSaved) {
        totalSaved.textContent = savedWords.length;
    }

    if (quizAttempts) {
        quizAttempts.textContent = quizStats.attempts;
    }

    const accuracy = quizStats.attempts > 0
        ? Math.round((quizStats.correct / quizStats.attempts) * 100)
        : 0;

    if (quizAccuracy) {
        quizAccuracy.textContent = `${accuracy}%`;
    }
}

searchForm?.addEventListener("submit", event => {
    event.preventDefault();
    searchWord(searchInput?.value || "");
});

refreshButton?.addEventListener("click", () => {
    renderSavedWords();
    updateStatistics();

    if (searchInput?.value.trim()) {
        searchWord(searchInput.value);
    }
});

renderSavedWords();
updateStatistics();
showQuizEmpty();