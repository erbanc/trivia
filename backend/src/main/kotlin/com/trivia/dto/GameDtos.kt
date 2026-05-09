package com.trivia.dto

enum class GamePhase {
    QUESTION, REVEAL, INTERMISSION, PODIUM
}

data class QuestionDto(
    val id: Long,
    val content: String,
    val category: String? = null
)

data class PlayerScoreDto(
    val username: String,
    val points: Long,
    val streak: Int = 0,
    val lastComment: String? = null,
    val isOnline: Boolean = true,
    val xp: Long = 0,
    val level: Int = 1,
    val title: String? = null
)

data class AnswerRequest(
    val username: String,
    val answer: String
)

data class AnswerResponse(
    val correct: Boolean,
    val pointsEarned: Int = 0,
    val submittedAnswer: String? = null,
    val currentStreak: Int = 0
)

data class ChatMessageDto(
    val username: String,
    val content: String,
    val timestamp: Long = System.currentTimeMillis()
)

data class ReactionDto(
    val username: String,
    val emoji: String,
    val timestamp: Long = System.currentTimeMillis()
)

data class ReportRequest(
    val questionId: Long,
    val username: String,
    val reason: String
)

data class GameStateDto(
    val phase: GamePhase,
    val remainingTime: Int,
    val question: QuestionDto? = null,
    val correctAnswers: List<String>? = null,
    val leaderboard: List<PlayerScoreDto> = emptyList(),
    val currentQuestionNumber: Int = 0,
    val totalQuestionsInRound: Int = 20
)

data class UserStatsDto(
    val username: String,
    val points: Int,
    val streak: Int,
    val rank: Int
)
