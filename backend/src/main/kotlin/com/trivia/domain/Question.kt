package com.trivia.domain

import jakarta.persistence.*

@Entity
@Table(name = "questions")
class Question(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long? = null,

    @Column(nullable = false, columnDefinition = "TEXT")
    val content: String,

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "question_answers", joinColumns = [JoinColumn(name = "question_id")])
    @Column(name = "answer")
    val correctAnswers: List<String>,

    val category: String? = null,
    val difficulty: String? = null
)
