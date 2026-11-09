
export default class Question {
    constructor(quiz, container, onQuizEnd) {
        this.quiz = quiz;
        this.container = container;
        this.onQuizEnd = onQuizEnd;

        this.questionData = null;
        this.questionCard = null;
        this.timerInterval = null;
        this.timeRemaining = 15;
        this.answered = false;

        this.keyboardHandler = this.handleKeyboard.bind(this);
    }

    decodeHTML(value) {
        const textarea = document.createElement("textarea");
        textarea.innerHTML = value;
        return textarea.value;
    }

    escapeHTML(value) {
        return String(value).replace(/[&<>"']/g, character => {
            const entities = {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;"
            };

            return entities[character];
        });
    }

    shuffleAnswers(answers) {
        const shuffled = [...answers];

        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        return shuffled;
    }

    displayQuestion() {
        this.questionData = this.quiz.getCurrentQuestion();

        if (!this.questionData) {
            this.onQuizEnd();
            return;
        }

        this.stopTimer();
        this.removeEventListeners();

        this.answered = false;
        this.timeRemaining = 15;

        const question = this.decodeHTML(this.questionData.question);
        const correctAnswer = this.decodeHTML(this.questionData.correct_answer);

        const answers = [
            correctAnswer,
            ...this.questionData.incorrect_answers.map(answer => this.decodeHTML(answer))
        ];

        const shuffledAnswers = this.shuffleAnswers(answers);

        const currentNumber = this.quiz.currentQuestionIndex + 1;
        const totalQuestions = this.quiz.questions.length;
        const progress = (currentNumber / totalQuestions) * 100;

        const category = this.decodeHTML(this.questionData.category);
        const difficulty = this.questionData.difficulty;

        const answersHTML = shuffledAnswers.map((answer, index) => `
            <button class="answer-btn" type="button"
                data-answer="${this.escapeHTML(answer)}"
                data-index="${index + 1}">
                <span class="answer-key">${index + 1}</span>
                <span class="answer-text">${this.escapeHTML(answer)}</span>
            </button>
        `).join("");

        this.container.innerHTML = `
            <div class="game-card question-card">
                <div class="xp-bar-container">
                    <div class="xp-bar-header">
                        <span class="xp-label">
                            <i class="fa-solid fa-bolt"></i> Progress
                        </span>
                        <span class="xp-value">Question ${currentNumber}/${totalQuestions}</span>
                    </div>

                    <div class="xp-bar">
                        <div class="xp-bar-fill" style="width: ${progress}%"></div>
                    </div>
                </div>

                <div class="stats-row">
                    <div class="stat-badge category">
                        <i class="fa-solid fa-bookmark"></i>
                        <span>${this.escapeHTML(category)}</span>
                    </div>

                    <div class="stat-badge difficulty ${difficulty}">
                        <span>${this.escapeHTML(difficulty)}</span>
                    </div>

                    <div class="stat-badge timer">
                        <i class="fa-solid fa-stopwatch"></i>
                        <span class="timer-value">15</span>s
                    </div>

                    <div class="stat-badge counter">
                        <i class="fa-solid fa-gamepad"></i>
                        <span>${currentNumber}/${totalQuestions}</span>
                    </div>
                </div>

                <h2 class="question-text">${this.escapeHTML(question)}</h2>

                <div class="answers-grid">
                    ${answersHTML}
                </div>

                <p class="keyboard-hint">
                    <i class="fa-regular fa-keyboard"></i>
                    Press 1-${shuffledAnswers.length} to select
                </p>

                <div class="score-panel">
                    <div class="score-item">
                        <div class="score-item-label">Score</div>
                        <div class="score-item-value">${this.quiz.score}</div>
                    </div>
                </div>
            </div>
        `;

        this.questionCard = this.container.querySelector(".question-card");

        this.addEventListeners();
        this.startTimer();
    }

    addEventListeners() {
        const answerButtons = this.questionCard.querySelectorAll(".answer-btn");

        answerButtons.forEach(button => {
            button.addEventListener("click", () => {
                this.checkAnswer(button);
            });
        });

        document.addEventListener("keydown", this.keyboardHandler);
    }

    removeEventListeners() {
        document.removeEventListener("keydown", this.keyboardHandler);
    }

