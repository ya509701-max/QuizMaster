import Quiz from "./quiz.js";
import Question from "./question.js";

const quizForm = document.getElementById("quizOptions");
const playerNameInput = document.getElementById("playerName");
const categoryInput = document.getElementById("categoryMenu");
const difficultyInput = document.getElementById("difficultyOptions");
const questionsNumberInput = document.getElementById("questionsNumber");
const startButton = document.getElementById("startQuiz");
const questionsContainer = document.getElementById("questionsContainer");

let currentQuiz = null;
let currentQuestion = null;
let isStarting = false;

function showFormError(message) {
    const oldError = quizForm.querySelector(".form-error");

    if (oldError) {
        oldError.remove();
    }

    const error = document.createElement("div");
    error.className = "form-error";
    error.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> ${message}`;

    startButton.before(error);
}

function clearFormError() {
    const error = quizForm.querySelector(".form-error");

    if (error) {
        error.remove();
    }
}

function validateForm() {
    const amount = Number(questionsNumberInput.value);

    if (!Number.isInteger(amount) || amount < 1 || amount > 50) {
        showFormError("Please enter a number between 1 and 50.");
        return false;
    }

    clearFormError();
    return true;
}

function showLoading() {
    quizForm.classList.add("hidden");

    questionsContainer.innerHTML = `
        <div class="loading-overlay">
            <div class="loading-spinner"></div>
            <p class="loading-text">Loading Questions...</p>
        </div>
    `;
}

function showError(message) {
    quizForm.classList.remove("hidden");

    questionsContainer.innerHTML = `
        <div class="game-card error-card">
            <div class="error-icon">
                <i class="fa-solid fa-triangle-exclamation"></i>
            </div>
            <h3 class="error-title">Something went wrong</h3>
            <p class="error-message">${message}</p>
            <button class="btn-play retry-btn" type="button">
                <i class="fa-solid fa-rotate-right"></i>
                Try Again
            </button>
        </div>
    `;

    questionsContainer.querySelector(".retry-btn").addEventListener("click", startQuiz);
}

function resetToStart() {
    if (currentQuestion) {
        currentQuestion.stopTimer();
        currentQuestion.removeEventListeners();
    }

    currentQuiz = null;
    currentQuestion = null;

    questionsContainer.innerHTML = "";
    quizForm.classList.remove("hidden");
    clearFormError();
}

function showResults() {
    questionsContainer.innerHTML = currentQuiz.endQuiz();

    const restartButton = questionsContainer.querySelector(".btn-restart");

    restartButton.addEventListener("click", resetToStart);
}

async function startQuiz() {
    if (isStarting || !validateForm()) {
        return;
    }

    isStarting = true;
    startButton.disabled = true;

    const category = categoryInput.value.trim();
    const difficulty = difficultyInput.value.trim();
    const amount = Number(questionsNumberInput.value);
    const playerName = playerNameInput.value.trim() || "Player";

    const questionTypeInput = document.getElementById("questionType");
    const questionType = questionTypeInput ? questionTypeInput.value : "";

    currentQuiz = new Quiz(
        category,
        difficulty,
        amount,
        playerName,
        questionType
    );

    showLoading();

    try {
        await currentQuiz.getQuestions();

        currentQuestion = new Question(
            currentQuiz,
            questionsContainer,
            showResults
        );

        currentQuestion.displayQuestion();
    } catch (error) {
        showError(error.message);
    } finally {
        isStarting = false;
        startButton.disabled = false;
    }
}

quizForm.addEventListener("submit", event => {
    event.preventDefault();
    startQuiz();
});

startButton.addEventListener("click", event => {
    event.preventDefault();
    startQuiz();
});