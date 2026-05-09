package com.trivia.domain

import jakarta.persistence.*
import java.time.LocalDateTime

@Entity
@Table(name = "game_results")
class GameResult(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long? = null,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    val user: AppUser,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_id")
    val question: Question,

    val isCorrect: Boolean,
    val pointsEarned: Int,
    val timestamp: LocalDateTime = LocalDateTime.now()
)