    handleKeyboard(event) {
        if (this.answered || !/^[1-4]$/.test(event.key)) {
            return;
        }

        const button = this.questionCard.querySelector(
            `.answer-btn[data-index="${event.key}"]`
        );

        if (button) {
            this.checkAnswer(button);
        }
    }

    startTimer() {
        this.stopTimer();

        this.timerInterval = setInterval(() => {
            if (this.answered) {
                return;
            }

            this.timeRemaining--;

            const timer = this.questionCard.querySelector(".stat-badge.timer");
            const timerValue = this.questionCard.querySelector(".timer-value");

            if (timerValue) {
                timerValue.textContent = this.timeRemaining;
            }

            if (this.timeRemaining <= 10 && timer) {
                timer.classList.add("warning");
            }

            if (this.timeRemaining <= 0) {
                this.handleTimeUp();
            }
        }, 1000);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    checkAnswer(button) {
        if (this.answered || !button) {
            return;
        }

        this.answered = true;
        this.stopTimer();

        const selectedAnswer = button.dataset.answer;
        const correctAnswer = this.decodeHTML(this.questionData.correct_answer);
        const isCorrect = selectedAnswer === correctAnswer;

        if (isCorrect) {
            this.quiz.incrementScore();
            button.classList.add("correct");
            this.playSound(true);
        } else {
            button.classList.add("wrong");
            this.highlightCorrectAnswer();
            this.playSound(false);

            const message = document.createElement("div");
            message.className = "time-up-message";
            message.innerHTML = `
                <i class="fa-solid fa-circle-check"></i>
                Correct Answer: ${this.escapeHTML(correctAnswer)}
            `;

            this.questionCard.querySelector(".answers-grid").after(message);
        }

        this.disableAnswers();

        const scoreElement = this.questionCard.querySelector(".score-item-value");

        if (scoreElement) {
            scoreElement.textContent = this.quiz.score;
        }

        this.animateQuestion();
    }

    handleTimeUp() {
        if (this.answered) {
            return;
        }

        this.answered = true;
        this.stopTimer();

        this.highlightCorrectAnswer();
        this.disableAnswers();

        const correctAnswer = this.decodeHTML(this.questionData.correct_answer);

        const message = document.createElement("div");
        message.className = "time-up-message";
        message.innerHTML = `
            <i class="fa-solid fa-clock"></i>
            TIME'S UP! Correct Answer: ${this.escapeHTML(correctAnswer)}
        `;

        this.questionCard.querySelector(".answers-grid").after(message);

        this.playSound(false);
        this.animateQuestion();
    }

    highlightCorrectAnswer() {
        const correctAnswer = this.decodeHTML(this.questionData.correct_answer);
        const buttons = this.questionCard.querySelectorAll(".answer-btn");

        buttons.forEach(button => {
            if (button.dataset.answer === correctAnswer) {
                button.classList.add("correct-reveal");
            }
        });
    }

    disableAnswers() {
        const buttons = this.questionCard.querySelectorAll(".answer-btn");

        buttons.forEach(button => {
            button.disabled = true;

            if (
                !button.classList.contains("correct") &&
                !button.classList.contains("wrong") &&
                !button.classList.contains("correct-reveal")
            ) {
                button.classList.add("disabled");
            }
        });
    }

    animateQuestion() {
        setTimeout(() => {
            this.getNextQuestion();
        }, 3000);
    }

    getNextQuestion() {
        this.removeEventListeners();
        this.stopTimer();

        this.quiz.nextQuestion();

        if (this.quiz.isComplete()) {
            this.container.innerHTML = "";
            this.onQuizEnd();
            return;
        }

        this.displayQuestion();
    }

    playSound(isCorrect) {
        try {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;

            if (!AudioContextClass) {
                return;
            }

            const audioContext = new AudioContextClass();
            const oscillator = audioContext.createOscillator();
            const gain = audioContext.createGain();

            oscillator.connect(gain);
            gain.connect(audioContext.destination);

            oscillator.type = "sine";
            oscillator.frequency.value = isCorrect ? 800 : 250;

            gain.gain.setValueAtTime(0.2, audioContext.currentTime);
            gain.gain.exponentialRampToValueAtTime(
                0.001,
                audioContext.currentTime + 0.3
            );

            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.3);

            oscillator.onended = () => {
                audioContext.close();
            };
        } catch (error) {
            console.error(error);
        }
    }
}
