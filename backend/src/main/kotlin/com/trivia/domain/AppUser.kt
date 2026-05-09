package com.trivia.domain

import jakarta.persistence.*
import java.time.LocalDateTime

@Entity
@Table(name = "users")
class AppUser(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long? = null,

    @Column(unique = true, nullable = false)
    val username: String,

    val passwordHash: String? = null,

    val email: String? = null,
    val provider: String? = null,
    val providerId: String? = null,

    var totalPoints: Long = 0,
    var allTimeBestRank: Int? = null,
    val createdAt: java.time.LocalDateTime = java.time.LocalDateTime.now()
)
