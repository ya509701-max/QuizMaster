export default class Quiz {
    constructor(category, difficulty, numberOfQuestions, playerName, questionType = "") {
        this.category = category;
        this.difficulty = difficulty;
        this.numberOfQuestions = Number(numberOfQuestions);
        this.playerName = playerName || "Player";
        this.questionType = questionType;
        this.questions = [];
        this.currentQuestionIndex = 0;
        this.score = 0;
        this.apiUrl = "https://opentdb.com/api.php";
        this.highScoresKey = "quizHighScores";
    }

    async getQuestions() {
        const url = this.buildApiUrl();

        try {
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error("The questions server is unavailable. Please try again.");
            }

            const data = await response.json();

            if (data.response_code === 1) {
                throw new Error("Not enough questions available. Try fewer questions or another category.");
            }

            if (data.response_code === 2) {
                throw new Error("Invalid quiz settings. Please check your selections.");
            }

            if (data.response_code === 3 || data.response_code === 4) {
                throw new Error("The question session is unavailable. Please try again.");
            }

            if (data.response_code === 5) {
                throw new Error("Please wait 5 seconds before starting another quiz.");
            }

            if (data.response_code !== 0 || !Array.isArray(data.results)) {
                throw new Error("Unable to load questions. Please try again.");
            }

            this.questions = data.results;
            this.currentQuestionIndex = 0;
            this.score = 0;

            return this.questions;
        } catch (error) {
            if (error instanceof TypeError) {
                throw new Error("Connection failed. Please check your internet connection.");
            }

            throw error;
        }
    }

    buildApiUrl() {
        const params = new URLSearchParams();

        params.set("amount", String(this.numberOfQuestions));

        if (this.category && /^\d+$/.test(String(this.category))) {
            params.set("category", String(this.category));
        }

        if (["easy", "medium", "hard"].includes(this.difficulty)) {
            params.set("difficulty", this.difficulty);
        }

        if (["multiple", "boolean"].includes(this.questionType)) {
            params.set("type", this.questionType);
        }

        return `${this.apiUrl}?${params.toString()}`;
    }

    incrementScore() {
        this.score++;
        return this.score;
    }

    getCurrentQuestion() {
        return this.questions[this.currentQuestionIndex] || null;
    }

    nextQuestion() {
        if (this.currentQuestionIndex < this.questions.length) {
            this.currentQuestionIndex++;
        }

        return this.getCurrentQuestion();
    }

    isComplete() {
        return this.currentQuestionIndex >= this.questions.length;
    }

    getScorePercentage() {
        if (this.questions.length === 0) {
            return 0;
        }

        return Math.round((this.score / this.questions.length) * 100);
    }

    getHighScores() {
        try {
            const savedScores = localStorage.getItem(this.highScoresKey);
            const parsedScores = savedScores ? JSON.parse(savedScores) : [];

            return Array.isArray(parsedScores) ? parsedScores : [];
        } catch {
            return [];
        }
    }

    isHighScore() {
        const highScores = this.getHighScores();

        if (highScores.length < 10) {
            return true;
        }

        return this.getScorePercentage() > Number(highScores[highScores.length - 1].percentage);
    }

    saveHighScore() {
        const result = {
            name: this.playerName,
            score: this.score,
            total: this.questions.length,
            percentage: this.getScorePercentage(),
            difficulty: this.difficulty || "Any",
            date: new Date().toISOString()
        };

        const highScores = this.getHighScores();

        highScores.push(result);

        highScores.sort((a, b) =>
            Number(b.percentage) - Number(a.percentage) ||
            Number(b.score) - Number(a.score)
        );

        const topScores = highScores.slice(0, 10);

        try {
            localStorage.setItem(this.highScoresKey, JSON.stringify(topScores));
        } catch (error) {
            console.error(error);
        }

        return topScores;
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

    endQuiz() {
        const isNewRecord = this.isHighScore();
        const highScores = this.saveHighScore();
        const percentage = this.getScorePercentage();

        const leaderboardHTML = highScores.map((item, index) => {
            const rankClass = ["gold", "silver", "bronze"][index] || "";

            return `
                <li class="leaderboard-item ${rankClass}">
                    <span class="leaderboard-rank">#${index + 1}</span>
                    <span class="leaderboard-name">${this.escapeHTML(item.name)}</span>
                    <span class="leaderboard-score">${Number(item.percentage)}%</span>
                </li>
            `;
        }).join("");

        return `
            <div class="game-card results-card">
                <div class="results-trophy">🏆</div>
                <h2 class="results-title">Quiz Complete!</h2>
                <p class="results-score-display">${this.score}/${this.questions.length}</p>
                <p class="results-percentage">${percentage}% Accuracy</p>

                ${isNewRecord ? `
                    <div class="new-record-badge">
                        <i class="fa-solid fa-star"></i>
                        New High Score!
                    </div>
                ` : ""}

                <div class="leaderboard">
                    <h4 class="leaderboard-title">
                        <i class="fa-solid fa-trophy"></i> Leaderboard
                    </h4>
                    <ul class="leaderboard-list">
                        ${leaderboardHTML}
                    </ul>
                </div>

                <div class="action-buttons">
                    <button class="btn-restart" type="button">
                        <i class="fa-solid fa-rotate-right"></i>
                        Play Again
                    </button>
                </div>
            </div>
        `;
    }
}